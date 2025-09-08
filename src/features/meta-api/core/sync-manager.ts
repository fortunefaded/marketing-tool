import { vibe } from '@/utils/vibelogger'
import { ConvexReactClient } from 'convex/react'

/**
 * Meta APIデータ同期マネージャー
 * - オプティミスティック更新
 * - コンフリクト解決
 * - デルタ同期
 * - バックグラウンド同期
 */
export class MetaDataSyncManager {
  private static instance: MetaDataSyncManager
  private syncWorker: Worker | null = null
  private syncQueue: SyncOperation[] = []
  private isSyncing = false
  
  // バージョン管理
  private dataVersions = new Map<string, number>()
  
  // オプティミスティック更新の追跡
  private optimisticUpdates = new Map<string, {
    originalData: any
    optimisticData: any
    timestamp: Date
  }>()
  
  private constructor(private convexClient: ConvexReactClient) {
    this.initializeWorker()
  }
  
  static getInstance(convexClient: ConvexReactClient): MetaDataSyncManager {
    if (!MetaDataSyncManager.instance) {
      MetaDataSyncManager.instance = new MetaDataSyncManager(convexClient)
    }
    return MetaDataSyncManager.instance
  }
  
  /**
   * Web Workerの初期化
   */
  private initializeWorker(): void {
    try {
      // Web Workerスクリプトを動的に作成
      const workerScript = `
        self.addEventListener('message', async (e) => {
          const { type, data } = e.data
          
          switch (type) {
            case 'SYNC_DELTA':
              // デルタ同期の実行
              const result = await performDeltaSync(data)
              self.postMessage({ type: 'SYNC_COMPLETE', result })
              break
              
            case 'CALCULATE_DIFF':
              // 差分計算
              const diff = calculateDiff(data.old, data.new)
              self.postMessage({ type: 'DIFF_COMPLETE', diff })
              break
          }
        })
        
        async function performDeltaSync(data) {
          // 実際の同期ロジック
          return { success: true, synced: data.length }
        }
        
        function calculateDiff(oldData, newData) {
          // 差分計算ロジック
          const diff = {
            added: [],
            modified: [],
            deleted: []
          }
          // 実装省略
          return diff
        }
      `
      
      const blob = new Blob([workerScript], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      this.syncWorker = new Worker(workerUrl)
      
      this.syncWorker.addEventListener('message', this.handleWorkerMessage.bind(this))
      vibe.good('同期ワーカー初期化完了')
      
    } catch (error) {
      vibe.warn('Web Worker初期化失敗、メインスレッドで実行', error)
    }
  }
  
  /**
   * オプティミスティック更新の実行
   */
  async performOptimisticUpdate<T>(
    dataId: string,
    updateFn: (data: T) => T,
    rollbackOnError = true
  ): Promise<T> {
    const story = vibe.story('オプティミスティック更新')
    
    try {
      // 現在のデータを取得
      story.chapter('現在データ取得', { dataId })
      const currentData = await this.getDataById(dataId)
      
      // オプティミスティック更新を適用
      const optimisticData = updateFn(currentData)
      
      // 更新を記録
      this.optimisticUpdates.set(dataId, {
        originalData: currentData,
        optimisticData,
        timestamp: new Date()
      })
      
      // UIに即座に反映
      story.chapter('UI更新', 'オプティミスティックデータを適用')
      await this.updateLocalData(dataId, optimisticData)
      
      // バックグラウンドで実際の更新を実行
      this.queueSyncOperation({
        type: 'UPDATE',
        dataId,
        data: optimisticData,
        rollbackOnError
      })
      
      story.success('オプティミスティック更新完了')
      return optimisticData
      
    } catch (error) {
      story.fail(`エラー: ${error.message}`)
      
      if (rollbackOnError) {
        await this.rollbackOptimisticUpdate(dataId)
      }
      
      throw error
    }
  }
  
  /**
   * オプティミスティック更新のロールバック
   */
  private async rollbackOptimisticUpdate(dataId: string): Promise<void> {
    const update = this.optimisticUpdates.get(dataId)
    if (!update) return
    
    vibe.warn('オプティミスティック更新をロールバック', { dataId })
    
    // 元のデータに戻す
    await this.updateLocalData(dataId, update.originalData)
    this.optimisticUpdates.delete(dataId)
  }
  
  /**
   * デルタ同期の実行
   */
  async performDeltaSync(
    accountId: string,
    lastSyncTimestamp?: Date
  ): Promise<SyncResult> {
    const story = vibe.story('デルタ同期')
    
    try {
      story.chapter('最終同期時刻確認', {
        lastSync: lastSyncTimestamp?.toISOString() || 'なし'
      })
      
      // 変更されたデータのみを取得
      const changes = await this.fetchChangedData(accountId, lastSyncTimestamp)
      
      if (changes.length === 0) {
        story.success('変更なし')
        return { success: true, syncedCount: 0, conflicts: [] }
      }
      
      story.chapter('変更データ検出', `${changes.length}件`)
      
      // コンフリクト検出
      const conflicts = await this.detectConflicts(changes)
      
      if (conflicts.length > 0) {
        story.chapter('コンフリクト検出', `${conflicts.length}件`)
        const resolved = await this.resolveConflicts(conflicts)
        story.chapter('コンフリクト解決', `${resolved.length}件解決`)
      }
      
      // データの適用
      await this.applyChanges(changes)
      
      // バージョン更新
      this.updateVersions(changes)
      
      story.success(`${changes.length}件のデータを同期`)
      
      return {
        success: true,
        syncedCount: changes.length,
        conflicts: conflicts
      }
      
    } catch (error) {
      story.fail(`同期エラー: ${error.message}`)
      throw error
    }
  }
  
  /**
   * コンフリクトの検出
   */
  private async detectConflicts(changes: any[]): Promise<Conflict[]> {
    const conflicts: Conflict[] = []
    
    for (const change of changes) {
      const localVersion = this.dataVersions.get(change.id) || 0
      const remoteVersion = change.version || 0
      
      // バージョンが一致しない場合はコンフリクト
      if (localVersion !== remoteVersion - 1) {
        conflicts.push({
          dataId: change.id,
          localVersion,
          remoteVersion,
          localData: await this.getDataById(change.id),
          remoteData: change
        })
      }
    }
    
    return conflicts
  }
  
  /**
   * コンフリクトの解決
   */
  private async resolveConflicts(conflicts: Conflict[]): Promise<Conflict[]> {
    const resolved: Conflict[] = []
    
    for (const conflict of conflicts) {
      // 解決戦略: 
      // 1. タイムスタンプが新しい方を採用
      // 2. 重要度が高いフィールドは手動マージ
      // 3. 解決不可能な場合はユーザーに通知
      
      const resolution = await this.applyConflictResolutionStrategy(conflict)
      
      if (resolution.resolved) {
        resolved.push(conflict)
        await this.updateLocalData(conflict.dataId, resolution.data)
      } else {
        // ユーザーに通知
        vibe.warn('コンフリクト解決不可', {
          dataId: conflict.dataId,
          reason: resolution.reason
        })
      }
    }
    
    return resolved
  }
  
  /**
   * コンフリクト解決戦略の適用
   */
  private async applyConflictResolutionStrategy(conflict: Conflict): Promise<{
    resolved: boolean
    data?: any
    reason?: string
  }> {
    // シンプルな戦略: より新しいデータを採用
    const localTimestamp = conflict.localData?.updatedAt || 0
    const remoteTimestamp = conflict.remoteData?.updatedAt || 0
    
    if (remoteTimestamp > localTimestamp) {
      return {
        resolved: true,
        data: conflict.remoteData
      }
    }
    
    // 同じタイムスタンプの場合は手動解決が必要
    return {
      resolved: false,
      reason: 'タイムスタンプが同じため自動解決不可'
    }
  }
  
  /**
   * 同期操作のキューイング
   */
  private queueSyncOperation(operation: SyncOperation): void {
    this.syncQueue.push(operation)
    
    // 同期中でなければ処理開始
    if (!this.isSyncing) {
      this.processSyncQueue()
    }
  }
  
  /**
   * 同期キューの処理
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || this.isSyncing) {
      return
    }
    
    this.isSyncing = true
    
    while (this.syncQueue.length > 0) {
      const operation = this.syncQueue.shift()!
      
      try {
        await this.executeSyncOperation(operation)
      } catch (error) {
        vibe.bad('同期操作エラー', { operation, error })
        
        if (operation.rollbackOnError) {
          await this.rollbackOptimisticUpdate(operation.dataId)
        }
      }
    }
    
    this.isSyncing = false
  }
  
  /**
   * 同期操作の実行
   */
  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'UPDATE':
        await this.syncUpdateToServer(operation.dataId, operation.data)
        break
      case 'DELETE':
        await this.syncDeleteToServer(operation.dataId)
        break
      case 'CREATE':
        await this.syncCreateToServer(operation.data)
        break
    }
  }
  
  // ヘルパーメソッド
  
  private async getDataById(_dataId: string): Promise<any> {
    // Convexから取得
    return {}
  }
  
  private async updateLocalData(_dataId: string, _data: any): Promise<void> {
    // Convexに保存
  }
  
  private async fetchChangedData(_accountId: string, _since?: Date): Promise<any[]> {
    // Meta APIから変更データを取得
    return []
  }
  
  private async applyChanges(_changes: any[]): Promise<void> {
    // 変更をローカルに適用
  }
  
  private updateVersions(changes: any[]): void {
    // バージョン情報を更新
    for (const change of changes) {
      this.dataVersions.set(change.id, change.version || 0)
    }
  }
  
  private async syncUpdateToServer(_dataId: string, _data: any): Promise<void> {
    // サーバーに更新を送信
  }
  
  private async syncDeleteToServer(_dataId: string): Promise<void> {
    // サーバーに削除を送信
  }
  
  private async syncCreateToServer(_data: any): Promise<void> {
    // サーバーに作成を送信
  }
  
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, result, diff } = event.data
    
    switch (type) {
      case 'SYNC_COMPLETE':
        vibe.good('ワーカー同期完了', result)
        break
      case 'DIFF_COMPLETE':
        vibe.info('差分計算完了', diff)
        break
    }
  }
}

// 型定義
interface SyncOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  dataId: string
  data?: any
  rollbackOnError?: boolean
}

interface SyncResult {
  success: boolean
  syncedCount: number
  conflicts: Conflict[]
}

interface Conflict {
  dataId: string
  localVersion: number
  remoteVersion: number
  localData: any
  remoteData: any
}
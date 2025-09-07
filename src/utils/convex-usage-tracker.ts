/**
 * Convex使用量追跡ツール
 *
 * 目的: Database Bandwidth超過の根本原因を特定
 * - どのクエリが頻繁に実行されているか
 * - 各クエリのデータサイズはどれくらいか
 * - 不要な再実行が起きていないか
 */

import { ConvexReactClient } from 'convex/react'

interface QueryLog {
  queryName: string
  timestamp: string
  duration: number
  dataSize: number
  dataSizeMB: number
  args: any
  stackTrace?: string
}

interface QueryStats {
  queryName: string
  callCount: number
  totalSize: number
  totalSizeMB: number
  avgSize: number
  avgDuration: number
  lastCalled: string
}

export class ConvexUsageTracker {
  private logs: QueryLog[] = []
  private statsMap: Map<string, QueryStats> = new Map()
  private originalQuery: any
  private originalMutation: any
  private isTracking = false
  private convex: ConvexReactClient

  constructor(convex: ConvexReactClient) {
    this.convex = convex
  }

  /**
   * トラッキングを開始
   */
  start() {
    if (this.isTracking) {
      console.warn('⚠️ Convex使用量トラッキングは既に開始されています')
      return
    }

    // オリジナルの関数を保存
    this.originalQuery = this.convex.query.bind(this.convex)
    this.originalMutation = this.convex.mutation.bind(this.convex)

    // クエリをラップ
    ;(this.convex as any).query = this.wrapQuery.bind(this)
    ;(this.convex as any).mutation = this.wrapMutation.bind(this)

    this.isTracking = true
    console.log('🔍 Convex使用量トラッキングを開始しました')

    // 5分ごとに統計を出力
    setInterval(
      () => {
        this.printStats()
      },
      5 * 60 * 1000
    )
  }

  /**
   * トラッキングを停止
   */
  stop() {
    if (!this.isTracking) {
      return
    }

    // オリジナルの関数を復元
    ;(this.convex as any).query = this.originalQuery
    ;(this.convex as any).mutation = this.originalMutation

    this.isTracking = false
    console.log('⏹️ Convex使用量トラッキングを停止しました')

    // 最終統計を出力
    this.printStats()
    this.exportLogs()
  }

  /**
   * クエリ関数をラップ
   */
  private async wrapQuery(queryFunction: any, args?: any) {
    const startTime = Date.now()
    const queryName = this.getQueryName(queryFunction)

    try {
      const result = await this.originalQuery(queryFunction, args)

      // ログを記録
      const duration = Date.now() - startTime
      const dataSize = this.calculateDataSize(result)

      const log: QueryLog = {
        queryName,
        timestamp: new Date().toISOString(),
        duration,
        dataSize,
        dataSizeMB: dataSize / (1024 * 1024),
        args: this.sanitizeArgs(args),
      }

      // デバッグ用にスタックトレースを取得（開発環境のみ）
      if (import.meta.env.DEV) {
        log.stackTrace = new Error().stack
      }

      this.logs.push(log)
      this.updateStats(log)

      // 大きなクエリは警告
      if (dataSize > 1024 * 1024) {
        // 1MB以上
        console.warn(`⚠️ 大きなクエリ検出: ${queryName}`, {
          sizeMB: (dataSize / (1024 * 1024)).toFixed(2),
          duration: `${duration}ms`,
          args,
        })
      }

      return result
    } catch (error) {
      console.error(`❌ クエリエラー: ${queryName}`, error)
      throw error
    }
  }

  /**
   * ミューテーション関数をラップ
   */
  private async wrapMutation(mutationFunction: any, args?: any) {
    const startTime = Date.now()
    const mutationName = this.getMutationName(mutationFunction)

    try {
      const result = await this.originalMutation(mutationFunction, args)

      const duration = Date.now() - startTime
      const dataSize = this.calculateDataSize(args) // ミューテーションは引数のサイズを計測

      const log: QueryLog = {
        queryName: `mutation:${mutationName}`,
        timestamp: new Date().toISOString(),
        duration,
        dataSize,
        dataSizeMB: dataSize / (1024 * 1024),
        args: this.sanitizeArgs(args),
      }

      this.logs.push(log)
      this.updateStats(log)

      return result
    } catch (error) {
      console.error(`❌ ミューテーションエラー: ${mutationName}`, error)
      throw error
    }
  }

  /**
   * クエリ名を取得
   */
  private getQueryName(queryFunction: any): string {
    if (queryFunction?._name) {
      return queryFunction._name
    }
    if (queryFunction?.name) {
      return queryFunction.name
    }
    return 'unknown_query'
  }

  /**
   * ミューテーション名を取得
   */
  private getMutationName(mutationFunction: any): string {
    if (mutationFunction?._name) {
      return mutationFunction._name
    }
    if (mutationFunction?.name) {
      return mutationFunction.name
    }
    return 'unknown_mutation'
  }

  /**
   * データサイズを計算（バイト）
   */
  private calculateDataSize(data: any): number {
    if (data === null || data === undefined) {
      return 0
    }

    try {
      const jsonString = JSON.stringify(data)
      // UTF-16として計算（JavaScriptの文字列は内部的にUTF-16）
      return jsonString.length * 2
    } catch {
      return 0
    }
  }

  /**
   * 引数をサニタイズ（トークンなどを隠す）
   */
  private sanitizeArgs(args: any): any {
    if (!args) return args

    const sanitized = { ...args }

    // センシティブなフィールドを隠す
    const sensitiveFields = ['accessToken', 'token', 'password', 'secret']

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }

    return sanitized
  }

  /**
   * 統計を更新
   */
  private updateStats(log: QueryLog) {
    const stats = this.statsMap.get(log.queryName) || {
      queryName: log.queryName,
      callCount: 0,
      totalSize: 0,
      totalSizeMB: 0,
      avgSize: 0,
      avgDuration: 0,
      lastCalled: log.timestamp,
    }

    stats.callCount++
    stats.totalSize += log.dataSize
    stats.totalSizeMB = stats.totalSize / (1024 * 1024)
    stats.avgSize = stats.totalSize / stats.callCount
    stats.avgDuration = (stats.avgDuration * (stats.callCount - 1) + log.duration) / stats.callCount
    stats.lastCalled = log.timestamp

    this.statsMap.set(log.queryName, stats)
  }

  /**
   * 統計を出力
   */
  printStats() {
    console.group('📊 Convex使用量統計')

    // 総計
    const totalCalls = this.logs.length
    const totalSize = this.logs.reduce((sum, log) => sum + log.dataSize, 0)
    const totalSizeMB = totalSize / (1024 * 1024)

    console.log('📈 総計:', {
      総クエリ数: totalCalls,
      総データ量: `${totalSizeMB.toFixed(2)} MB`,
      記録開始: this.logs[0]?.timestamp || 'なし',
      最終記録: this.logs[this.logs.length - 1]?.timestamp || 'なし',
    })

    // クエリ別統計（データ量の多い順）
    const sortedStats = Array.from(this.statsMap.values())
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, 10) // トップ10

    console.table(
      sortedStats.map((stats) => ({
        クエリ名: stats.queryName,
        呼び出し回数: stats.callCount,
        '総データ量(MB)': stats.totalSizeMB.toFixed(2),
        '平均サイズ(KB)': (stats.avgSize / 1024).toFixed(2),
        '平均時間(ms)': stats.avgDuration.toFixed(0),
        最終実行: new Date(stats.lastCalled).toLocaleTimeString(),
      }))
    )

    // 問題のあるクエリを警告
    const problematicQueries = sortedStats.filter(
      (stats) => stats.totalSizeMB > 100 || stats.callCount > 100
    )

    if (problematicQueries.length > 0) {
      console.warn('⚠️ 問題の可能性があるクエリ:')
      problematicQueries.forEach((stats) => {
        console.warn(
          `  - ${stats.queryName}: ${stats.callCount}回, ${stats.totalSizeMB.toFixed(2)}MB`
        )
      })
    }

    console.groupEnd()
  }

  /**
   * ログをエクスポート
   */
  exportLogs() {
    const exportData = {
      summary: {
        totalCalls: this.logs.length,
        totalSizeMB: this.logs.reduce((sum, log) => sum + log.dataSize, 0) / (1024 * 1024),
        startTime: this.logs[0]?.timestamp,
        endTime: this.logs[this.logs.length - 1]?.timestamp,
      },
      stats: Array.from(this.statsMap.values()),
      logs: this.logs.slice(-100), // 最新100件のログ
    }

    // コンソールに出力
    console.log('📤 エクスポートデータ:', exportData)

    // ローカルストレージに保存（デバッグ用）
    try {
      localStorage.setItem(`convex_usage_${Date.now()}`, JSON.stringify(exportData))
      console.log('💾 ログをローカルストレージに保存しました')
    } catch (error) {
      console.error('❌ ログの保存に失敗:', error)
    }

    return exportData
  }

  /**
   * 統計をリセット
   */
  reset() {
    this.logs = []
    this.statsMap.clear()
    console.log('🔄 統計をリセットしました')
  }
}

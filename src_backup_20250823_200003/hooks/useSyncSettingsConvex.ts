import { useState, useEffect } from 'react'
import { useConvex, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { logger } from '../utils/logger'

export interface SyncSettingsData {
  autoSync: boolean
  syncInterval: 'manual' | 'hourly' | 'daily' | 'weekly'
  debugMode: boolean
  retentionDays: number
  excludeTestCampaigns: boolean
  maxMonths?: number
  limitPerRequest?: number
  skipCreatives?: boolean
}

const DEFAULT_SETTINGS: SyncSettingsData = {
  autoSync: false,
  syncInterval: 'manual',
  debugMode: false,
  retentionDays: 30,
  excludeTestCampaigns: false,
  maxMonths: 1,
  limitPerRequest: 100,
  skipCreatives: false,
}

export function useSyncSettingsConvex(accountId: string) {
  const convex = useConvex()
  const [settings, setSettings] = useState<SyncSettingsData>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mutations
  const saveSettingsMutation = useMutation(api.syncSettings.saveSettings)
  const updateSettingsMutation = useMutation(api.syncSettings.updateSettings)
  const deleteSettingsMutation = useMutation(api.syncSettings.deleteSettings)

  // 設定の読み込み
  useEffect(() => {
    async function loadSettings() {
      if (!accountId) {
        setSettings(DEFAULT_SETTINGS)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const result = await convex.query(api.syncSettings.getSettings, { accountId })
        
        if (result) {
          setSettings({
            autoSync: result.autoSync,
            syncInterval: result.syncInterval as SyncSettingsData['syncInterval'],
            debugMode: result.debugMode,
            retentionDays: result.retentionDays,
            excludeTestCampaigns: result.excludeTestCampaigns,
            maxMonths: result.maxMonths,
            limitPerRequest: result.limitPerRequest,
            skipCreatives: result.skipCreatives,
          })
        } else {
          // 設定が存在しない場合はデフォルト値を使用
          setSettings(DEFAULT_SETTINGS)
        }
        
        setError(null)
      } catch (err) {
        logger.error('Failed to load sync settings:', err)
        setError('同期設定の読み込みに失敗しました')
        setSettings(DEFAULT_SETTINGS)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [convex, accountId])

  // 設定の保存
  const saveSettings = async (newSettings: SyncSettingsData): Promise<void> => {
    if (!accountId) {
      throw new Error('アカウントIDが設定されていません')
    }

    try {
      await saveSettingsMutation({
        accountId,
        ...newSettings,
      })
      
      setSettings(newSettings)
      setError(null)
    } catch (err) {
      logger.error('Failed to save sync settings:', err)
      throw new Error('同期設定の保存に失敗しました')
    }
  }

  // 設定の部分更新
  const updateSettings = async (updates: Partial<SyncSettingsData>): Promise<void> => {
    if (!accountId) {
      throw new Error('アカウントIDが設定されていません')
    }

    try {
      await updateSettingsMutation({
        accountId,
        ...updates,
      })
      
      setSettings(prev => ({ ...prev, ...updates }))
      setError(null)
    } catch (err) {
      logger.error('Failed to update sync settings:', err)
      throw new Error('同期設定の更新に失敗しました')
    }
  }

  // 単一の設定項目を更新
  const updateSetting = async <K extends keyof SyncSettingsData>(
    key: K,
    value: SyncSettingsData[K]
  ): Promise<void> => {
    await updateSettings({ [key]: value })
  }

  // 設定の削除（デフォルト値にリセット）
  const resetSettings = async (): Promise<void> => {
    if (!accountId) {
      throw new Error('アカウントIDが設定されていません')
    }

    try {
      await deleteSettingsMutation({ accountId })
      setSettings(DEFAULT_SETTINGS)
      setError(null)
    } catch (err) {
      logger.error('Failed to reset sync settings:', err)
      throw new Error('同期設定のリセットに失敗しました')
    }
  }

  // デバッグモードの切り替え
  const toggleDebugMode = async (): Promise<void> => {
    await updateSetting('debugMode', !settings.debugMode)
  }

  // 自動同期の切り替え
  const toggleAutoSync = async (): Promise<void> => {
    await updateSetting('autoSync', !settings.autoSync)
  }

  // テストキャンペーン除外の切り替え
  const toggleExcludeTestCampaigns = async (): Promise<void> => {
    await updateSetting('excludeTestCampaigns', !settings.excludeTestCampaigns)
  }

  return {
    settings,
    loading,
    error,
    saveSettings,
    updateSettings,
    updateSetting,
    resetSettings,
    toggleDebugMode,
    toggleAutoSync,
    toggleExcludeTestCampaigns,
  }
}
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { MetaDashboardReal } from '../MetaDashboardReal'
import { MetaDataCache } from '../../services/metaDataCache'
import { MetaAccountManager } from '../../services/metaAccountManager'

// Mocks
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}))

vi.mock('../../services/metaAccountManager')
vi.mock('../../services/metaApiService')
vi.mock('../../services/metaDataCache')

describe('MetaDashboardReal - キャッシュクリア機能', () => {
  const mockAccountId = 'test-account-123'
  const mockAccount = {
    accountId: mockAccountId,
    fullAccountId: 'act_123456789',
    name: 'Test Account',
    accessToken: 'test-token'
  }

  const mockApiService = {
    checkPermissions: vi.fn().mockResolvedValue([
      { permission: 'ads_read', status: 'granted' },
      { permission: 'ads_management', status: 'granted' }
    ]),
    getAccountInfo: vi.fn().mockResolvedValue({ id: mockAccountId }),
    getCampaigns: vi.fn().mockResolvedValue([]),
    getInsights: vi.fn().mockResolvedValue([]),
    detectDateLimit: vi.fn().mockResolvedValue({ maxMonths: 37, oldestDate: '2022-01-01' })
  }

  beforeEach(() => {
    // Mocks setup
    MetaAccountManager.prototype.getActiveAccount = vi.fn().mockReturnValue(mockAccount)
    MetaAccountManager.prototype.getActiveApiService = vi.fn().mockReturnValue(mockApiService)
    
    // MetaDataCache mocks
    MetaDataCache.getInsights = vi.fn().mockReturnValue([])
    MetaDataCache.getSyncStatus = vi.fn().mockReturnValue({
      accountId: mockAccountId,
      lastFullSync: null,
      lastIncrementalSync: null,
      totalRecords: 0,
      dateRange: { earliest: null, latest: null }
    })
    MetaDataCache.getCacheUsage = vi.fn().mockReturnValue({ sizeKB: 0, records: 0 })
    MetaDataCache.clearAccountCache = vi.fn()
    MetaDataCache.saveInsights = vi.fn()
    MetaDataCache.saveSyncStatus = vi.fn()
    
    // window mocks
    window.confirm = vi.fn().mockReturnValue(true)
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: vi.fn() }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('キャッシュクリアボタンを押すとデータがクリアされてページがリロードされる', async () => {
    // Given: データが存在する状態
    MetaDataCache.getInsights.mockReturnValue([
      { dateStart: '2025-07-18', spend: '100' },
      { dateStart: '2025-08-11', spend: '200' }
    ])
    MetaDataCache.getCacheUsage.mockReturnValue({ sizeKB: 10, records: 2 })

    render(<MetaDashboardReal />)

    // クリアボタンを探す
    await waitFor(() => {
      expect(screen.getByText('クリア')).toBeInTheDocument()
    })

    // When: クリアボタンをクリック
    fireEvent.click(screen.getByText('クリア'))

    // Then: 確認ダイアログが表示される
    expect(window.confirm).toHaveBeenCalledWith('キャッシュされたデータをすべて削除しますか？')

    // キャッシュクリア関数が呼ばれる
    expect(MetaDataCache.clearAccountCache).toHaveBeenCalledWith(mockAccountId)

    // ページがリロードされる
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('初回アクセス時に推奨メッセージが表示される', async () => {
    // Given: 全期間同期が一度も行われていない
    MetaDataCache.getSyncStatus.mockReturnValue({
      accountId: mockAccountId,
      lastFullSync: null,
      lastIncrementalSync: null,
      totalRecords: 0,
      dateRange: { earliest: null, latest: null }
    })

    render(<MetaDashboardReal />)

    // Then: 推奨メッセージが表示される
    await waitFor(() => {
      expect(screen.getByText(/初回アクセスです。「全同期」ボタンをクリックして過去37ヶ月間のデータを取得することを推奨します。/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('データが存在しても全期間同期がされていない場合は推奨メッセージが表示される', async () => {
    // Given: データは存在するが全期間同期されていない
    MetaDataCache.getInsights.mockReturnValue([
      { dateStart: '2025-07-18', spend: '100' }
    ])
    MetaDataCache.getSyncStatus.mockReturnValue({
      accountId: mockAccountId,
      lastFullSync: null, // 全期間同期されていない
      lastIncrementalSync: '2025-08-11T10:00:00Z',
      totalRecords: 1,
      dateRange: { earliest: '2025-07-18', latest: '2025-08-11' }
    })

    render(<MetaDashboardReal />)

    // Then: 推奨メッセージが表示される
    await waitFor(() => {
      expect(screen.getByText(/初回アクセスです。「全同期」ボタンをクリックして過去37ヶ月間のデータを取得することを推奨します。/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
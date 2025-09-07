import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFilterPresetsConvex } from '../useFilterPresetsConvex'

// Convexのモック
const mockQuery = vi.fn()
const mockMutation = vi.fn()

vi.mock('convex/react', () => ({
  useConvex: () => ({
    query: mockQuery,
  }),
  useMutation: () => mockMutation,
}))

describe('useFilterPresetsConvex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('プリセットを読み込める', async () => {
    const mockPresets = [
      {
        _id: 'preset1',
        name: 'マイフィルター1',
        filters: { campaign: 'test' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ]

    mockQuery.mockResolvedValue(mockPresets)

    const { result } = renderHook(() => useFilterPresetsConvex('user1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.presets).toHaveLength(1)
    expect(result.current.presets[0]).toMatchObject({
      id: 'preset1',
      name: 'マイフィルター1',
      criteria: { campaign: 'test' },
    })
    expect(result.current.error).toBeNull()
  })

  it('プリセットの読み込みエラーを処理できる', async () => {
    mockQuery.mockRejectedValue(new Error('Query failed'))

    const { result } = renderHook(() => useFilterPresetsConvex())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.presets).toEqual([])
    expect(result.current.error).toBe('プリセットの読み込みに失敗しました')
  })

  it('新しいプリセットを保存できる', async () => {
    const mockPresets: any[] = []
    mockQuery.mockResolvedValue(mockPresets)
    mockMutation.mockResolvedValue({ action: 'created', name: '新規フィルター' })

    const { result } = renderHook(() => useFilterPresetsConvex())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // 保存後の再読み込みをシミュレート
    const updatedPresets = [
      {
        _id: 'preset2',
        name: '新規フィルター',
        filters: { status: 'active' },
        createdAt: '2024-01-02',
        updatedAt: '2024-01-02',
      },
    ]
    mockQuery.mockResolvedValue(updatedPresets)

    await act(async () => {
      await result.current.savePreset('新規フィルター', { status: 'active' })
    })

    expect(mockMutation).toHaveBeenCalledWith({
      name: '新規フィルター',
      filters: { status: 'active' },
      userId: undefined,
    })
  })

  it('プリセットを削除できる', async () => {
    const mockPresets = [
      {
        _id: 'preset1',
        name: '削除対象',
        filters: {},
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ]
    mockQuery.mockResolvedValue(mockPresets)
    mockMutation.mockResolvedValue({ deleted: true })

    const { result } = renderHook(() => useFilterPresetsConvex())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.deletePreset('preset1')
    })

    expect(mockMutation).toHaveBeenCalledWith({
      name: '削除対象',
      userId: undefined,
    })
    expect(result.current.presets).toHaveLength(0)
  })

  it('複数のプリセットを一括保存できる', async () => {
    mockQuery.mockResolvedValue([])
    mockMutation.mockResolvedValue({ created: 2, updated: 0, total: 2 })

    const { result } = renderHook(() => useFilterPresetsConvex('user1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const presetsToSave = [
      { name: 'フィルター1', criteria: { type: 'A' } },
      { name: 'フィルター2', criteria: { type: 'B' } },
    ]

    // 保存後の再読み込みをシミュレート
    const savedPresets = presetsToSave.map((p, i) => ({
      _id: `preset${i + 1}`,
      name: p.name,
      filters: p.criteria,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }))
    mockQuery.mockResolvedValue(savedPresets)

    await act(async () => {
      await result.current.bulkSavePresets(presetsToSave)
    })

    expect(mockMutation).toHaveBeenCalledWith({
      presets: [
        { name: 'フィルター1', filters: { type: 'A' } },
        { name: 'フィルター2', filters: { type: 'B' } },
      ],
      userId: 'user1',
    })
  })

  it('すべてのプリセットをクリアできる', async () => {
    const mockPresets = [
      { _id: 'preset1', name: 'テスト1', filters: {} },
      { _id: 'preset2', name: 'テスト2', filters: {} },
    ]
    mockQuery.mockResolvedValue(mockPresets)
    mockMutation.mockResolvedValue({ deleted: 2 })

    const { result } = renderHook(() => useFilterPresetsConvex())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.clearAllPresets()
    })

    expect(mockMutation).toHaveBeenCalledWith({ userId: undefined })
    expect(result.current.presets).toHaveLength(0)
  })

  it('名前でプリセットを取得できる', async () => {
    const mockPreset = {
      _id: 'preset1',
      name: '特定のフィルター',
      filters: { campaign: 'special' },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockQuery.mockResolvedValue(mockPreset)

    const { result } = renderHook(() => useFilterPresetsConvex())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const preset = await act(async () => {
      return await result.current.getPresetByName('特定のフィルター')
    })

    expect(preset).toMatchObject({
      id: 'preset1',
      name: '特定のフィルター',
      criteria: { campaign: 'special' },
    })
  })

  it('存在しない名前のプリセットを取得した場合はnullを返す', async () => {
    mockQuery.mockResolvedValue(null)

    const { result } = renderHook(() => useFilterPresetsConvex())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const preset = await act(async () => {
      return await result.current.getPresetByName('存在しない')
    })

    expect(preset).toBeNull()
  })
})
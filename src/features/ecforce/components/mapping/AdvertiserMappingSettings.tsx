import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import {
  LinkIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

export const AdvertiserMappingSettings: React.FC = () => {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newMapping, setNewMapping] = useState({
    metaAccountId: '',
    ecforceAdvertiser: '',
  })

  // データ取得
  const advertisersWithMapping = useQuery(api.advertiserMappings.getAdvertisersWithMapping)
  const availableMetaAccounts = useQuery(api.advertiserMappings.getAvailableMetaAccounts)

  // デバッグログ
  React.useEffect(() => {
    console.log('AdvertiserMappingSettings - advertisersWithMapping:', advertisersWithMapping)
    console.log('AdvertiserMappingSettings - availableMetaAccounts:', availableMetaAccounts)
  }, [advertisersWithMapping, availableMetaAccounts])

  // Mutations
  const upsertMapping = useMutation(api.advertiserMappings.upsertMapping)
  const deleteMapping = useMutation(api.advertiserMappings.deleteMapping)
  const toggleMapping = useMutation(api.advertiserMappings.toggleMapping)

  // 新規マッピングを保存
  const handleSaveNewMapping = async () => {
    if (!newMapping.metaAccountId || !newMapping.ecforceAdvertiser) {
      alert('両方のフィールドを入力してください')
      return
    }

    try {
      await upsertMapping({
        metaAccountId: newMapping.metaAccountId,
        ecforceAdvertiser: newMapping.ecforceAdvertiser,
        isActive: true,
      })
      setNewMapping({ metaAccountId: '', ecforceAdvertiser: '' })
      setIsAddingNew(false)
    } catch (error) {
      console.error('マッピング保存エラー:', error)
      alert('マッピングの保存に失敗しました')
    }
  }

  // マッピングを削除
  const handleDelete = async (id: any) => {
    if (confirm('このマッピングを削除してもよろしいですか？')) {
      try {
        await deleteMapping({ id })
      } catch (error) {
        console.error('削除エラー:', error)
        alert('削除に失敗しました')
      }
    }
  }

  // 有効/無効を切り替え
  const handleToggle = async (id: any) => {
    try {
      await toggleMapping({ id })
    } catch (error) {
      console.error('切り替えエラー:', error)
      alert('切り替えに失敗しました')
    }
  }

  // エラーハンドリング強化
  if (advertisersWithMapping === undefined || availableMetaAccounts === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">データを読み込み中...</div>
      </div>
    )
  }

  // データが空の場合の詳細表示
  if (availableMetaAccounts !== null && availableMetaAccounts.length === 0) {
    console.warn('利用可能なMetaアカウントが0件です')
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">広告主マッピング設定</h2>
            <p className="mt-1 text-sm text-gray-600">
              Meta広告アカウントとECForce広告主の対応関係を設定します
            </p>
          </div>
          {!isAddingNew && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              新規マッピング
            </button>
          )}
        </div>

        {/* 新規マッピング追加フォーム */}
        {isAddingNew && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-3">新規マッピングを追加</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta広告アカウント
                </label>
                <select
                  value={newMapping.metaAccountId}
                  onChange={(e) => setNewMapping({ ...newMapping, metaAccountId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {availableMetaAccounts && availableMetaAccounts.length > 0 ? (
                    availableMetaAccounts.map((account) => (
                      <option
                        key={account.accountId}
                        value={account.accountId}
                        disabled={account.isMapped}
                      >
                        {account.accountId} - {account.accountName}
                        {account.isMapped && ' (マッピング済み)'}
                        {!account.isAccountActive && ' (無効)'}
                      </option>
                    ))
                  ) : availableMetaAccounts === null ? (
                    <option value="" disabled>
                      データ読み込み中...
                    </option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Metaアカウントが登録されていません
                      </option>
                      <option value="" disabled>
                        ※ Meta API設定からアカウントを追加してください
                      </option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ECForce広告主名
                </label>
                <input
                  type="text"
                  value={newMapping.ecforceAdvertiser}
                  onChange={(e) =>
                    setNewMapping({ ...newMapping, ecforceAdvertiser: e.target.value })
                  }
                  placeholder="例: インハウス"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleSaveNewMapping}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsAddingNew(false)
                    setNewMapping({ metaAccountId: '', ecforceAdvertiser: '' })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 統計情報 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{advertisersWithMapping.length}</div>
            <div className="text-sm text-gray-600">ECForce広告主数</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {advertisersWithMapping.filter((a) => a.isActive).length}
            </div>
            <div className="text-sm text-gray-600">マッピング済み</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {advertisersWithMapping.filter((a) => !a.isActive).length}
            </div>
            <div className="text-sm text-gray-600">未マッピング</div>
          </div>
        </div>

        {/* マッピング一覧テーブル */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ECForce広告主
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meta広告アカウント
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {advertisersWithMapping.map((item) => (
                <tr key={item.advertiser} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.isActive ? (
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-700">マッピング済み</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircleIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-500">未設定</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.advertiser}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.metaAccountId ? (
                      <div className="text-sm text-gray-900 font-mono">{item.metaAccountId}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {item.mappingId ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(item.mappingId)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {item.isActive ? '無効化' : '有効化'}
                        </button>
                        <button
                          onClick={() => handleDelete(item.mappingId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setNewMapping({
                            metaAccountId: '',
                            ecforceAdvertiser: item.advertiser,
                          })
                          setIsAddingNew(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 ml-auto"
                      >
                        <LinkIcon className="h-4 w-4" />
                        マッピング設定
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import {
  useGetMonthlyTarget,
  useListMonthlyTargets,
  useUpsertMonthlyTarget,
  getCurrentYearMonth,
  formatYearMonth,
  getPastMonths,
  formatNumber,
  parseNumber,
} from '../hooks/useMonthlyTargets'

export function MonthlyTargets() {
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth())
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  // フォーム入力値
  const [budget, setBudget] = useState('')
  const [cvTarget, setCvTarget] = useState('')
  const [cpoTarget, setCpoTarget] = useState('')

  // データ取得
  const currentTarget = useGetMonthlyTarget(selectedMonth)
  const pastMonths = getPastMonths(3)
  const pastTargets = useListMonthlyTargets(pastMonths[pastMonths.length - 1], pastMonths[0])
  const upsertTarget = useUpsertMonthlyTarget()

  // 選択月の変更時にフォームを更新
  useEffect(() => {
    if (currentTarget) {
      setBudget(formatNumber(currentTarget.budget))
      setCvTarget(formatNumber(currentTarget.cvTarget))
      setCpoTarget(formatNumber(currentTarget.cpoTarget))
      setIsEditing(false)
    } else {
      setBudget('')
      setCvTarget('')
      setCpoTarget('')
      setIsEditing(true)
    }
  }, [currentTarget, selectedMonth])

  // 保存処理
  const handleSave = async () => {
    if (!budget || !cvTarget || !cpoTarget) {
      setMessage('すべての項目を入力してください')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsSaving(true)
    try {
      await upsertTarget({
        yearMonth: selectedMonth,
        budget: parseNumber(budget),
        cvTarget: parseNumber(cvTarget),
        cpoTarget: parseNumber(cpoTarget),
      })
      setMessage('保存しました')
      setIsEditing(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('保存エラー:', error)
      setMessage('保存に失敗しました')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // キャンセル処理
  const handleCancel = () => {
    if (currentTarget) {
      setBudget(formatNumber(currentTarget.budget))
      setCvTarget(formatNumber(currentTarget.cvTarget))
      setCpoTarget(formatNumber(currentTarget.cpoTarget))
      setIsEditing(false)
    } else {
      setBudget('')
      setCvTarget('')
      setCpoTarget('')
    }
  }

  // 月選択用のオプションを生成（過去6ヶ月＋未来3ヶ月）
  const monthOptions = () => {
    const options: YearMonth[] = []
    const now = new Date()

    for (let i = -3; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      options.push(`${year}-${month}`)
    }

    return options.sort()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/settings')}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">月次目標設定</h1>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側：入力フォーム */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* 月選択 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  対象月
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {monthOptions().map((month) => (
                    <option key={month} value={month}>
                      {formatYearMonth(month)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 入力フィールド */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    広告予算
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      ¥
                    </span>
                    <input
                      type="text"
                      value={budget}
                      onChange={(e) => {
                        const formatted = formatNumber(parseNumber(e.target.value))
                        setBudget(formatted)
                      }}
                      disabled={!isEditing}
                      placeholder="10,000,000"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CV目標
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cvTarget}
                      onChange={(e) => {
                        const formatted = formatNumber(parseNumber(e.target.value))
                        setCvTarget(formatted)
                      }}
                      disabled={!isEditing}
                      placeholder="1,000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      件
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPO目標
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      ¥
                    </span>
                    <input
                      type="text"
                      value={cpoTarget}
                      onChange={(e) => {
                        const formatted = formatNumber(parseNumber(e.target.value))
                        setCpoTarget(formatted)
                      }}
                      disabled={!isEditing}
                      placeholder="10,000"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* ボタン */}
              <div className="mt-8 flex items-center justify-between">
                <div className="flex gap-3">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      編集
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        キャンセル
                      </button>
                    </>
                  )}
                </div>

                {/* メッセージ表示 */}
                {message && (
                  <div
                    className={`px-4 py-2 rounded-lg text-sm ${
                      message.includes('失敗')
                        ? 'bg-red-100 text-red-700'
                        : message.includes('入力')
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右側：過去の設定値 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">過去3ヶ月の設定</h2>
              <div className="space-y-4">
                {pastTargets.length > 0 ? (
                  pastTargets
                    .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
                    .slice(0, 3)
                    .map((target) => (
                      <div
                        key={target.yearMonth}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedMonth(target.yearMonth)}
                      >
                        <div className="font-medium text-gray-900 mb-2">
                          {formatYearMonth(target.yearMonth)}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>予算:</span>
                            <span>¥{formatNumber(target.budget)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CV目標:</span>
                            <span>{formatNumber(target.cvTarget)}件</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CPO目標:</span>
                            <span>¥{formatNumber(target.cpoTarget)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-gray-500 text-sm">
                    過去の設定はありません
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
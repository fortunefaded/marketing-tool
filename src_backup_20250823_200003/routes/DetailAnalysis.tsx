import { useState } from 'react'
import { CalendarIcon, DocumentArrowDownIcon, FunnelIcon } from '@heroicons/react/24/outline'
import DataTable, { Column } from '../components/DataTable'
import { useVibeLogger } from '../hooks/useVibeLogger'
import { logger as standaloneLogger } from '../utils/logger'

export default function DetailAnalysis() {
  const logger = useVibeLogger('DetailAnalysis')
  const [selectedPeriod] = useState('2024/06/19 〜 2025/06/14')

  const columns: Column[] = [
    { key: 'category', label: 'カテゴリ名', sortable: true, width: 'w-24' },
    { key: 'campaignGroup', label: 'キャンペーン/広告グループ', sortable: true, width: 'w-48' },
    { key: 'adType', label: '広告タイプ/イベント', sortable: true, width: 'w-32' },
    { key: 'keyword', label: 'キーワード/プレースメント', sortable: true, width: 'w-48' },
    { key: 'totalClicks', label: 'クリック数（延べ数）', sortable: true, align: 'right' },
    { key: 'uniqueClicks', label: 'クリック数（ユニーク数）', sortable: true, align: 'right' },
    { key: 'cv', label: 'CV（会員登録）', sortable: true, align: 'right' },
    { key: 'cvRate', label: 'CV率（%）', sortable: true, align: 'right' },
    { key: 'ctr', label: 'CTR（%）', sortable: true, align: 'right' },
    { key: 'initialContact', label: '初回接触', sortable: true, align: 'right' },
    { key: 'cost', label: '広告コスト', sortable: true, align: 'right' },
    { key: 'cpa', label: 'CPA', sortable: true, align: 'right' },
    { key: 'roas', label: 'ROAS', sortable: true, align: 'right' },
  ]

  const mockData = [
    {
      category: '広告なし',
      campaignGroup: '直接参照',
      adType: 'なし',
      keyword: 'アフィリエイト登録ページ',
      totalClicks: '263,821',
      uniqueClicks: '93,906',
      cv: '2,639',
      cvRate: '2.81%',
      ctr: '-',
      initialContact: '±0%',
      cost: '-',
      cpa: '-',
      roas: '-',
    },
    {
      category: '広告リンク',
      campaignGroup: 'GoogleAds',
      adType: '検索',
      keyword: 'ブランドキーワード',
      totalClicks: '214,558,905',
      uniqueClicks: '262,871',
      cv: '263,821',
      cvRate: '0.97%',
      ctr: '4,327',
      initialContact: '±0%',
      cost: '¥1,683,811',
      cpa: '¥5,525',
      roas: '39',
    },
    {
      category: '広告リンク',
      campaignGroup: 'GoogleAds',
      adType: '検索',
      keyword: '副業 スマホ',
      totalClicks: '1,052,882',
      uniqueClicks: '106,427',
      cv: '1,062',
      cvRate: '1.00%',
      ctr: '1,077',
      initialContact: '±1%',
      cost: '¥1,683,811',
      cpa: '¥1,586',
      roas: '206',
    },
    {
      category: '広告リンク',
      campaignGroup: 'LINE広告',
      adType: 'オープンキャンペーン',
      keyword: '2014年度_東京',
      totalClicks: '345,275',
      uniqueClicks: '71,109',
      cv: '3,452',
      cvRate: '1.00%',
      ctr: '711',
      initialContact: '±1.5%',
      cost: '¥1,562,019',
      cpa: '¥2,519',
      roas: '114',
    },
    {
      category: '自然流入',
      campaignGroup: 'Google',
      adType: '-',
      keyword: '-',
      totalClicks: '-',
      uniqueClicks: '90,719',
      cv: '3,356',
      cvRate: '3.70%',
      ctr: '859',
      initialContact: '-',
      cost: '-',
      cpa: '-',
      roas: '-',
    },
    {
      category: '広告リンク',
      campaignGroup: 'GoogleAds',
      adType: '検索',
      keyword: '(not provided)',
      totalClicks: '161,522',
      uniqueClicks: '36,117',
      cv: '1,615',
      cvRate: '4.47%',
      ctr: '366',
      initialContact: '±0.4%',
      cost: '¥852,100',
      cpa: '¥528',
      roas: '117',
    },
    {
      category: '広告リンク',
      campaignGroup: 'Yahoo!ディスプレイ',
      adType: 'オープンキャンペーン',
      keyword: 'RMテンプレート',
      totalClicks: '74,208',
      uniqueClicks: '41,112',
      cv: '742',
      cvRate: '1.80%',
      ctr: '227',
      initialContact: '±2%',
      cost: '¥420,265',
      cpa: '¥566',
      roas: '110',
    },
    // 緑色のハイライト行
    {
      category: '不明',
      campaignGroup: '一般',
      adType: 'Google: 検索 アフィリエイト',
      keyword: '【年収1000万円突破】在宅ワークで月収50万円を稼ぐ方法',
      totalClicks: '71,103',
      uniqueClicks: '12,134',
      cv: '711',
      cvRate: '5.86%',
      ctr: '123',
      initialContact: '±10%',
      cost: '¥753,889',
      cpa: '¥1,060',
      roas: '113',
      _highlight: 'green',
    },
    {
      category: '不明',
      campaignGroup: '一般',
      adType: 'Google: 検索 アフィリエイト',
      keyword: '【2024年最新】主婦でもできる在宅ワーク',
      totalClicks: '56,956',
      uniqueClicks: '12,956',
      cv: '570',
      cvRate: '4.40%',
      ctr: '130',
      initialContact: '±0.2%',
      cost: '¥594,682',
      cpa: '¥1,043',
      roas: '77',
      _highlight: 'green',
    },
    {
      category: '広告リンク',
      campaignGroup: 'アフィリエイト',
      adType: '(未実施)',
      keyword: '(未実施)',
      totalClicks: '35,711',
      uniqueClicks: '5,711',
      cv: '357',
      cvRate: '6.25%',
      ctr: '69',
      initialContact: '-',
      cost: '-',
      cpa: '-',
      roas: '-',
    },
  ]

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    logger.action('テーブルソート', { key, direction })
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">
              キーワード、商品グループを細かく見ると効果を把握できる
            </h1>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-sm">{selectedPeriod}</span>
              </button>
              <button className="p-2 bg-[#f6d856] text-gray-800 rounded hover:bg-[#e5c945]">
                <FunnelIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">ドリルアップ↑</span>
              <nav className="flex items-center space-x-2 text-sm">
                <span className="text-gray-500">広告分析 / </span>
                <span className="text-gray-500">インバウンドキャリア / </span>
                <span className="text-gray-500">広告タイプ / </span>
                <span className="font-medium text-gray-900">詳細</span>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">計138件（1～100件）</span>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm bg-gray-200 rounded" disabled>
                  前
                </button>
                <span className="text-sm font-medium">1</span>
                <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">
                  2
                </button>
                <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">
                  次
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm">
          <DataTable
            columns={columns}
            data={mockData}
            onSort={handleSort}
            className="detail-analysis-table"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span>合計CV数: </span>
            <span className="font-medium">338,558</span>
          </div>

          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 px-4 py-2 bg-[#f6d856] text-gray-800 rounded hover:bg-[#e5c945]">
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span className="text-sm">CSVをエクスポート</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * CSVエクスポート用ユーティリティ
 */

import { FatigueData } from '@/types'

/**
 * データをCSV形式に変換
 */
export function convertToCSV(data: FatigueData[]): string {
  if (!data || data.length === 0) {
    return ''
  }

  // ヘッダー行の定義
  const headers = [
    'クリエイティブ名',
    '疲労度スコア',
    'タイプ',
    'Frequency',
    'CTR (%)',
    'U-CTR (%)',
    'CPM (¥)',
    'CPC (¥)',
    'インプレッション',
    'クリック',
    '消化金額 (¥)',
    'CV',
    'F-CV',
    'CPA (¥)',
    'CVR (%)',
    'ROAS',
    'ステータス',
    'キャンペーン名',
    '広告セット名',
    '作成日',
    '最終更新日',
  ]

  // データ行の作成
  const rows = data.map((item) => {
    return [
      item.adName || '',
      item.score?.toFixed(1) || '0',
      '', // typeフィールドは存在しないため空文字
      item.metrics?.frequency?.toFixed(2) || '0',
      item.metrics?.ctr?.toFixed(2) || '0',
      item.metrics?.unique_ctr?.toFixed(2) || '0',
      item.metrics?.cpm?.toFixed(0) || '0',
      item.metrics?.cpc?.toFixed(0) || '0',
      item.metrics?.impressions || '0',
      item.metrics?.clicks || '0',
      item.metrics?.spend?.toFixed(0) || '0',
      item.metrics?.conversions || '0',
      '', // fcvフィールドは存在しないため空文字
      '', // cpaフィールドは存在しないため空文字
      '', // cvrフィールドは存在しないため空文字
      '', // roasフィールドは存在しないため空文字
      item.status || '',
      item.campaign_name || '',
      item.adset_name || '',
      '', // createdTimeフィールドは存在しないため空文字
      '', // updatedTimeフィールドは存在しないため空文字
    ]
  })

  // CSV文字列の生成
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // セル内にカンマ、改行、ダブルクォートが含まれる場合は囲む
          const cellStr = String(cell)
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })
        .join(',')
    ),
  ].join('\n')

  // BOMを付加（Excelで文字化けを防ぐ）
  return '\uFEFF' + csvContent
}

/**
 * CSVファイルをダウンロード
 */
export function downloadCSV(data: FatigueData[], filename?: string): void {
  const csv = convertToCSV(data)

  if (!csv) {
    console.error('CSVデータが空です')
    return
  }

  // 現在の日時を含むファイル名を生成
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const defaultFilename = `fatigue_data_${dateStr}_${timeStr}.csv`

  // Blobを作成
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })

  // ダウンロードリンクを作成
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename || defaultFilename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // メモリを解放
  URL.revokeObjectURL(url)
}

/**
 * 集計データ用のCSV変換
 */
export function convertAggregatedToCSV(data: any[], level: 'campaign' | 'adset'): string {
  if (!data || data.length === 0) {
    return ''
  }

  // レベルに応じたヘッダー
  const headers = [
    level === 'campaign' ? 'キャンペーン名' : '広告セット名',
    '疲労度スコア',
    '広告数',
    '消化金額 (¥)',
    'インプレッション',
    'クリック',
    'CV',
    'F-CV',
    'CPA (¥)',
    'CTR (%)',
    'CPC (¥)',
    'CVR (%)',
    'CPM (¥)',
    'Frequency',
  ]

  // データ行の作成
  const rows = data.map((item) => {
    return [
      item.name || '',
      item.fatigueScore?.toFixed(1) || '0',
      item.adCount || '0',
      item.metrics?.spend?.toFixed(0) || '0',
      item.metrics?.impressions || '0',
      item.metrics?.clicks || '0',
      item.metrics?.conversions || '0',
      item.fcv || '0',
      item.metrics?.cpa?.toFixed(0) || '0',
      item.metrics?.ctr?.toFixed(2) || '0',
      item.metrics?.cpc?.toFixed(0) || '0',
      item.metrics?.cvr?.toFixed(2) || '0',
      item.metrics?.cpm?.toFixed(0) || '0',
      item.metrics?.frequency?.toFixed(2) || '0',
    ]
  })

  // CSV文字列の生成
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell)
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })
        .join(',')
    ),
  ].join('\n')

  // BOMを付加
  return '\uFEFF' + csvContent
}

/**
 * 集計データをダウンロード
 */
export function downloadAggregatedCSV(
  data: any[],
  level: 'campaign' | 'adset',
  filename?: string
): void {
  const csv = convertAggregatedToCSV(data, level)

  if (!csv) {
    console.error('CSVデータが空です')
    return
  }

  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const defaultFilename = `fatigue_${level}_${dateStr}_${timeStr}.csv`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename || defaultFilename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * EC Force注文データの型定義
 */

export interface ECForceOrder {
  受注ID: string
  受注番号: string
  顧客番号: string
  購入URL: string
  購入オファー: string
  定期受注番号: string
  メールアドレス: string
  小計: number
  支払い合計: number
  受注日: string
  購入商品: string[] // 商品コードの配列
  広告URLグループ名: string
  広告主名: string
  顧客購入回数: number
  定期ステータス: '有効' | '無効' | string
  定期回数: number | string
  ランディングページ?: string
  消費税?: number
  送料?: number
  合計?: number
  決済方法?: string
  定期間隔?: string
  配送先郵便番号?: string
  配送先都道府県?: string
  配送先市区町村?: string
  配送先住所?: string
  配送先氏名?: string
}

export interface ECForceImportResult {
  success: boolean
  totalRecords: number
  importedRecords: number
  errors: string[]
  data: ECForceOrder[]
}

export interface ECForceImportProgress {
  status: 'idle' | 'uploading' | 'parsing' | 'importing' | 'complete' | 'error'
  progress: number
  message: string
}
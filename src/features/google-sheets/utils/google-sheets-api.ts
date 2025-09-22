/**
 * Google Sheets APIクライアント
 */

import { GoogleSheetConfig, SheetData } from '../types'

export class GoogleSheetsApiClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * スプレッドシートIDをURLから抽出
   */
  static extractSheetId(url: string): string | null {
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /[?&]id=([a-zA-Z0-9-_]+)/,
      /^([a-zA-Z0-9-_]+)$/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  /**
   * スプレッドシートのメタデータを取得
   */
  async getSpreadsheetMetadata(spreadsheetId: string) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'スプレッドシートの情報取得に失敗しました')
    }

    return response.json()
  }

  /**
   * シート一覧を取得
   */
  async getSheetsList(spreadsheetId: string): Promise<string[]> {
    const metadata = await this.getSpreadsheetMetadata(spreadsheetId)
    return metadata.sheets.map((sheet: any) => sheet.properties.title)
  }

  /**
   * 指定範囲のデータを取得
   */
  async getSheetData(
    spreadsheetId: string,
    range: string,
    options?: {
      majorDimension?: 'ROWS' | 'COLUMNS'
      valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA'
    }
  ): Promise<SheetData> {
    const params = new URLSearchParams({
      majorDimension: options?.majorDimension || 'ROWS',
      valueRenderOption: options?.valueRenderOption || 'FORMATTED_VALUE',
    })

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?${params}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'データの取得に失敗しました')
    }

    return response.json()
  }

  /**
   * 複数範囲のデータを一括取得
   */
  async getBatchData(
    spreadsheetId: string,
    ranges: string[],
    options?: {
      majorDimension?: 'ROWS' | 'COLUMNS'
      valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA'
    }
  ): Promise<SheetData[]> {
    const params = new URLSearchParams({
      majorDimension: options?.majorDimension || 'ROWS',
      valueRenderOption: options?.valueRenderOption || 'FORMATTED_VALUE',
    })

    // rangesパラメータを追加
    ranges.forEach(range => {
      params.append('ranges', range)
    })

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'データの一括取得に失敗しました')
    }

    const data = await response.json()
    return data.valueRanges
  }

  /**
   * 設定に基づいてデータを取得
   */
  async fetchDataByConfig(config: GoogleSheetConfig): Promise<any[][]> {
    const range = config.dataRange || `${config.sheetName}!A${config.headerRow}:Z`

    try {
      const data = await this.getSheetData(config.sheetId, range)
      return data.values || []
    } catch (error) {
      console.error(`データ取得エラー (${config.sheetName}):`, error)
      throw error
    }
  }

  /**
   * ヘッダー行を取得
   */
  async getHeaders(
    spreadsheetId: string,
    sheetName: string,
    headerRow: number = 1
  ): Promise<string[]> {
    const range = `${sheetName}!${headerRow}:${headerRow}`
    const data = await this.getSheetData(spreadsheetId, range)
    return data.values?.[0] || []
  }

  /**
   * データ範囲を自動検出
   */
  async detectDataRange(
    spreadsheetId: string,
    sheetName: string,
    startRow: number = 1,
    maxRows: number = 1000
  ): Promise<{
    dataRange: string
    headerRow: number
    dataStartRow: number
    totalRows: number
    totalColumns: number
  }> {
    // 最初の数行を取得してヘッダーを検出
    const sampleRange = `${sheetName}!A1:Z${Math.min(startRow + 10, maxRows)}`
    const sampleData = await this.getSheetData(spreadsheetId, sampleRange)

    if (!sampleData.values || sampleData.values.length === 0) {
      throw new Error('データが見つかりません')
    }

    // ヘッダー行を検出（最初の完全な行）
    let headerRow = -1
    for (let i = 0; i < sampleData.values.length; i++) {
      const row = sampleData.values[i]
      if (row && row.length > 0 && row.filter(cell => cell).length >= 3) {
        headerRow = i + 1
        break
      }
    }

    if (headerRow === -1) {
      throw new Error('ヘッダー行が見つかりません')
    }

    // データ開始行を検出
    const dataStartRow = headerRow + 1

    // 実際のデータ範囲を取得
    const fullRange = `${sheetName}!A${headerRow}:Z${maxRows}`
    const fullData = await this.getSheetData(spreadsheetId, fullRange)

    const totalRows = fullData.values?.length || 0
    const totalColumns = Math.max(...(fullData.values?.map(row => row.length) || [0]))

    // 最終列のアルファベットを計算
    const lastColumn = String.fromCharCode(65 + totalColumns - 1)
    const dataRange = `${sheetName}!A${headerRow}:${lastColumn}${headerRow + totalRows - 1}`

    return {
      dataRange,
      headerRow,
      dataStartRow,
      totalRows,
      totalColumns,
    }
  }

  /**
   * アクセストークンの有効性を確認
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      return response.ok
    } catch {
      return false
    }
  }

  /**
   * リフレッシュトークンを使用してアクセストークンを更新
   */
  static async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{
    accessToken: string
    expiresIn: number
    tokenType: string
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error_description || 'トークンの更新に失敗しました')
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    }
  }
}

/**
 * データ型変換ユーティリティ
 */
export class DataTypeConverter {
  /**
   * 文字列を数値に変換
   */
  static toNumber(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      // カンマ、通貨記号、パーセント記号を除去
      const cleaned = value.replace(/[,¥$%]/g, '').trim()
      const num = parseFloat(cleaned)
      return isNaN(num) ? 0 : num
    }
    return 0
  }

  /**
   * 日付文字列を統一フォーマット(YYYY-MM-DD)に変換
   */
  static toDateString(value: any): string {
    if (!value) return ''

    // すでに正しい形式の場合
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value
    }

    // スラッシュ区切りの場合
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) {
      return value.replace(/\//g, '-')
    }

    // MM/DD/YYYY形式の場合
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [month, day, year] = value.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // DD/MM/YYYY形式の場合（ヨーロッパ形式）
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // YYYYMMDD形式の場合
    if (/^\d{8}$/.test(value)) {
      return `${value.substr(0, 4)}-${value.substr(4, 2)}-${value.substr(6, 2)}`
    }

    // Dateオブジェクトとして解析を試みる
    try {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    } catch {}

    return ''
  }

  /**
   * パーセンテージを小数に変換
   */
  static percentageToDecimal(value: any): number {
    const num = this.toNumber(value)
    // すでに小数の場合（0.1 = 10%）
    if (num >= 0 && num <= 1) return num
    // パーセンテージの場合（10 = 10%）
    return num / 100
  }
}
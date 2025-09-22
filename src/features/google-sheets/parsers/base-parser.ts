/**
 * パーサーの基底クラス
 */

import { GoogleSheetConfig, SheetParser, UnifiedAdPerformance, SheetFormatType } from '../types'
import { DataTypeConverter } from '../utils/google-sheets-api'

export abstract class BaseParser implements SheetParser {
  abstract formatType: SheetFormatType

  /**
   * データをパース
   */
  abstract parse(data: any[][], config: GoogleSheetConfig): UnifiedAdPerformance[]

  /**
   * ヘッダーを検証
   */
  abstract validateHeaders(headers: any[]): boolean

  /**
   * フォーマットを検出
   */
  abstract detectFormat(data: any[][]): boolean

  /**
   * ヘッダー行を取得
   */
  protected getHeaders(data: any[][], headerRowIndex: number): string[] {
    if (!data || data.length <= headerRowIndex) {
      return []
    }
    return data[headerRowIndex].map(h => String(h || '').trim())
  }

  /**
   * データ行を取得
   */
  protected getDataRows(data: any[][], dataStartRowIndex: number): any[][] {
    if (!data || data.length <= dataStartRowIndex) {
      return []
    }
    return data.slice(dataStartRowIndex)
  }

  /**
   * カラムインデックスを取得
   */
  protected getColumnIndex(
    headers: string[],
    columnName: string | string[]
  ): number {
    const names = Array.isArray(columnName) ? columnName : [columnName]
    for (const name of names) {
      const index = headers.findIndex(h =>
        h.toLowerCase().includes(name.toLowerCase())
      )
      if (index !== -1) return index
    }
    return -1
  }

  /**
   * セルの値を取得
   */
  protected getCellValue(row: any[], index: number, defaultValue: any = ''): any {
    if (index < 0 || index >= row.length) {
      return defaultValue
    }
    return row[index] || defaultValue
  }

  /**
   * 数値を取得
   */
  protected getNumberValue(row: any[], index: number, defaultValue: number = 0): number {
    const value = this.getCellValue(row, index, defaultValue)
    return DataTypeConverter.toNumber(value)
  }

  /**
   * 文字列を取得
   */
  protected getStringValue(row: any[], index: number, defaultValue: string = ''): string {
    const value = this.getCellValue(row, index, defaultValue)
    return String(value).trim()
  }

  /**
   * 日付を取得
   */
  protected getDateValue(row: any[], index: number): string {
    const value = this.getCellValue(row, index, '')
    return DataTypeConverter.toDateString(value)
  }

  /**
   * 計算フィールドを追加
   */
  protected calculateMetrics(data: Partial<UnifiedAdPerformance>): Partial<UnifiedAdPerformance> {
    const impressions = data.impressions || 0
    const clicks = data.clicks || 0
    const cost = data.cost || 0
    const conversions = data.conversions || 0

    return {
      ...data,
      ctr: impressions > 0 ? clicks / impressions : 0,
      cvr: clicks > 0 ? conversions / clicks : 0,
      cpc: clicks > 0 ? cost / clicks : 0,
      cpa: conversions > 0 ? cost / conversions : 0,
    }
  }

  /**
   * 行データを統合フォーマットに変換
   */
  protected transformRow(
    row: any[],
    headers: string[],
    config: GoogleSheetConfig
  ): UnifiedAdPerformance | null {
    // サブクラスで実装
    throw new Error('transformRow must be implemented by subclass')
  }

  /**
   * 空行かどうかをチェック
   */
  protected isEmptyRow(row: any[]): boolean {
    return !row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')
  }

  /**
   * データ検証
   */
  protected validateData(data: Partial<UnifiedAdPerformance>): boolean {
    // 必須フィールドのチェック
    if (!data.date || !data.agencyName) {
      return false
    }

    // 日付形式のチェック
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      return false
    }

    // 数値の妥当性チェック
    if (
      (data.impressions !== undefined && data.impressions < 0) ||
      (data.clicks !== undefined && data.clicks < 0) ||
      (data.cost !== undefined && data.cost < 0) ||
      (data.conversions !== undefined && data.conversions < 0)
    ) {
      return false
    }

    return true
  }

  /**
   * エラーログ
   */
  protected logError(message: string, row?: any[], rowIndex?: number): void {
    console.error(`[${this.formatType}] ${message}`, {
      row,
      rowIndex,
    })
  }
}
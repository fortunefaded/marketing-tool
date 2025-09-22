/**
 * mogumo Prisma運用形式のパーサー
 */

import { BaseParser } from './base-parser'
import { GoogleSheetConfig, UnifiedAdPerformance, SheetFormatType } from '../types'
import { FORMAT_HINTS } from '../types/agency-formats'

export class MogumoPrismaParser extends BaseParser {
  formatType: SheetFormatType = 'mogumo-prisma'

  /**
   * データをパース
   */
  parse(data: any[][], config: GoogleSheetConfig): UnifiedAdPerformance[] {
    const results: UnifiedAdPerformance[] = []

    // ヘッダーを取得
    const headers = this.getHeaders(data, config.headerRow - 1)
    if (!this.validateHeaders(headers)) {
      throw new Error('無効なヘッダー形式です')
    }

    // データ行を取得
    const dataRows = this.getDataRows(data, config.dataStartRow - 1)

    // カラムインデックスを取得
    const columnIndices = this.getColumnIndices(headers, config.columnMappings)

    // 各行を処理
    dataRows.forEach((row, index) => {
      if (this.isEmptyRow(row)) {
        return
      }

      try {
        const transformed = this.transformMogumoRow(row, columnIndices, config)
        if (transformed && this.validateData(transformed)) {
          results.push(transformed)
        }
      } catch (error) {
        this.logError(
          `行のパースエラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
          row,
          index + config.dataStartRow
        )
      }
    })

    return results
  }

  /**
   * ヘッダーを検証
   */
  validateHeaders(headers: any[]): boolean {
    if (!headers || headers.length === 0) {
      return false
    }

    // mogumo形式の特徴的なヘッダーをチェック
    const requiredHeaders = ['日付', '媒体名', '広告費']
    const headerStrings = headers.map(h => String(h).toLowerCase())

    return requiredHeaders.every(required =>
      headerStrings.some(header => header.includes(required.toLowerCase()))
    )
  }

  /**
   * フォーマットを検出
   */
  detectFormat(data: any[][]): boolean {
    if (!data || data.length === 0) {
      return false
    }

    // 最初の非空行を探す
    const headerRow = data.find(row => row && row.length > 0 && row.filter(cell => cell).length >= 3)
    if (!headerRow) {
      return false
    }

    const headerStrings = headerRow.map(h => String(h).toLowerCase())
    const hints = FORMAT_HINTS['mogumo-prisma']

    // ヒントの半分以上が含まれていればmogumo形式と判定
    const matchCount = hints.filter(hint =>
      headerStrings.some(header => header.includes(hint.toLowerCase()))
    ).length

    return matchCount >= hints.length / 2
  }

  /**
   * カラムインデックスを取得
   */
  private getColumnIndices(headers: string[], columnMappings?: any): any {
    const indices: any = {}

    // デフォルトのマッピング
    const defaultMappings = {
      date: ['日付', 'date'],
      campaignName: ['キャンペーン名', 'campaign'],
      adsetName: ['広告セット名', 'adset', '広告セット'],
      adName: ['広告名', 'ad name', '広告'],
      mediaName: ['媒体名', 'media', '媒体'],
      impressions: ['インプレッション数', 'impressions', '表示回数', 'imp'],
      clicks: ['クリック数', 'clicks', 'クリック'],
      cost: ['広告費', 'cost', '費用', '消化金額'],
      orderCount: ['注文数', 'orders', '購入数'],
      orderAmount: ['注文金額', 'order amount', '売上'],
      newCustomerCount: ['新規顧客数', 'new customers', '新規'],
      repeatCustomerCount: ['リピート顧客数', 'repeat customers', 'リピート'],
    }

    // カスタムマッピングがある場合は優先
    if (columnMappings) {
      Object.keys(columnMappings).forEach(key => {
        const mapping = columnMappings[key]
        if (typeof mapping === 'number') {
          indices[key] = mapping
        } else if (typeof mapping === 'string') {
          indices[key] = this.getColumnIndex(headers, mapping)
        }
      })
    }

    // デフォルトマッピングで補完
    Object.keys(defaultMappings).forEach(key => {
      if (indices[key] === undefined) {
        indices[key] = this.getColumnIndex(headers, defaultMappings[key as keyof typeof defaultMappings])
      }
    })

    return indices
  }

  /**
   * mogumo形式の行を変換
   */
  private transformMogumoRow(
    row: any[],
    columnIndices: any,
    config: GoogleSheetConfig
  ): UnifiedAdPerformance {
    const date = this.getDateValue(row, columnIndices.date)
    const campaignName = this.getStringValue(row, columnIndices.campaignName)
    const adsetName = this.getStringValue(row, columnIndices.adsetName)
    const adName = this.getStringValue(row, columnIndices.adName)
    const mediaName = this.getStringValue(row, columnIndices.mediaName)
    const impressions = this.getNumberValue(row, columnIndices.impressions)
    const clicks = this.getNumberValue(row, columnIndices.clicks)
    const cost = this.getNumberValue(row, columnIndices.cost)
    const orderCount = this.getNumberValue(row, columnIndices.orderCount)
    const orderAmount = this.getNumberValue(row, columnIndices.orderAmount)
    const newCustomerCount = this.getNumberValue(row, columnIndices.newCustomerCount)
    const repeatCustomerCount = this.getNumberValue(row, columnIndices.repeatCustomerCount)

    // コンバージョンはorderCountを使用
    const conversions = orderCount
    const conversionValue = orderAmount

    // 基本データ
    const baseData: Partial<UnifiedAdPerformance> = {
      sourceType: 'google-sheets',
      sourceId: config.sheetId,
      agencyName: config.agencyName,
      date,
      campaignName: campaignName || undefined,
      adsetName: adsetName || undefined,
      adName: adName || undefined,
      impressions,
      clicks,
      cost,
      conversions,
      conversionValue,
      rawData: {
        mediaName,
        orderCount,
        orderAmount,
        newCustomerCount,
        repeatCustomerCount,
      },
    }

    // 計算フィールドを追加
    const withMetrics = this.calculateMetrics(baseData)

    // タイムスタンプを追加
    return {
      ...withMetrics,
      importedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as UnifiedAdPerformance
  }
}
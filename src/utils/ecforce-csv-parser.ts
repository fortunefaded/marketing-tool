import { ECForceOrder } from '@/types'
import { logger } from './logger'

/**
 * EC Force CSVパーサー
 */
export class ECForceCSVParser {
  /**
   * CSVテキストをパースしてEC Force注文データに変換
   */
  static parse(csvText: string): ECForceOrder[] {
    // BOMを除去
    if (csvText.charCodeAt(0) === 0xfeff) {
      csvText = csvText.substring(1)
    }

    const lines = csvText.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      throw new Error('CSVファイルにデータが含まれていません')
    }

    // ヘッダー行を取得
    const headers = this.parseCSVLine(lines[0])
    const expectedHeaders = [
      '受注ID',
      '受注番号',
      '顧客番号',
      '購入URL',
      '購入オファー',
      '定期受注番号',
      'メールアドレス',
      '小計',
      '支払い合計',
      '受注日',
      '購入商品（商品コード）',
      '広告URLグループ名',
      '広告主名',
      '顧客購入回数',
      '定期ステータス',
      '定期回数',
    ]

    // ヘッダーの検証
    const missingHeaders = expectedHeaders.filter((header) => !headers.includes(header))

    if (missingHeaders.length > 0) {
      throw new Error(`必要なヘッダーが不足しています: ${missingHeaders.join(', ')}`)
    }

    // データ行をパース
    const orders: ECForceOrder[] = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i])

        if (values.length !== headers.length) {
          errors.push(`行 ${i + 1}: カラム数が一致しません`)
          continue
        }

        const order = this.mapToOrder(headers, values)
        orders.push(order)
      } catch (error) {
        errors.push(`行 ${i + 1}: ${error instanceof Error ? error.message : 'パースエラー'}`)
      }
    }

    if (errors.length > 0) {
      logger.warn('CSVパース中のエラー:', errors)
    }

    return orders
  }

  /**
   * CSV行をパース（ダブルクォート対応）
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされたダブルクォート
          current += '"'
          i++ // 次の文字をスキップ
        } else {
          // クォートの開始/終了
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // フィールドの区切り
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    // 最後のフィールドを追加
    result.push(current.trim())

    return result
  }

  /**
   * 配列データをEC Force注文オブジェクトにマッピング
   */
  private static mapToOrder(headers: string[], values: string[]): ECForceOrder {
    const getValue = (headerName: string): string => {
      const index = headers.indexOf(headerName)
      return index >= 0 ? values[index] : ''
    }

    // 購入商品をパース（カンマ区切り）
    const productsString = getValue('購入商品（商品コード）')
    const products = productsString
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p)

    return {
      受注ID: getValue('受注ID'),
      受注番号: getValue('受注番号'),
      顧客番号: getValue('顧客番号'),
      購入URL: getValue('購入URL'),
      購入オファー: getValue('購入オファー'),
      定期受注番号: getValue('定期受注番号'),
      メールアドレス: getValue('メールアドレス'),
      小計: this.parseNumber(getValue('小計')),
      支払い合計: this.parseNumber(getValue('支払い合計')),
      受注日: getValue('受注日'),
      購入商品: products,
      広告URLグループ名: getValue('広告URLグループ名'),
      広告主名: getValue('広告主名'),
      顧客購入回数: this.parseNumber(getValue('顧客購入回数')),
      定期ステータス: getValue('定期ステータス'),
      定期回数: this.parseNumber(getValue('定期回数')),
    }
  }

  /**
   * 数値をパース
   */
  private static parseNumber(value: string): number {
    const num = parseInt(value.replace(/[^0-9.-]/g, ''), 10)
    return isNaN(num) ? 0 : num
  }

  /**
   * ファイルを読み込んでパース
   */
  static async parseFile(file: File): Promise<ECForceOrder[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          let text = event.target?.result as string

          // 文字化けチェック - もし文字化けしていたら別のエンコーディングを試す
          if (text.includes('�') || !text.includes('受注ID')) {
            // UTF-8で再読み込み
            const reader2 = new FileReader()
            reader2.onload = (event2) => {
              try {
                const text2 = event2.target?.result as string
                const orders = this.parse(text2)
                resolve(orders)
              } catch (error) {
                // それでもダメならShift-JISの結果を使用
                try {
                  const orders = this.parse(text)
                  resolve(orders)
                } catch {
                  reject(error)
                }
              }
            }
            reader2.readAsText(file, 'UTF-8')
            return
          }

          const orders = this.parse(text)
          resolve(orders)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'))
      }

      // Shift-JISエンコーディングで読み込み
      reader.readAsText(file, 'Shift_JIS')
    })
  }
}

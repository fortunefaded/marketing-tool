import { ECForceOrder } from '../types/ecforce'

/**
 * EC Force CSVパーサー (改良版)
 * エンコーディングの自動検出とエラーハンドリングを強化
 */
export class ECForceCSVParserV2 {
  private static readonly EXPECTED_HEADERS = [
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

  /**
   * CSVテキストをパースしてEC Force注文データに変換
   */
  static parse(csvText: string): ECForceOrder[] {
    // BOMを除去
    csvText = this.removeBOM(csvText)

    const lines = csvText.split(/\r?\n/).filter((line) => line.trim())

    if (lines.length < 2) {
      throw new Error('CSVファイルにデータが含まれていません')
    }

    // ヘッダー行を取得
    const headers = this.parseCSVLine(lines[0])

    // ヘッダーの検証
    this.validateHeaders(headers)

    // データ行をパース
    const orders: ECForceOrder[] = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i])

        if (values.length !== headers.length) {
          errors.push(
            `行 ${i + 1}: カラム数が一致しません (期待値: ${headers.length}, 実際: ${values.length})`
          )
          continue
        }

        const order = this.mapToOrder(headers, values)
        orders.push(order)
      } catch (error) {
        errors.push(`行 ${i + 1}: ${error instanceof Error ? error.message : 'パースエラー'}`)
      }
    }

    if (errors.length > 0) {
      console.warn('CSVパース中の警告:', errors)
    }

    return orders
  }

  /**
   * BOMを除去
   */
  private static removeBOM(text: string): string {
    if (text.charCodeAt(0) === 0xfeff) {
      return text.substring(1)
    }
    // UTF-8 BOM
    if (text.startsWith('\xEF\xBB\xBF')) {
      return text.substring(3)
    }
    return text
  }

  /**
   * ヘッダーの検証
   */
  private static validateHeaders(headers: string[]): void {
    const missingHeaders = this.EXPECTED_HEADERS.filter((header) => !headers.includes(header))

    if (missingHeaders.length > 0) {
      throw new Error(`必要なヘッダーが不足しています: ${missingHeaders.join(', ')}`)
    }
  }

  /**
   * CSV行をパース（RFC 4180準拠）
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされたダブルクォート
          current += '"'
          i += 2
          continue
        } else {
          // クォートの開始/終了
          inQuotes = !inQuotes
          i++
          continue
        }
      }

      if (char === ',' && !inQuotes) {
        // フィールドの区切り
        result.push(current.trim())
        current = ''
        i++
        continue
      }

      current += char
      i++
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
   * ファイルを読み込んでパース（複数エンコーディング対応）
   */
  static async parseFile(file: File): Promise<ECForceOrder[]> {
    // まずShift-JISで試す
    try {
      const text = await this.readFileAsText(file, 'Shift_JIS')
      if (this.isValidCSV(text)) {
        return this.parse(text)
      }
    } catch (error) {
      console.warn('Shift-JIS読み込みエラー:', error)
    }

    // 次にUTF-8で試す
    try {
      const text = await this.readFileAsText(file, 'UTF-8')
      if (this.isValidCSV(text)) {
        return this.parse(text)
      }
    } catch (error) {
      console.warn('UTF-8読み込みエラー:', error)
    }

    throw new Error('CSVファイルの読み込みに失敗しました。エンコーディングを確認してください。')
  }

  /**
   * ファイルを指定エンコーディングで読み込み
   */
  private static readFileAsText(file: File, encoding: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        const text = event.target?.result as string
        resolve(text)
      }

      reader.onerror = () => {
        reject(new Error(`${encoding}での読み込みに失敗しました`))
      }

      reader.readAsText(file, encoding)
    })
  }

  /**
   * 有効なCSVかチェック
   */
  private static isValidCSV(text: string): boolean {
    // 文字化けチェック
    if (text.includes('�')) {
      return false
    }

    // 必須ヘッダーの存在チェック
    const firstLine = text.split(/\r?\n/)[0]
    return firstLine.includes('受注ID') && firstLine.includes('受注番号')
  }
}

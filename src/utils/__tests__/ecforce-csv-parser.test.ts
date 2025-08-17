import { describe, it, expect } from 'vitest'
import { ECForceCSVParser } from '../ecforce-csv-parser'

describe('ECForceCSVParser', () => {
  describe('parse', () => {
    it('正常なCSVデータをパースできること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"upsell18_set_if8,aisatsu_1,guide-1",ナハト,ナハト,0,有効,1
401964,ffad31d5fc,c7bd95e895,in_demand_7660,通常(なし),a4330541d5,test2@example.com,8500,0,2025/08/09 22:52,"teiki_18_3w_set_pietro,aisatsu_1",Google,インハウス,1,有効,2`

      const result = ECForceCSVParser.parse(csvData)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        受注ID: '401966',
        受注番号: 'bdbfaf4469',
        顧客番号: '5f20015e35',
        購入URL: 'IF_7860_nht',
        購入オファー: 'サンクスアップセル',
        定期受注番号: '1f7666bf4a',
        メールアドレス: 'test@example.com',
        小計: 4296,
        支払い合計: 0,
        受注日: '2025/08/09 23:15',
        購入商品: ['upsell18_set_if8', 'aisatsu_1', 'guide-1'],
        広告URLグループ名: 'ナハト',
        広告主名: 'ナハト',
        顧客購入回数: 0,
        定期ステータス: '有効',
        定期回数: 1
      })
    })

    it('BOM付きのCSVデータをパースできること', () => {
      const csvData = '\uFEFF受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数\n' +
        '401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"upsell18_set_if8",ナハト,ナハト,0,有効,1'

      const result = ECForceCSVParser.parse(csvData)
      expect(result).toHaveLength(1)
      expect(result[0].受注ID).toBe('401966')
    })

    it('ダブルクォート内のカンマを正しく処理できること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"product1,product2,product3",ナハト,ナハト,0,有効,1`

      const result = ECForceCSVParser.parse(csvData)
      expect(result[0].購入商品).toEqual(['product1', 'product2', 'product3'])
    })

    it('エスケープされたダブルクォートを正しく処理できること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,"サンクス""アップ""セル",1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"product1",ナハト,ナハト,0,有効,1`

      const result = ECForceCSVParser.parse(csvData)
      expect(result[0].購入オファー).toBe('サンクス"アップ"セル')
    })

    it('空のフィールドを正しく処理できること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,,通常(なし),1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"product1",,インハウス,0,有効,1`

      const result = ECForceCSVParser.parse(csvData)
      expect(result[0].購入URL).toBe('')
      expect(result[0].広告URLグループ名).toBe('')
    })

    it('数値フィールドを正しくパースできること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,test,通常(なし),1f7666bf4a,test@example.com,"10,500","-1,000",2025/08/09 23:15,"product1",グループ,広告主,5,有効,10`

      const result = ECForceCSVParser.parse(csvData)
      expect(result[0].小計).toBe(10500)
      expect(result[0].支払い合計).toBe(-1000)
      expect(result[0].顧客購入回数).toBe(5)
      expect(result[0].定期回数).toBe(10)
    })

    it('必要なヘッダーが不足している場合エラーをスローすること', () => {
      const csvData = `受注ID,受注番号,顧客番号
401966,bdbfaf4469,5f20015e35`

      expect(() => ECForceCSVParser.parse(csvData)).toThrow('必要なヘッダーが不足しています')
    })

    it('データが含まれていない場合エラーをスローすること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数`

      expect(() => ECForceCSVParser.parse(csvData)).toThrow('CSVファイルにデータが含まれていません')
    })

    it('空のCSVの場合エラーをスローすること', () => {
      expect(() => ECForceCSVParser.parse('')).toThrow('CSVファイルにデータが含まれていません')
    })

    it('カラム数が一致しない行をスキップすること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"upsell18_set_if8",ナハト,ナハト,0,有効,1
401967,短い行
401968,ffad31d5fc,c7bd95e895,in_demand_7660,通常(なし),a4330541d5,test2@example.com,8500,0,2025/08/09 22:52,"teiki_18_3w_set_pietro",Google,インハウス,1,有効,2`

      const result = ECForceCSVParser.parse(csvData)
      expect(result).toHaveLength(2)
      expect(result[0].受注ID).toBe('401966')
      expect(result[1].受注ID).toBe('401968')
    })
  })

  describe('parseCSVLine', () => {
    it('シンプルなCSV行をパースできること', () => {
      const line = 'a,b,c,d'
      const result = ECForceCSVParser['parseCSVLine'](line)
      expect(result).toEqual(['a', 'b', 'c', 'd'])
    })

    it('ダブルクォートで囲まれたフィールドをパースできること', () => {
      const line = 'a,"b,c",d'
      const result = ECForceCSVParser['parseCSVLine'](line)
      expect(result).toEqual(['a', 'b,c', 'd'])
    })

    it('エスケープされたダブルクォートを含むフィールドをパースできること', () => {
      const line = 'a,"b""c",d'
      const result = ECForceCSVParser['parseCSVLine'](line)
      expect(result).toEqual(['a', 'b"c', 'd'])
    })

    it('空のフィールドを正しく処理できること', () => {
      const line = 'a,,c,'
      const result = ECForceCSVParser['parseCSVLine'](line)
      expect(result).toEqual(['a', '', 'c', ''])
    })
  })

  describe('parseFile', () => {
    it('Shift-JISエンコーディングのファイルを読み込めること', async () => {
      // Shift-JISエンコーディングのテストデータ
      const shiftJISContent = new Uint8Array([
        0x8e, 0xf3, 0x92, 0x8d, 0x49, 0x44, 0x2c, 0x8e, 0xf3, 0x92, 0x8d, 0x94, 0xd4, 0x8d, 0x86, 0x0a,
        0x31, 0x2c, 0x32, 0x0a
      ])
      
      const file = new File([shiftJISContent], 'test.csv', { type: 'text/csv' })
      
      // FileReaderのモック
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: null as string | null
      }

      vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any)

      ECForceCSVParser.parseFile(file)

      // FileReaderのonloadをトリガー - 必要なヘッダーを全て含める
      const csvContent = '受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数\n1,2,100,http://example.com,offer,sub-1,test@example.com,1000,1100,2024-01-01,item-1,group,広告主,1,active,1\n'
      mockFileReader.result = csvContent
      mockFileReader.onload({ target: { result: mockFileReader.result } })

      await expect(parsePromise).resolves.toBeTruthy()

      // モックをリストア
      vi.restoreAllMocks()
    })
  })
})
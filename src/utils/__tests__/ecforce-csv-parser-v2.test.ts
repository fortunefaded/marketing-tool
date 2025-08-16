import { describe, it, expect, vi } from 'vitest'
import { ECForceCSVParserV2 } from '../ecforce-csv-parser-v2'

describe('ECForceCSVParserV2', () => {
  describe('parse', () => {
    it('正常なCSVデータをパースできること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"upsell18_set_if8,aisatsu_1,guide-1",ナハト,ナハト,0,有効,1
401964,ffad31d5fc,c7bd95e895,in_demand_7660,通常(なし),a4330541d5,test2@example.com,8500,0,2025/08/09 22:52,"teiki_18_3w_set_pietro,aisatsu_1",Google,インハウス,1,有効,2`

      const result = ECForceCSVParserV2.parse(csvData)

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

      const result = ECForceCSVParserV2.parse(csvData)
      expect(result).toHaveLength(1)
      expect(result[0].受注ID).toBe('401966')
    })

    it('UTF-8 BOMを除去できること', () => {
      const csvData = '\xEF\xBB\xBF受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数\n' +
        '401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"upsell18_set_if8",ナハト,ナハト,0,有効,1'

      const result = ECForceCSVParserV2.parse(csvData)
      expect(result).toHaveLength(1)
      expect(result[0].受注ID).toBe('401966')
    })

    it('CRLF改行をサポートすること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数\r\n401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"upsell18_set_if8",ナハト,ナハト,0,有効,1\r\n`

      const result = ECForceCSVParserV2.parse(csvData)
      expect(result).toHaveLength(1)
      expect(result[0].受注ID).toBe('401966')
    })

    it('ダブルクォート内のカンマを正しく処理できること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"product1,product2,product3",ナハト,ナハト,0,有効,1`

      const result = ECForceCSVParserV2.parse(csvData)
      expect(result[0].購入商品).toEqual(['product1', 'product2', 'product3'])
    })

    it('エスケープされたダブルクォートを正しく処理できること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,"サンクス""アップ""セル",1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"product1",ナハト,ナハト,0,有効,1`

      const result = ECForceCSVParserV2.parse(csvData)
      expect(result[0].購入オファー).toBe('サンクス"アップ"セル')
    })

    it('空のフィールドを正しく処理できること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,,通常(なし),1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"product1",,インハウス,0,有効,1`

      const result = ECForceCSVParserV2.parse(csvData)
      expect(result[0].購入URL).toBe('')
      expect(result[0].広告URLグループ名).toBe('')
    })

    it('数値フィールドを正しくパースできること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,test,通常(なし),1f7666bf4a,test@example.com,"10,500","-1,000",2025/08/09 23:15,"product1",グループ,広告主,5,有効,10`

      const result = ECForceCSVParserV2.parse(csvData)
      expect(result[0].小計).toBe(10500)
      expect(result[0].支払い合計).toBe(-1000)
      expect(result[0].顧客購入回数).toBe(5)
      expect(result[0].定期回数).toBe(10)
    })

    it('必要なヘッダーが不足している場合エラーをスローすること', () => {
      const csvData = `受注ID,受注番号,顧客番号
401966,bdbfaf4469,5f20015e35`

      expect(() => ECForceCSVParserV2.parse(csvData)).toThrow('必要なヘッダーが不足しています')
    })

    it('データが含まれていない場合エラーをスローすること', () => {
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数`

      expect(() => ECForceCSVParserV2.parse(csvData)).toThrow('CSVファイルにデータが含まれていません')
    })

    it('空のCSVの場合エラーをスローすること', () => {
      expect(() => ECForceCSVParserV2.parse('')).toThrow('CSVファイルにデータが含まれていません')
    })

    it('カラム数が一致しない行を警告付きでスキップすること', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const csvData = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"upsell18_set_if8",ナハト,ナハト,0,有効,1
401967,短い行
401968,ffad31d5fc,c7bd95e895,in_demand_7660,通常(なし),a4330541d5,test2@example.com,8500,0,2025/08/09 22:52,"teiki_18_3w_set_pietro",Google,インハウス,1,有効,2`

      const result = ECForceCSVParserV2.parse(csvData)
      expect(result).toHaveLength(2)
      expect(result[0].受注ID).toBe('401966')
      expect(result[1].受注ID).toBe('401968')
      expect(consoleSpy).toHaveBeenCalledWith(
        'CSVパース中の警告:',
        expect.arrayContaining([expect.stringContaining('行 3: カラム数が一致しません')])
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('parseCSVLine', () => {
    it('シンプルなCSV行をパースできること', () => {
      const line = 'a,b,c,d'
      const result = ECForceCSVParserV2['parseCSVLine'](line)
      expect(result).toEqual(['a', 'b', 'c', 'd'])
    })

    it('ダブルクォートで囲まれたフィールドをパースできること', () => {
      const line = 'a,"b,c",d'
      const result = ECForceCSVParserV2['parseCSVLine'](line)
      expect(result).toEqual(['a', 'b,c', 'd'])
    })

    it('エスケープされたダブルクォートを含むフィールドをパースできること', () => {
      const line = 'a,"b""c",d'
      const result = ECForceCSVParserV2['parseCSVLine'](line)
      expect(result).toEqual(['a', 'b"c', 'd'])
    })

    it('空のフィールドを正しく処理できること', () => {
      const line = 'a,,c,'
      const result = ECForceCSVParserV2['parseCSVLine'](line)
      expect(result).toEqual(['a', '', 'c', ''])
    })

    it('先頭と末尾の空白をトリムすること', () => {
      const line = ' a , b , c '
      const result = ECForceCSVParserV2['parseCSVLine'](line)
      expect(result).toEqual(['a', 'b', 'c'])
    })
  })

  describe('parseFile', () => {
    it('Shift-JISエンコーディングのファイルを正しく読み込めること', async () => {
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: null as string | null
      }

      vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any)

      const csvContent = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"upsell18_set_if8",ナハト,ナハト,0,有効,1`

      const file = new File(['dummy'], 'test.csv', { type: 'text/csv' })
      
      const parsePromise = ECForceCSVParserV2.parseFile(file)

      // 最初のreadAsTextが呼ばれることを確認
      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file, 'Shift_JIS')

      // Shift-JISでの読み込みが成功
      mockFileReader.result = csvContent
      mockFileReader.onload({ target: { result: csvContent } })

      const result = await parsePromise
      expect(result).toHaveLength(1)
      expect(result[0].受注ID).toBe('401966')

      vi.restoreAllMocks()
    })

    it('Shift-JISが失敗した場合はUTF-8にフォールバックすること', async () => {
      let readCount = 0
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: null as string | null
      }

      vi.spyOn(window, 'FileReader').mockImplementation(() => {
        readCount++
        return {
          ...mockFileReader,
          readAsText: mockFileReader.readAsText,
          onload: null,
          onerror: null,
          result: null
        } as any
      })

      const csvContent = `受注ID,受注番号,顧客番号,購入URL,購入オファー,定期受注番号,メールアドレス,小計,支払い合計,受注日,購入商品（商品コード）,広告URLグループ名,広告主名,顧客購入回数,定期ステータス,定期回数
401966,bdbfaf4469,5f20015e35,IF_7860_nht,サンクスアップセル,1f7666bf4a,test@example.com,4296,0,2025/08/09 23:15,"upsell18_set_if8",ナハト,ナハト,0,有効,1`

      const file = new File(['dummy'], 'test.csv', { type: 'text/csv' })
      
      // 複数のFileReaderインスタンスを保持
      const readers: any[] = []
      vi.spyOn(window, 'FileReader').mockImplementation(() => {
        const reader = {
          readAsText: vi.fn(),
          onload: null as any,
          onerror: null as any,
          result: null as string | null
        }
        readers.push(reader)
        return reader as any
      })

      const parsePromise = ECForceCSVParserV2.parseFile(file)

      // 最初のreadAsTextが呼ばれることを確認（Shift-JIS）
      expect(readers[0].readAsText).toHaveBeenCalledWith(file, 'Shift_JIS')

      // Shift-JISで文字化けを返す
      readers[0].onload({ target: { result: '文字化け�データ' } })

      // 少し待ってから、UTF-8のFileReaderが作成されることを確認
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(readers[1].readAsText).toHaveBeenCalledWith(file, 'UTF-8')

      // UTF-8での読み込みが成功
      readers[1].onload({ target: { result: csvContent } })

      const result = await parsePromise
      expect(result).toHaveLength(1)
      expect(result[0].受注ID).toBe('401966')

      vi.restoreAllMocks()
    })

    it('両方のエンコーディングで失敗した場合はエラーをスローすること', async () => {
      const readers: any[] = []
      vi.spyOn(window, 'FileReader').mockImplementation(() => {
        const reader = {
          readAsText: vi.fn(),
          onload: null as any,
          onerror: null as any,
          result: null as string | null
        }
        readers.push(reader)
        return reader as any
      })

      const file = new File(['dummy'], 'test.csv', { type: 'text/csv' })
      
      const parsePromise = ECForceCSVParserV2.parseFile(file)

      // Shift-JISで文字化け
      readers[0].onload({ target: { result: '文字化け�データ' } })

      // UTF-8でも文字化け
      await new Promise(resolve => setTimeout(resolve, 10))
      readers[1].onload({ target: { result: '文字化け�データ' } })

      await expect(parsePromise).rejects.toThrow('CSVファイルの読み込みに失敗しました')

      vi.restoreAllMocks()
    })
  })

  describe('isValidCSV', () => {
    it('有効なCSVを判定できること', () => {
      const validCSV = '受注ID,受注番号,顧客番号\n123,456,789'
      expect(ECForceCSVParserV2['isValidCSV'](validCSV)).toBe(true)
    })

    it('文字化けを含むCSVを無効と判定すること', () => {
      const invalidCSV = '受注ID,受注�番号,顧客番号\n123,456,789'
      expect(ECForceCSVParserV2['isValidCSV'](invalidCSV)).toBe(false)
    })

    it('必須ヘッダーがない場合は無効と判定すること', () => {
      const invalidCSV = 'ID,番号,顧客\n123,456,789'
      expect(ECForceCSVParserV2['isValidCSV'](invalidCSV)).toBe(false)
    })
  })
})
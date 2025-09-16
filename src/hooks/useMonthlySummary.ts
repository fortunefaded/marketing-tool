import { useCallback, useEffect, useState } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const useMonthlySummary = (accountId: string | null, accessToken?: string) => {
  const convex = useConvex()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)  // 重複実行防止フラグ
  const [fetchedMonths, setFetchedMonths] = useState<Set<string>>(new Set())  // 取得済み月を記録

  // Convexから月次サマリーを取得
  const summaries = useQuery(
    api.metaMonthlySummary.getMonthlySummaries,
    accountId ? { accountId } : 'skip'
  )

  // デバッグログ
  useEffect(() => {
    if (summaries) {
      console.log('📊 取得したサマリー:', summaries)
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      console.log('📊 現在月（クライアント）:', currentMonth)
    }
  }, [summaries])

  // サマリー生成mutation
  const generateSummary = useMutation(api.metaMonthlySummary.generateMonthlySummary)

  // Meta APIから月次データを取得してキャッシュに保存
  const fetchAndCacheMonthlySummary = useCallback(
    async (yearMonth: string) => {
      if (!accountId || !accessToken) {
        console.error('アカウントIDまたはアクセストークンがありません')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log(`📊 ${yearMonth}の月次データを取得開始`)

        // 年月から開始日と終了日を計算
        const [year, month] = yearMonth.split('-').map(Number)
        const startDate = new Date(year, month - 1, 1)
        startDate.setHours(0, 0, 0, 0)  // 時刻を00:00:00に設定

        const endDate = new Date(year, month, 0) // 月末日
        endDate.setHours(23, 59, 59, 999)  // 時刻を23:59:59に設定

        // 現在月かどうか判定
        const now = new Date()
        const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

        // 現在月の場合は今日までを終了日とする
        if (isCurrentMonth) {
          endDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate())
          endDate.setHours(23, 59, 59, 999)
        }

        // ローカルタイムゾーンで日付をフォーマット
        const formatDate = (date: Date) => {
          const y = date.getFullYear()
          const m = String(date.getMonth() + 1).padStart(2, '0')
          const d = String(date.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }

        console.log(`📅 ${yearMonth} の期間設定:`, {
          開始日: formatDate(startDate),
          終了日: formatDate(endDate),
          現在月: isCurrentMonth,
          startDateObject: startDate,
          endDateObject: endDate
        })

        // Meta API URL構築
        const baseUrl = 'https://graph.facebook.com/v23.0'
        const cleanAccountId = accountId.replace('act_', '')
        const url = new URL(`${baseUrl}/act_${cleanAccountId}/insights`)

        // パラメータ設定（月全体の集計）
        const params = {
          access_token: accessToken,
          time_range: JSON.stringify({
            since: formatDate(startDate),
            until: formatDate(endDate),
          }),
          level: 'account', // アカウント全体の集計
          fields: 'impressions,clicks,spend,ctr,cpm,cpc,frequency,reach,unique_ctr,conversions,actions,unique_actions',
          limit: '1',
        }

        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value)
        })

        // API呼び出し
        const response = await fetch(url.toString())
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || 'Meta API Error')
        }

        const data = result.data?.[0]
        if (!data) {
          throw new Error('データが取得できませんでした')
        }

        // 広告数を取得するために別途APIコール（ページネーション対応）
        // 注：期間内にインプレッションがあった広告を集計するために
        // insightsエンドポイントを使用
        const adsUrl = new URL(`${baseUrl}/act_${cleanAccountId}/insights`)
        const adsParams = {
          access_token: accessToken,
          fields: 'ad_id,ad_name',
          time_range: JSON.stringify({
            since: formatDate(startDate),
            until: formatDate(endDate),
          }),
          level: 'ad',
          limit: '5000', // 最大値を増やす
        }

        Object.entries(adsParams).forEach(([key, value]) => {
          adsUrl.searchParams.append(key, value)
        })

        // 全ての広告を取得（ページネーション対応）
        let allAds = []
        let nextUrl: string | null = adsUrl.toString()

        while (nextUrl) {
          const adsResponse = await fetch(nextUrl)
          const adsResult = await adsResponse.json()

          if (adsResult.data) {
            allAds = allAds.concat(adsResult.data)
          }

          // 次のページがあるか確認
          nextUrl = adsResult.paging?.next || null

          // 安全のため最大10ページまで
          if (allAds.length > 50000) break
        }

        // ユニークな広告IDの数をカウント
        const uniqueAdIds = new Set(allAds.map(ad => ad.ad_id))
        const totalAds = uniqueAdIds.size

        console.log(`📊 ${yearMonth}: 広告数=${totalAds}件`)

        // ECForceからCVデータを取得（受注CVと決済CVの両方）
        let totalCvOrder = 0  // 受注CV
        let totalCvPayment = 0  // 決済CV
        let totalFcv = undefined // F-CVは表示しない

        try {
          const ecforceStartDate = formatDate(startDate)
          const ecforceEndDate = formatDate(endDate)

          console.log(`📊 ${yearMonth}: ECForceデータ取得開始`, {
            開始日: ecforceStartDate,
            終了日: ecforceEndDate
          })

          // ECForceのデータを取得（期間指定）
          const ecforceData = await convex.query(api.ecforce.getPerformanceData, {
            startDate: ecforceStartDate,
            endDate: ecforceEndDate,
            limit: 100  // API制限回避のため件数を減らす
          })

          if (ecforceData && ecforceData.data && ecforceData.data.length > 0) {
            // 期間内の全データを集計（受注CVと決済CVの両方）
            const totals = ecforceData.data.reduce((acc: any, item: any) => {
              return {
                cvOrder: (acc.cvOrder || 0) + (item.cvOrder || 0),  // 受注CV
                cvPayment: (acc.cvPayment || 0) + (item.cvPayment || 0),  // 決済CV
                revenue: (acc.revenue || 0) + (item.salesAmount || 0)
              }
            }, { cvOrder: 0, cvPayment: 0, revenue: 0 })

            totalCvOrder = totals.cvOrder
            totalCvPayment = totals.cvPayment

            console.log(`✅ ${yearMonth}: ECForceデータ取得成功`, {
              件数: ecforceData.data.length,
              受注CV: totalCvOrder,
              決済CV: totalCvPayment,
              売上合計: totals.revenue
            })
          } else {
            console.log(`⚠️ ${yearMonth}: ECForceデータが見つかりません`)

            // フォールバック: Meta APIのデータを使用（受注CVと同じ値を使用）
            if (data.actions && Array.isArray(data.actions)) {
              const purchaseAction = data.actions.find(
                (action: any) =>
                  action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
                  action.action_type === 'purchase'
              )
              if (purchaseAction) {
                const metaCv = parseInt(purchaseAction.value || '0')
                totalCvOrder = metaCv
                totalCvPayment = metaCv  // 同じ値を設定
              }
            }
          }
        } catch (ecError) {
          console.error(`❌ ${yearMonth}: ECForceデータ取得エラー`, ecError)

          // エラー時はMeta APIのデータを使用（受注CVと同じ値を使用）
          if (data.actions && Array.isArray(data.actions)) {
            const purchaseAction = data.actions.find(
              (action: any) =>
                action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
                action.action_type === 'purchase'
            )
            if (purchaseAction) {
              const metaCv = parseInt(purchaseAction.value || '0')
              totalCvOrder = metaCv
              totalCvPayment = metaCv  // 同じ値を設定
            }
          }
        }

        // U-CTRの計算
        let avgUctr = undefined
        if (data.unique_ctr) {
          avgUctr = parseFloat(data.unique_ctr) // Meta APIは既にパーセント値で返す
        }

        // サマリーデータを整形
        const summaryData: any = {
          totalAds,
          avgFrequency: parseFloat(data.frequency || '0'),
          totalReach: parseInt(data.reach || '0'),
          totalImpressions: parseInt(data.impressions || '0'),
          totalClicks: parseInt(data.clicks || '0'),
          avgCtr: parseFloat(data.ctr || '0'), // Meta APIは既にパーセント値で返す（例: 1.08）
          avgUctr,
          avgCpc: parseFloat(data.cpc || '0'),
          totalSpend: parseFloat(data.spend || '0'),
          totalFcv,  // undefined（F-CVは表示しない）
          totalCv: totalCvPayment,   // ECForceのCV（決済完了）を使用
          avgCpa: totalCvOrder > 0 ? parseFloat(data.spend || '0') / totalCvOrder : 0,  // 受注CVベースでCPA計算
          avgCpm: parseFloat(data.cpm || '0'),
        }

        // totalCvOrderは別途保持（表示用）
        const fullSummaryData = {
          ...summaryData,
          totalCvOrder,  // 受注CV（表示用に保持）
        }

        // デバッグ用ログ
        console.log(`📊 ${yearMonth} サマリーデータ:`, {
          期間: `${formatDate(startDate)} ~ ${formatDate(endDate)}`,
          生データ: {
            ctr: data.ctr,
            unique_ctr: data.unique_ctr,
            impressions: data.impressions,
            clicks: data.clicks,
            spend: data.spend,
            actions: data.actions,
            unique_actions: data.unique_actions,
          },
          整形後: fullSummaryData,
          CPA計算詳細: {
            totalSpend: parseFloat(data.spend || '0'),
            totalCvOrder,
            avgCpa: totalCvOrder > 0 ? parseFloat(data.spend || '0') / totalCvOrder : 0,
          },
        })

        // Convexに保存（totalCvOrderを含む）
        await generateSummary({
          accountId,
          yearMonth,
          data: {
            ...summaryData,
            totalCvOrder,  // Convexに保存時にtotalCvOrderも含める
          },
        })

        console.log(`✅ ${yearMonth}のサマリーを保存完了`)
        return fullSummaryData
      } catch (err: any) {
        console.error(`❌ ${yearMonth}のデータ取得エラー:`, err)
        setError(err.message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [accountId, accessToken, generateSummary, convex]  // convexを追加
  )

  // アカウント変更時にfetchedMonthsをリセット
  useEffect(() => {
    setFetchedMonths(new Set())
  }, [accountId])

  // 不足しているサマリーを自動取得（最適化版）
  useEffect(() => {
    if (!summaries || !accountId || !accessToken) return

    const fetchMissingSummaries = async () => {
      const currentYearMonth = new Date().toISOString().slice(0, 7)

      // 未取得かつmissingなデータを抽出
      const missingMonths = summaries
        .filter(s => s.source === 'missing' && !fetchedMonths.has(s.yearMonth))
        .map(s => s.yearMonth)

      if (missingMonths.length === 0 || isFetching) {
        return  // 取得するデータがないか、既に取得中
      }

      // 重複実行を防ぐ
      setIsFetching(true)

      try {
        console.log('📊 不足サマリー取得開始:', missingMonths)

        for (const yearMonth of missingMonths) {
          // 取得済みとしてマーク（再実行を防ぐ）
          setFetchedMonths(prev => new Set([...prev, yearMonth]))

          console.log(`📊 ${yearMonth}: データ取得開始`)
          await fetchAndCacheMonthlySummary(yearMonth)

          // 連続リクエストを避けるため少し待つ（API制限対策）
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error: any) {
        console.error('❌ サマリー取得エラー:', {
          error: error.message || error,
          stack: error.stack,
          missingMonths
        })
        // エラー時は取得済みマークを削除（リトライ可能にする）
        missingMonths.forEach(month => {
          setFetchedMonths(prev => {
            const newSet = new Set(prev)
            newSet.delete(month)
            return newSet
          })
        })
      } finally {
        setIsFetching(false)
      }
    }

    fetchMissingSummaries()
  }, [summaries, accountId, accessToken])  // fetchedMonths, isFetchingを依存配列から除外

  return {
    summaries,
    isLoading,
    error,
    refetchSummary: fetchAndCacheMonthlySummary,
  }
}
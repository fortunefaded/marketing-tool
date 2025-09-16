import { useCallback, useEffect, useState } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const useMonthlySummary = (accountId: string | null, accessToken?: string) => {
  const convex = useConvex()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        const endDate = new Date(year, month, 0) // 月末日

        // 現在月かどうか判定
        const now = new Date()
        const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

        // 現在月の場合は今日までを終了日とする
        if (isCurrentMonth) {
          endDate.setTime(now.getTime())
        }

        const formatDate = (date: Date) => {
          const y = date.getFullYear()
          const m = String(date.getMonth() + 1).padStart(2, '0')
          const d = String(date.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }

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

        // 広告数を取得するために別途APIコール
        const adsUrl = new URL(`${baseUrl}/act_${cleanAccountId}/ads`)
        const adsParams = {
          access_token: accessToken,
          fields: 'id',
          time_range: JSON.stringify({
            since: formatDate(startDate),
            until: formatDate(endDate),
          }),
          filtering: JSON.stringify([
            {
              field: 'effective_status',
              operator: 'IN',
              value: ['ACTIVE', 'PAUSED', 'ARCHIVED'],
            },
          ]),
          limit: '500',
        }

        Object.entries(adsParams).forEach(([key, value]) => {
          adsUrl.searchParams.append(key, value)
        })

        const adsResponse = await fetch(adsUrl.toString())
        const adsResult = await adsResponse.json()
        const totalAds = adsResult.data?.length || 0

        // CVデータを抽出
        let totalCv = 0
        let totalFcv = undefined

        if (data.actions && Array.isArray(data.actions)) {
          const purchaseAction = data.actions.find(
            (action: any) =>
              action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
              action.action_type === 'purchase'
          )
          if (purchaseAction) {
            totalCv = parseInt(purchaseAction.value || '0')
          }
        }

        if (data.unique_actions && Array.isArray(data.unique_actions)) {
          const uniquePurchaseAction = data.unique_actions.find(
            (action: any) =>
              action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
              action.action_type === 'purchase'
          )
          if (uniquePurchaseAction) {
            totalFcv = parseInt(uniquePurchaseAction.value || '0')
          }
        }

        // U-CTRの計算
        let avgUctr = undefined
        if (data.unique_ctr) {
          avgUctr = parseFloat(data.unique_ctr) / 100 // パーセントから小数へ
        }

        // サマリーデータを整形
        const summaryData = {
          totalAds,
          avgFrequency: parseFloat(data.frequency || '0'),
          totalReach: parseInt(data.reach || '0'),
          totalImpressions: parseInt(data.impressions || '0'),
          totalClicks: parseInt(data.clicks || '0'),
          avgCtr: parseFloat(data.ctr || '0') / 100, // パーセントから小数へ
          avgUctr,
          avgCpc: parseFloat(data.cpc || '0'),
          totalSpend: parseFloat(data.spend || '0'),
          totalFcv,
          totalCv,
          avgCpa: totalCv > 0 ? parseFloat(data.spend || '0') / totalCv : 0,
          avgCpm: parseFloat(data.cpm || '0'),
        }

        // Convexに保存
        await generateSummary({
          accountId,
          yearMonth,
          data: summaryData,
        })

        console.log(`✅ ${yearMonth}のサマリーを保存完了`)
        return summaryData
      } catch (err: any) {
        console.error(`❌ ${yearMonth}のデータ取得エラー:`, err)
        setError(err.message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [accountId, accessToken, generateSummary]
  )

  // 不足しているサマリーを自動取得
  useEffect(() => {
    if (!summaries || !accountId || !accessToken) return

    const fetchMissingSummaries = async () => {
      console.log('📊 不足サマリーチェック開始')
      const currentYearMonth = new Date().toISOString().slice(0, 7)

      for (const summary of summaries) {
        console.log(`📊 ${summary.yearMonth}: source=${summary.source}`)
        if (summary.source === 'missing') {
          const isCurrentMonth = summary.yearMonth === currentYearMonth
          console.log(`📊 ${summary.yearMonth}: 現在月=${isCurrentMonth}, currentYearMonth=${currentYearMonth}`)

          // 全ての月でキャッシュを生成（現在月も含む）
          // 現在月は後で自動的に最新データで更新される
          console.log(`📊 ${summary.yearMonth}: データ取得開始`)
          await fetchAndCacheMonthlySummary(summary.yearMonth)
          // 連続リクエストを避けるため少し待つ
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }

    fetchMissingSummaries()
  }, [summaries, accountId, accessToken, fetchAndCacheMonthlySummary])

  return {
    summaries,
    isLoading,
    error,
    refetchSummary: fetchAndCacheMonthlySummary,
  }
}
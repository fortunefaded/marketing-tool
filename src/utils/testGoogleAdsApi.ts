// Google Ads API直接テスト用ユーティリティ

export async function testGoogleAdsDirectly(
  accessToken: string,
  developerToken: string,
  customerId: string,
  startDate: string,
  endDate: string
) {
  const apiUrl = `https://googleads.googleapis.com/v21/customers/${customerId.replace(/-/g, '')}/googleAds:searchStream`

  // テスト用の最もシンプルなクエリ
  const queries = [
    {
      name: 'キャンペーン一覧（期間指定なし）',
      query: `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status
        FROM campaign
      `
    },
    {
      name: 'キャンペーンメトリクス（期間指定あり）',
      query: `
        SELECT
          campaign.id,
          campaign.name,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      `
    },
    {
      name: 'キャンペーンメトリクス（期間指定なし・集計）',
      query: `
        SELECT
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros
        FROM campaign
      `
    }
  ]

  const results: any[] = []

  for (const testQuery of queries) {
    console.log(`\n🔍 テスト: ${testQuery.name}`)
    console.log('Query:', testQuery.query.trim())

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: testQuery.query }),
      })

      const responseText = await response.text()

      if (!response.ok) {
        console.error(`❌ エラー (${response.status}):`, responseText)
        results.push({
          test: testQuery.name,
          success: false,
          error: responseText,
          status: response.status
        })
        continue
      }

      const data = JSON.parse(responseText)
      console.log('✅ 成功:', {
        resultsCount: data.results?.length || 0,
        hasResults: !!data.results,
        firstResult: data.results?.[0] || null
      })

      results.push({
        test: testQuery.name,
        success: true,
        data: data,
        resultsCount: data.results?.length || 0
      })

      // 完全なレスポンスも表示
      console.log('完全なレスポンス:', data)

    } catch (error: any) {
      console.error(`❌ 実行エラー:`, error)
      results.push({
        test: testQuery.name,
        success: false,
        error: error.message
      })
    }
  }

  return results
}
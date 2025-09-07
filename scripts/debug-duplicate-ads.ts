#!/usr/bin/env npx tsx
/**
 * 重複広告の詳細調査スクリプト
 * 実行: npx tsx scripts/debug-duplicate-ads.ts
 */

async function debugDuplicateAds() {
  const accessToken = process.env.META_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE' // ← 環境変数またはトークンを設定
  const accountId = '596086994975714'
  
  // 問題の広告名で直接検索
  const adNames = ['250809_早く始めればよかった', '250809_メモ風']
  
  for (const adName of adNames) {
    console.log(`\n🔍 調査中: ${adName}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const url = new URL(`https://graph.facebook.com/v23.0/act_${accountId}/insights`)
    
    // フィルタリングで特定の広告名を検索
    const filtering = [{
      field: 'ad.name',
      operator: 'CONTAIN',
      value: adName
    }]
    
    url.searchParams.append('access_token', accessToken)
    url.searchParams.append('filtering', JSON.stringify(filtering))
    url.searchParams.append('time_range', JSON.stringify({
      since: '2025-08-01',
      until: '2025-08-31'
    }))
    url.searchParams.append('fields', 'ad_id,ad_name,campaign_id,campaign_name,impressions,spend,date_start')
    url.searchParams.append('level', 'ad')
    url.searchParams.append('limit', '500')
    url.searchParams.append('time_increment', '1')
    url.searchParams.append('time_zone', 'Asia/Tokyo')
    url.searchParams.append('use_unified_attribution_setting', 'true')
    
    console.log('API URL:', url.toString().replace(accessToken, '***TOKEN***'))
    
    try {
      const response = await fetch(url.toString())
      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        console.log(`\n✅ データ取得成功: ${data.data.length}件`)
        
        // 広告IDごとにグループ化
        const byAdId = data.data.reduce((acc: any, item: any) => {
          if (!acc[item.ad_id]) {
            acc[item.ad_id] = {
              ad_name: item.ad_name,
              campaigns: new Set(),
              records: [],
              totalImpressions: 0,
              totalSpend: 0
            }
          }
          acc[item.ad_id].campaigns.add(item.campaign_name)
          acc[item.ad_id].records.push(item)
          acc[item.ad_id].totalImpressions += Number(item.impressions || 0)
          acc[item.ad_id].totalSpend += Number(item.spend || 0)
          return acc
        }, {})
        
        console.log(`\n見つかった広告ID: ${Object.keys(byAdId).length}個`)
        
        Object.entries(byAdId).forEach(([adId, info]: [string, any]) => {
          console.log(`\n広告ID: ${adId}`)
          console.log(`  広告名: ${info.ad_name}`)
          console.log(`  キャンペーン: ${Array.from(info.campaigns).join(', ')}`)
          console.log(`  レコード数: ${info.records.length}`)
          console.log(`  合計インプレッション: ${info.totalImpressions.toLocaleString()}`)
          console.log(`  合計消化金額: ¥${info.totalSpend.toFixed(0)}`)
          
          // キャンペーンが複数ある場合は警告
          if (info.campaigns.size > 1) {
            console.log(`  ⚠️ 警告: この広告は複数のキャンペーンに属しています！`)
          }
          
          // 日付ごとの集計
          const byDate = info.records.reduce((acc: any, r: any) => {
            const key = `${r.date_start}_${r.campaign_name}`
            if (!acc[key]) {
              acc[key] = { 
                date: r.date_start,
                campaign: r.campaign_name,
                impressions: 0, 
                spend: 0
              }
            }
            acc[key].impressions += Number(r.impressions || 0)
            acc[key].spend += Number(r.spend || 0)
            return acc
          }, {})
          
          console.log('\n  日付別データ:')
          Object.values(byDate)
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
            .forEach((stats: any) => {
              console.log(`    ${stats.date}: imp=${stats.impressions.toLocaleString()}, spend=¥${stats.spend.toFixed(0)}, campaign=${stats.campaign}`)
            })
          
          // キャンペーン別の期間を特定
          const campaignPeriods: Record<string, { start: string, end: string }> = {}
          info.records.forEach((r: any) => {
            const campaign = r.campaign_name
            if (!campaignPeriods[campaign]) {
              campaignPeriods[campaign] = { start: r.date_start, end: r.date_start }
            }
            if (r.date_start < campaignPeriods[campaign].start) {
              campaignPeriods[campaign].start = r.date_start
            }
            if (r.date_start > campaignPeriods[campaign].end) {
              campaignPeriods[campaign].end = r.date_start
            }
          })
          
          console.log('\n  キャンペーン別期間:')
          Object.entries(campaignPeriods).forEach(([campaign, period]) => {
            console.log(`    ${campaign}: ${period.start} 〜 ${period.end}`)
          })
        })
      } else if (data.error) {
        console.log('❌ エラー:', data.error)
        if (data.error.error_user_msg) {
          console.log('ユーザーメッセージ:', data.error.error_user_msg)
        }
      } else {
        console.log('⚠️ データが見つかりませんでした')
      }
    } catch (error) {
      console.error('❌ リクエストエラー:', error)
    }
  }
  
  // サマリー
  console.log('\n\n📊 調査サマリー')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('問題の原因と思われる点:')
  console.log('1. 同一広告が月中にキャンペーン間で移動された可能性')
  console.log('2. CSVはキャンペーンごとに集計、APIは広告全体で集計')
  console.log('3. 広告IDベースでのマッチングが必要')
  console.log('\n推奨対応:')
  console.log('1. 広告IDを使用した正確なマッチング実装')
  console.log('2. キャンペーン移動を考慮した集計ロジック')
  console.log('3. Meta Ad Managerで変更履歴を確認')
}

debugDuplicateAds().catch(console.error)
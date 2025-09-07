#!/usr/bin/env npx tsx
/**
 * Meta API 8月1-2日データ取得テスト
 * 実行: npx tsx scripts/test-meta-august-data.ts
 */

async function testAugustData() {
  console.log('🧪 Meta API 8月1-2日データ取得テスト開始\n')
  
  // 直接APIコールで確認
  const accessToken = process.env.META_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE' // ← 環境変数またはここにトークンを入れる
  const accountId = '596086994975714'
  
  const url = new URL(`https://graph.facebook.com/v23.0/act_${accountId}/insights`)
  
  // time_rangeをJSON形式で指定（重要！）
  const timeRange = {
    since: '2025-08-01',
    until: '2025-08-02'
  }
  
  url.searchParams.append('access_token', accessToken)
  url.searchParams.append('time_range', JSON.stringify(timeRange))
  url.searchParams.append('fields', 'ad_name,impressions,spend,date_start,date_stop')
  url.searchParams.append('level', 'ad')
  url.searchParams.append('limit', '100')
  url.searchParams.append('time_increment', '1')
  url.searchParams.append('time_zone', 'Asia/Tokyo')
  url.searchParams.append('use_unified_attribution_setting', 'true')
  
  console.log('API URL:', url.toString().replace(accessToken, '***TOKEN***'))
  console.log('Time Range:', timeRange)
  console.log('')
  
  try {
    const response = await fetch(url.toString())
    const data = await response.json()
    
    if (data.data && data.data.length > 0) {
      console.log('✅ データ取得成功!')
      console.log('取得件数:', data.data.length)
      console.log('\n最初のレコード:')
      console.log(JSON.stringify(data.data[0], null, 2))
      
      // 日付ごとの集計
      const dateGroups: Record<string, number> = {}
      data.data.forEach((item: any) => {
        const date = item.date_start
        dateGroups[date] = (dateGroups[date] || 0) + 1
      })
      
      console.log('\n日付ごとのレコード数:')
      Object.entries(dateGroups).sort().forEach(([date, count]) => {
        console.log(`  ${date}: ${count}件`)
      })
    } else if (data.error) {
      console.log('❌ エラー:', data.error)
      if (data.error.error_user_msg) {
        console.log('ユーザーメッセージ:', data.error.error_user_msg)
      }
    } else {
      console.log('⚠️ データが0件です')
      console.log('レスポンス:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('❌ リクエストエラー:', error)
  }
}

// 追加テスト: 8月全体のデータを取得して8/1-8/2が含まれているか確認
async function testFullAugustData() {
  console.log('\n\n🧪 8月全体データ取得テスト開始\n')
  
  const accessToken = process.env.META_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE'
  const accountId = '596086994975714'
  
  const url = new URL(`https://graph.facebook.com/v23.0/act_${accountId}/insights`)
  
  const timeRange = {
    since: '2025-07-30',
    until: '2025-09-02'
  }
  
  url.searchParams.append('access_token', accessToken)
  url.searchParams.append('time_range', JSON.stringify(timeRange))
  url.searchParams.append('fields', 'ad_name,impressions,spend,date_start,date_stop')
  url.searchParams.append('level', 'ad')
  url.searchParams.append('limit', '500')
  url.searchParams.append('time_increment', '1')
  url.searchParams.append('time_zone', 'Asia/Tokyo')
  url.searchParams.append('use_unified_attribution_setting', 'true')
  url.searchParams.append('action_attribution_windows', '1d_click,7d_click,1d_view,7d_view')
  
  console.log('Time Range:', timeRange)
  
  try {
    const response = await fetch(url.toString())
    const data = await response.json()
    
    if (data.data && data.data.length > 0) {
      console.log('✅ データ取得成功!')
      console.log('取得件数:', data.data.length)
      
      // 日付ごとの集計とスペンド合計
      const dateGroups: Record<string, { count: number, spend: number }> = {}
      data.data.forEach((item: any) => {
        const date = item.date_start
        if (!dateGroups[date]) {
          dateGroups[date] = { count: 0, spend: 0 }
        }
        dateGroups[date].count++
        dateGroups[date].spend += parseFloat(item.spend || '0')
      })
      
      console.log('\n日付ごとのレコード数と広告費:')
      Object.entries(dateGroups).sort().forEach(([date, info]) => {
        const marker = (date === '2025-08-01' || date === '2025-08-02') ? ' ⭐' : ''
        console.log(`  ${date}: ${info.count}件, ¥${info.spend.toFixed(0)}${marker}`)
      })
      
      // 8/1と8/2のデータを確認
      const aug1Count = dateGroups['2025-08-01']?.count || 0
      const aug2Count = dateGroups['2025-08-02']?.count || 0
      const aug1Spend = dateGroups['2025-08-01']?.spend || 0
      const aug2Spend = dateGroups['2025-08-02']?.spend || 0
      
      console.log('\n📊 8月1-2日のデータ確認:')
      console.log(`  8月1日: ${aug1Count}件, ¥${aug1Spend.toFixed(0)}`)
      console.log(`  8月2日: ${aug2Count}件, ¥${aug2Spend.toFixed(0)}`)
      console.log(`  合計: ${aug1Count + aug2Count}件, ¥${(aug1Spend + aug2Spend).toFixed(0)}`)
      
      if (aug1Count === 0 && aug2Count === 0) {
        console.log('\n⚠️ 警告: 8月1日と2日のデータが取得できていません！')
      } else if (aug1Spend + aug2Spend < 1000000) {
        console.log('\n⚠️ 警告: 8月1-2日の広告費が100万円未満です（期待値: 100万円以上）')
      } else {
        console.log('\n✅ 8月1-2日のデータが正常に取得できています！')
      }
    } else if (data.error) {
      console.log('❌ エラー:', data.error)
    } else {
      console.log('⚠️ データが0件です')
    }
  } catch (error) {
    console.error('❌ リクエストエラー:', error)
  }
}

// メイン実行
async function main() {
  await testAugustData()
  await testFullAugustData()
}

main().catch(console.error)
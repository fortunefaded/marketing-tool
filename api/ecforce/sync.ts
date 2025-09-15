import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORSヘッダーの設定
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 本番環境ではECForce APIの実装が必要
    // 現時点では、手動同期は無効化
    return res.status(200).json({
      success: false,
      error: '本番環境での自動同期は現在準備中です。CSVファイルを手動でアップロードしてください。',
      message: 'Production sync not yet implemented',
    })
  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { chromium } from 'playwright-chromium'

// 環境変数から認証情報を取得
const BASIC_USER = process.env.ECFORCE_BASIC_USER
const BASIC_PASS = process.env.ECFORCE_BASIC_PASS
const LOGIN_EMAIL = process.env.ECFORCE_EMAIL
const LOGIN_PASS = process.env.ECFORCE_PASSWORD

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

  // 環境変数のチェック
  if (!BASIC_USER || !BASIC_PASS || !LOGIN_EMAIL || !LOGIN_PASS) {
    console.error('ECForce認証情報が設定されていません')
    return res.status(500).json({
      success: false,
      error: 'ECForce認証情報が設定されていません。環境変数を確認してください。',
    })
  }

  try {
    console.log('🚀 ECForce同期処理開始...')

    // Vercel環境での制限により、実際のブラウザ自動化は難しい
    // 代替案として、以下のアプローチを提案:
    // 1. ECForce APIが利用可能な場合は直接API呼び出し
    // 2. そうでない場合は、ローカルでのスクリプト実行を推奨

    // 現時点では、環境変数が正しく設定されていることを確認
    return res.status(200).json({
      success: true,
      message: 'ECForce認証情報が正しく設定されています',
      info: {
        hasBasicAuth: !!BASIC_USER && !!BASIC_PASS,
        hasLoginCredentials: !!LOGIN_EMAIL && !!LOGIN_PASS,
        environment: process.env.VERCEL ? 'production' : 'development',
      },
      note: 'CSVダウンロードはローカルスクリプト（npm run ecforce:sync）を使用してください',
    })
  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
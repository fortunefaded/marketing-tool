// ECForce同期専用サーバー
// Railway, Render, Fly.ioなどにデプロイ可能

import express from 'express'
import cors from 'cors'
import { chromium } from 'playwright'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ecforce-sync-server' })
})

// ECForce同期エンドポイント
app.post('/api/sync', async (req, res) => {
  const { token } = req.body

  // 簡易認証
  if (token !== process.env.SYNC_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  console.log('🚀 ECForce同期処理開始...')

  const BASIC_USER = process.env.ECFORCE_BASIC_USER
  const BASIC_PASS = process.env.ECFORCE_BASIC_PASS
  const LOGIN_EMAIL = process.env.ECFORCE_EMAIL
  const LOGIN_PASS = process.env.ECFORCE_PASSWORD

  if (!BASIC_USER || !BASIC_PASS || !LOGIN_EMAIL || !LOGIN_PASS) {
    return res.status(500).json({
      success: false,
      error: '認証情報が設定されていません',
    })
  }

  let browser = null

  try {
    // ブラウザを起動
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const context = await browser.newContext({
      httpCredentials: {
        username: BASIC_USER,
        password: BASIC_PASS,
      },
      acceptDownloads: true,
    })

    const page = await context.newPage()

    // ログイン処理
    await page.goto('https://mogumo.jp/admin')
    await page.fill('input[name="admin[email]"]', LOGIN_EMAIL)
    await page.fill('input[name="admin[password]"]', LOGIN_PASS)
    await page.click('input[type="submit"][value="ログイン"]')

    // ログイン完了を待つ
    await page.waitForURL('**/advertisements**', { timeout: 10000 })

    // CSVダウンロード処理
    // TODO: 実際のダウンロード処理を実装

    await browser.close()

    return res.json({
      success: true,
      message: 'ECForce同期が完了しました',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('同期エラー:', error)
    if (browser) await browser.close()

    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 ECForce同期サーバーがポート${PORT}で起動しました`)
})
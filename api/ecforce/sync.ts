import type { VercelRequest, VercelResponse } from '@vercel/node'

// 環境変数から認証情報を取得
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'your-github-username' // GitHubユーザー名を設定
const GITHUB_REPO = process.env.GITHUB_REPO || 'marketing-tool'

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
    console.log('🚀 ECForce同期をGitHub Actionsでトリガー...')

    // GitHub Actionsワークフローをトリガー
    if (GITHUB_TOKEN) {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'ecforce-sync',
            client_payload: {
              triggered_by: 'vercel_api',
              timestamp: new Date().toISOString(),
            }
          })
        }
      )

      if (response.ok || response.status === 204) {
        return res.status(200).json({
          success: true,
          message: 'ECForce同期ジョブを開始しました',
          info: {
            triggeredAt: new Date().toISOString(),
            workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`,
          },
        })
      } else {
        const errorText = await response.text()
        console.error('GitHub API Error:', errorText)
        throw new Error(`GitHub API returned ${response.status}`)
      }
    } else {
      // GitHub Tokenが設定されていない場合は手動実行を案内
      return res.status(200).json({
        success: false,
        message: 'GitHub Actions連携が設定されていません',
        instructions: {
          step1: 'GitHub Personal Access Tokenを作成',
          step2: 'Vercel環境変数にGITHUB_TOKENを設定',
          step3: 'GITHUB_OWNERとGITHUB_REPOも設定',
          manual: `手動実行: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`,
        },
      })
    }
  } catch (error) {
    console.error('Sync trigger error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}
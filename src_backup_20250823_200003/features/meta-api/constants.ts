export const ERROR_MESSAGES = {
  NO_TOKEN: 'アカウントのアクセストークンが設定されていません。Meta APIの設定を確認してください。',
  INVALID_REQUEST: 'Meta APIリクエストが無効です。アカウント設定を確認してください。',
  TOKEN_EXPIRED: 'アクセストークンが無効または期限切れです。再認証が必要です。'
} as const
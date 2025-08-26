// Vibeloggerをベースとしたログユーティリティ
import { vibe } from '@/lib/vibelogger'

export const logger = {
  debug: (message: string, data?: any) => vibe.debug(message, data ? { data } : undefined),
  info: (message: string, data?: any) => vibe.info(message, data ? { data } : undefined),
  warn: (message: string, data?: any) => vibe.warn(message, data ? { data } : undefined),
  error: (message: string, data?: any) => vibe.bad(message, data ? { data } : undefined),
  
  // 構造化ログ
  api: (event: string, data?: any) => {
    vibe.debug(`API: ${event}`, data ? { data } : undefined)
  },
  
  // パフォーマンス計測（Vibeloggerでstoryを使用）
  time: (label: string) => {
    // パフォーマンス測定をstory形式で開始
    return vibe.story(label)
  },
  timeEnd: (story: any) => {
    // storyを完了させる
    if (story && story.end) {
      story.end()
    }
  },
}

// グループ化されたログ（story機能を使用）
export const logGroup = (title: string, fn: () => void) => {
  const story = vibe.story(title)
  try {
    fn()
    story.success()
  } catch (error) {
    story.fail(error instanceof Error ? error.message : String(error))
    throw error
  }
}
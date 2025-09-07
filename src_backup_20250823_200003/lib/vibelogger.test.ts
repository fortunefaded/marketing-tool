import { describe, it, expect, beforeEach, vi } from 'vitest'
import { vibe } from './vibelogger'

describe('Vibelogger', () => {
  beforeEach(() => {
    vibe.clearLogs()
    vi.clearAllMocks()
  })

  describe('ログレベル', () => {
    it('vibeメソッドが正しく動作すること', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      vibe.vibe('通常の処理フロー')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎵'), '')
    })

    it('goodメソッドが正しく動作すること', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      vibe.good('成功した処理')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✨'), '')
    })

    it('badメソッドが正しく動作すること', () => {
      const consoleSpy = vi.spyOn(console, 'error')
      vibe.bad('エラーが発生')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌'), '')
    })

    it('warnメソッドが正しく動作すること', () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      vibe.warn('注意が必要')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️'), '')
    })

    it('infoメソッドが正しく動作すること', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      vibe.info('情報の記録')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ️'), '')
    })

    it('debugメソッドが開発環境で動作すること', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      vibe.debug('デバッグ情報')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔍'), '')
    })

    it('コンテキスト付きログが正しく記録されること', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const context = { userId: 123, action: 'login' }
      vibe.info('ユーザーアクション', context)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ️'), context)
    })
  })

  describe('ストーリーテリング機能', () => {
    it('ストーリーが正しく開始・終了すること', () => {
      const story = vibe.story('キャンペーン作成')
      story.chapter('入力値検証')
      story.chapter('データベース保存')
      story.success('作成完了')
      story.end()

      const stories = vibe.getStories()
      expect(stories).toHaveLength(1)
      expect(stories[0].title).toBe('キャンペーン作成')
      expect(stories[0].status).toBe('success')
      expect(stories[0].chapters).toHaveLength(2)
    })

    it('ストーリーが失敗として記録されること', () => {
      const story = vibe.story('データ取得処理')
      story.chapter('API呼び出し')
      story.fail('ネットワークエラー')

      const stories = vibe.getStories()
      expect(stories[0].status).toBe('failed')
    })

    it('チャプターに詳細情報が含まれること', () => {
      const story = vibe.story('ユーザー登録')
      story.chapter('バリデーション', 'メールアドレスの形式チェック')
      story.end()

      const stories = vibe.getStories()
      expect(stories[0].chapters[0].details).toBe('メールアドレスの形式チェック')
    })
  })

  describe('ログの取得と検索', () => {
    it('すべてのログが取得できること', () => {
      vibe.info('ログ1')
      vibe.warn('ログ2')
      vibe.good('ログ3')

      const logs = vibe.getLogs()
      expect(logs.filter((log) => log.message.startsWith('ログ'))).toHaveLength(3)
    })

    it('レベルでフィルタリングできること', () => {
      vibe.info('情報ログ')
      vibe.warn('警告ログ')
      vibe.bad('エラーログ')

      const warnLogs = vibe.getLogs({ level: 'warn' })
      expect(warnLogs).toHaveLength(1)
      expect(warnLogs[0].message).toBe('警告ログ')
    })

    it('キーワードで検索できること', () => {
      vibe.info('ユーザーがログインしました')
      vibe.info('キャンペーンを作成しました')
      vibe.info('ユーザーがログアウトしました')

      const userLogs = vibe.getLogs({ search: 'ユーザー' })
      expect(userLogs).toHaveLength(2)
    })

    it('日付範囲でフィルタリングできること', async () => {
      const startDate = new Date()
      vibe.info('最初のログ')

      await new Promise((resolve) => setTimeout(resolve, 10))
      vibe.info('2番目のログ')

      const endDate = new Date(startDate.getTime() + 5)
      const filteredLogs = vibe.getLogs({ startDate, endDate })
      const firstLogs = filteredLogs.filter((log) => log.message === '最初のログ')
      expect(firstLogs).toHaveLength(1)
    })
  })

  describe('セッション管理', () => {
    it('セッションIDが生成されること', () => {
      const sessionId = vibe.getCurrentSessionId()
      expect(sessionId).toMatch(/^session-\d+-[a-z0-9]+$/)
    })

    it('新しいセッションが開始できること', () => {
      const oldSessionId = vibe.getCurrentSessionId()
      const newSessionId = vibe.newSession()

      expect(newSessionId).not.toBe(oldSessionId)
      expect(vibe.getCurrentSessionId()).toBe(newSessionId)
    })

    it('セッションIDでログをフィルタリングできること', () => {
      const sessionId1 = vibe.getCurrentSessionId()
      vibe.info('セッション1のログ')

      vibe.newSession()
      vibe.info('セッション2のログ')

      const session1Logs = vibe.getLogs({ sessionId: sessionId1 })
      const session1InfoLogs = session1Logs.filter((log) => log.message === 'セッション1のログ')
      expect(session1InfoLogs).toHaveLength(1)
      expect(session1InfoLogs[0].message).toBe('セッション1のログ')
    })
  })

  describe('ログのクリア', () => {
    it('ログとストーリーがクリアされること', () => {
      vibe.info('テストログ')
      vibe.story('テストストーリー').end()

      expect(vibe.getLogs()).toHaveLength(3) // ログ + ストーリー開始・終了ログ
      expect(vibe.getStories()).toHaveLength(1)

      vibe.clearLogs()

      expect(vibe.getLogs()).toHaveLength(0) // ログがクリアされている
      expect(vibe.getStories()).toHaveLength(0)
    })
  })

  describe('ログの最大数制限', () => {
    it('最大数を超えたら古いログが削除されること', () => {
      // 1000個以上のログを作成
      for (let i = 0; i < 1005; i++) {
        vibe.info(`ログ ${i}`)
      }

      const logs = vibe.getLogs()
      expect(logs.length).toBeLessThanOrEqual(1000)
      expect(logs[0].message).not.toBe('ログ 0') // 最初のログは削除されているはず
    })
  })
})

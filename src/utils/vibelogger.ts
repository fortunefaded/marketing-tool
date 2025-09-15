type LogLevel = 'vibe' | 'good' | 'bad' | 'warn' | 'info' | 'debug' | 'error'

interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  sessionId: string
  context?: Record<string, unknown>
}

interface StoryChapter {
  name: string
  timestamp: Date
  status: 'in_progress' | 'completed' | 'failed'
  details?: string
}

interface Story {
  id: string
  title: string
  startTime: Date
  endTime?: Date
  chapters: StoryChapter[]
  status: 'in_progress' | 'success' | 'failed'
}

class VibeLogger {
  private static instance: VibeLogger
  private logs: LogEntry[] = []
  private stories: Map<string, Story> = new Map()
  private sessionId: string
  private isDevelopment = import.meta.env.DEV
  private maxLogs = 1000

  private constructor() {
    this.sessionId = this.generateSessionId()
  }

  static getInstance(): VibeLogger {
    if (!VibeLogger.instance) {
      VibeLogger.instance = new VibeLogger()
    }
    return VibeLogger.instance
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      vibe: '🎵',
      good: '✨',
      bad: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🔍',
      error: '🚨',
    }
    return emojis[level]
  }

  private formatMessage(level: LogLevel, message: string): string {
    const emoji = this.getEmoji(level)
    const timestamp = new Date().toLocaleTimeString('ja-JP')
    return `${emoji} [${timestamp}] ${message}`
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const formattedMessage = this.formatMessage(level, message)

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      sessionId: this.sessionId,
      context,
    }

    this.logs.push(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    if (level === 'debug' && !this.isDevelopment) {
      return
    }

    switch (level) {
      case 'bad':
      case 'error':
        console.error(formattedMessage, context || '')
        break
      case 'warn':
        console.warn(formattedMessage, context || '')
        break
      default:
        // eslint-disable-next-line no-console
        console.log(formattedMessage, context || '')
    }
  }

  vibe(message: string, context?: Record<string, unknown>): void {
    this.log('vibe', message, context)
  }

  good(message: string, context?: Record<string, unknown>): void {
    this.log('good', message, context)
  }

  bad(message: string, context?: Record<string, unknown>): void {
    this.log('bad', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context)
  }

  story(title: string): {
    chapter: (name: string, details?: string) => void
    success: (message?: string) => void
    fail: (message?: string) => void
    end: () => void
  } {
    const storyId = `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const story: Story = {
      id: storyId,
      title,
      startTime: new Date(),
      chapters: [],
      status: 'in_progress',
    }

    this.stories.set(storyId, story)
    this.vibe(`📖 ストーリー開始: ${title}`)

    return {
      chapter: (name: string, details?: string) => {
        const chapter: StoryChapter = {
          name,
          timestamp: new Date(),
          status: 'in_progress',
          details,
        }
        story.chapters.push(chapter)
        this.info(`📑 チャプター: ${name}`, details ? { details } : undefined)
      },

      success: (message?: string) => {
        story.status = 'success'
        story.endTime = new Date()
        const duration = story.endTime.getTime() - story.startTime.getTime()
        this.good(`🎉 ストーリー完了: ${title}${message ? ` - ${message}` : ''}`, {
          duration: `${duration}ms`,
          chapters: story.chapters.length,
        })
      },

      fail: (message?: string) => {
        story.status = 'failed'
        story.endTime = new Date()
        const duration = story.endTime.getTime() - story.startTime.getTime()
        this.bad(`💔 ストーリー失敗: ${title}${message ? ` - ${message}` : ''}`, {
          duration: `${duration}ms`,
          chapters: story.chapters.length,
        })
      },

      end: () => {
        if (!story.endTime) {
          story.endTime = new Date()
          const duration = story.endTime.getTime() - story.startTime.getTime()
          this.info(`📕 ストーリー終了: ${title}`, {
            duration: `${duration}ms`,
            chapters: story.chapters.length,
          })
        }
      },
    }
  }

  getLogs(filter?: {
    level?: LogLevel
    sessionId?: string
    startDate?: Date
    endDate?: Date
    search?: string
  }): LogEntry[] {
    let filtered = [...this.logs]

    if (filter?.level) {
      filtered = filtered.filter((log) => log.level === filter.level)
    }

    if (filter?.sessionId) {
      filtered = filtered.filter((log) => log.sessionId === filter.sessionId)
    }

    if (filter?.startDate) {
      filtered = filtered.filter((log) => log.timestamp >= filter.startDate!)
    }

    if (filter?.endDate) {
      filtered = filtered.filter((log) => log.timestamp <= filter.endDate!)
    }

    if (filter?.search) {
      const searchLower = filter.search.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.context || {})
            .toLowerCase()
            .includes(searchLower)
      )
    }

    return filtered
  }

  getStories(): Story[] {
    return Array.from(this.stories.values())
  }

  clearLogs(): void {
    this.logs = []
    this.stories.clear()
  }

  newSession(): string {
    this.sessionId = this.generateSessionId()
    this.info(`新しいセッションを開始しました: ${this.sessionId}`)
    return this.sessionId
  }

  getCurrentSessionId(): string {
    return this.sessionId
  }
}

export const vibe = VibeLogger.getInstance()
export type { LogLevel, LogEntry, Story, StoryChapter }

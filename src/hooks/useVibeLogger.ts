import { useEffect, useRef } from 'react'
import { vibe } from '../utils/vibelogger'

interface UseVibeLoggerOptions {
  componentName: string
  trackRenders?: boolean
  trackProps?: boolean
}

interface ExtendedVibeLogger {
  vibe: typeof vibe.vibe
  good: typeof vibe.good
  bad: typeof vibe.bad
  warn: typeof vibe.warn
  info: typeof vibe.info
  debug: typeof vibe.debug
  story: typeof vibe.story
  getLogs: typeof vibe.getLogs
  getStories: typeof vibe.getStories
  clearLogs: typeof vibe.clearLogs
  newSession: typeof vibe.newSession
  getCurrentSessionId: typeof vibe.getCurrentSessionId
  action: (action: string, details?: Record<string, unknown>) => void
  error: (error: string, details?: Record<string, unknown>) => void
  propsChange: (props: Record<string, unknown>) => void
  componentStory: (storyTitle: string) => ReturnType<typeof vibe.story>
}

export function useVibeLogger(options: UseVibeLoggerOptions | string): ExtendedVibeLogger {
  const componentName = typeof options === 'string' ? options : options.componentName
  const trackRenders = typeof options === 'object' ? (options.trackRenders ?? false) : false
  const trackProps = typeof options === 'object' ? (options.trackProps ?? false) : false

  const renderCount = useRef(0)
  const prevPropsRef = useRef<Record<string, unknown>>({})

  useEffect(() => {
    vibe.info(`🏗️ コンポーネントマウント: ${componentName}`)

    return () => {
      vibe.info(`🏚️ コンポーネントアンマウント: ${componentName}`, {
        totalRenders: renderCount.current,
      })
    }
  }, [componentName])

  useEffect(() => {
    if (trackRenders) {
      renderCount.current += 1
      vibe.debug(`🔄 レンダリング: ${componentName} (${renderCount.current}回目)`)
    }
  })

  const logComponentAction = (action: string, details?: Record<string, unknown>) => {
    vibe.info(`[${componentName}] ${action}`, details)
  }

  const logComponentError = (error: string, details?: Record<string, unknown>) => {
    vibe.bad(`[${componentName}] ${error}`, details)
  }

  const logPropsChange = (props: Record<string, unknown>) => {
    if (!trackProps) return

    const changedProps: Record<string, unknown> = {}
    Object.keys(props).forEach((key) => {
      if (prevPropsRef.current[key] !== props[key]) {
        changedProps[key] = {
          old: prevPropsRef.current[key],
          new: props[key],
        }
      }
    })

    if (Object.keys(changedProps).length > 0) {
      vibe.debug(`[${componentName}] Props変更`, changedProps)
    }

    prevPropsRef.current = { ...props }
  }

  const startComponentStory = (storyTitle: string) => {
    return vibe.story(`[${componentName}] ${storyTitle}`)
  }

  return {
    vibe: vibe.vibe.bind(vibe),
    good: vibe.good.bind(vibe),
    bad: vibe.bad.bind(vibe),
    warn: vibe.warn.bind(vibe),
    info: vibe.info.bind(vibe),
    debug: vibe.debug.bind(vibe),
    story: vibe.story.bind(vibe),
    getLogs: vibe.getLogs.bind(vibe),
    getStories: vibe.getStories.bind(vibe),
    clearLogs: vibe.clearLogs.bind(vibe),
    newSession: vibe.newSession.bind(vibe),
    getCurrentSessionId: vibe.getCurrentSessionId.bind(vibe),
    action: logComponentAction,
    error: logComponentError,
    propsChange: logPropsChange,
    componentStory: startComponentStory,
  }
}

export function useComponentLifecycleLogger(componentName: string) {
  const logger = useVibeLogger({
    componentName,
    trackRenders: true,
    trackProps: false,
  })

  return logger
}

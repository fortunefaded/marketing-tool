import { EventEmitter } from 'events'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'failed'

export interface WebSocketOptions {
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  connectionTimeout?: number
  pingInterval?: number
}

export interface MetricsUpdate {
  revenue?: number
  orders?: number
  visitors?: number
  conversionRate?: number
  timestamp: string
}

export interface Alert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  timestamp: string
}

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null
  private url: string
  private options: Required<WebSocketOptions>
  private status: ConnectionStatus = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingTimer: NodeJS.Timeout | null = null
  private connectionTimer: NodeJS.Timeout | null = null
  private lastPingTime: Date | null = null

  constructor(url: string, options: WebSocketOptions = {}) {
    super()
    this.url = url
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 5000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      connectionTimeout: options.connectionTimeout ?? 10000,
      pingInterval: options.pingInterval ?? 30000,
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.status === 'connected') {
        resolve()
        return
      }

      this.updateStatus('connecting')

      try {
        this.ws = new WebSocket(this.url)
        
        // 接続タイムアウト設定
        this.connectionTimer = setTimeout(() => {
          this.ws?.close()
          const error = new Error('Connection timeout')
          this.emit('error', error)
          reject(error)
        }, this.options.connectionTimeout)

        this.ws.onopen = () => {
          if (this.connectionTimer) {
            clearTimeout(this.connectionTimer)
            this.connectionTimer = null
          }
          
          this.updateStatus('connected')
          this.reconnectAttempts = 0
          this.startPingInterval()
          
          this.emit('open')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            // メッセージタイプに応じてイベントを発火
            this.emit('message', data)
            
            if (data.type) {
              this.emit(data.type, data.data)
            }
            
            // pongレスポンスの処理
            if (data.type === 'pong') {
              this.lastPingTime = new Date()
            }
          } catch (error) {
            this.emit('error', new Error('Failed to parse message: ' + event.data))
          }
        }

        this.ws.onerror = (event) => {
          if (this.connectionTimer) {
            clearTimeout(this.connectionTimer)
            this.connectionTimer = null
          }
          
          this.updateStatus('error')
          this.emit('error', event)
          
          if (this.status === 'connecting') {
            reject(new Error('Connection failed'))
          }
        }

        this.ws.onclose = (event) => {
          if (this.connectionTimer) {
            clearTimeout(this.connectionTimer)
            this.connectionTimer = null
          }
          
          this.stopPingInterval()
          this.updateStatus('disconnected')
          this.emit('close', event)
          
          // 自動再接続
          if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this.scheduleReconnect()
          } else if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            this.updateStatus('failed')
            this.emit('reconnect:failed')
          }
        }
      } catch (error) {
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer)
          this.connectionTimer = null
        }
        
        this.updateStatus('error')
        this.emit('error', error)
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.options.autoReconnect = false
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }
    
    this.ws.send(JSON.stringify(data))
  }

  subscribe(channels: string | string[]): void {
    const channelArray = Array.isArray(channels) ? channels : [channels]
    
    if (channelArray.length === 1) {
      this.send({ type: 'subscribe', channel: channelArray[0] })
    } else {
      this.send({ type: 'subscribe', channels: channelArray })
    }
  }

  unsubscribe(channels: string | string[]): void {
    const channelArray = Array.isArray(channels) ? channels : [channels]
    
    if (channelArray.length === 1) {
      this.send({ type: 'unsubscribe', channel: channelArray[0] })
    } else {
      this.send({ type: 'unsubscribe', channels: channelArray })
    }
  }

  acknowledgeAlert(alertId: string): void {
    this.send({ type: 'alert:acknowledge', alertId })
  }

  ping(): void {
    if (this.isConnected()) {
      this.send({ type: 'ping' })
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  getConnectionStatus(): ConnectionStatus {
    return this.status
  }

  getLastPingTime(): Date | null {
    return this.lastPingTime
  }

  private updateStatus(status: ConnectionStatus): void {
    const previous = this.status
    this.status = status
    
    if (previous !== status) {
      this.emit('status:change', { previous, current: status })
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }
    
    this.reconnectAttempts++
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.emit('reconnect:attempt', this.reconnectAttempts)
      
      this.connect().catch(() => {
        // エラーは内部で処理される
      })
    }, this.options.reconnectInterval)
  }

  private startPingInterval(): void {
    if (this.pingTimer) {
      return
    }
    
    this.pingTimer = setInterval(() => {
      this.ping()
    }, this.options.pingInterval)
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}

// シングルトンインスタンス
let wsInstance: WebSocketService | null = null

export function getWebSocketService(url?: string, options?: WebSocketOptions): WebSocketService {
  if (!wsInstance) {
    // デフォルトのURLを使用
    const defaultUrl = url || (typeof window !== 'undefined' && (window as any).process?.env?.VITE_WS_URL) || 'ws://localhost:8080'
    wsInstance = new WebSocketService(defaultUrl, options)
  }
  
  return wsInstance
}

export function closeWebSocketService(): void {
  if (wsInstance) {
    wsInstance.disconnect()
    wsInstance = null
  }
}
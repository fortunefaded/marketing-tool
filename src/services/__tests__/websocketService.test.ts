import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketService } from '../websocketService'
import WS from 'jest-websocket-mock'

// WebSocketのモック
vi.mock('ws', () => ({
  default: vi.fn()
}))

describe('WebSocketService', () => {
  let service: WebSocketService
  let mockServer: WS
  const mockUrl = 'ws://localhost:8080'

  beforeEach(async () => {
    // WebSocketサーバーのモックを作成
    mockServer = new WS(mockUrl)
    service = new WebSocketService(mockUrl)
  })

  afterEach(() => {
    WS.clean()
    service.disconnect()
  })

  describe('接続管理', () => {
    it('WebSocketサーバーに接続できる', async () => {
      await service.connect()
      await mockServer.connected
      
      expect(service.isConnected()).toBe(true)
      expect(service.getConnectionStatus()).toBe('connected')
    })

    it('接続エラーを処理できる', async () => {
      const errorCallback = vi.fn()
      service.on('error', errorCallback)
      
      const connectPromise = service.connect()
      await mockServer.connected
      mockServer.error()
      
      await expect(connectPromise).rejects.toThrow()
      expect(errorCallback).toHaveBeenCalled()
      expect(service.getConnectionStatus()).toBe('error')
    })

    it('切断を処理できる', async () => {
      const closeCallback = vi.fn()
      service.on('close', closeCallback)
      
      await service.connect()
      await mockServer.connected
      
      service.disconnect()
      await mockServer.closed
      
      expect(closeCallback).toHaveBeenCalled()
      expect(service.isConnected()).toBe(false)
      expect(service.getConnectionStatus()).toBe('disconnected')
    })

    it('自動再接続ができる', async () => {
      service = new WebSocketService(mockUrl, { 
        autoReconnect: true,
        reconnectInterval: 100 
      })
      
      await service.connect()
      await mockServer.connected
      
      // 切断をシミュレート
      mockServer.close()
      
      // 再接続を待つ
      await new Promise(resolve => setTimeout(resolve, 150))
      await mockServer.connected
      
      expect(service.isConnected()).toBe(true)
    })
  })

  describe('メッセージ送受信', () => {
    beforeEach(async () => {
      await service.connect()
      await mockServer.connected
    })

    it('メッセージを送信できる', async () => {
      const message = { type: 'subscribe', channel: 'metrics' }
      service.send(message)
      
      await expect(mockServer).toReceiveMessage(JSON.stringify(message))
    })

    it('メッセージを受信できる', async () => {
      const messageCallback = vi.fn()
      service.on('message', messageCallback)
      
      const testMessage = { type: 'update', data: { revenue: 10000 } }
      mockServer.send(JSON.stringify(testMessage))
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(messageCallback).toHaveBeenCalledWith(testMessage)
    })

    it('不正なJSONメッセージを処理できる', async () => {
      const errorCallback = vi.fn()
      service.on('error', errorCallback)
      
      mockServer.send('invalid json {')
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(errorCallback).toHaveBeenCalled()
    })
  })

  describe('イベントハンドリング', () => {
    it('複数のリスナーを登録できる', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      
      service.on('message', listener1)
      service.on('message', listener2)
      
      await service.connect()
      await mockServer.connected
      
      const testMessage = { type: 'test' }
      mockServer.send(JSON.stringify(testMessage))
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(listener1).toHaveBeenCalledWith(testMessage)
      expect(listener2).toHaveBeenCalledWith(testMessage)
    })

    it('リスナーを削除できる', () => {
      const listener = vi.fn()
      
      service.on('message', listener)
      service.off('message', listener)
      
      service.emit('message', { type: 'test' })
      
      expect(listener).not.toHaveBeenCalled()
    })

    it('一度だけ実行されるリスナーを登録できる', () => {
      const listener = vi.fn()
      
      service.once('test-event', listener)
      
      service.emit('test-event', 'data1')
      service.emit('test-event', 'data2')
      
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith('data1')
    })
  })

  describe('チャンネル購読', () => {
    beforeEach(async () => {
      await service.connect()
      await mockServer.connected
    })

    it('チャンネルを購読できる', async () => {
      service.subscribe('revenue')
      
      await expect(mockServer).toReceiveMessage(
        JSON.stringify({ type: 'subscribe', channel: 'revenue' })
      )
    })

    it('複数のチャンネルを購読できる', async () => {
      service.subscribe(['revenue', 'orders', 'visitors'])
      
      await expect(mockServer).toReceiveMessage(
        JSON.stringify({ type: 'subscribe', channels: ['revenue', 'orders', 'visitors'] })
      )
    })

    it('チャンネルの購読を解除できる', async () => {
      service.unsubscribe('revenue')
      
      await expect(mockServer).toReceiveMessage(
        JSON.stringify({ type: 'unsubscribe', channel: 'revenue' })
      )
    })
  })

  describe('メトリクス更新', () => {
    beforeEach(async () => {
      await service.connect()
      await mockServer.connected
    })

    it('メトリクス更新を受信して処理できる', async () => {
      const metricsCallback = vi.fn()
      service.on('metrics:update', metricsCallback)
      
      const metricsData = {
        type: 'metrics:update',
        data: {
          revenue: 50000,
          orders: 150,
          visitors: 5000,
          conversionRate: 3.0,
          timestamp: new Date().toISOString()
        }
      }
      
      mockServer.send(JSON.stringify(metricsData))
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(metricsCallback).toHaveBeenCalledWith(metricsData.data)
    })

    it('増分更新を処理できる', async () => {
      const deltaCallback = vi.fn()
      service.on('metrics:delta', deltaCallback)
      
      const deltaData = {
        type: 'metrics:delta',
        data: {
          revenue: +1000,
          orders: +2,
          timestamp: new Date().toISOString()
        }
      }
      
      mockServer.send(JSON.stringify(deltaData))
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(deltaCallback).toHaveBeenCalledWith(deltaData.data)
    })
  })

  describe('アラート', () => {
    beforeEach(async () => {
      await service.connect()
      await mockServer.connected
    })

    it('アラートを受信できる', async () => {
      const alertCallback = vi.fn()
      service.on('alert', alertCallback)
      
      const alertData = {
        type: 'alert',
        data: {
          id: 'alert-001',
          severity: 'high',
          title: '売上急増',
          message: '過去1時間の売上が通常の200%を超えました',
          timestamp: new Date().toISOString()
        }
      }
      
      mockServer.send(JSON.stringify(alertData))
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(alertCallback).toHaveBeenCalledWith(alertData.data)
    })

    it('アラートの確認を送信できる', async () => {
      service.acknowledgeAlert('alert-001')
      
      await expect(mockServer).toReceiveMessage(
        JSON.stringify({ 
          type: 'alert:acknowledge', 
          alertId: 'alert-001' 
        })
      )
    })
  })

  describe('接続状態管理', () => {
    it('接続状態の変更を通知する', async () => {
      const statusCallback = vi.fn()
      service.on('status:change', statusCallback)
      
      await service.connect()
      await mockServer.connected
      
      expect(statusCallback).toHaveBeenCalledWith({
        previous: 'disconnected',
        current: 'connecting'
      })
      
      expect(statusCallback).toHaveBeenCalledWith({
        previous: 'connecting',
        current: 'connected'
      })
    })

    it('ping/pongでハートビートを実行できる', async () => {
      await service.connect()
      await mockServer.connected
      
      // pingを送信
      service.ping()
      
      // pongを返す
      mockServer.send(JSON.stringify({ type: 'pong' }))
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(service.getLastPingTime()).toBeDefined()
    })
  })

  describe('エラーハンドリング', () => {
    it('接続タイムアウトを処理できる', async () => {
      service = new WebSocketService(mockUrl, { connectionTimeout: 100 })
      
      const errorCallback = vi.fn()
      service.on('error', errorCallback)
      
      // 接続を試みるが、サーバーが応答しない
      const connectPromise = service.connect()
      
      await expect(connectPromise).rejects.toThrow('Connection timeout')
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Connection timeout' })
      )
    })

    it('最大再接続回数に達したら再接続を停止する', async () => {
      service = new WebSocketService(mockUrl, {
        autoReconnect: true,
        maxReconnectAttempts: 2,
        reconnectInterval: 50
      })
      
      const errorCallback = vi.fn()
      service.on('reconnect:failed', errorCallback)
      
      await service.connect()
      await mockServer.connected
      
      // 切断を繰り返す
      mockServer.close()
      await new Promise(resolve => setTimeout(resolve, 100))
      mockServer.close()
      await new Promise(resolve => setTimeout(resolve, 100))
      mockServer.close()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(errorCallback).toHaveBeenCalled()
      expect(service.getConnectionStatus()).toBe('failed')
    })
  })
})
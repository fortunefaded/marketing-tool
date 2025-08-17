// データを効率的に処理するためのチャンク分割ユーティリティ

interface ChunkProcessOptions {
  chunkSize?: number
  delayBetweenChunks?: number
  onProgress?: (progress: number) => void
}

/**
 * 大量のデータを小さなチャンクに分割して処理
 */
export async function processDataInChunks<T, R>(
  data: T[],
  processor: (chunk: T[]) => Promise<R>,
  options: ChunkProcessOptions = {}
): Promise<R[]> {
  const {
    chunkSize = 100,
    delayBetweenChunks = 10,
    onProgress
  } = options

  const results: R[] = []
  // Removed unused totalChunks variable

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    const result = await processor(chunk)
    results.push(result)

    // 進捗を通知
    if (onProgress) {
      const progress = Math.min(100, Math.round(((i + chunkSize) / data.length) * 100))
      onProgress(progress)
    }

    // UIスレッドをブロックしないように遅延を入れる
    if (i + chunkSize < data.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenChunks))
    }
  }

  return results
}

/**
 * Intersection Observerを使用した遅延読み込み
 */
export class LazyLoader<T> {
  private observer: IntersectionObserver | null = null
  private loadedItems = new Set<string>()
  private pendingItems = new Map<string, T>()

  constructor(
    private onLoad: (item: T) => void,
    private options: IntersectionObserverInit = {}
  ) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: '50px',
          threshold: 0.01,
          ...options
        }
      )
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('data-lazy-id')
        if (id && !this.loadedItems.has(id)) {
          this.loadedItems.add(id)
          const item = this.pendingItems.get(id)
          if (item) {
            this.onLoad(item)
            this.pendingItems.delete(id)
          }
        }
      }
    })
  }

  observe(element: Element, id: string, item: T) {
    if (this.observer) {
      element.setAttribute('data-lazy-id', id)
      this.pendingItems.set(id, item)
      this.observer.observe(element)
    } else {
      // IntersectionObserverがサポートされていない場合は即座に読み込む
      this.onLoad(item)
    }
  }

  unobserve(element: Element) {
    if (this.observer) {
      this.observer.unobserve(element)
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
      this.pendingItems.clear()
      this.loadedItems.clear()
    }
  }
}

/**
 * 仮想化リストのためのユーティリティ
 */
export class VirtualList<T> {
  private visibleRange = { start: 0, end: 0 }
  private itemHeights = new Map<number, number>()
  private averageItemHeight = 50

  constructor(
    private items: T[],
    private containerHeight: number,
    private defaultItemHeight: number = 50
  ) {
    this.averageItemHeight = defaultItemHeight
  }

  setItemHeight(index: number, height: number) {
    this.itemHeights.set(index, height)
    this.updateAverageHeight()
  }

  private updateAverageHeight() {
    if (this.itemHeights.size === 0) return
    
    const totalHeight = Array.from(this.itemHeights.values()).reduce((sum, h) => sum + h, 0)
    this.averageItemHeight = totalHeight / this.itemHeights.size
  }

  getVisibleItems(scrollTop: number): { items: T[]; offset: number } {
    const buffer = 5 // 上下に余分に描画する項目数
    
    // 可視範囲を計算
    let accumulatedHeight = 0
    let startIndex = 0
    let endIndex = 0

    for (let i = 0; i < this.items.length; i++) {
      const itemHeight = this.itemHeights.get(i) || this.averageItemHeight
      
      if (accumulatedHeight + itemHeight > scrollTop && startIndex === 0) {
        startIndex = Math.max(0, i - buffer)
      }
      
      if (accumulatedHeight > scrollTop + this.containerHeight && endIndex === 0) {
        endIndex = Math.min(this.items.length, i + buffer)
        break
      }
      
      accumulatedHeight += itemHeight
    }

    if (endIndex === 0) {
      endIndex = this.items.length
    }

    // オフセットを計算
    let offset = 0
    for (let i = 0; i < startIndex; i++) {
      offset += this.itemHeights.get(i) || this.averageItemHeight
    }

    this.visibleRange = { start: startIndex, end: endIndex }
    
    return {
      items: this.items.slice(startIndex, endIndex),
      offset
    }
  }

  getTotalHeight(): number {
    let totalHeight = 0
    for (let i = 0; i < this.items.length; i++) {
      totalHeight += this.itemHeights.get(i) || this.averageItemHeight
    }
    return totalHeight
  }

  getVisibleRange() {
    return { ...this.visibleRange }
  }
}

/**
 * Web Workerを使用したバックグラウンド処理
 */
export class BackgroundProcessor {
  private worker: Worker | null = null

  constructor(workerScript: string) {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(workerScript)
      } catch (error) {
        console.error('Failed to create Web Worker:', error)
      }
    }
  }

  async process<T, R>(data: T, type: string): Promise<R> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Web Worker not available'))
        return
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === `${type}_result`) {
          this.worker!.removeEventListener('message', messageHandler)
          resolve(event.data.result)
        } else if (event.data.type === `${type}_error`) {
          this.worker!.removeEventListener('message', messageHandler)
          reject(new Error(event.data.error))
        }
      }

      this.worker.addEventListener('message', messageHandler)
      this.worker.postMessage({ type, data })
    })
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}
// Rate Limit Manager - Green Phase Minimal Implementation
// Manages API call rate limiting for Meta API

export class RateLimitManager {
  private callHistory: number[] = []
  private maxCalls: number
  private windowMs: number

  constructor(maxCalls: number, windowMs: number) {
    this.maxCalls = maxCalls
    this.windowMs = windowMs
  }

  canMakeCall(): boolean {
    this.cleanOldCalls()
    return this.callHistory.length < this.maxCalls
  }

  recordCall(): void {
    this.callHistory.push(Date.now())
  }

  getWaitTime(): number {
    if (this.canMakeCall()) {
      return 0
    }
    
    this.cleanOldCalls()
    if (this.callHistory.length === 0) {
      return 0
    }
    
    const oldestCall = Math.min(...this.callHistory)
    const waitTime = (oldestCall + this.windowMs) - Date.now()
    return Math.max(0, waitTime)
  }

  getRemainingCalls(): number {
    this.cleanOldCalls()
    return Math.max(0, this.maxCalls - this.callHistory.length)
  }

  private cleanOldCalls(): void {
    const cutoff = Date.now() - this.windowMs
    this.callHistory = this.callHistory.filter(time => time > cutoff)
  }
}
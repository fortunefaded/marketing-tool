export interface FatigueData {
  adId: string
  adName: string
  score: number
  status: 'healthy' | 'caution' | 'warning' | 'critical'
  metrics: {
    frequency: number
    ctr: number
    cpm: number
  }
}
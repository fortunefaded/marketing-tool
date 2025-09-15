// ECForce関連の型定義
export interface ECForcePerformanceData {
  _id?: string
  importId: string
  hash: string
  advertiser: string
  advertiserNormalized: string
  dataDate: string
  orderAmount: number
  salesAmount: number
  cost: number
  accessCount: number
  cvOrder: number
  cvrOrder: number
  cvPayment: number
  cvrPayment: number
  cvUpsell: number
  cvThanksUpsell: number
  cvThanksCrossSell: number
  offerRateUpsell: number
  offerRateThanksUpsell: number
  offerRateThanksCrossSell: number
  paymentRate?: number
  realCPA?: number
  roas?: number
  createdAt: number
  updatedAt: number
}

export interface ECForceImport {
  _id?: string
  importId: string
  fileName?: string
  fileSize?: number
  dataDate: string
  source: 'manual' | 'scheduled'
  status: 'processing' | 'success' | 'partial' | 'failed'
  totalRows: number
  filteredRows: number
  processedRows: number
  successRows: number
  errorRows: number
  duplicateRows: number
  errors?: Array<{
    row: number
    advertiser?: string
    message: string
  }>
  startedAt: number
  completedAt?: number
  createdBy?: string
}

export interface ECForceSyncConfig {
  _id?: string
  enabled: boolean
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string // HH:MM
    timezone: string
    lastRun?: number
    nextRun?: number
  }
  updatedAt?: number
}

export interface UploadState {
  file: File | null
  dataDate: string
  isUploading: boolean
  uploadProgress: number
  previewData: any[] | null
  errors: string[]
  skipDuplicates: boolean
}

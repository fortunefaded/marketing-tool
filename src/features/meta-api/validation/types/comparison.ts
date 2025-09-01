// Comparison Types for Ad Manager Data

export interface AdManagerExport {
  ad_id: string
  ad_name?: string
  campaign_id?: string
  campaign_name?: string
  date?: string
  impressions: number
  clicks: number
  spend: number
  conversions?: number
  ctr?: number
  cpc?: number
  cpm?: number
  frequency?: number
  reach?: number
  currency?: string
}

export interface ComparisonResult {
  ad_id: string
  date?: string
  matches: boolean
  differences: FieldDifference[]
  possibleCauses: string[]
  confidence: number
}

export interface FieldDifference {
  field: string
  apiValue: number
  csvValue: number
  difference: number
  percentageDifference: number
  withinTolerance: boolean
}

export interface ComparisonConfig {
  tolerances: {
    spend: number      // e.g., 0.01 for 1% tolerance
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    cpm: number
    frequency: number
    reach: number
  }
  checkCurrency: boolean
  checkTimezone: boolean
  checkAttribution: boolean
}
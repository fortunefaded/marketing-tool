// Data Validation Types

export interface NumericNormalizationConfig {
  currency: {
    accountCurrency: string
    displayCurrency: string
    exchangeRates?: Record<string, number>
    decimalPlaces: number
  }
  percentageHandling: {
    apiFormat: 'decimal' | 'percentage'
    displayFormat: 'decimal' | 'percentage'
  }
  rounding: {
    method: 'round' | 'floor' | 'ceil'
    precision: number
  }
}

export interface TimeRangeConfig {
  timezone: string
  accountTimezone: string
  timezoneOffset?: number
  adjustForDST: boolean
  inclusionMode: 'inclusive' | 'exclusive'
}

export interface AttributionConfig {
  clickWindow: string
  viewWindow: string
  useUnifiedAttribution: boolean
}

export interface AdInsight {
  ad_id?: string
  ad_name?: string
  impressions?: string | number
  clicks?: string | number
  spend?: string | number
  ctr?: string | number
  cpc?: string | number
  cpm?: string | number
  frequency?: string | number
  reach?: string | number
  account_currency?: string
  date_start?: string
  date_stop?: string
  [key: string]: any
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error'
  value?: any
}

export interface ValidationWarning {
  field: string
  message: string
  severity: 'warning'
  value?: any
  threshold?: number
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  normalizedData?: AdInsight
}

export interface DataValidation {
  validateMetrics(data: AdInsight): ValidationResult
  normalizeNumericValues(value: string | number | undefined | null, precision?: number): number
  applyCurrencyConversion(amount: number, currency: string): number
  normalizePercentage(value: string | number): number
  normalizeDateWithTimezone(date: string, timezone?: string): Date
}
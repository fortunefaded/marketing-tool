import type {
  NumericNormalizationConfig,
  TimeRangeConfig,
  AttributionConfig,
  AdInsight,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DataValidation
} from './types/data-validation'
import type {
  AdManagerExport,
  ComparisonResult,
  FieldDifference,
  ComparisonConfig
} from './types/comparison'

export class DataValidator implements DataValidation {
  private static readonly DEFAULT_COMPARISON_CONFIG: ComparisonConfig = {
    tolerances: {
      spend: 0.01,      // 1% tolerance
      impressions: 0.01,
      clicks: 0.01,
      ctr: 0.05,        // 5% tolerance for rates
      cpc: 0.02,
      cpm: 0.02,
      frequency: 0.05,
      reach: 0.01
    },
    checkCurrency: true,
    checkTimezone: true,
    checkAttribution: true
  }

  constructor(
    private normalizationConfig: NumericNormalizationConfig,
    private timeRangeConfig: TimeRangeConfig,
    private attributionConfig: AttributionConfig
  ) {}

  normalizeNumericValues(value: string | number | undefined | null, precision?: number): number {
    // Handle undefined/null
    if (value === undefined || value === null || value === '') {
      return 0
    }

    let numericValue: number

    // Convert string to number
    if (typeof value === 'string') {
      // Remove commas from string
      const cleanedValue = value.replace(/,/g, '')
      numericValue = parseFloat(cleanedValue)
    } else {
      numericValue = value
    }

    // Apply rounding if precision is specified
    if (precision !== undefined && !isNaN(numericValue)) {
      return Math.round(numericValue * Math.pow(10, precision)) / Math.pow(10, precision)
    }

    return numericValue
  }

  validateMetrics(data: AdInsight): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check required fields
    if (!data.ad_id) {
      errors.push({
        field: 'ad_id',
        message: 'Required field ad_id is missing',
        severity: 'error'
      })
    } else if (typeof data.ad_id !== 'string') {
      errors.push({
        field: 'ad_id',
        message: 'ad_id must be of type string',
        severity: 'error',
        value: data.ad_id
      })
    }

    if (!data.ad_name) {
      errors.push({
        field: 'ad_name',
        message: 'Required field ad_name is missing',
        severity: 'error'
      })
    }

    // Validate CTR
    if (data.ctr !== undefined) {
      const ctr = this.normalizeNumericValues(data.ctr)
      if (ctr > 100) {
        warnings.push({
          field: 'ctr',
          message: 'CTR exceeds 100%, which is unusual',
          severity: 'warning',
          value: ctr,
          threshold: 100
        })
      }
    }

    // Validate Frequency
    if (data.frequency !== undefined) {
      const frequency = this.normalizeNumericValues(data.frequency)
      if (frequency > 3.5) {  // Changed threshold from 50 to 3.5 as per requirements
        warnings.push({
          field: 'frequency',
          message: 'High frequency detected, may indicate ad fatigue',
          severity: 'warning',
          value: frequency,
          threshold: 3.5
        })
      }
    }

    // Normalize all numeric fields
    const normalizedData: AdInsight = { ...data }
    const numericFields = [
      'impressions', 'clicks', 'spend', 'ctr', 'cpc', 'cpm', 
      'frequency', 'reach'
    ]

    for (const field of numericFields) {
      // Always normalize numeric fields, even if undefined
      normalizedData[field] = this.normalizeNumericValues(data[field])
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedData
    }
  }

  applyCurrencyConversion(amount: number, currency: string): number {
    const { accountCurrency, displayCurrency, exchangeRates } = this.normalizationConfig.currency

    // No conversion needed if currencies match
    if (currency === displayCurrency) {
      return amount
    }

    // Check if we have exchange rate
    if (exchangeRates && exchangeRates[currency]) {
      return amount * exchangeRates[currency]
    }

    // Return original amount if no exchange rate available
    return amount
  }

  normalizePercentage(value: string | number): number {
    const numericValue = typeof value === 'string' 
      ? parseFloat(value) 
      : value

    const { apiFormat, displayFormat } = this.normalizationConfig.percentageHandling

    // No conversion needed if formats match
    if (apiFormat === displayFormat) {
      return numericValue
    }

    // Convert from decimal to percentage (0.05 -> 5)
    if (apiFormat === 'decimal' && displayFormat === 'percentage') {
      return numericValue * 100
    }

    // Convert from percentage to decimal (5 -> 0.05)
    if (apiFormat === 'percentage' && displayFormat === 'decimal') {
      return numericValue / 100
    }

    return numericValue
  }

  normalizeDateWithTimezone(date: string, timezone?: string): Date {
    const dateObj = new Date(date)
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return dateObj // Return Invalid Date
    }

    // Apply timezone offset if provided
    const tz = timezone || this.timeRangeConfig.timezone
    const offset = this.timeRangeConfig.timezoneOffset

    if (offset !== undefined) {
      // Offset is in minutes, convert to milliseconds
      const offsetMs = offset * 60 * 1000
      return new Date(dateObj.getTime() + offsetMs)
    }

    return dateObj
  }

  compareWithAdManager(
    apiData: AdInsight,
    csvData: AdManagerExport,
    config: ComparisonConfig = DataValidator.DEFAULT_COMPARISON_CONFIG
  ): ComparisonResult {
    const differences: FieldDifference[] = []
    const possibleCauses: string[] = []

    // Compare numeric fields
    const fieldsToCompare = ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'frequency', 'reach']
    
    for (const field of fieldsToCompare) {
      if (apiData[field] !== undefined && csvData[field as keyof AdManagerExport] !== undefined) {
        const apiValue = this.normalizeNumericValues(apiData[field])
        const csvValue = csvData[field as keyof AdManagerExport] as number
        
        const difference = Math.abs(apiValue - csvValue)
        const percentageDifference = csvValue !== 0 
          ? (difference / csvValue) 
          : (apiValue !== 0 ? 1 : 0)
        
        const tolerance = config.tolerances[field as keyof typeof config.tolerances]
        const withinTolerance = percentageDifference <= tolerance

        if (!withinTolerance) {
          differences.push({
            field,
            apiValue,
            csvValue,
            difference,
            percentageDifference,
            withinTolerance
          })
        }
      }
    }

    // Check for currency mismatch
    if (config.checkCurrency && differences.some(d => d.field === 'spend')) {
      const spendDiff = differences.find(d => d.field === 'spend')
      if (spendDiff && spendDiff.percentageDifference > 0.5) {
        possibleCauses.push('Currency conversion mismatch')
      }
    }

    // Check for timezone issues
    if (config.checkTimezone && apiData.date_start && csvData.date) {
      const apiDate = new Date(apiData.date_start).toDateString()
      const csvDate = new Date(csvData.date).toDateString()
      if (apiDate !== csvDate) {
        possibleCauses.push('Timezone difference affecting date boundaries')
      }
    }

    // Check for attribution window differences
    if (config.checkAttribution && differences.some(d => ['clicks', 'conversions'].includes(d.field))) {
      possibleCauses.push('Attribution window settings may differ')
    }

    // Calculate confidence score
    const confidence = this.calculateConfidence(differences, fieldsToCompare.length)

    return {
      ad_id: apiData.ad_id || csvData.ad_id,
      date: apiData.date_start || csvData.date,
      matches: differences.length === 0,
      differences,
      possibleCauses,
      confidence
    }
  }

  private calculateConfidence(differences: FieldDifference[], totalFields: number): number {
    if (differences.length === 0) return 1.0

    const avgPercentageDiff = differences.reduce((sum, d) => sum + d.percentageDifference, 0) / differences.length
    const fieldsMismatched = differences.length / totalFields

    // Confidence decreases with more mismatches and larger differences
    const confidence = Math.max(0, 1 - (fieldsMismatched * 0.5) - (avgPercentageDiff * 0.5))
    
    return Math.round(confidence * 100) / 100
  }
}
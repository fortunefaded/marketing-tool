// Delivery Pattern Analyzer - Green Phase Minimal Implementation
// Analyzes ad delivery patterns from Meta API data

import type { MetaAdInsight, DeliveryAnalysis, DeliveryPattern } from '../types'

export function analyzeDeliveryPattern(
  data: MetaAdInsight[],
  dateRange: { start: string; end: string }
): DeliveryAnalysis {
  // Calculate requested days
  const startDate = new Date(dateRange.start)
  const endDate = new Date(dateRange.end)
  const timeDiff = endDate.getTime() - startDate.getTime()
  const totalRequestedDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1

  // Get actual delivery days
  const actualDeliveryDays = data.length
  const deliveryRatio = actualDeliveryDays / totalRequestedDays

  // Determine delivery pattern
  let deliveryPattern: DeliveryPattern
  if (actualDeliveryDays === 0) {
    deliveryPattern = 'none'
  } else if (deliveryRatio === 1.0) {
    deliveryPattern = 'continuous'
  } else if (actualDeliveryDays === 1 && totalRequestedDays > 1) {
    deliveryPattern = 'single'
  } else if (deliveryRatio > 0.7) {
    deliveryPattern = 'partial'
  } else {
    deliveryPattern = 'intermittent'
  }

  // Find first and last delivery dates
  let firstDeliveryDate: string | undefined
  let lastDeliveryDate: string | undefined

  if (data.length > 0) {
    const dates = data.map(d => d.date_start).sort()
    firstDeliveryDate = dates[0]
    lastDeliveryDate = dates[dates.length - 1]
  }

  return {
    totalRequestedDays,
    actualDeliveryDays,
    deliveryRatio,
    deliveryPattern,
    firstDeliveryDate,
    lastDeliveryDate
  }
}
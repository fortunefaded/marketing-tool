interface KPIInput {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue?: number
}

interface KPIResult extends KPIInput {
  roas: number
  cpa: number
  ctr: number
  cvr: number
  cpm: number
}

/**
 * Calculate Return on Ad Spend (ROAS)
 * @param revenue Total revenue generated
 * @param spend Total ad spend
 * @returns ROAS value (revenue / spend)
 */
export function calculateROAS(revenue: number, spend: number): number {
  if (spend === 0 || revenue === 0) return 0
  return Math.round((revenue / spend) * 100) / 100
}

/**
 * Calculate Cost Per Acquisition (CPA)
 * @param spend Total ad spend
 * @param conversions Total conversions
 * @returns CPA value (spend / conversions)
 */
export function calculateCPA(spend: number, conversions: number): number {
  if (conversions === 0 || spend === 0) return 0
  return Math.round((spend / conversions) * 100) / 100
}

/**
 * Calculate Click-Through Rate (CTR)
 * @param clicks Total clicks
 * @param impressions Total impressions
 * @returns CTR as percentage
 */
export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions === 0 || clicks === 0) return 0
  return Math.round((clicks / impressions) * 10000) / 100
}

/**
 * Calculate Conversion Rate (CVR)
 * @param conversions Total conversions
 * @param clicks Total clicks
 * @returns CVR as percentage
 */
export function calculateCVR(conversions: number, clicks: number): number {
  if (clicks === 0 || conversions === 0) return 0
  return Math.round((conversions / clicks) * 10000) / 100
}

/**
 * Calculate Cost Per Mille (CPM) - cost per 1000 impressions
 * @param spend Total ad spend
 * @param impressions Total impressions
 * @returns CPM value
 */
export function calculateCPM(spend: number, impressions: number): number {
  if (impressions === 0 || spend === 0) return 0
  return Math.round((spend / impressions) * 100000) / 100
}

/**
 * Calculate all KPIs from raw insight data
 * @param input Raw insight data
 * @returns Calculated KPIs
 */
export function calculateKPIs(input: KPIInput): KPIResult {
  const { impressions, clicks, spend, conversions, revenue } = input

  return {
    ...input,
    roas: calculateROAS(revenue || 0, spend),
    cpa: calculateCPA(spend, conversions),
    ctr: calculateCTR(clicks, impressions),
    cvr: calculateCVR(conversions, clicks),
    cpm: calculateCPM(spend, impressions),
  }
}

/**
 * Aggregate multiple KPI records into a single summary
 * @param records Array of KPI records
 * @returns Aggregated KPIs
 */
export function aggregateKPIs(records: KPIResult[]): KPIResult {
  if (records.length === 0) {
    return {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      revenue: 0,
      roas: 0,
      cpa: 0,
      ctr: 0,
      cvr: 0,
      cpm: 0,
    }
  }

  // Sum up the raw metrics
  const totals = records.reduce(
    (acc, record) => ({
      impressions: acc.impressions + record.impressions,
      clicks: acc.clicks + record.clicks,
      spend: acc.spend + record.spend,
      conversions: acc.conversions + record.conversions,
      revenue: acc.revenue + (record.revenue || 0),
    }),
    {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      revenue: 0,
    }
  )

  // Recalculate KPIs based on aggregated totals
  return calculateKPIs(totals)
}

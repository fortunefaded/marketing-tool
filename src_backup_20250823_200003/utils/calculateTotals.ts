export interface TableRow {
  category: string
  subCategory?: string
  details?: string
  clicks?: string
  uniquePv?: string
  directContribution?: string
  purchaseCount?: string
  purchaseUsers?: string
  sampleCv19?: string
  cv?: string
  cvr?: string
  cost?: string
  _highlight?: string
  [key: string]: string | undefined
}

/**
 * Parse a formatted number string (e.g., "1,234,567" or "¥1,234,567") to a number
 */
function parseFormattedNumber(value: string | undefined): number {
  if (!value || value === '-' || value === '') return 0

  // Remove currency symbols, commas, and percentage signs
  const cleanValue = value.replace(/[¥,％%]/g, '').trim()
  const parsed = parseFloat(cleanValue)

  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format a number with thousand separators
 */
function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

/**
 * Format a currency value
 */
function formatCurrency(value: number): string {
  return `¥${formatNumber(value)}`
}

/**
 * Format a percentage value
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Calculate totals for table data
 */
export function calculateTotals(data: TableRow[]): TableRow {
  if (data.length === 0) {
    return {
      category: '合計',
      subCategory: '',
      details: '0',
      clicks: '0',
      uniquePv: '0',
      directContribution: '',
      purchaseCount: '0',
      purchaseUsers: '0',
      sampleCv19: '0',
      cv: '0',
      cvr: '0.00%',
      cost: '¥0',
      _highlight: 'summary',
    }
  }

  // Calculate sums for numeric columns
  const totals = data.reduce(
    (acc, row) => {
      return {
        details: acc.details + parseFormattedNumber(row.details),
        clicks: acc.clicks + parseFormattedNumber(row.clicks),
        uniquePv: acc.uniquePv + parseFormattedNumber(row.uniquePv),
        purchaseCount: acc.purchaseCount + parseFormattedNumber(row.purchaseCount),
        purchaseUsers: acc.purchaseUsers + parseFormattedNumber(row.purchaseUsers),
        sampleCv19: acc.sampleCv19 + parseFormattedNumber(row.sampleCv19),
        cv: acc.cv + parseFormattedNumber(row.cv),
        cost: acc.cost + parseFormattedNumber(row.cost),
      }
    },
    {
      details: 0,
      clicks: 0,
      uniquePv: 0,
      purchaseCount: 0,
      purchaseUsers: 0,
      sampleCv19: 0,
      cv: 0,
      cost: 0,
    }
  )

  // Calculate CVR (CV / clicks * 100)
  const cvr = totals.clicks > 0 ? (totals.cv / totals.clicks) * 100 : 0

  // Format the result
  return {
    category: '合計',
    subCategory: '',
    details: formatNumber(totals.details),
    clicks: formatNumber(totals.clicks),
    uniquePv: totals.uniquePv > 0 ? formatNumber(totals.uniquePv) : '',
    directContribution: '',
    purchaseCount: totals.purchaseCount > 0 ? formatNumber(totals.purchaseCount) : '',
    purchaseUsers: totals.purchaseUsers > 0 ? formatNumber(totals.purchaseUsers) : '',
    sampleCv19: totals.sampleCv19 > 0 ? formatNumber(totals.sampleCv19) : '',
    cv: formatNumber(totals.cv),
    cvr: formatPercentage(cvr),
    cost: formatCurrency(totals.cost),
    _highlight: 'summary',
  }
}

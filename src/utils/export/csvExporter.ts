import { ECForceOrder } from '../../types/ecforce'

export const exportToCSV = async (
  orders: ECForceOrder[],
  reportType: 'sales' | 'customer' | 'product' | 'full'
): Promise<void> => {
  let csvContent = ''
  let filename = ''

  switch (reportType) {
    case 'sales':
      csvContent = generateSalesCSV(orders)
      filename = `売上レポート_${getDateString()}.csv`
      break
    case 'customer':
      csvContent = generateCustomerCSV(orders)
      filename = `顧客レポート_${getDateString()}.csv`
      break
    case 'product':
      csvContent = generateProductCSV(orders)
      filename = `商品レポート_${getDateString()}.csv`
      break
    case 'full':
    default:
      csvContent = generateFullCSV(orders)
      filename = `ECForce全データ_${getDateString()}.csv`
  }

  // BOMを追加（Excelで日本語が文字化けしないように）
  const bom = new Uint8Array([0xef, 0xbb, 0xbf])
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const generateFullCSV = (orders: ECForceOrder[]): string => {
  const headers = [
    '受注番号',
    '受注日',
    '顧客番号',
    'メールアドレス',
    '購入商品',
    '購入オファー',
    '広告主名',
    'ランディングページ',
    '購入URL',
    '小計',
    '消費税',
    '送料',
    '合計',
    '決済方法',
    '定期ステータス',
    '定期回数',
    '定期間隔',
    '配送先郵便番号',
    '配送先都道府県',
    '配送先市区町村',
    '配送先住所',
    '配送先氏名'
  ]

  const rows = orders.map(order => [
    order.受注番号,
    order.受注日,
    order.顧客番号,
    order.メールアドレス,
    order.購入商品?.join('、') || '',
    order.購入オファー || '',
    order.広告主名 || '',
    order.ランディングページ || '',
    order.購入URL || '',
    order.小計,
    order.消費税,
    order.送料,
    order.合計,
    order.決済方法 || '',
    order.定期ステータス || '',
    order.定期回数 || '',
    order.定期間隔 || '',
    order.配送先郵便番号 || '',
    order.配送先都道府県 || '',
    order.配送先市区町村 || '',
    order.配送先住所 || '',
    order.配送先氏名 || ''
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
}

const generateSalesCSV = (orders: ECForceOrder[]): string => {
  // 日付別の売上集計
  const salesByDate = new Map<string, {
    count: number
    revenue: number
    tax: number
    shipping: number
    total: number
  }>()

  orders.forEach(order => {
    const date = order.受注日.split(' ')[0]
    const current = salesByDate.get(date) || {
      count: 0,
      revenue: 0,
      tax: 0,
      shipping: 0,
      total: 0
    }

    salesByDate.set(date, {
      count: current.count + 1,
      revenue: current.revenue + (order.小計 || 0),
      tax: current.tax + (order.消費税 || 0),
      shipping: current.shipping + (order.送料 || 0),
      total: current.total + (order.合計 || 0)
    })
  })

  const headers = ['日付', '注文数', '売上', '消費税', '送料', '合計']
  const rows = Array.from(salesByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => [
      date,
      data.count,
      data.revenue,
      data.tax,
      data.shipping,
      data.total
    ])

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

const generateCustomerCSV = (orders: ECForceOrder[]): string => {
  // 顧客別の集計
  const customerMap = new Map<string, {
    email: string
    orderCount: number
    totalRevenue: number
    firstOrder: string
    lastOrder: string
    isSubscriber: boolean
  }>()

  orders.forEach(order => {
    const current = customerMap.get(order.顧客番号) || {
      email: order.メールアドレス,
      orderCount: 0,
      totalRevenue: 0,
      firstOrder: order.受注日,
      lastOrder: order.受注日,
      isSubscriber: false
    }

    customerMap.set(order.顧客番号, {
      email: current.email,
      orderCount: current.orderCount + 1,
      totalRevenue: current.totalRevenue + (order.合計 || 0),
      firstOrder: order.受注日 < current.firstOrder ? order.受注日 : current.firstOrder,
      lastOrder: order.受注日 > current.lastOrder ? order.受注日 : current.lastOrder,
      isSubscriber: current.isSubscriber || order.定期ステータス === '有効'
    })
  })

  const headers = ['顧客番号', 'メールアドレス', '注文回数', '累計購入金額', '初回購入日', '最終購入日', '定期購入']
  const rows = Array.from(customerMap.entries()).map(([customerId, data]) => [
    customerId,
    data.email,
    data.orderCount,
    data.totalRevenue,
    data.firstOrder,
    data.lastOrder,
    data.isSubscriber ? '有' : '無'
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
}

const generateProductCSV = (orders: ECForceOrder[]): string => {
  // 商品別の集計
  const productMap = new Map<string, {
    orderCount: number
    totalRevenue: number
    customers: Set<string>
  }>()

  orders.forEach(order => {
    order.購入商品?.forEach(product => {
      const current = productMap.get(product) || {
        orderCount: 0,
        totalRevenue: 0,
        customers: new Set()
      }

      current.orderCount++
      current.totalRevenue += order.小計 / (order.購入商品?.length || 1) // 商品数で按分
      current.customers.add(order.顧客番号)

      productMap.set(product, current)
    })
  })

  const headers = ['商品名', '注文数', '売上金額', '購入顧客数', '平均単価']
  const rows = Array.from(productMap.entries())
    .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
    .map(([product, data]) => [
      product,
      data.orderCount,
      Math.round(data.totalRevenue),
      data.customers.size,
      Math.round(data.totalRevenue / data.orderCount)
    ])

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

const getDateString = (): string => {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
}
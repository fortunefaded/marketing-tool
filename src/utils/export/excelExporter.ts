import * as XLSX from 'xlsx'
import { ECForceOrder } from '../../types/ecforce'

export const exportToExcel = async (
  orders: ECForceOrder[],
  reportType: 'sales' | 'customer' | 'product' | 'full'
): Promise<void> => {
  const workbook = XLSX.utils.book_new()
  let filename = ''

  switch (reportType) {
    case 'sales':
      addSalesSheets(workbook, orders)
      filename = `売上レポート_${getDateString()}.xlsx`
      break
    case 'customer':
      addCustomerSheets(workbook, orders)
      filename = `顧客レポート_${getDateString()}.xlsx`
      break
    case 'product':
      addProductSheets(workbook, orders)
      filename = `商品レポート_${getDateString()}.xlsx`
      break
    case 'full':
    default:
      addFullDataSheet(workbook, orders)
      addSalesSheets(workbook, orders)
      addCustomerSheets(workbook, orders)
      addProductSheets(workbook, orders)
      filename = `ECForce分析レポート_${getDateString()}.xlsx`
  }

  // Excelファイルを生成してダウンロード
  XLSX.writeFile(workbook, filename)
}

const addFullDataSheet = (workbook: XLSX.WorkBook, orders: ECForceOrder[]) => {
  const data = orders.map(order => ({
    '受注番号': order.受注番号,
    '受注日': order.受注日,
    '顧客番号': order.顧客番号,
    'メールアドレス': order.メールアドレス,
    '購入商品': order.購入商品?.join('、') || '',
    '購入オファー': order.購入オファー || '',
    '広告主名': order.広告主名 || '',
    'ランディングページ': order.ランディングページ || '',
    '購入URL': order.購入URL || '',
    '小計': order.小計,
    '消費税': order.消費税,
    '送料': order.送料,
    '合計': order.合計,
    '決済方法': order.決済方法 || '',
    '定期ステータス': order.定期ステータス || '',
    '定期回数': order.定期回数 || '',
    '定期間隔': order.定期間隔 || '',
    '配送先郵便番号': order.配送先郵便番号 || '',
    '配送先都道府県': order.配送先都道府県 || '',
    '配送先市区町村': order.配送先市区町村 || '',
    '配送先住所': order.配送先住所 || '',
    '配送先氏名': order.配送先氏名 || ''
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, '全データ')

  // 列幅の自動調整
  const maxWidths: number[] = []
  const headers = Object.keys(data[0] || {})
  headers.forEach((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...data.map(row => String(row[header as keyof typeof row] || '').length)
    )
    maxWidths[index] = Math.min(maxLength + 2, 50)
  })
  worksheet['!cols'] = maxWidths.map(w => ({ wch: w }))
}

const addSalesSheets = (workbook: XLSX.WorkBook, orders: ECForceOrder[]) => {
  // 日別売上
  const dailySales = calculateDailySales(orders)
  const dailySheet = XLSX.utils.json_to_sheet(dailySales)
  XLSX.utils.book_append_sheet(workbook, dailySheet, '日別売上')

  // 月別売上
  const monthlySales = calculateMonthlySales(orders)
  const monthlySheet = XLSX.utils.json_to_sheet(monthlySales)
  XLSX.utils.book_append_sheet(workbook, monthlySheet, '月別売上')

  // オファー別売上
  const offerSales = calculateOfferSales(orders)
  const offerSheet = XLSX.utils.json_to_sheet(offerSales)
  XLSX.utils.book_append_sheet(workbook, offerSheet, 'オファー別売上')
}

const addCustomerSheets = (workbook: XLSX.WorkBook, orders: ECForceOrder[]) => {
  // 顧客分析
  const customerAnalysis = calculateCustomerAnalysis(orders)
  const customerSheet = XLSX.utils.json_to_sheet(customerAnalysis)
  XLSX.utils.book_append_sheet(workbook, customerSheet, '顧客分析')

  // 顧客セグメント
  const segments = calculateCustomerSegments(orders)
  const segmentSheet = XLSX.utils.json_to_sheet(segments)
  XLSX.utils.book_append_sheet(workbook, segmentSheet, '顧客セグメント')
}

const addProductSheets = (workbook: XLSX.WorkBook, orders: ECForceOrder[]) => {
  // 商品別売上
  const productSales = calculateProductSales(orders)
  const productSheet = XLSX.utils.json_to_sheet(productSales)
  XLSX.utils.book_append_sheet(workbook, productSheet, '商品別売上')

  // 商品組み合わせ分析
  const combinations = calculateProductCombinations(orders)
  const comboSheet = XLSX.utils.json_to_sheet(combinations)
  XLSX.utils.book_append_sheet(workbook, comboSheet, '商品組み合わせ')
}

// 計算関数
const calculateDailySales = (orders: ECForceOrder[]) => {
  const salesMap = new Map<string, any>()

  orders.forEach(order => {
    const date = order.受注日.split(' ')[0]
    const current = salesMap.get(date) || {
      '日付': date,
      '注文数': 0,
      '売上': 0,
      '消費税': 0,
      '送料': 0,
      '合計': 0,
      '平均単価': 0
    }

    current['注文数']++
    current['売上'] += order.小計
    current['消費税'] += order.消費税
    current['送料'] += order.送料
    current['合計'] += order.合計

    salesMap.set(date, current)
  })

  return Array.from(salesMap.values())
    .sort((a, b) => a['日付'].localeCompare(b['日付']))
    .map(row => ({
      ...row,
      '平均単価': Math.round(row['合計'] / row['注文数'])
    }))
}

const calculateMonthlySales = (orders: ECForceOrder[]) => {
  const salesMap = new Map<string, any>()

  orders.forEach(order => {
    const date = new Date(order.受注日)
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    const current = salesMap.get(yearMonth) || {
      '年月': yearMonth,
      '注文数': 0,
      '売上': 0,
      '新規顧客数': new Set(),
      '既存顧客数': new Set(),
      '定期注文数': 0
    }

    current['注文数']++
    current['売上'] += order.合計
    if (order.定期ステータス === '有効') {
      current['定期注文数']++
    }

    salesMap.set(yearMonth, current)
  })

  return Array.from(salesMap.values())
    .sort((a, b) => a['年月'].localeCompare(b['年月']))
}

const calculateOfferSales = (orders: ECForceOrder[]) => {
  const offerMap = new Map<string, any>()

  orders.forEach(order => {
    const offer = order.購入オファー || '不明'
    const current = offerMap.get(offer) || {
      'オファー名': offer,
      '注文数': 0,
      '売上': 0,
      '顧客数': new Set(),
      'コンバージョン率': 0
    }

    current['注文数']++
    current['売上'] += order.合計
    current['顧客数'].add(order.顧客番号)

    offerMap.set(offer, current)
  })

  return Array.from(offerMap.values())
    .map(row => ({
      'オファー名': row['オファー名'],
      '注文数': row['注文数'],
      '売上': row['売上'],
      '顧客数': row['顧客数'].size,
      '平均単価': Math.round(row['売上'] / row['注文数'])
    }))
    .sort((a, b) => b['売上'] - a['売上'])
}

const calculateCustomerAnalysis = (orders: ECForceOrder[]) => {
  const customerMap = new Map<string, any>()

  orders.forEach(order => {
    const current = customerMap.get(order.顧客番号) || {
      '顧客番号': order.顧客番号,
      'メールアドレス': order.メールアドレス,
      '注文回数': 0,
      '累計購入金額': 0,
      '初回購入日': order.受注日,
      '最終購入日': order.受注日,
      '定期購入': '無',
      '購入商品数': new Set()
    }

    current['注文回数']++
    current['累計購入金額'] += order.合計
    current['最終購入日'] = order.受注日 > current['最終購入日'] ? order.受注日 : current['最終購入日']
    if (order.定期ステータス === '有効') {
      current['定期購入'] = '有'
    }
    order.購入商品?.forEach(product => current['購入商品数'].add(product))

    customerMap.set(order.顧客番号, current)
  })

  return Array.from(customerMap.values())
    .map(row => ({
      '顧客番号': row['顧客番号'],
      'メールアドレス': row['メールアドレス'],
      '注文回数': row['注文回数'],
      '累計購入金額': row['累計購入金額'],
      '平均購入単価': Math.round(row['累計購入金額'] / row['注文回数']),
      '初回購入日': row['初回購入日'],
      '最終購入日': row['最終購入日'],
      '定期購入': row['定期購入'],
      '購入商品種類数': row['購入商品数'].size
    }))
    .sort((a, b) => b['累計購入金額'] - a['累計購入金額'])
}

const calculateCustomerSegments = (orders: ECForceOrder[]) => {
  const customerMap = new Map<string, any>()

  // 顧客ごとの購入データを集計
  orders.forEach(order => {
    const current = customerMap.get(order.顧客番号) || {
      customerId: order.顧客番号,
      totalRevenue: 0,
      orderCount: 0,
      lastOrderDate: order.受注日,
      isSubscriber: false
    }

    current.totalRevenue += order.合計
    current.orderCount++
    current.lastOrderDate = order.受注日 > current.lastOrderDate ? order.受注日 : current.lastOrderDate
    if (order.定期ステータス === '有効') {
      current.isSubscriber = true
    }

    customerMap.set(order.顧客番号, current)
  })

  // セグメント分類
  const segments = {
    'VIP顧客': 0,
    '優良顧客': 0,
    '一般顧客': 0,
    '新規顧客': 0,
    '休眠顧客': 0
  }

  const now = new Date()
  customerMap.forEach(customer => {
    const daysSinceLastOrder = Math.floor((now.getTime() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
    
    if (customer.totalRevenue >= 100000 || customer.orderCount >= 10) {
      segments['VIP顧客']++
    } else if (customer.totalRevenue >= 50000 || customer.orderCount >= 5) {
      segments['優良顧客']++
    } else if (customer.orderCount === 1) {
      segments['新規顧客']++
    } else if (daysSinceLastOrder > 90) {
      segments['休眠顧客']++
    } else {
      segments['一般顧客']++
    }
  })

  return Object.entries(segments).map(([segment, count]) => ({
    'セグメント': segment,
    '顧客数': count,
    '割合': `${((count / customerMap.size) * 100).toFixed(1)}%`
  }))
}

const calculateProductSales = (orders: ECForceOrder[]) => {
  const productMap = new Map<string, any>()

  orders.forEach(order => {
    order.購入商品?.forEach(product => {
      const current = productMap.get(product) || {
        '商品名': product,
        '注文数': 0,
        '売上金額': 0,
        '購入顧客数': new Set()
      }

      current['注文数']++
      current['売上金額'] += order.小計 / (order.購入商品?.length || 1)
      current['購入顧客数'].add(order.顧客番号)

      productMap.set(product, current)
    })
  })

  return Array.from(productMap.values())
    .map(row => ({
      '商品名': row['商品名'],
      '注文数': row['注文数'],
      '売上金額': Math.round(row['売上金額']),
      '購入顧客数': row['購入顧客数'].size,
      '平均単価': Math.round(row['売上金額'] / row['注文数'])
    }))
    .sort((a, b) => b['売上金額'] - a['売上金額'])
}

const calculateProductCombinations = (orders: ECForceOrder[]) => {
  const combinationMap = new Map<string, number>()

  orders.forEach(order => {
    if (order.購入商品 && order.購入商品.length > 1) {
      const sortedProducts = [...order.購入商品].sort()
      const combination = sortedProducts.join(' + ')
      combinationMap.set(combination, (combinationMap.get(combination) || 0) + 1)
    }
  })

  return Array.from(combinationMap.entries())
    .map(([combination, count]) => ({
      '商品組み合わせ': combination,
      '購入回数': count
    }))
    .sort((a, b) => b['購入回数'] - a['購入回数'])
    .slice(0, 20) // 上位20件
}

const getDateString = (): string => {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
}
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { ECForceOrder } from '../../types/ecforce'

// jsPDF用の型定義を拡張
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export const generatePDFReport = async (
  orders: ECForceOrder[],
  reportType: 'sales' | 'customer' | 'product' | 'full'
): Promise<void> => {
  const doc = new jsPDF()
  
  // 日本語フォントの設定（一部の環境では文字化けする可能性があります）
  // 実運用では日本語フォントを適切に埋め込む必要があります
  
  let filename = ''
  const now = new Date()
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  switch (reportType) {
    case 'sales':
      generateSalesReport(doc, orders, dateStr)
      filename = `売上レポート_${getDateString()}.pdf`
      break
    case 'customer':
      generateCustomerReport(doc, orders, dateStr)
      filename = `顧客レポート_${getDateString()}.pdf`
      break
    case 'product':
      generateProductReport(doc, orders, dateStr)
      filename = `商品レポート_${getDateString()}.pdf`
      break
    case 'full':
    default:
      generateFullReport(doc, orders, dateStr)
      filename = `ECForce分析レポート_${getDateString()}.pdf`
  }

  doc.save(filename)
}

const generateSalesReport = (doc: jsPDF, orders: ECForceOrder[], dateStr: string) => {
  // タイトル
  doc.setFontSize(20)
  doc.text('Sales Report', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text(dateStr, 105, 30, { align: 'center' })

  // KPIサマリー
  const totalRevenue = orders.reduce((sum, order) => sum + order.合計, 0)
  const avgOrderValue = totalRevenue / orders.length
  const uniqueCustomers = new Set(orders.map(order => order.顧客番号)).size

  doc.setFontSize(14)
  doc.text('Key Metrics', 20, 50)
  doc.setFontSize(10)
  doc.text(`Total Revenue: ¥${totalRevenue.toLocaleString()}`, 20, 60)
  doc.text(`Total Orders: ${orders.length}`, 20, 67)
  doc.text(`Average Order Value: ¥${Math.round(avgOrderValue).toLocaleString()}`, 20, 74)
  doc.text(`Unique Customers: ${uniqueCustomers}`, 20, 81)

  // 日別売上テーブル
  const dailySales = calculateDailySalesForPDF(orders)
  
  doc.autoTable({
    startY: 95,
    head: [['Date', 'Orders', 'Revenue', 'Avg Order']],
    body: dailySales.slice(0, 10).map(row => [
      row.date,
      row.orders.toString(),
      `¥${row.revenue.toLocaleString()}`,
      `¥${row.avgOrder.toLocaleString()}`
    ]),
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  })

  // オファー別売上
  const offerSales = calculateOfferSalesForPDF(orders)
  const currentY = (doc as any).lastAutoTable.finalY + 20

  doc.setFontSize(14)
  doc.text('Sales by Offer', 20, currentY)
  
  doc.autoTable({
    startY: currentY + 10,
    head: [['Offer', 'Orders', 'Revenue', 'Conversion']],
    body: offerSales.slice(0, 5).map(row => [
      row.offer,
      row.orders.toString(),
      `¥${row.revenue.toLocaleString()}`,
      `${row.conversionRate}%`
    ]),
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  })
}

const generateCustomerReport = (doc: jsPDF, orders: ECForceOrder[], dateStr: string) => {
  // タイトル
  doc.setFontSize(20)
  doc.text('Customer Report', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text(dateStr, 105, 30, { align: 'center' })

  // 顧客セグメント
  const segments = calculateCustomerSegments(orders)
  
  doc.setFontSize(14)
  doc.text('Customer Segments', 20, 50)
  
  doc.autoTable({
    startY: 60,
    head: [['Segment', 'Count', 'Percentage']],
    body: segments.map(row => [
      row.segment,
      row.count.toString(),
      row.percentage
    ]),
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  })

  // トップ顧客
  const topCustomers = calculateTopCustomers(orders)
  const currentY = (doc as any).lastAutoTable.finalY + 20

  doc.setFontSize(14)
  doc.text('Top Customers', 20, currentY)
  
  doc.autoTable({
    startY: currentY + 10,
    head: [['Customer ID', 'Orders', 'Total Spent', 'Avg Order']],
    body: topCustomers.slice(0, 10).map(row => [
      row.customerId,
      row.orderCount.toString(),
      `¥${row.totalSpent.toLocaleString()}`,
      `¥${row.avgOrder.toLocaleString()}`
    ]),
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  })
}

const generateProductReport = (doc: jsPDF, orders: ECForceOrder[], dateStr: string) => {
  // タイトル
  doc.setFontSize(20)
  doc.text('Product Report', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text(dateStr, 105, 30, { align: 'center' })

  // トップ商品
  const topProducts = calculateTopProducts(orders)
  
  doc.setFontSize(14)
  doc.text('Top Products', 20, 50)
  
  doc.autoTable({
    startY: 60,
    head: [['Product', 'Orders', 'Revenue', 'Customers']],
    body: topProducts.slice(0, 10).map(row => [
      row.product,
      row.orders.toString(),
      `¥${row.revenue.toLocaleString()}`,
      row.customers.toString()
    ]),
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  })

  // 商品組み合わせ
  const combinations = calculateProductCombinations(orders)
  const currentY = (doc as any).lastAutoTable.finalY + 20

  if (combinations.length > 0) {
    doc.setFontSize(14)
    doc.text('Popular Product Combinations', 20, currentY)
    
    doc.autoTable({
      startY: currentY + 10,
      head: [['Combination', 'Count']],
      body: combinations.slice(0, 5).map(row => [
        row.combination,
        row.count.toString()
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    })
  }
}

const generateFullReport = (doc: jsPDF, orders: ECForceOrder[], dateStr: string) => {
  // 表紙
  doc.setFontSize(24)
  doc.text('EC Force Analysis Report', 105, 50, { align: 'center' })
  doc.setFontSize(16)
  doc.text(dateStr, 105, 65, { align: 'center' })
  
  // KPIサマリー
  const totalRevenue = orders.reduce((sum, order) => sum + order.合計, 0)
  const avgOrderValue = totalRevenue / orders.length
  const uniqueCustomers = new Set(orders.map(order => order.顧客番号)).size
  const subscriptionRate = (orders.filter(order => order.定期ステータス === '有効').length / orders.length * 100).toFixed(1)

  doc.setFontSize(12)
  doc.text('Executive Summary', 20, 100)
  doc.setFontSize(10)
  doc.text(`Total Revenue: ¥${totalRevenue.toLocaleString()}`, 30, 110)
  doc.text(`Total Orders: ${orders.length}`, 30, 117)
  doc.text(`Average Order Value: ¥${Math.round(avgOrderValue).toLocaleString()}`, 30, 124)
  doc.text(`Unique Customers: ${uniqueCustomers}`, 30, 131)
  doc.text(`Subscription Rate: ${subscriptionRate}%`, 30, 138)

  // 新しいページで詳細レポート
  doc.addPage()
  generateSalesReport(doc, orders, dateStr)
  
  doc.addPage()
  generateCustomerReport(doc, orders, dateStr)
  
  doc.addPage()
  generateProductReport(doc, orders, dateStr)
}

// ヘルパー関数
const calculateDailySalesForPDF = (orders: ECForceOrder[]) => {
  const salesMap = new Map<string, any>()

  orders.forEach(order => {
    const date = order.受注日.split(' ')[0]
    const current = salesMap.get(date) || {
      date,
      orders: 0,
      revenue: 0
    }

    current.orders++
    current.revenue += order.合計

    salesMap.set(date, current)
  })

  return Array.from(salesMap.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(row => ({
      ...row,
      avgOrder: Math.round(row.revenue / row.orders)
    }))
}

const calculateOfferSalesForPDF = (orders: ECForceOrder[]) => {
  const offerMap = new Map<string, any>()

  orders.forEach(order => {
    const offer = order.購入オファー || 'Unknown'
    const current = offerMap.get(offer) || {
      offer,
      orders: 0,
      revenue: 0
    }

    current.orders++
    current.revenue += order.合計

    offerMap.set(offer, current)
  })

  return Array.from(offerMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map(row => ({
      ...row,
      conversionRate: ((row.orders / orders.length) * 100).toFixed(1)
    }))
}

const calculateCustomerSegments = (orders: ECForceOrder[]) => {
  const customerMap = new Map<string, any>()

  orders.forEach(order => {
    const current = customerMap.get(order.顧客番号) || {
      totalRevenue: 0,
      orderCount: 0
    }

    current.totalRevenue += order.合計
    current.orderCount++

    customerMap.set(order.顧客番号, current)
  })

  const segments = {
    VIP: 0,
    Premium: 0,
    Regular: 0,
    New: 0
  }

  customerMap.forEach(customer => {
    if (customer.totalRevenue >= 100000) {
      segments.VIP++
    } else if (customer.totalRevenue >= 50000) {
      segments.Premium++
    } else if (customer.orderCount === 1) {
      segments.New++
    } else {
      segments.Regular++
    }
  })

  const total = customerMap.size
  return Object.entries(segments).map(([segment, count]) => ({
    segment,
    count,
    percentage: `${((count / total) * 100).toFixed(1)}%`
  }))
}

const calculateTopCustomers = (orders: ECForceOrder[]) => {
  const customerMap = new Map<string, any>()

  orders.forEach(order => {
    const current = customerMap.get(order.顧客番号) || {
      customerId: order.顧客番号,
      orderCount: 0,
      totalSpent: 0
    }

    current.orderCount++
    current.totalSpent += order.合計

    customerMap.set(order.顧客番号, current)
  })

  return Array.from(customerMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .map(row => ({
      ...row,
      avgOrder: Math.round(row.totalSpent / row.orderCount)
    }))
}

const calculateTopProducts = (orders: ECForceOrder[]) => {
  const productMap = new Map<string, any>()

  orders.forEach(order => {
    order.購入商品?.forEach(product => {
      const current = productMap.get(product) || {
        product,
        orders: 0,
        revenue: 0,
        customers: new Set()
      }

      current.orders++
      current.revenue += order.小計 / (order.購入商品?.length || 1)
      current.customers.add(order.顧客番号)

      productMap.set(product, current)
    })
  })

  return Array.from(productMap.values())
    .map(row => ({
      ...row,
      customers: row.customers.size
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

const calculateProductCombinations = (orders: ECForceOrder[]) => {
  const combinationMap = new Map<string, number>()

  orders.forEach(order => {
    if (order.購入商品 && order.購入商品.length > 1) {
      const combination = order.購入商品.slice(0, 2).sort().join(' + ')
      combinationMap.set(combination, (combinationMap.get(combination) || 0) + 1)
    }
  })

  return Array.from(combinationMap.entries())
    .map(([combination, count]) => ({ combination, count }))
    .sort((a, b) => b.count - a.count)
}

const getDateString = (): string => {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
}
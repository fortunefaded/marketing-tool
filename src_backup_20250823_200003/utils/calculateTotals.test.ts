import { describe, it, expect } from 'vitest'
import { calculateTotals, TableRow } from './calculateTotals'

describe('calculateTotals', () => {
  it('should calculate totals for numeric columns', () => {
    const data: TableRow[] = [
      {
        category: 'GoogleAds',
        subCategory: '指名',
        details: '1,852,147',
        clicks: '135,603',
        uniquePv: '',
        directContribution: '',
        purchaseCount: '291',
        purchaseUsers: '5,064',
        sampleCv19: '',
        cv: '5,355',
        cvr: '3.95%',
        cost: '¥2,336,011',
      },
      {
        category: 'LINE広告',
        subCategory: 'オーディエンス',
        details: '345,270',
        clicks: '88,433',
        uniquePv: '',
        directContribution: '',
        purchaseCount: '203',
        purchaseUsers: '3,127',
        sampleCv19: '',
        cv: '3,330',
        cvr: '3.77%',
        cost: '¥1,362,019',
      },
      {
        category: 'Yahoo!スポンサードサーチ',
        subCategory: '指名',
        details: '632,998',
        clicks: '54,956',
        uniquePv: '',
        directContribution: '',
        purchaseCount: '110',
        purchaseUsers: '1,940',
        sampleCv19: '',
        cv: '2,050',
        cvr: '3.73%',
        cost: '¥1,231,400',
      },
    ]

    const result = calculateTotals(data)

    expect(result.category).toBe('合計')
    expect(result.subCategory).toBe('')
    expect(result.details).toBe('2,830,415')
    expect(result.clicks).toBe('278,992')
    expect(result.purchaseCount).toBe('604')
    expect(result.purchaseUsers).toBe('10,131')
    expect(result.cv).toBe('10,735')
    expect(result.cost).toBe('¥4,929,430')
    expect(result._highlight).toBe('summary')
  })

  it('should handle empty data', () => {
    const result = calculateTotals([])

    expect(result.category).toBe('合計')
    expect(result.details).toBe('0')
    expect(result.clicks).toBe('0')
    expect(result.cv).toBe('0')
    expect(result.cost).toBe('¥0')
  })

  it('should calculate CVR correctly', () => {
    const data: TableRow[] = [
      {
        category: 'GoogleAds',
        details: '1,000',
        clicks: '100',
        cv: '10',
        cvr: '10.00%',
        cost: '¥1,000',
      },
      {
        category: 'LINE広告',
        details: '2,000',
        clicks: '200',
        cv: '30',
        cvr: '15.00%',
        cost: '¥2,000',
      },
    ]

    const result = calculateTotals(data)

    expect(result.cv).toBe('40')
    expect(result.clicks).toBe('300')
    // CVR should be (40 / 300) * 100 = 13.33%
    expect(result.cvr).toBe('13.33%')
  })

  it('should handle missing values', () => {
    const data: TableRow[] = [
      {
        category: 'GoogleAds',
        details: '1,000',
        clicks: '100',
        cv: '-',
        cost: '¥1,000',
      },
      {
        category: 'LINE広告',
        details: '2,000',
        clicks: '200',
        cv: '30',
        cost: '¥2,000',
      },
    ]

    const result = calculateTotals(data)

    expect(result.cv).toBe('30')
    expect(result.clicks).toBe('300')
    expect(result.cvr).toBe('10.00%')
  })

  it('should format large numbers with commas', () => {
    const data: TableRow[] = [
      {
        category: 'GoogleAds',
        details: '100,000,000',
        clicks: '1,000,000',
        cv: '10,000',
        cost: '¥10,000,000',
      },
      {
        category: 'LINE広告',
        details: '118,485,456',
        clicks: '2,000,000',
        cv: '20,000',
        cost: '¥20,000,000',
      },
    ]

    const result = calculateTotals(data)

    expect(result.details).toBe('218,485,456')
    expect(result.clicks).toBe('3,000,000')
    expect(result.cv).toBe('30,000')
    expect(result.cost).toBe('¥30,000,000')
  })

  it('should handle real data from screenshot', () => {
    const data: TableRow[] = [
      {
        category: 'GoogleAds',
        subCategory: '指名',
        details: '1,852,147',
        clicks: '135,603',
        uniquePv: '',
        directContribution: '',
        purchaseCount: '291',
        purchaseUsers: '5,064',
        sampleCv19: '',
        cv: '5,355',
        cvr: '3.95%',
        cost: '¥2,336,011',
      },
      {
        category: 'LINE広告',
        subCategory: 'オーディエンス',
        details: '345,270',
        clicks: '88,433',
        uniquePv: '',
        directContribution: '',
        purchaseCount: '203',
        purchaseUsers: '3,127',
        sampleCv19: '',
        cv: '3,330',
        cvr: '3.77%',
        cost: '¥1,362,019',
      },
      {
        category: 'Yahoo!スポンサードサーチ',
        subCategory: '指名',
        details: '632,998',
        clicks: '54,956',
        uniquePv: '',
        directContribution: '',
        purchaseCount: '110',
        purchaseUsers: '1,940',
        sampleCv19: '',
        cv: '2,050',
        cvr: '3.73%',
        cost: '¥1,231,400',
      },
      {
        category: 'GoogleAds',
        subCategory: 'オーディエンス',
        details: '792,247',
        clicks: '43,940',
        uniquePv: '',
        directContribution: '',
        purchaseCount: '',
        purchaseUsers: '1,399',
        sampleCv19: '',
        cv: '1,399',
        cvr: '3.18%',
        cost: '¥763,989',
      },
      {
        category: 'LINE広告',
        subCategory: '類似配信',
        details: '410,729',
        clicks: '151,956',
        uniquePv: '',
        directContribution: '',
        purchaseCount: '',
        purchaseUsers: '1,243',
        sampleCv19: '',
        cv: '1,243',
        cvr: '0.82%',
        cost: '¥1,594,880',
      },
    ]

    const result = calculateTotals(data)

    // Based on the screenshot, the actual totals should be:
    expect(result.details).toBe('4,033,391')
    expect(result.clicks).toBe('474,888')
    expect(result.cv).toBe('13,377')
    expect(result.cost).toBe('¥7,288,299')

    // Calculate CVR: (13,377 / 474,888) * 100 = 2.82%
    expect(result.cvr).toBe('2.82%')
  })
})

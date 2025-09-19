import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { YearMonth } from '../types/monthlyTargets'

// 現在の年月を取得（YYYY-MM形式）
export const getCurrentYearMonth = (): YearMonth => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// 年月をフォーマット（表示用）
export const formatYearMonth = (yearMonth: YearMonth): string => {
  const [year, month] = yearMonth.split('-')
  return `${year}年${parseInt(month)}月`
}

// 過去N月分の年月を取得
export const getPastMonths = (count: number): YearMonth[] => {
  const months: YearMonth[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    months.push(`${year}-${month}`)
  }

  return months
}

// 指定月の目標を取得
export const useGetMonthlyTarget = (yearMonth: YearMonth) => {
  const target = useQuery(api.monthlyTargets.get, { yearMonth })
  return target
}

// 期間指定で目標一覧を取得
export const useListMonthlyTargets = (startMonth?: YearMonth, endMonth?: YearMonth) => {
  const targets = useQuery(api.monthlyTargets.list, {
    startMonth,
    endMonth,
  })
  return targets || []
}

// 目標を作成/更新
export const useUpsertMonthlyTarget = () => {
  const upsert = useMutation(api.monthlyTargets.upsert)
  return upsert
}

// 目標を削除
export const useDeleteMonthlyTarget = () => {
  const remove = useMutation(api.monthlyTargets.remove)
  return remove
}

// 変更履歴を取得
export const useTargetHistory = (yearMonth?: YearMonth, limit?: number) => {
  const history = useQuery(api.monthlyTargets.getHistory, {
    yearMonth,
    limit,
  })
  return history || []
}

// 数値を3桁区切りでフォーマット
export const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return ''
  return num.toLocaleString('ja-JP')
}

// 3桁区切りを除去して数値に変換
export const parseNumber = (str: string): number => {
  const cleanStr = str.replace(/,/g, '').replace(/[^\d]/g, '')
  const num = parseInt(cleanStr)
  return isNaN(num) ? 0 : num
}
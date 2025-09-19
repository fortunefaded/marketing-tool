export type YearMonth = string // "YYYY-MM"形式

export interface MonthlyTarget {
  _id?: string
  yearMonth: YearMonth
  budget: number
  cvTarget: number
  cpoTarget: number
  createdAt?: number
  updatedAt?: number
}

export interface TargetHistory {
  _id?: string
  targetId: string
  yearMonth: YearMonth
  previousValues: {
    budget: number
    cvTarget: number
    cpoTarget: number
  }
  newValues: {
    budget: number
    cvTarget: number
    cpoTarget: number
  }
  changedAt: number
}
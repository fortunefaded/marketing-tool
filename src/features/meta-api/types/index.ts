/**
 * types/index.ts
 * 型定義のエントリーポイント
 */

// API関連の型
export * from './api-types'

// ドメインモデルの型  
export * from './domain-types'

// UIコンポーネントの型
export * from './ui-types'

// 便利な型ユーティリティ
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

// 型ガード
export function isNotNull<T>(value: T | null): value is T {
  return value !== null
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}
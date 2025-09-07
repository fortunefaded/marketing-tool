/**
 * Result型パターン - エラーハンドリングの型安全性を保証
 */

export type Result<T, E = Error> = 
  | { success: true; data: T; cached?: boolean }
  | { success: false; error: E; retryable?: boolean }

export const Result = {
  /**
   * 成功結果を作成
   */
  ok<T>(data: T, cached = false): Result<T> {
    return { success: true, data, cached }
  },

  /**
   * エラー結果を作成
   */
  err<E = Error>(error: E, retryable = false): Result<never, E> {
    return { success: false, error, retryable }
  },

  /**
   * Result型かどうかチェック
   */
  isResult<T, E = Error>(value: any): value is Result<T, E> {
    return value && typeof value === 'object' && 'success' in value
  },

  /**
   * 成功した結果かチェック
   */
  isOk<T, E = Error>(result: Result<T, E>): result is { success: true; data: T; cached?: boolean } {
    return result.success === true
  },

  /**
   * エラー結果かチェック
   */
  isErr<T, E = Error>(result: Result<T, E>): result is { success: false; error: E; retryable?: boolean } {
    return result.success === false
  },

  /**
   * Result型から値を取り出す（エラーの場合は例外をスロー）
   */
  unwrap<T, E = Error>(result: Result<T, E>): T {
    if (Result.isOk(result)) {
      return result.data
    }
    throw result.error
  },

  /**
   * Result型から値を取り出す（エラーの場合はデフォルト値を返す）
   */
  unwrapOr<T, E = Error>(result: Result<T, E>, defaultValue: T): T {
    if (Result.isOk(result)) {
      return result.data
    }
    return defaultValue
  },

  /**
   * Result型の変換（成功の場合のみ）
   */
  map<T, U, E = Error>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (Result.isOk(result)) {
      return Result.ok(fn(result.data), result.cached)
    }
    return result as Result<U, E>
  },

  /**
   * Result型の変換（エラーの場合のみ）
   */
  mapErr<T, E = Error, F = Error>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (Result.isErr(result)) {
      return Result.err(fn(result.error), result.retryable)
    }
    return result as Result<T, F>
  },

  /**
   * 非同期Result型の変換
   */
  async mapAsync<T, U, E = Error>(
    result: Result<T, E>, 
    fn: (value: T) => Promise<U>
  ): Promise<Result<U, E>> {
    if (Result.isOk(result)) {
      try {
        const data = await fn(result.data)
        return Result.ok(data, result.cached)
      } catch (error) {
        return Result.err(error as E)
      }
    }
    return result as Result<U, E>
  },

  /**
   * Result型のチェーン処理
   */
  chain<T, U, E = Error>(
    result: Result<T, E>, 
    fn: (value: T) => Result<U, E>
  ): Result<U, E> {
    if (Result.isOk(result)) {
      return fn(result.data)
    }
    return result as Result<U, E>
  },

  /**
   * 複数のResult型をまとめる
   */
  all<T extends readonly Result<any, any>[]>(
    results: T
  ): Result<{ [K in keyof T]: T[K] extends Result<infer U, any> ? U : never }, any> {
    const errors = results.filter(Result.isErr)
    if (errors.length > 0) {
      return Result.err(errors[0].error)
    }
    
    const values = results.map(r => Result.isOk(r) ? r.data : undefined)
    return Result.ok(values as any)
  },

  /**
   * Promiseをtry-catchしてResult型に変換
   */
  async fromPromise<T, E = Error>(
    promise: Promise<T>,
    errorTransformer?: (error: unknown) => E
  ): Promise<Result<T, E>> {
    try {
      const data = await promise
      return Result.ok(data)
    } catch (error) {
      const transformedError = errorTransformer 
        ? errorTransformer(error)
        : error as E
      return Result.err(transformedError)
    }
  }
}

/**
 * Result型を使った網羅的なswitch文のヘルパー
 */
export function exhaustiveResultCheck<T, E>(
  result: Result<T, E>,
  handlers: {
    ok: (data: T, cached?: boolean) => void
    err: (error: E, retryable?: boolean) => void
  }
): void {
  if (Result.isOk(result)) {
    handlers.ok(result.data, result.cached)
  } else {
    handlers.err(result.error, result.retryable)
  }
}
/**
 * Browser extension error handler
 * Filters out errors caused by browser extensions to prevent console noise
 */

// Known extension-related error patterns
const EXTENSION_ERROR_PATTERNS = [
  'A listener indicated an asynchronous response by returning true',
  'message channel closed',
  'Extension context invalidated',
  'Cannot access a chrome:// URL',
  'chrome-extension://',
  'moz-extension://'
]

// Check if an error is likely caused by a browser extension
export function isExtensionError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error?.message || ''
  return EXTENSION_ERROR_PATTERNS.some(pattern => 
    errorMessage.includes(pattern)
  )
}

// Global error handler to filter out extension errors
export function setupExtensionErrorHandler() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (isExtensionError(event.reason)) {
      // Prevent the error from appearing in console
      event.preventDefault()
      console.debug('[Extension Error Filtered]', event.reason)
    }
  })

  // Handle general errors
  window.addEventListener('error', (event) => {
    if (isExtensionError(event.error || event.message)) {
      // Prevent the error from appearing in console
      event.preventDefault()
      console.debug('[Extension Error Filtered]', event.error || event.message)
    }
  })
}

// Instructions for users experiencing extension conflicts
export function getExtensionTroubleshootingGuide(): string {
  return `
ブラウザ拡張機能のエラーが検出されました。

この問題を解決するには：
1. シークレット/プライベートウィンドウで試す
2. 問題のある拡張機能を特定して無効化する
3. 広告ブロッカーや翻訳拡張機能を一時的に無効にする

このエラーはアプリケーションの動作には影響しません。
  `.trim()
}
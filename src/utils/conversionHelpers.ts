/**
 * コンバージョンデータ抽出ヘルパー関数
 * F-CV（最初のコンバージョン）調査用の実装
 */

/**
 * 購入系アクションかどうかを判定
 */
export const isPurchaseAction = (actionType: string | undefined | null): boolean => {
  if (!actionType || typeof actionType !== 'string') return false

  // Meta APIで定義されている購入関連のアクションタイプ
  const purchaseTypes = [
    'offsite_conversion.fb_pixel_purchase', // Facebookピクセル経由の購入
    'offsite_conversion.fb_pixel_initiate_checkout', // チェックアウト開始
    'offsite_conversion.fb_pixel_add_to_cart', // カート追加（オプション）
    'omni_purchase', // オムニチャネル購入
    'purchase', // 一般的な購入
    'mobile_app_purchase', // モバイルアプリ内購入
    'onsite_conversion.purchase', // サイト内購入
    'app_custom_event.fb_mobile_purchase', // カスタムイベント購入
    'offline_conversion.purchase', // オフライン購入
  ]

  // 小文字に変換して部分一致でチェック
  const actionTypeLower = actionType.toLowerCase()
  const isStandardPurchase = purchaseTypes.some((type) =>
    actionTypeLower.includes(type.toLowerCase())
  )

  // カスタムコンバージョンのチェック
  const isCustomConversion =
    actionTypeLower.includes('custom') && actionTypeLower.includes('conversion')

  return isStandardPurchase || isCustomConversion
}

/**
 * F-CV調査用のデバッグ情報インターフェース
 */
export interface FCVDebugInfo {
  unique_actions_value: number // unique_actionsの合計値
  unique_actions_1d_click: number // unique_actions内の1d_click値
  unique_conversions: number // unique_conversionsフィールド（存在する場合）
  raw_unique_actions?: any // 生のunique_actionsデータ
  raw_actions?: any // 生のactionsデータ
  raw_conversions?: any // 生のconversionsフィールド
  purchase_actions?: any[] // 購入系アクションのみ抽出
  unique_purchase_actions?: any[] // ユニーク購入系アクションのみ抽出
}

/**
 * コンバージョンデータを抽出（F-CV調査用デバッグ情報付き）
 */
export const extractConversions = (item: any) => {
  try {
    let cv = 0 // CV: 1日クリックの総コンバージョン
    let fcv_candidate1 = 0 // unique_actions.value
    let fcv_candidate2 = 0 // unique_actions['1d_click']
    let fcv_candidate3 = 0 // unique_conversions

    // デバッグ用: APIレスポンスの構造を確認（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔬 === F-CV調査デバッグ ===')
      console.log('利用可能フィールド:', Object.keys(item || {}))

      if (item.actions) {
        console.log('actions構造:', item.actions)
      }

      if (item.unique_actions) {
        console.log('🔥 unique_actions構造（F-CV候補）:', item.unique_actions)
      }

      if (item.conversions !== undefined) {
        console.log('conversionsフィールド:', item.conversions)
      }

      if (item.unique_conversions !== undefined) {
        console.log('unique_conversionsフィールド:', item.unique_conversions)
      }
    }

    // CV: 総コンバージョン数の取得
    // action_attribution_windows: ['1d_click']指定により、
    // conversionsフィールドは1日クリックアトリビューションの値
    if (item.conversions !== undefined && item.conversions !== null) {
      cv = parseInt(item.conversions) || 0
    } else if (item.actions && Array.isArray(item.actions)) {
      // actionsフィールドから購入系アクションを集計
      item.actions.forEach((action: any) => {
        if (isPurchaseAction(action.action_type)) {
          cv += parseInt(action.value || '0')
        }
      })
    }

    // 購入系アクションのみ抽出して比較（デバッグ用）
    const purchaseActions = item.actions?.filter((a: any) => isPurchaseAction(a.action_type)) || []

    const uniquePurchaseActions =
      item.unique_actions?.filter((a: any) => isPurchaseAction(a.action_type)) || []

    // F-CV候補1: unique_actionsのvalue合計
    if (item.unique_actions && Array.isArray(item.unique_actions)) {
      item.unique_actions.forEach((action: any) => {
        if (isPurchaseAction(action.action_type)) {
          fcv_candidate1 += parseInt(action.value || '0')

          // 1d_click属性がある場合（Meta APIの特殊なレスポンス形式）
          if (action['1d_click'] !== undefined) {
            fcv_candidate2 += parseInt(action['1d_click'] || '0')
          }
        }
      })
    }

    // F-CV候補3: unique_conversions（もし存在すれば）
    if (item.unique_conversions !== undefined && item.unique_conversions !== null) {
      fcv_candidate3 = parseInt(item.unique_conversions) || 0
    }

    // デバッグモードでの詳細比較
    if (
      process.env.NODE_ENV === 'development' &&
      (purchaseActions.length > 0 || uniquePurchaseActions.length > 0)
    ) {
      console.log('購入アクション比較:', {
        通常: purchaseActions,
        ユニーク: uniquePurchaseActions,
        通常合計: cv,
        ユニーク候補1: fcv_candidate1,
        ユニーク候補2: fcv_candidate2,
        ユニーク候補3: fcv_candidate3,
      })
    }

    // 最も妥当なF-CV値を選択（暫定的な優先順位）
    // 1. unique_actionsのvalue（最も可能性が高い）
    // 2. unique_actions['1d_click']
    // 3. unique_conversions
    // 4. フォールバック: CV値（すべて初回購入と仮定）
    let fcv = fcv_candidate1 || fcv_candidate2 || fcv_candidate3 || cv

    // データ整合性チェック: CV ≥ F-CV の保証
    if (fcv > cv) {
      console.warn(`⚠️ データ不整合検出: F-CV (${fcv}) > CV (${cv}), F-CVをCVと同値に修正`)
      fcv = cv
    }

    // デバッグ情報を含めて返却
    return {
      conversions: cv,
      conversions_1d_click: fcv,
      // デバッグ用追加フィールド
      fcv_debug: {
        unique_actions_value: fcv_candidate1,
        unique_actions_1d_click: fcv_candidate2,
        unique_conversions: fcv_candidate3,
        raw_unique_actions: item.unique_actions,
        raw_actions: item.actions,
        raw_conversions: item.conversions,
        purchase_actions: purchaseActions,
        unique_purchase_actions: uniquePurchaseActions,
      } as FCVDebugInfo,
    }
  } catch (error) {
    console.error('❌ Conversion extraction failed:', error, { item })
    return {
      conversions: 0,
      conversions_1d_click: 0,
      fcv_debug: {
        unique_actions_value: 0,
        unique_actions_1d_click: 0,
        unique_conversions: 0,
      } as FCVDebugInfo,
    }
  }
}

/**
 * コンバージョン率（CVR）を計算
 */
export const calculateCVR = (conversions: number, clicks: number): number => {
  if (clicks <= 0) return 0
  return (conversions / clicks) * 100
}

/**
 * コンバージョン単価（CPA）を計算
 */
export const calculateCPA = (spend: number, conversions: number): number => {
  if (conversions <= 0) return 0
  return spend / conversions
}

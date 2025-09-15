export class MetaDataParser {
  // アクション配列からコンバージョンを抽出
  static extractConversions(actions: any[]) {
    if (!actions || !Array.isArray(actions)) return 0

    // 購入アクションを探す（より多くのパターンに対応）
    const purchaseActions = [
      'purchase',
      'omni_purchase',
      'offline_conversion',
      'onsite_conversion.purchase',
      'app_custom_event.fb_mobile_purchase',
      'offsite_conversion.fb_pixel_purchase',
      'offline_conversion.purchase',
    ]

    let totalConversions = 0
    for (const action of actions) {
      if (!action || !action.action_type) continue

      // 完全一致または部分一致でチェック
      const isPurchase =
        purchaseActions.includes(action.action_type) || action.action_type.includes('purchase')

      if (isPurchase) {
        const value = parseFloat(action.value) || 0
        totalConversions += value
      }
    }

    return totalConversions
  }

  // アクション値から売上を抽出
  static extractActionValues(actionValues: any[]) {
    if (!actionValues || !Array.isArray(actionValues)) return 0

    const purchaseActions = [
      'purchase',
      'omni_purchase',
      'offline_conversion',
      'onsite_conversion.purchase',
      'app_custom_event.fb_mobile_purchase',
      'offsite_conversion.fb_pixel_purchase',
      'offline_conversion.purchase',
    ]

    let totalValue = 0
    for (const actionValue of actionValues) {
      if (!actionValue || !actionValue.action_type) continue

      // 完全一致または部分一致でチェック
      const isPurchase =
        purchaseActions.includes(actionValue.action_type) ||
        actionValue.action_type.includes('purchase')

      if (isPurchase) {
        totalValue += parseFloat(actionValue.value) || 0
      }
    }

    return totalValue
  }

  // ROASを計算
  static calculateROAS(data: any) {
    // purchase_roasフィールドを確認（omni_purchaseを優先）
    if (data.purchase_roas?.length > 0) {
      // omni_purchaseを優先的に探す
      const omniPurchase = data.purchase_roas.find((r: any) => r.action_type === 'omni_purchase')
      if (omniPurchase) {
        return parseFloat(omniPurchase.value) || 0
      }
      // なければ最初の値を使用
      return parseFloat(data.purchase_roas[0].value) || 0
    }

    // website_purchase_roasを確認
    if (data.website_purchase_roas?.length > 0) {
      return parseFloat(data.website_purchase_roas[0].value) || 0
    }

    // 手動計算: conversion_values / spend
    if (data.conversion_values && data.spend) {
      const values = parseFloat(data.conversion_values)
      const spend = parseFloat(data.spend)
      return spend > 0 ? values / spend : 0
    }

    // action_valuesから計算
    if (data.action_values && data.spend) {
      const totalValue = this.extractActionValues(data.action_values)
      const spend = parseFloat(data.spend)
      return spend > 0 ? totalValue / spend : 0
    }

    return 0
  }

  // CPAを計算
  static calculateCPA(data: any) {
    // cost_per_conversionフィールドを確認
    if (data.cost_per_conversion) {
      return parseFloat(data.cost_per_conversion)
    }

    // cost_per_action_typeから抽出（omni_purchaseを優先）
    if (data.cost_per_action_type?.length > 0) {
      // omni_purchaseを優先的に探す
      const omniPurchaseCPA = data.cost_per_action_type.find(
        (cpa: any) => cpa.action_type === 'omni_purchase'
      )
      if (omniPurchaseCPA) {
        return parseFloat(omniPurchaseCPA.value) || 0
      }

      // purchaseを探す
      const purchaseCPA = data.cost_per_action_type.find(
        (cpa: any) => cpa.action_type === 'purchase'
      )
      if (purchaseCPA) {
        return parseFloat(purchaseCPA.value) || 0
      }
    }

    // 手動計算: spend / conversions
    if (data.spend) {
      // conversionsフィールドがあればそれを使用
      if (data.conversions && parseFloat(data.conversions) > 0) {
        return parseFloat(data.spend) / parseFloat(data.conversions)
      }

      // なければactionsから計算
      const conversions = this.extractConversions(data.actions)
      if (conversions > 0) {
        return parseFloat(data.spend) / conversions
      }
    }

    return 0
  }

  // コンバージョン値を抽出（extractActionValuesのエイリアス）
  static extractConversionValue(actionValues: any[]) {
    return this.extractActionValues(actionValues)
  }

  // 包括的なデータ解析
  static parseInsightData(rawData: any) {
    const conversions = this.extractConversions(rawData.actions)
    const conversionValue = this.extractActionValues(rawData.action_values)
    const roas = this.calculateROAS(rawData)
    const cpa = this.calculateCPA(rawData)
    // frequencyの解析を追加
    const frequency = rawData.frequency ? parseFloat(rawData.frequency) : 0

    return {
      conversions,
      conversionValue,
      roas,
      cpa,
      frequency,
      // デバッグ情報
      debug: {
        hasActions: !!rawData.actions,
        actionsCount: rawData.actions?.length || 0,
        hasActionValues: !!rawData.action_values,
        actionValuesCount: rawData.action_values?.length || 0,
        hasPurchaseRoas: !!rawData.purchase_roas,
        hasWebsitePurchaseRoas: !!rawData.website_purchase_roas,
        hasCostPerActionType: !!rawData.cost_per_action_type,
        spend: rawData.spend,
        rawActions: rawData.actions,
        rawActionValues: rawData.action_values,
      },
    }
  }
}

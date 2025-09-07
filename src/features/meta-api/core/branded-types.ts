/**
 * ブランド型 - 型レベルでIDの混同を防ぐ
 */

// ブランド型のベース定義
declare const brand: unique symbol
type Brand<T, B> = T & { [brand]: B }

// Meta API関連のブランド型
export type AccountId = Brand<string, 'AccountId'>
export type AdId = Brand<string, 'AdId'>
export type CampaignId = Brand<string, 'CampaignId'>
export type CreativeId = Brand<string, 'CreativeId'>
export type AccessToken = Brand<string, 'AccessToken'>
export type RefreshToken = Brand<string, 'RefreshToken'>

// ブランド型のコンストラクタ
export const AccountId = {
  /**
   * 文字列からAccountIdを作成（バリデーション付き）
   */
  from(value: string): AccountId {
    // Meta APIのアカウントIDは数字のみ
    if (!/^\d+$/.test(value)) {
      throw new Error(`Invalid AccountId format: ${value}`)
    }
    return value as AccountId
  },

  /**
   * act_プレフィックスを除去してAccountIdを作成
   */
  fromFullId(fullId: string): AccountId {
    const match = fullId.match(/^act_(\d+)$/)
    if (!match) {
      throw new Error(`Invalid full account ID format: ${fullId}`)
    }
    return match[1] as AccountId
  },

  /**
   * AccountIdにact_プレフィックスを追加
   */
  toFullId(accountId: AccountId): string {
    return `act_${accountId}`
  },

  /**
   * 型ガード
   */
  is(value: any): value is AccountId {
    return typeof value === 'string' && /^\d+$/.test(value)
  }
}

export const AdId = {
  from(value: string): AdId {
    if (!value || value.length === 0) {
      throw new Error('AdId cannot be empty')
    }
    return value as AdId
  },

  is(value: any): value is AdId {
    return typeof value === 'string' && value.length > 0
  }
}

export const CampaignId = {
  from(value: string): CampaignId {
    if (!value || value.length === 0) {
      throw new Error('CampaignId cannot be empty')
    }
    return value as CampaignId
  },

  is(value: any): value is CampaignId {
    return typeof value === 'string' && value.length > 0
  }
}

export const CreativeId = {
  from(value: string): CreativeId {
    if (!value || value.length === 0) {
      throw new Error('CreativeId cannot be empty')
    }
    return value as CreativeId
  },

  is(value: any): value is CreativeId {
    return typeof value === 'string' && value.length > 0
  }
}

export const AccessToken = {
  /**
   * アクセストークンの作成（基本的なバリデーション付き）
   */
  from(value: string): AccessToken {
    if (!value || value.length < 10) {
      throw new Error('Invalid access token format')
    }
    return value as AccessToken
  },

  /**
   * トークンのマスク表示
   */
  mask(token: AccessToken): string {
    const str = token as string
    if (str.length <= 8) {
      return '****'
    }
    return str.substring(0, 4) + '****' + str.substring(str.length - 4)
  },

  is(value: any): value is AccessToken {
    return typeof value === 'string' && value.length >= 10
  }
}

export const RefreshToken = {
  from(value: string): RefreshToken {
    if (!value || value.length < 10) {
      throw new Error('Invalid refresh token format')
    }
    return value as RefreshToken
  },

  mask(token: RefreshToken): string {
    return AccessToken.mask(token as any as AccessToken)
  },

  is(value: any): value is RefreshToken {
    return typeof value === 'string' && value.length >= 10
  }
}

/**
 * 型レベルでIDの変換を保証するユーティリティ
 */
export namespace IdConverter {
  export function accountToString(id: AccountId): string {
    return id as string
  }

  export function adToString(id: AdId): string {
    return id as string
  }

  export function campaignToString(id: CampaignId): string {
    return id as string
  }

  export function creativeToString(id: CreativeId): string {
    return id as string
  }

  export function tokenToString(token: AccessToken | RefreshToken): string {
    return token as string
  }
}
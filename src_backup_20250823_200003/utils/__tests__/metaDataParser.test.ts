import { describe, it, expect } from 'vitest'
import { MetaDataParser } from '../metaDataParser'

describe('MetaDataParser', () => {
  describe('extractConversions', () => {
    it('should extract purchase conversions from actions array', () => {
      const actions = [
        { action_type: 'purchase', value: '5' },
        { action_type: 'add_to_cart', value: '10' },
        { action_type: 'omni_purchase', value: '3' },
      ]

      const result = MetaDataParser.extractConversions(actions)
      expect(result).toBe(8) // 5 + 3
    })

    it('should return 0 when no purchase actions exist', () => {
      const actions = [
        { action_type: 'view_content', value: '100' },
        { action_type: 'add_to_cart', value: '10' },
      ]

      const result = MetaDataParser.extractConversions(actions)
      expect(result).toBe(0)
    })

    it('should handle undefined actions', () => {
      expect(MetaDataParser.extractConversions(undefined as any)).toBe(0)
      expect(MetaDataParser.extractConversions(null as any)).toBe(0)
      expect(MetaDataParser.extractConversions([])).toBe(0)
    })

    it('should handle various purchase action types', () => {
      const actions = [
        { action_type: 'purchase', value: '2' },
        { action_type: 'omni_purchase', value: '3' },
        { action_type: 'app_custom_event.fb_mobile_purchase', value: '1' },
        { action_type: 'offsite_conversion.fb_pixel_purchase', value: '4' },
        { action_type: 'onsite_conversion.purchase', value: '5' },
        { action_type: 'offline_conversion.purchase', value: '2' },
      ]

      const result = MetaDataParser.extractConversions(actions)
      expect(result).toBe(17)
    })

    it('should handle invalid value formats', () => {
      const actions = [
        { action_type: 'purchase', value: 'invalid' },
        { action_type: 'purchase', value: null },
        { action_type: 'purchase', value: undefined },
        { action_type: 'purchase', value: '5.5' },
      ]

      const result = MetaDataParser.extractConversions(actions)
      expect(result).toBe(5.5)
    })
  })

  describe('calculateROAS', () => {
    it('should calculate ROAS from purchase_roas array', () => {
      const data = {
        purchase_roas: [{ value: '2.50', action_type: 'omni_purchase' }],
      }

      const result = MetaDataParser.calculateROAS(data)
      expect(result).toBe(2.5)
    })

    it('should prioritize omni_purchase over purchase', () => {
      const data = {
        purchase_roas: [
          { value: '1.50', action_type: 'purchase' },
          { value: '2.50', action_type: 'omni_purchase' },
        ],
      }

      const result = MetaDataParser.calculateROAS(data)
      expect(result).toBe(2.5)
    })

    it('should calculate ROAS from spend and action_values', () => {
      const data = {
        spend: '100',
        action_values: [
          { action_type: 'purchase', value: '250' },
          { action_type: 'add_to_cart', value: '50' },
        ],
      }

      const result = MetaDataParser.calculateROAS(data)
      expect(result).toBe(2.5) // 250 / 100
    })

    it('should return 0 when spend is 0', () => {
      const data = {
        spend: '0',
        action_values: [{ action_type: 'purchase', value: '250' }],
      }

      const result = MetaDataParser.calculateROAS(data)
      expect(result).toBe(0)
    })

    it('should handle missing data gracefully', () => {
      expect(MetaDataParser.calculateROAS({})).toBe(0)
      expect(MetaDataParser.calculateROAS({ purchase_roas: [] })).toBe(0)
      expect(MetaDataParser.calculateROAS({ purchase_roas: null as any })).toBe(0)
    })

    it('should handle website_purchase_roas', () => {
      const data = {
        website_purchase_roas: [{ value: '3.25', action_type: 'website_purchase' }],
      }

      const result = MetaDataParser.calculateROAS(data)
      expect(result).toBe(3.25)
    })
  })

  describe('calculateCPA', () => {
    it('should extract CPA from cost_per_action_type', () => {
      const data = {
        cost_per_action_type: [
          { action_type: 'purchase', value: '25.50' },
          { action_type: 'add_to_cart', value: '5.00' },
        ],
      }

      const result = MetaDataParser.calculateCPA(data)
      expect(result).toBe(25.5)
    })

    it('should prioritize omni_purchase CPA', () => {
      const data = {
        cost_per_action_type: [
          { action_type: 'purchase', value: '30.00' },
          { action_type: 'omni_purchase', value: '25.00' },
        ],
      }

      const result = MetaDataParser.calculateCPA(data)
      expect(result).toBe(25)
    })

    it('should calculate CPA from spend and conversions', () => {
      const data = {
        spend: '100',
        conversions: '4', // 100 / 4 = 25
      }

      const result = MetaDataParser.calculateCPA(data)
      expect(result).toBe(25)
    })

    it('should calculate CPA from spend and actions when conversions is 0', () => {
      const data = {
        spend: '100',
        conversions: '0',
        actions: [{ action_type: 'purchase', value: '5' }],
      }

      const result = MetaDataParser.calculateCPA(data)
      expect(result).toBe(20) // 100 / 5
    })

    it('should return 0 when no conversions', () => {
      const data = {
        spend: '100',
        conversions: '0',
        actions: [],
      }

      const result = MetaDataParser.calculateCPA(data)
      expect(result).toBe(0)
    })

    it('should handle missing data', () => {
      expect(MetaDataParser.calculateCPA({})).toBe(0)
      expect(MetaDataParser.calculateCPA({ cost_per_action_type: [] })).toBe(0)
      expect(MetaDataParser.calculateCPA({ spend: '0', conversions: '5' })).toBe(0)
    })

    it('should handle invalid numeric values', () => {
      const data = {
        spend: 'invalid',
        conversions: 'also invalid',
      }

      const result = MetaDataParser.calculateCPA(data)
      expect(result).toBe(0)
    })
  })

  describe('extractConversionValue', () => {
    it('should extract conversion value from action_values', () => {
      const actionValues = [
        { action_type: 'purchase', value: '500.50' },
        { action_type: 'add_to_cart', value: '100' },
      ]

      const result = MetaDataParser.extractConversionValue(actionValues)
      expect(result).toBe(500.5)
    })

    it('should sum multiple purchase values', () => {
      const actionValues = [
        { action_type: 'purchase', value: '200' },
        { action_type: 'omni_purchase', value: '300' },
        { action_type: 'offsite_conversion.fb_pixel_purchase', value: '100' },
      ]

      const result = MetaDataParser.extractConversionValue(actionValues)
      expect(result).toBe(600)
    })

    it('should handle missing or invalid data', () => {
      expect(MetaDataParser.extractConversionValue(undefined as any)).toBe(0)
      expect(MetaDataParser.extractConversionValue([])).toBe(0)
      expect(MetaDataParser.extractConversionValue(null as any)).toBe(0)
    })
  })

  describe('integration test', () => {
    it('should parse complete Meta API response correctly', () => {
      const metaApiResponse = {
        impressions: '10000',
        clicks: '500',
        spend: '250.00',
        conversions: '0', // よくある問題：0として返される
        actions: [
          { action_type: 'purchase', value: '10' },
          { action_type: 'add_to_cart', value: '50' },
          { action_type: 'omni_purchase', value: '5' },
        ],
        action_values: [
          { action_type: 'purchase', value: '1000' },
          { action_type: 'omni_purchase', value: '500' },
        ],
        cost_per_action_type: [{ action_type: 'purchase', value: '16.67' }],
        purchase_roas: [{ value: '6.00', action_type: 'omni_purchase' }],
      }

      const conversions = MetaDataParser.extractConversions(metaApiResponse.actions)
      const roas = MetaDataParser.calculateROAS(metaApiResponse)
      const cpa = MetaDataParser.calculateCPA(metaApiResponse)
      const conversionValue = MetaDataParser.extractConversionValue(metaApiResponse.action_values)

      expect(conversions).toBe(15) // 10 + 5
      expect(roas).toBe(6.0)
      expect(cpa).toBe(16.67)
      expect(conversionValue).toBe(1500) // 1000 + 500
    })
  })
})

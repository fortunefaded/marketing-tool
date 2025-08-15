import { describe, it, expect } from 'vitest'
import { validateCampaignData, validateTaskData } from './convex-helpers'

describe('Convex Helpers', () => {
  describe('validateCampaignData', () => {
    it('should validate valid campaign data', () => {
      const validData = {
        title: 'Test Campaign',
        description: 'Test Description',
        userId: 'user123',
      }

      expect(() => validateCampaignData(validData)).not.toThrow()
    })

    it('should throw error for empty title', () => {
      const invalidData = {
        title: '',
        description: 'Test Description',
        userId: 'user123',
      }

      expect(() => validateCampaignData(invalidData)).toThrow('Title is required')
    })

    it('should throw error for title too long', () => {
      const invalidData = {
        title: 'a'.repeat(201),
        description: 'Test Description',
        userId: 'user123',
      }

      expect(() => validateCampaignData(invalidData)).toThrow(
        'Title must be less than 200 characters'
      )
    })
  })

  describe('validateTaskData', () => {
    it('should validate valid task data', () => {
      const validData = {
        title: 'Test Task',
        campaignId: 'campaign123',
        userId: 'user123',
      }

      expect(() => validateTaskData(validData)).not.toThrow()
    })

    it('should throw error for empty task title', () => {
      const invalidData = {
        title: '',
        campaignId: 'campaign123',
        userId: 'user123',
      }

      expect(() => validateTaskData(invalidData)).toThrow('Task title is required')
    })

    it('should validate optional due date', () => {
      const validData = {
        title: 'Test Task',
        campaignId: 'campaign123',
        userId: 'user123',
        dueDate: Date.now() + 86400000, // Tomorrow
      }

      expect(() => validateTaskData(validData)).not.toThrow()
    })

    it('should throw error for past due date', () => {
      const invalidData = {
        title: 'Test Task',
        campaignId: 'campaign123',
        userId: 'user123',
        dueDate: Date.now() - 86400000, // Yesterday
      }

      expect(() => validateTaskData(invalidData)).toThrow('Due date cannot be in the past')
    })
  })
})

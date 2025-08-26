// Convexデータのバリデーションヘルパー

export interface CampaignData {
  title: string
  description: string
  userId: string // Convex ID type
}

export interface TaskData {
  title: string
  campaignId: string // Convex ID type
  userId: string // Convex ID type
  dueDate?: number
}

export function validateCampaignData(data: CampaignData): void {
  if (!data.title || data.title.trim() === '') {
    throw new Error('Title is required')
  }

  if (data.title.length > 200) {
    throw new Error('Title must be less than 200 characters')
  }

  if (!data.description || data.description.trim() === '') {
    throw new Error('Description is required')
  }

  if (data.description.length > 1000) {
    throw new Error('Description must be less than 1000 characters')
  }
}

export function validateTaskData(data: TaskData): void {
  if (!data.title || data.title.trim() === '') {
    throw new Error('Task title is required')
  }

  if (data.title.length > 200) {
    throw new Error('Task title must be less than 200 characters')
  }

  if (data.dueDate && data.dueDate < Date.now()) {
    throw new Error('Due date cannot be in the past')
  }
}

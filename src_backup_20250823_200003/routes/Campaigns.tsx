import React from 'react'
import { useQuery, useMutation } from 'convex/react'
import { Id } from 'convex/_generated/dataModel'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { useVibeLogger } from '../hooks/useVibeLogger'
import { logger as standaloneLogger } from '../utils/logger'

export default function Campaigns() {
  const logger = useVibeLogger({
    componentName: 'Campaigns',
    trackRenders: true,
  })

  const campaigns = useQuery(api.campaigns.list, {})
  const createCampaign = useMutation(api.campaigns.create)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const story = logger.componentStory('キャンペーン作成処理')

    try {
      story.chapter('入力値検証', `タイトル: ${title}, 説明: ${description.length}文字`)

      if (!title.trim() || !description.trim()) {
        logger.warn('入力値が不正です', {
          title: title.trim(),
          descriptionLength: description.trim().length,
        })
        story.fail('入力値検証エラー')
        return
      }

      story.chapter('データベース保存処理開始')
      logger.action('キャンペーン作成APIを呼び出します', {
        title,
        descriptionLength: description.length,
      })

      await createCampaign({
        title,
        description,
        userId: 'temp-user-id' as Id<'users'>, // 仮のユーザーID
      })

      story.chapter('フォームリセット')
      setTitle('')
      setDescription('')

      story.success(`キャンペーン「${title}」を作成しました`)
      logger.good(`キャンペーン作成成功: ${title}`)
    } catch (error) {
      story.fail('キャンペーン作成エラー')
      logger.error('キャンペーン作成に失敗しました', {
        error: error instanceof Error ? error.message : '不明なエラー',
        title,
        description,
      })
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">キャンペーン管理</h2>

      <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">新規キャンペーン作成</h3>
        <input
          type="text"
          placeholder="キャンペーン名"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <textarea
          placeholder="説明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          required
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          作成
        </button>
      </form>

      <div className="grid gap-4">
        {campaigns?.map((campaign) => (
          <div key={campaign._id} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold">{campaign.title}</h3>
            <p className="text-gray-600 mt-2">{campaign.description}</p>
            <span className="inline-block mt-3 px-2 py-1 text-xs rounded bg-gray-100">
              {campaign.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

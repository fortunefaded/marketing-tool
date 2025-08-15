import React from 'react'
import { useQuery, useMutation } from 'convex/react'
import { Id } from 'convex/_generated/dataModel'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { useVibeLogger } from '../hooks/useVibeLogger'

export default function Tasks() {
  const logger = useVibeLogger({
    componentName: 'Tasks',
    trackRenders: true,
  })

  const tasks = useQuery(api.tasks.list, {})
  const createTask = useMutation(api.tasks.create)
  const updateTaskStatus = useMutation(api.tasks.updateStatus)

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
  })

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    const story = logger.componentStory('タスク作成処理')

    try {
      story.chapter('入力値検証')

      if (!newTask.title.trim()) {
        logger.warn('タスクタイトルが入力されていません')
        story.fail('入力値検証エラー')
        return
      }

      story.chapter('タスク作成API呼び出し')
      logger.action('新規タスクを作成します', {
        title: newTask.title,
        hasDescription: !!newTask.description,
        hasDueDate: !!newTask.dueDate,
      })

      await createTask({
        title: newTask.title,
        description: newTask.description,
        campaignId: 'temp-campaign-id' as Id<'campaigns'>, // 仮のキャンペーンID
        assignedTo: 'temp-user-id' as Id<'users'>, // 仮のユーザーID
        dueDate: newTask.dueDate || undefined,
      })

      story.chapter('フォームリセット')
      setNewTask({ title: '', description: '', dueDate: '' })

      story.success(`タスク「${newTask.title}」を作成しました`)
      logger.good(`タスク作成成功: ${newTask.title}`)
    } catch (error) {
      story.fail('タスク作成エラー')
      logger.error('タスク作成に失敗しました', {
        error: error instanceof Error ? error.message : '不明なエラー',
        task: newTask,
      })
    }
  }

  const handleStatusChange = async (
    taskId: string,
    newStatus: 'pending' | 'in_progress' | 'completed'
  ) => {
    try {
      logger.action(`タスクステータスを変更します`, { taskId, newStatus })

      await updateTaskStatus({
        taskId: taskId as Id<'tasks'>,
        status: newStatus,
      })

      logger.good(`タスクステータスを「${newStatus}」に変更しました`)
    } catch (error) {
      logger.error('タスクステータスの変更に失敗しました', {
        error: error instanceof Error ? error.message : '不明なエラー',
        taskId,
        newStatus,
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">タスク管理</h2>

      <form onSubmit={handleCreateTask} className="mb-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">新規タスク作成</h3>
        <input
          type="text"
          placeholder="タスク名"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          className="w-full p-2 border rounded mb-3"
          required
        />
        <textarea
          placeholder="詳細説明（任意）"
          value={newTask.description}
          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          className="w-full p-2 border rounded mb-3"
          rows={3}
        />
        <input
          type="date"
          value={newTask.dueDate}
          onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
          className="w-full p-2 border rounded mb-3"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          タスク作成
        </button>
      </form>

      <div>
        <h3 className="text-lg font-semibold mb-4">タスク一覧</h3>
        {tasks === undefined ? (
          <p>読み込み中...</p>
        ) : tasks.length === 0 ? (
          <p>タスクがありません</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task._id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{task.title}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                {task.description && <p className="text-gray-600 mb-2">{task.description}</p>}
                {task.dueDate && <p className="text-sm text-gray-500">期限: {task.dueDate}</p>}
                <div className="mt-3 space-x-2">
                  <button
                    onClick={() => handleStatusChange(task._id, 'pending')}
                    className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded"
                  >
                    保留
                  </button>
                  <button
                    onClick={() => handleStatusChange(task._id, 'in_progress')}
                    className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded"
                  >
                    進行中
                  </button>
                  <button
                    onClick={() => handleStatusChange(task._id, 'completed')}
                    className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded"
                  >
                    完了
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

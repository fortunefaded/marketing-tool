import React, { useState, useEffect } from 'react'
import { useLocation, Link, Outlet } from 'react-router-dom'
import { CheckIcon } from '@heroicons/react/24/solid'

interface Step {
  id: string
  name: string
  href: string
  status: 'complete' | 'current' | 'upcoming'
}

export const MetaApiSetupSteps: React.FC = () => {
  // const navigate = useNavigate()
  const location = useLocation()
  // const [manager] = useState(() => MetaAccountManager.getInstance())
  // const [hasAccount, setHasAccount] = useState(false)

  // ステップの定義
  const [steps, setSteps] = useState<Step[]>([
    { id: 'connect', name: 'アカウント接続', href: '/meta-api-setup/connect', status: 'current' },
    { id: 'permissions', name: '権限確認', href: '/meta-api-setup/permissions', status: 'upcoming' },
    { id: 'test', name: '接続テスト', href: '/meta-api-setup/test', status: 'upcoming' },
    { id: 'complete', name: '完了', href: '/meta-api-setup/complete', status: 'upcoming' }
  ])

  useEffect(() => {
    // const accounts = manager.getAccounts()
    // setHasAccount(accounts.length > 0)
    updateStepStatus()
  }, [location])

  const updateStepStatus = () => {
    const currentPath = location.pathname
    const newSteps = steps.map((step, index) => {
      const currentIndex = steps.findIndex(s => currentPath.includes(s.id))
      
      if (currentIndex === -1) return step
      
      if (index < currentIndex) {
        return { ...step, status: 'complete' as const }
      } else if (index === currentIndex) {
        return { ...step, status: 'current' as const }
      } else {
        return { ...step, status: 'upcoming' as const }
      }
    })
    setSteps(newSteps)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Meta広告API設定
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Meta広告データにアクセスするための設定を行います
          </p>
        </div>

        {/* ステップインジケーター */}
        <nav aria-label="Progress" className="mb-8">
          <ol className="flex items-center justify-between">
            {steps.map((step, stepIdx) => (
              <li key={step.name} className={stepIdx !== steps.length - 1 ? 'flex-1' : ''}>
                <div className="flex items-center">
                  <Link
                    to={step.href}
                    className={`${
                      step.status === 'complete'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : step.status === 'current'
                        ? 'bg-indigo-600'
                        : 'bg-gray-300'
                    } h-10 w-10 rounded-full flex items-center justify-center text-white transition-colors`}
                  >
                    {step.status === 'complete' ? (
                      <CheckIcon className="h-6 w-6" />
                    ) : (
                      <span>{stepIdx + 1}</span>
                    )}
                  </Link>
                  {stepIdx !== steps.length - 1 && (
                    <div
                      className={`ml-4 h-0.5 flex-1 ${
                        step.status === 'complete' ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">{step.name}</p>
              </li>
            ))}
          </ol>
        </nav>

        {/* コンテンツエリア */}
        <div className="bg-white shadow rounded-lg p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
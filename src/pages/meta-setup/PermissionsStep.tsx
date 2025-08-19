import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetaAccountManager } from '../../services/metaAccountManager'
import { CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Permission {
  name: string
  key: string
  required: boolean
  description: string
  hasPermission: boolean
}

export const PermissionsStep: React.FC = () => {
  const navigate = useNavigate()
  const [manager] = useState(() => MetaAccountManager.getInstance())
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      name: '広告読み取り',
      key: 'ads_read',
      required: true,
      description: '広告データとインサイトを読み取るための権限',
      hasPermission: false
    },
    {
      name: '広告管理',
      key: 'ads_management',
      required: true,
      description: '広告の管理とレポート取得のための権限',
      hasPermission: false
    },
    {
      name: 'ビジネス管理',
      key: 'business_management',
      required: true,
      description: 'ビジネスアカウントへのアクセス権限',
      hasPermission: false
    }
  ])
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    setIsChecking(true)
    const activeAccount = manager.getActiveAccount()
    
    if (!activeAccount) {
      navigate('/meta-api-setup/connect')
      return
    }

    // アカウントの権限を確認（実際のAPI呼び出しをシミュレート）
    setTimeout(() => {
      const updatedPermissions = permissions.map(perm => ({
        ...perm,
        hasPermission: perm.required // デモのため、必須権限は付与されているとする
      }))
      setPermissions(updatedPermissions)
      setIsChecking(false)
    }, 1000)
  }

  const handleContinue = () => {
    const hasAllRequiredPermissions = permissions
      .filter(p => p.required)
      .every(p => p.hasPermission)
    
    if (hasAllRequiredPermissions) {
      navigate('/meta-api-setup/test')
    }
  }

  const handleBack = () => {
    navigate('/meta-api-setup/connect')
  }

  const allRequiredPermissionsGranted = permissions
    .filter(p => p.required)
    .every(p => p.hasPermission)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          アクセス権限の確認
        </h2>
        <p className="text-gray-600">
          Meta広告データにアクセスするために必要な権限を確認します。
        </p>
      </div>

      {isChecking ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {permissions.map((permission) => (
              <div
                key={permission.key}
                className={`border rounded-lg p-4 ${
                  permission.hasPermission
                    ? 'border-green-200 bg-green-50'
                    : permission.required
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {permission.hasPermission ? (
                      <CheckIcon className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900">
                        {permission.name}
                      </h3>
                      {permission.required && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                          必須
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {permission.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      権限キー: {permission.key}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!allRequiredPermissionsGranted && (
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    必要な権限が不足しています
                  </h3>
                  <p className="mt-2 text-sm text-yellow-700">
                    必須の権限がすべて付与されていません。
                    Graph API Explorerでアクセストークンを再生成し、
                    必要な権限をすべて選択してください。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={handleBack}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              戻る
            </button>
            
            <button
              onClick={handleContinue}
              disabled={!allRequiredPermissionsGranted}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              次へ進む
            </button>
          </div>
        </>
      )}
    </div>
  )
}
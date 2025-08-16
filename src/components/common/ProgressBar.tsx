import React from 'react'

interface ProgressBarProps {
  progress: number // 0-100
  message?: string
  showPercentage?: boolean
  color?: 'blue' | 'green' | 'yellow' | 'red'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  message,
  showPercentage = true,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  }

  return (
    <div className="w-full">
      {(message || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {message && (
            <span className="text-sm font-medium text-gray-700">{message}</span>
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// 複数ステップのプログレスバー
interface MultiStepProgressProps {
  steps: Array<{
    name: string
    status: 'pending' | 'in-progress' | 'completed'
  }>
}

export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({ steps }) => {
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const progress = (completedSteps / steps.length) * 100

  return (
    <div className="w-full">
      <ProgressBar 
        progress={progress} 
        message={`処理中... (${completedSteps}/${steps.length})`}
        color="green"
      />
      <div className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              step.status === 'completed' ? 'bg-green-600' : 
              step.status === 'in-progress' ? 'bg-blue-600 animate-pulse' : 
              'bg-gray-300'
            }`}>
              {step.status === 'completed' && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${
              step.status === 'in-progress' ? 'font-medium text-blue-600' : 
              step.status === 'completed' ? 'text-gray-600' : 
              'text-gray-400'
            }`}>
              {step.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
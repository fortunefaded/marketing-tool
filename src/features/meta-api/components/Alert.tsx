interface AlertProps {
  type: 'error' | 'warning' | 'info'
  title?: string
  message: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function Alert({ type, title, message, action }: AlertProps) {
  const styles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-400',
      title: 'text-red-800',
      text: 'text-red-700',
      link: 'text-red-600'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-400',
      title: 'text-yellow-800',
      text: 'text-yellow-700',
      link: 'text-yellow-600'
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-400',
      title: 'text-blue-800',
      text: 'text-blue-700',
      link: 'text-blue-600'
    }
  }[type]
  
  return (
    <div className={`border rounded-lg p-4 ${styles.container}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            {type === 'error' && (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            )}
            {type === 'warning' && (
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            )}
            {type === 'info' && (
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            )}
          </svg>
        </div>
        <div className="ml-3">
          {title && <h3 className={`text-sm font-medium ${styles.title}`}>{title}</h3>}
          <p className={`${title ? 'mt-1' : ''} text-sm ${styles.text}`}>{message}</p>
          {action && (
            <p className="mt-2">
              {action.href ? (
                <a href={action.href} className={`${styles.link} underline text-sm`}>
                  {action.label}
                </a>
              ) : (
                <button onClick={action.onClick} className={`${styles.link} underline text-sm`}>
                  {action.label}
                </button>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
import { MetaAccount } from '@/types'

interface Props {
  accounts: MetaAccount[]
  selectedAccountId: string | null
  onSelect: (accountId: string) => void
  isLoading?: boolean
}

export function AccountSelector({ accounts, selectedAccountId, onSelect, isLoading }: Props) {
  if (isLoading) {
    return <div className="text-gray-500">Loading accounts...</div>
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">No Meta accounts connected.</p>
        <a href="/settings/meta-api" className="text-yellow-600 underline">
          Connect an account
        </a>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-600">Account:</label>
      <select
        value={selectedAccountId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="block w-48 px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Select an account</option>
        {accounts.map((account) => (
          <option key={account.accountId} value={account.accountId}>
            {account.name} ({account.accountId})
          </option>
        ))}
      </select>
    </div>
  )
}

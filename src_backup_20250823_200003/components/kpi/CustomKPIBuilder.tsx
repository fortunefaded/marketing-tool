import React, { useState } from 'react'
import {
  CalculatorIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  BeakerIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export interface KPIField {
  name: string
  label: string
  type: string
}

export interface CustomKPIConfig {
  name: string
  description: string
  formula: string
  format: 'number' | 'percentage' | 'currency'
  decimals: number
}

interface CustomKPIBuilderProps {
  availableFields: KPIField[]
  previewData?: Record<string, number>
  onSave: (config: CustomKPIConfig) => void
}

type FormulaToken = {
  type: 'field' | 'operator' | 'parenthesis' | 'function'
  value: string
  label?: string
}

const OPERATORS = [
  { value: '+', label: '+' },
  { value: '-', label: '-' },
  { value: '*', label: '×' },
  { value: '/', label: '÷' },
]

const FUNCTIONS = [
  { value: 'SUM', label: 'SUM (合計)' },
  { value: 'AVG', label: 'AVG (平均)' },
  { value: 'MAX', label: 'MAX (最大)' },
  { value: 'MIN', label: 'MIN (最小)' },
  { value: 'COUNT', label: 'COUNT (件数)' },
]

const TEMPLATES = [
  { name: 'ROAS (売上 ÷ 広告費)', formula: 'revenue / adSpend' },
  { name: 'CTR (クリック ÷ インプレッション × 100)', formula: 'clicks / impressions * 100' },
  { name: 'CPA (広告費 ÷ 注文数)', formula: 'adSpend / orders' },
]

export const CustomKPIBuilder: React.FC<CustomKPIBuilderProps> = ({
  availableFields,
  previewData,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formula, setFormula] = useState<FormulaToken[]>([])
  const [format, setFormat] = useState<'number' | 'percentage' | 'currency'>('number')
  const [decimals, setDecimals] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [previewResult, setPreviewResult] = useState<number | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showFunctions, setShowFunctions] = useState(false)
  const [history, setHistory] = useState<FormulaToken[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // 計算式を文字列に変換
  const getFormulaString = () => {
    return formula
      .map((token) => {
        if (token.type === 'field') return token.value
        if (token.type === 'operator') return ` ${token.value} `
        if (token.type === 'function') return `${token.value}(`
        return token.value
      })
      .join('')
  }

  // フィールドを追加
  const addField = (field: KPIField) => {
    const newFormula = [
      ...formula,
      { type: 'field' as const, value: field.name, label: field.label },
    ]
    updateFormula(newFormula)
  }

  // 演算子を追加
  const addOperator = (operator: string) => {
    const newFormula = [...formula, { type: 'operator' as const, value: operator }]
    updateFormula(newFormula)
  }

  // 括弧を追加
  const addParenthesis = (paren: string) => {
    const newFormula = [...formula, { type: 'parenthesis' as const, value: paren }]
    updateFormula(newFormula)
  }

  // 関数を追加
  const addFunction = (func: string) => {
    const newFormula = [...formula, { type: 'function' as const, value: func }]
    updateFormula(newFormula)
  }

  // 計算式を更新（履歴も管理）
  const updateFormula = (newFormula: FormulaToken[]) => {
    setFormula(newFormula)

    // 履歴を更新
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newFormula)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // 元に戻す
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setFormula(history[historyIndex - 1])
    }
  }

  // やり直し
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setFormula(history[historyIndex + 1])
    }
  }

  // 計算式をクリア
  const clearFormula = () => {
    updateFormula([])
    setError(null)
    setPreviewResult(null)
  }

  // 計算式の検証
  const validateFormula = () => {
    setError(null)

    if (formula.length === 0) {
      setError('計算式を入力してください')
      return false
    }

    // 最後のトークンが演算子の場合はエラー
    const lastToken = formula[formula.length - 1]
    if (lastToken.type === 'operator') {
      setError('計算式が不完全です')
      return false
    }

    // 括弧の数をチェック
    const openParens = formula.filter((t) => t.value === '(').length
    const closeParens = formula.filter((t) => t.value === ')').length
    if (openParens !== closeParens) {
      setError('括弧が対応していません')
      return false
    }

    return true
  }

  // プレビューを計算
  const calculatePreview = () => {
    if (!validateFormula() || !previewData) return

    try {
      // 簡易的な計算実装（実際はより堅牢な実装が必要）
      let formulaStr = getFormulaString()

      // フィールド名を値に置換
      Object.entries(previewData).forEach(([field, value]) => {
        formulaStr = formulaStr.replace(new RegExp(field, 'g'), value.toString())
      })

      // ゼロ除算チェック
      if (formulaStr.includes('/ 0')) {
        setError('エラー: ゼロ除算')
        return
      }

      // 計算実行（evalの代わりに安全な方法を使うべき）
      const result = Function(`"use strict"; return (${formulaStr})`)()
      setPreviewResult(result)
    } catch {
      setError('計算エラーが発生しました')
    }
  }

  // テンプレートを適用
  const applyTemplate = (template: string) => {
    const tokens: FormulaToken[] = []
    const parts = template.split(/\s+/)

    parts.forEach((part) => {
      if (['+', '-', '*', '/'].includes(part)) {
        tokens.push({ type: 'operator', value: part })
      } else if (['(', ')'].includes(part)) {
        tokens.push({ type: 'parenthesis', value: part })
      } else {
        const field = availableFields.find((f) => f.name === part)
        if (field) {
          tokens.push({ type: 'field', value: field.name, label: field.label })
        } else if (!isNaN(Number(part))) {
          tokens.push({ type: 'field', value: part })
        }
      }
    })

    updateFormula(tokens)
    setShowTemplates(false)
  }

  // 保存処理
  const handleSave = () => {
    setError(null)

    if (!name) {
      setError('KPI名を入力してください')
      return
    }

    if (!validateFormula()) return

    onSave({
      name,
      description,
      formula: getFormulaString(),
      format,
      decimals,
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">カスタムKPIビルダー</h2>

      {/* 基本情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="kpi-name" className="block text-sm font-medium text-gray-700 mb-1">
            KPI名
          </label>
          <input
            id="kpi-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="kpi-description" className="block text-sm font-medium text-gray-700 mb-1">
            説明
          </label>
          <input
            id="kpi-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* 計算式ディスプレイ */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">計算式</label>
          <div className="flex gap-2">
            <button
              data-testid="undo-button"
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-1 text-gray-600 hover:text-gray-900 disabled:text-gray-300"
            >
              <ArrowUturnLeftIcon className="h-5 w-5" />
            </button>
            <button
              data-testid="redo-button"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-1 text-gray-600 hover:text-gray-900 disabled:text-gray-300"
            >
              <ArrowUturnRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div
          data-testid="formula-display"
          className="p-4 bg-gray-50 border border-gray-200 rounded-md min-h-[60px] font-mono"
        >
          {formula.map((token, index) => (
            <span
              key={index}
              className={
                token.type === 'field'
                  ? 'text-blue-600'
                  : token.type === 'operator'
                    ? 'text-orange-600 mx-1'
                    : token.type === 'function'
                      ? 'text-purple-600'
                      : 'text-gray-900'
              }
            >
              {token.label || token.value}
            </span>
          ))}
        </div>
      </div>

      {/* フィールド選択 */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">フィールド</h3>
        <div className="flex flex-wrap gap-2">
          {availableFields.map((field) => (
            <button
              key={field.name}
              onClick={() => addField(field)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              {field.label}
            </button>
          ))}
        </div>
      </div>

      {/* 演算子と括弧 */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">演算子</h3>
        <div className="flex gap-2">
          {OPERATORS.map((op) => (
            <button
              key={op.value}
              onClick={() => addOperator(op.value)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {op.label}
            </button>
          ))}
          <button
            onClick={() => addParenthesis('(')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            (
          </button>
          <button
            onClick={() => addParenthesis(')')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            )
          </button>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          <DocumentTextIcon className="h-5 w-5 inline mr-1" />
          テンプレート
        </button>
        <button
          onClick={() => setShowFunctions(!showFunctions)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          <CalculatorIcon className="h-5 w-5 inline mr-1" />
          関数
        </button>
        <button
          onClick={calculatePreview}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <BeakerIcon className="h-5 w-5 inline mr-1" />
          プレビュー
        </button>
        <button
          onClick={validateFormula}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          検証
        </button>
        <button
          onClick={clearFormula}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          <XMarkIcon className="h-5 w-5 inline mr-1" />
          クリア
        </button>
      </div>

      {/* テンプレート選択 */}
      {showTemplates && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">テンプレート</h3>
          <div className="space-y-2">
            {TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => applyTemplate(template.formula)}
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 関数選択 */}
      {showFunctions && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">関数</h3>
          <div className="flex gap-2">
            {FUNCTIONS.map((func) => (
              <button
                key={func.value}
                onClick={() => addFunction(func.value)}
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                {func.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* プレビュー結果 */}
      {previewResult !== null && (
        <div className="mb-4 p-4 bg-blue-50 rounded-md">
          <p className="text-lg font-medium text-blue-900">計算結果: {previewResult.toFixed(2)}</p>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* フォーマット設定 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-1">
            表示形式
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="number">数値</option>
            <option value="percentage">パーセント</option>
            <option value="currency">通貨</option>
          </select>
        </div>
        <div>
          <label htmlFor="decimals" className="block text-sm font-medium text-gray-700 mb-1">
            小数点以下桁数
          </label>
          <input
            id="decimals"
            type="number"
            min="0"
            max="4"
            value={decimals}
            onChange={(e) => setDecimals(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          保存
        </button>
      </div>
    </div>
  )
}

/* eslint-env node */
/* eslint-disable no-undef */
// const fs = require('fs'); // 未使用
// const path = require('path'); // 未使用

// ESLint設定に基づいて未使用インポートを自動修正
const fixUnusedImports = () => {
  const { ESLint } = require('eslint')

  const eslint = new ESLint({
    fix: true,
    baseConfig: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['@typescript-eslint', 'unused-imports'],
      rules: {
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'warn',
          { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
        ],
      },
    },
  })

  return eslint
}

// 修正対象のディレクトリ
const targetDirs = ['src/components', 'src/hooks', 'src/pages', 'src/services', 'src/utils']

async function main() {
  try {
    const eslint = fixUnusedImports()

    for (const dir of targetDirs) {
      const results = await eslint.lintFiles(`${dir}/**/*.{ts,tsx}`)

      await ESLint.outputFixes(results)

      const errorCount = results.reduce((acc, result) => acc + result.errorCount, 0)
      console.log(`Fixed ${errorCount} issues in ${dir}`)
    }
  } catch (error) {
    console.error('Error fixing imports:', error)
  }
}

main()

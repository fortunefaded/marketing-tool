module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新機能
        'fix',      // バグ修正
        'docs',     // ドキュメント
        'style',    // フォーマット
        'refactor', // リファクタリング
        'perf',     // パフォーマンス改善
        'test',     // テスト
        'build',    // ビルド
        'ci',       // CI/CD
        'chore',    // その他
        'revert'    // リバート
      ]
    ],
    'subject-case': [0], // subject-caseチェックを無効化
    'subject-full-stop': [0], // ピリオドチェックを無効化
    'header-max-length': [2, 'always', 100], // 最大100文字
  }
}

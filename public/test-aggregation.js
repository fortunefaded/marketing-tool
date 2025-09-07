// テスト用スクリプト: ブラウザコンソールで実行してください
// /ad-fatigue ページにアクセスした状態で実行

console.log('=== 集約機能テスト ===');

// デバッグ情報を確認
if (window.__AGGREGATION_DEBUG__) {
  const debug = window.__AGGREGATION_DEBUG__;
  console.log('集約状態:', {
    データ件数: debug.aggregatedData?.length || 0,
    集約中: debug.isAggregating,
    エラー: debug.error,
    メトリクス: debug.aggregationMetrics
  });
  
  if (debug.aggregationMetrics) {
    console.log(`✅ 集約成功: ${debug.aggregationMetrics.inputRows}行 → ${debug.aggregationMetrics.outputRows}行 (${debug.aggregationMetrics.dataReduction}削減)`);
    console.log(`処理時間: ${debug.aggregationMetrics.processingTimeMs}ms`);
  }
} else {
  console.log('⚠️ 集約機能が有効になっていません。');
  console.log('集約トグルボタンをONにしてください。');
}

// フィルター状態を確認
const filterButton = document.querySelector('button[class*="フィルター"]');
if (filterButton) {
  console.log('✅ フィルターボタンが見つかりました');
} else {
  console.log('❌ フィルターボタンが見つかりません');
}

console.log('=== テスト完了 ===');
// デバッグコマンド集
// ブラウザのコンソールで以下のコマンドを実行してください

// 1. 最新のAPI Requestログを表示
window.showLastAPIRequest = () => {
  const logs = window.DEBUG_FATIGUE_LOGS || [];
  const apiRequestLogs = logs.filter(log => log.includes('Meta API Request'));
  const lastRequest = apiRequestLogs[apiRequestLogs.length - 1];
  
  if (lastRequest) {
    try {
      const match = lastRequest.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        console.log('📅 最新のAPIリクエスト:');
        console.log('日付範囲タイプ:', data.dateRange);
        console.log('送信された期間:', data.timeRange);
        console.log('詳細情報:', data.debugDateInfo);
        return data;
      }
    } catch (e) {
      console.error('パースエラー:', e);
    }
  }
  console.log('APIリクエストログが見つかりません');
};

// 2. 最新のAPI Responseログを表示
window.showLastAPIResponse = () => {
  const logs = window.DEBUG_FATIGUE_LOGS || [];
  const apiResponseLogs = logs.filter(log => log.includes('Meta API Response'));
  const lastResponse = apiResponseLogs[apiResponseLogs.length - 1];
  
  if (lastResponse) {
    try {
      const match = lastResponse.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        console.log('📊 最新のAPIレスポンス:');
        console.log('データ件数:', data.dataCount);
        console.log('合計広告費:', data.totalSpend);
        console.log('最大インプレッション:', data.maxImpressions);
        console.log('上位5件:', data.top5ByImpressions);
        return data;
      }
    } catch (e) {
      console.error('パースエラー:', e);
    }
  }
  console.log('APIレスポンスログが見つかりません');
};

// 3. 日付範囲の計算結果を表示
window.showDateRangeCalculation = () => {
  const logs = window.DEBUG_FATIGUE_LOGS || [];
  const dateRangeLogs = logs.filter(log => 
    log.includes('今日と昨日の日付範囲設定') || 
    log.includes('今日の日付範囲設定') ||
    log.includes('昨日の日付範囲設定')
  );
  
  console.log('📅 日付範囲の計算ログ:');
  dateRangeLogs.forEach((log, index) => {
    console.log(`--- ログ ${index + 1} ---`);
    try {
      const match = log.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        console.log('開始:', data.start);
        console.log('終了:', data.end);
        console.log('フォーマット済み開始:', data.startFormatted);
        console.log('フォーマット済み終了:', data.endFormatted);
      }
    } catch (e) {
      console.log(log);
    }
  });
};

// 4. すべてを一度に確認
window.debugDateRange = () => {
  console.log('========== デバッグ開始 ==========');
  
  console.log('\n【1. 日付範囲の計算】');
  window.showDateRangeCalculation();
  
  console.log('\n【2. APIリクエスト】');
  const request = window.showLastAPIRequest();
  
  console.log('\n【3. APIレスポンス】');
  const response = window.showLastAPIResponse();
  
  console.log('\n【4. 問題の診断】');
  if (response && response.maxImpressions) {
    const maxImp = response.maxImpressions.value;
    console.log(`最大インプレッション: ${maxImp.toLocaleString()}`);
    console.log(`実際の値との差: ${(80594 - maxImp).toLocaleString()}`);
    
    if (maxImp < 80594) {
      console.warn('⚠️ データが不完全です！');
      console.log('考えられる原因:');
      console.log('1. 日付範囲が正しくない（開始日または終了日が間違っている）');
      console.log('2. APIのページネーションで全データを取得できていない');
      console.log('3. フィルタリングやキャッシュの問題');
    } else {
      console.log('✅ データは正しく取得されています');
    }
  }
  
  console.log('\n========== デバッグ終了 ==========');
};

// 使い方を表示
console.log('🔍 デバッグコマンドが利用可能です:');
console.log('  window.debugDateRange() - すべての情報を表示');
console.log('  window.showLastAPIRequest() - 最新のAPIリクエスト');
console.log('  window.showLastAPIResponse() - 最新のAPIレスポンス');
console.log('  window.showDateRangeCalculation() - 日付範囲の計算結果');
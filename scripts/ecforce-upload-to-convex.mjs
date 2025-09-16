// ECForce CSV を Convexデータベースにアップロードするスクリプト
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Convexへのアップロード処理
export async function uploadToConvex(csvPath, options = {}) {
  const { limitDays = 2 } = options; // デフォルトは2日分に制限

  try {
    console.log('\n📤 Convexデータベースへアップロード開始...');
    console.log(`  CSVファイル: ${csvPath}`);
    console.log(`  インポート制限: 直近${limitDays}日分`);
    
    // Convex URLを環境変数から取得
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      console.error('❌ VITE_CONVEX_URLが設定されていません');
      return false;
    }
    
    const client = new ConvexHttpClient(convexUrl);
    
    // CSVファイルを読み込み（Shift-JISの場合も考慮）
    let csvContent;
    const buffer = fs.readFileSync(csvPath);
    
    // まずShift-JISとして読み込みを試みる（ECForceのCSVは通常Shift-JIS）
    try {
      // Shift-JISとして読み込み
      console.log('  Shift-JISからUTF-8に変換中...');
      csvContent = iconv.decode(buffer, 'Shift_JIS');
      
      // 変換成功の確認（日本語が含まれているかチェック）
      if (!csvContent.includes('デバイス') && !csvContent.includes('合計')) {
        // UTF-8として再度試みる
        csvContent = buffer.toString('utf-8');
        // BOMを除去
        if (csvContent.charCodeAt(0) === 0xFEFF) {
          csvContent = csvContent.substring(1);
        }
        console.log('  UTF-8として読み込み');
      } else {
        console.log('  Shift-JIS変換成功');
      }
    } catch (e) {
      // UTF-8として読み込み
      console.log('  UTF-8として読み込み中...');
      csvContent = buffer.toString('utf-8');
      // BOMを除去
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.substring(1);
      }
    }
    
    // papaparseでCSVをパース
    console.log('📊 CSVファイルを解析中...');
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    if (parseResult.errors && parseResult.errors.length > 0) {
      console.error('❌ CSVパースエラー:');
      parseResult.errors.forEach(error => {
        console.error(`  行${error.row}: ${error.message}`);
      });
      if (parseResult.data.length === 0) {
        return false;
      }
    }
    
    console.log(`  総行数: ${parseResult.data.length}`);
    
    // デバッグ: 最初の数行のデータとヘッダーを確認
    if (parseResult.data.length > 0) {
      console.log('📋 ヘッダー:', Object.keys(parseResult.data[0]));
      console.log('📋 最初の3行のデータ:');
      parseResult.data.slice(0, 3).forEach((row, i) => {
        console.log(`  行${i + 1}:`, row);
      });
    }
    
    // デバイス=「合計」のみフィルタリング
    const deviceFilteredData = parseResult.data.filter(row => row['デバイス'] === '合計');
    console.log(`  デバイス=合計: ${deviceFilteredData.length}件`);

    // 指定日数分のみに制限（Convexクエリ節約のため）
    const today = new Date();
    const cutoffDateObj = new Date(today);
    cutoffDateObj.setDate(today.getDate() - limitDays);

    // 日付形式を正規化（YYYY-MM-DD形式）
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const cutoffDate = formatDate(cutoffDateObj);
    console.log(`  📅 直近${limitDays}日分のみ処理（${cutoffDate}以降）`);

    const filteredData = deviceFilteredData.filter(row => {
      const dateField = row['日付'] || row['期間'];
      if (!dateField) return false;

      // 日付を正規化（YYYY-MM-DD形式に統一）
      const normalizedDate = String(dateField).replace(/\//g, '-').split(' ')[0];

      // 2024-12-25 形式または 2024-12-25形式を想定
      const dateParts = normalizedDate.split('-');
      if (dateParts.length === 3) {
        const formattedDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
        return formattedDate >= cutoffDate;
      }

      return false;
    });

    console.log(`  処理対象データ: ${filteredData.length}件（直近${limitDays}日分）`);

    if (filteredData.length === 0) {
      console.log(`⚠️ 処理対象のデータがありません（直近${limitDays}日分のデータが存在しない可能性があります）`);
      return false;
    }
    
    // 日付範囲を取得
    const dateSet = new Set();
    filteredData.forEach(row => {
      const dateField = row['日付'] || row['期間'];
      if (dateField) {
        let normalizedDate = String(dateField).replace(/\//g, '-').split(' ')[0];
        dateSet.add(normalizedDate);
      }
    });
    
    const sortedDates = Array.from(dateSet).sort();
    const dateRange = {
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1],
      uniqueDates: sortedDates,
    };
    
    console.log(`📅 日付範囲: ${dateRange.startDate} 〜 ${dateRange.endDate}`);
    console.log(`  日付数: ${sortedDates.length}日分`);
    
    // インポートセッション作成
    const fileName = path.basename(csvPath);
    const fileSize = fs.statSync(csvPath).size;
    
    console.log('\n📝 インポートセッション作成中...');
    const importSession = await client.mutation(api.ecforce.createImport, {
      fileName,
      fileSize,
      dataDate: dateRange.startDate,
      source: 'automation',
      totalRows: parseResult.data.length,
      filteredRows: filteredData.length,
    });
    
    console.log(`✅ インポートセッション作成: ${importSession.importId}`);
    
    // データを変換
    console.log('\n🔄 データ変換中...');
    const transformedData = [];
    
    // ヘッダーマッピング
    const HEADER_MAPPING = {
      '期間': 'period',
      '日付': 'date',
      '広告主別': 'advertiser',
      'デバイス': 'device',
      '受注金額': 'orderAmount',
      '売上金額': 'salesAmount',
      'アクセス数': 'accessCount',
      'CV（受注）': 'cvOrder',
      'CVR（受注）': 'cvrOrder',
      'CV（決済）': 'cvPayment',
      'CVR（決済）': 'cvrPayment',
      'コスト': 'cost',
      'CV（サンクスアップセル）': 'cvThanksUpsell',
      'CV（アップセル）': 'cvUpsell',
      'CV（サンクスアップセル）': 'cvThanksUpsell',
      'CV（サンクスクロスセル）': 'cvThanksCrossSell',
      'オファー成功率（アップセル）': 'offerRateUpsell',
      'オファー成功率（サンクスアップセル）': 'offerRateThanksUpsell',
      'オファー成功率（サンクスクロスセル）': 'offerRateThanksCrossSell',
    };
    
    filteredData.forEach((row, index) => {
      try {
        const dateField = row['日付'] || row['期間'];
        const rowDataDate = String(dateField).replace(/\//g, '-').split(' ')[0];
        
        const transformed = { dataDate: rowDataDate };
        
        Object.entries(row).forEach(([key, value]) => {
          const mappedKey = HEADER_MAPPING[key];
          if (mappedKey && key !== '期間' && key !== 'デバイス') {
            const strValue = String(value || '').trim();
            
            if (mappedKey === 'advertiser') {
              transformed[mappedKey] = strValue;
              // 広告主名の正規化
              transformed.advertiserNormalized = strValue
                .toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[　]/g, '')
                .trim();
            } else if (mappedKey === 'date') {
              transformed[mappedKey] = strValue.replace(/\//g, '-').split(' ')[0];
            } else if (
              mappedKey.includes('Amount') ||
              mappedKey.includes('cost') ||
              (mappedKey.includes('cv') && !mappedKey.includes('cvr')) ||
              mappedKey === 'accessCount'
            ) {
              // カンマを除去して数値に変換
              const numValue = strValue.replace(/,/g, '').replace(/[^\d.-]/g, '');
              transformed[mappedKey] = parseInt(numValue) || 0;
            } else if (mappedKey.includes('cvr') || mappedKey.includes('Rate')) {
              // パーセンテージを小数に変換
              const percentValue = strValue.replace('%', '').replace(/[^\d.-]/g, '');
              transformed[mappedKey] = parseFloat(percentValue) / 100 || 0;
            } else {
              transformed[mappedKey] = strValue;
            }
          }
        });
        
        // 計算フィールド
        if (transformed.cvOrder > 0) {
          transformed.paymentRate = transformed.cvPayment / transformed.cvOrder;
        }
        if (transformed.cvPayment > 0) {
          transformed.realCPA = Math.round(transformed.cost / transformed.cvPayment);
        }
        if (transformed.cost > 0) {
          transformed.roas = transformed.salesAmount / transformed.cost;
        }
        
        // 必須フィールドの確認
        if (!transformed.advertiser) {
          throw new Error('広告主名が設定されていません');
        }
        
        transformedData.push(transformed);
      } catch (error) {
        console.error(`  ⚠️ 行${index + 2}でエラー: ${error.message}`);
      }
    });
    
    console.log(`✅ ${transformedData.length}件のデータを変換完了`);
    
    // バッチサイズ設定（一度に処理するレコード数）
    // 最適化: パフォーマンステストの結果、1000が最適（広告主1件の場合）
    const batchSize = 1000;
    const batches = [];
    for (let i = 0; i < transformedData.length; i += batchSize) {
      batches.push(transformedData.slice(i, i + batchSize));
    }
    
    console.log(`\n📦 ${batches.length}個のバッチで処理を開始...`);
    
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    const allErrors = [];
    
    // バッチごとに処理
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      process.stdout.write(`  バッチ ${i + 1}/${batches.length} を処理中...`);
      
      try {
        const result = await client.mutation(api.ecforce.savePerformanceData, {
          importId: importSession.importId,
          data: batch,
          skipDuplicates: false, // 重複は上書き（新しいデータで更新）
        });
        
        totalProcessed += batch.length;
        totalSuccess += result.success;
        totalDuplicates += result.duplicates;
        totalErrors += result.errors;
        
        if (result.errorDetails) {
          allErrors.push(...result.errorDetails);
        }
        
        process.stdout.write(` ✅ (成功: ${result.success}, 重複: ${result.duplicates}, エラー: ${result.errors})\n`);
        
        // 進捗更新
        await client.mutation(api.ecforce.updateImportStatus, {
          importId: importSession.importId,
          processedRows: totalProcessed,
          successRows: totalSuccess,
          duplicateRows: totalDuplicates,
          errorRows: totalErrors,
        });
      } catch (error) {
        process.stdout.write(` ❌ エラー\n`);
        console.error(`    ${error.message}`);
        totalErrors += batch.length;
        allErrors.push({
          row: i * batchSize + 2,
          message: error.message,
        });
      }
    }
    
    // 最終ステータス更新
    const finalStatus = totalErrors === 0 ? 'success' : totalSuccess === 0 ? 'failed' : 'partial';
    
    await client.mutation(api.ecforce.updateImportStatus, {
      importId: importSession.importId,
      status: finalStatus,
      processedRows: totalProcessed,
      successRows: totalSuccess,
      duplicateRows: totalDuplicates,
      errorRows: totalErrors,
      errors: allErrors.slice(0, 100), // 最大100件のエラーを保存
    });
    
    // 結果サマリー
    console.log('\n=====================================');
    console.log('📊 アップロード結果:');
    console.log('=====================================');
    console.log(`  インポートID: ${importSession.importId}`);
    console.log(`  ステータス: ${finalStatus === 'success' ? '✅ 成功' : finalStatus === 'partial' ? '⚠️ 部分的成功' : '❌ 失敗'}`);
    console.log(`  処理済み: ${totalProcessed}件`);
    console.log(`  成功: ${totalSuccess}件`);
    console.log(`  重複: ${totalDuplicates}件`);
    console.log(`  エラー: ${totalErrors}件`);
    console.log('=====================================\n');
    
    // エラー詳細を表示
    if (allErrors.length > 0) {
      console.log('⚠️ エラー詳細（最大10件）:');
      allErrors.slice(0, 10).forEach(error => {
        console.log(`  - 行${error.row}: ${error.message}`);
      });
      if (allErrors.length > 10) {
        console.log(`  ... 他${allErrors.length - 10}件のエラー`);
      }
    }
    
    return finalStatus === 'success' || finalStatus === 'partial';
    
  } catch (error) {
    console.error('❌ Convexアップロードエラー:', error.message);
    console.error(error.stack);
    return false;
  }
}

// コマンドライン引数からCSVファイルパスを取得（直接実行時のみ）
if (import.meta.url === `file://${process.argv[1]}`) {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.log('使用方法: node ecforce-upload-to-convex.mjs <CSVファイルパス>');
    console.log('例: node ecforce-upload-to-convex.mjs downloads/daily_advertiser_advertisements_20250911184556_utf8.csv');
    process.exit(1);
  }

  // ファイルの存在確認
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ ファイルが見つかりません: ${csvPath}`);
    process.exit(1);
  }

  // アップロード実行
  uploadToConvex(csvPath)
    .then(success => {
      if (success) {
        console.log('🎉 アップロード処理が完了しました！');
        process.exit(0);
      } else {
        console.log('⚠️ アップロード処理で問題が発生しました');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ 予期しないエラー:', error);
      process.exit(1);
    });
}
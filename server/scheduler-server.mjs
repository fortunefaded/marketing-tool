// 自動同期スケジューラーサーバー
import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Convexクライアント
const convexUrl = process.env.VITE_CONVEX_URL;
const client = new ConvexHttpClient(convexUrl);

// 現在の設定
let currentConfig = {
  enabled: false,
  schedule: {
    frequency: 'daily',
    time: '06:00',
    timezone: 'Asia/Tokyo'
  }
};

// 実行中のcronタスク
let cronTask = null;

// 同期を実行
async function executeSyncJob() {
  console.log(`[${new Date().toISOString()}] 自動同期を開始します...`);
  
  try {
    // スクリプトのパス
    const scriptPath = path.join(__dirname, '..', 'scripts', 'ecforce-download-csv.mjs');
    const command = `node ${scriptPath} --upload`;
    
    console.log('実行コマンド:', command);
    
    // タイムアウトを5分に設定
    exec(command, { 
      timeout: 300000,
      cwd: path.join(__dirname, '..')
    }, async (error, stdout, stderr) => {
      if (error) {
        console.error('実行エラー:', error);
        
        // エラーをConvexに記録
        try {
          await client.mutation(api.ecforce.updateSyncConfig, {
            enabled: currentConfig.enabled,
            schedule: {
              ...currentConfig.schedule,
              lastRun: Date.now(),
              lastRunStatus: 'error',
              lastRunError: error.message
            }
          });
        } catch (e) {
          console.error('エラー記録失敗:', e);
        }
        return;
      }
      
      // 成功をConvexに記録
      try {
        await client.mutation(api.ecforce.updateSyncConfig, {
          enabled: currentConfig.enabled,
          schedule: {
            ...currentConfig.schedule,
            lastRun: Date.now(),
            lastRunStatus: 'success'
          }
        });
      } catch (e) {
        console.error('成功記録失敗:', e);
      }
      
      console.log(`[${new Date().toISOString()}] 自動同期が完了しました`);
      console.log('出力:', stdout.slice(0, 500)); // 最初の500文字のみ
    });
    
  } catch (error) {
    console.error('スケジューラーエラー:', error);
  }
}

// Cron式を生成
function generateCronExpression(schedule) {
  const [hours, minutes] = schedule.time.split(':');
  
  switch (schedule.frequency) {
    case 'daily':
      // 毎日指定時刻に実行
      return `${minutes} ${hours} * * *`;
    case 'weekly':
      // 毎週月曜日の指定時刻に実行
      return `${minutes} ${hours} * * 1`;
    case 'monthly':
      // 毎月1日の指定時刻に実行
      return `${minutes} ${hours} 1 * *`;
    case 'test':
      // テスト用：1分ごとに実行
      return '* * * * *';
    default:
      return `${minutes} ${hours} * * *`;
  }
}

// スケジューラーを更新
function updateScheduler(config) {
  console.log('スケジューラー設定を更新:', config);
  
  // 既存のタスクを停止
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('既存のスケジュールを停止しました');
  }
  
  // 新しい設定を保存
  currentConfig = config;
  
  // 有効な場合は新しいタスクを開始
  if (config.enabled) {
    const cronExpression = generateCronExpression(config.schedule);
    console.log(`Cron式: ${cronExpression}`);
    
    cronTask = cron.schedule(cronExpression, executeSyncJob, {
      scheduled: true,
      timezone: config.schedule.timezone || 'Asia/Tokyo'
    });
    
    console.log(`スケジュールを開始しました: ${config.schedule.frequency} at ${config.schedule.time}`);
  }
}

// 設定を定期的にチェック
async function checkConfigUpdate() {
  try {
    const config = await client.query(api.ecforce.getSyncConfig);
    
    // 設定が変更されていれば更新
    if (JSON.stringify(config) !== JSON.stringify(currentConfig)) {
      updateScheduler(config);
    }
  } catch (error) {
    console.error('設定取得エラー:', error);
  }
}

// メイン処理
async function main() {
  console.log('=====================================');
  console.log('ECForce自動同期スケジューラー');
  console.log('=====================================');
  console.log(`起動時刻: ${new Date().toISOString()}`);
  console.log(`タイムゾーン: Asia/Tokyo`);
  
  // 初期設定を取得
  try {
    const config = await client.query(api.ecforce.getSyncConfig);
    updateScheduler(config);
  } catch (error) {
    console.error('初期設定取得エラー:', error);
  }
  
  // 1分ごとに設定をチェック
  setInterval(checkConfigUpdate, 60000);
  
  console.log('\nスケジューラーが稼働中...');
  console.log('終了するにはCtrl+Cを押してください');
}

// プロセス終了時の処理
process.on('SIGINT', () => {
  console.log('\nスケジューラーを停止します...');
  if (cronTask) {
    cronTask.stop();
  }
  process.exit(0);
});

// 起動
main().catch(console.error);
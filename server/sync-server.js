// 簡易的なAPIサーバー（ECForce同期用）
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const PORT = 3001;

// CORS設定
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// 同期エンドポイント
app.post('/api/ecforce/sync', async (req, res) => {
  console.log('ECForce同期リクエストを受信');
  
  try {
    // スクリプトのパス
    const scriptPath = path.join(__dirname, '..', 'scripts', 'ecforce-download-csv.mjs');
    const command = `node ${scriptPath} --upload`;
    
    console.log('実行コマンド:', command);
    
    // タイムアウトを3分に設定
    exec(command, { 
      timeout: 180000,
      cwd: path.join(__dirname, '..')
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('実行エラー:', error);
        return res.status(500).json({
          success: false,
          error: error.message,
          stderr
        });
      }
      
      // 成功判定
      const success = stdout.includes('アップロード処理が完了しました') || 
                     stdout.includes('すべての処理が正常に完了しました');
      
      // 処理件数を抽出
      let recordsProcessed = 0;
      const match = stdout.match(/処理済み:\s*(\d+)件/);
      if (match) {
        recordsProcessed = parseInt(match[1], 10);
      }
      
      console.log('処理完了:', { success, recordsProcessed });
      
      res.json({
        success,
        message: success ? 'ECForce同期が完了しました' : 'ECForce同期に失敗しました',
        recordsProcessed,
        output: stdout
      });
    });
    
  } catch (error) {
    console.error('サーバーエラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ECForce同期サーバーが稼働中' });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`ECForce同期サーバーが起動しました: http://localhost:${PORT}`);
  console.log('同期エンドポイント: POST http://localhost:3001/api/ecforce/sync');
});
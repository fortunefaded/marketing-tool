// 簡易的なAPIサーバー（ECForce同期用）
import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

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
      
      // 成功判定（より多くのパターンに対応）
      const success = stdout.includes('アップロード結果: true') ||
                     stdout.includes('アップロード処理が完了しました') || 
                     stdout.includes('すべての処理が正常に完了しました') ||
                     stdout.includes('✅ すべての処理が正常に完了しました');
      
      // 処理件数を抽出（複数のパターンを試す）
      let recordsProcessed = 0;
      const patterns = [
        /処理済み:\s*(\d+)件/,
        /成功:\s*(\d+)件/,
        /処理対象データ:\s*(\d+)件/,
        /処理対象データ:\s*(\d+)件（デバイス=合計のみ）/
      ];
      
      for (const pattern of patterns) {
        const match = stdout.match(pattern);
        if (match) {
          recordsProcessed = parseInt(match[1], 10);
          if (recordsProcessed > 0) break;
        }
      }
      
      // インポートIDを抽出
      let importId = null;
      const importIdMatch = stdout.match(/インポートID:\s*([^\s]+)/);
      if (importIdMatch) {
        importId = importIdMatch[1];
      }
      
      console.log('処理完了:', { success, recordsProcessed, importId });
      
      res.json({
        success,
        message: success ? 'ECForce同期が完了しました' : 'ECForce同期に失敗しました',
        recordsProcessed,
        importId,
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
  console.log(`同期エンドポイント: POST http://localhost:${PORT}/api/ecforce/sync`);
});
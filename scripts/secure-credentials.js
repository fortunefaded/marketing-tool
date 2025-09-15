/**
 * ECForce認証情報の安全な管理
 *
 * セキュリティ強化のための推奨事項：
 * 1. 本番環境では必ずVercel環境変数を使用
 * 2. ローカル開発では.env.ecforceを使用（gitignore済み）
 * 3. パスワードは定期的に変更
 * 4. 可能であればOAuth2.0やAPIキー認証への移行を検討
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// 暗号化キー（本番環境では環境変数から取得）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'development-only-key-do-not-use-in-production';

/**
 * 認証情報を暗号化
 */
export function encryptCredentials(credentials) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * 認証情報を復号化
 */
export function decryptCredentials(encryptedData) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

/**
 * 環境に応じた認証情報の取得
 */
export function getCredentials() {
  // 本番環境（Vercel）
  if (process.env.VERCEL) {
    return {
      basicAuth: {
        username: process.env.ECFORCE_BASIC_USER,
        password: process.env.ECFORCE_BASIC_PASS
      },
      login: {
        email: process.env.ECFORCE_EMAIL,
        password: process.env.ECFORCE_PASSWORD
      }
    };
  }

  // 開発環境
  const envPath = path.join(process.cwd(), '.env.ecforce');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    return {
      basicAuth: {
        username: process.env.ECFORCE_BASIC_USER,
        password: process.env.ECFORCE_BASIC_PASS
      },
      login: {
        email: process.env.ECFORCE_EMAIL,
        password: process.env.ECFORCE_PASSWORD
      }
    };
  }

  throw new Error('ECForce credentials not found. Please set up environment variables.');
}

/**
 * セキュリティチェック
 */
export function validateSecuritySettings() {
  const issues = [];

  // 環境変数のチェック
  if (!process.env.VERCEL && !process.env.ENCRYPTION_KEY) {
    issues.push('警告: ENCRYPTION_KEYが設定されていません');
  }

  // .env.ecforceファイルの権限チェック（ローカルのみ）
  if (!process.env.VERCEL) {
    const envPath = path.join(process.cwd(), '.env.ecforce');
    if (fs.existsSync(envPath)) {
      const stats = fs.statSync(envPath);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);
      if (mode !== '600') {
        issues.push(`警告: .env.ecforceのファイル権限が緩すぎます (現在: ${mode}, 推奨: 600)`);
      }
    }
  }

  return {
    secure: issues.length === 0,
    issues
  };
}

// セキュリティ設定のバリデーション
if (!process.env.VERCEL) {
  const security = validateSecuritySettings();
  if (!security.secure) {
    console.warn('⚠️ セキュリティ上の問題が検出されました:');
    security.issues.forEach(issue => console.warn(`  - ${issue}`));
  }
}
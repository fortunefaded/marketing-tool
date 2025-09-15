// mogumo ECForceログインスクリプト（BASIC認証対応）
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.ecforceファイルを読み込む
dotenv.config({ path: path.join(__dirname, '..', '.env.ecforce') });

async function loginToMogumo() {
  console.log('🚀 mogumo ECForceログインテスト開始...');
  
  // 環境変数から認証情報を取得
  const BASIC_USER = process.env.ECFORCE_BASIC_USER;
  const BASIC_PASS = process.env.ECFORCE_BASIC_PASS;
  const LOGIN_EMAIL = process.env.ECFORCE_EMAIL;
  const LOGIN_PASS = process.env.ECFORCE_PASSWORD;
  
  console.log('📋 設定確認:');
  console.log('  BASIC認証ユーザー:', BASIC_USER ? '✓ 設定済み' : '✗ 未設定');
  console.log('  BASIC認証パスワード:', BASIC_PASS ? '✓ 設定済み' : '✗ 未設定');
  console.log('  ログインメール:', LOGIN_EMAIL ? '✓ 設定済み' : '✗ 未設定');
  console.log('  ログインパスワード:', LOGIN_PASS ? '✓ 設定済み' : '✗ 未設定');
  
  // ブラウザを起動（画面表示あり）
  const browser = await chromium.launch({ 
    headless: false,  // 画面を表示（false = 表示、true = 非表示）
    slowMo: 500      // 操作を0.5秒遅らせる（動きが見やすい）
  });
  
  try {
    // BASIC認証を含むコンテキストを作成
    const context = await browser.newContext({
      httpCredentials: {
        username: BASIC_USER,
        password: BASIC_PASS
      }
    });
    
    const page = await context.newPage();
    
    // 1. ログインページへアクセス（BASIC認証は自動で処理される）
    console.log('📍 mogumo管理画面へアクセス中...');
    await page.goto('https://mogumo.jp/admin');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: 'screenshots/1-mogumo-login.png',
      fullPage: true 
    });
    console.log('📸 スクリーンショット保存: 1-mogumo-login.png');
    
    // 現在のURLを確認
    console.log('📍 現在のURL:', page.url());
    
    // 2. ログインフォームを探す
    // ECForceの一般的なセレクタパターン
    console.log('🔍 ログインフォームを検索中...');
    
    // メールアドレス入力
    const emailSelectors = [
      'input[name="admin[email]"]',  // mogumo実際のセレクタ
      '#admin_email',
      'input[name="administrator[email]"]',
      'input[name="email"]',
      'input[type="email"]'
    ];
    
    let emailFilled = false;
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.fill(selector, LOGIN_EMAIL);
        console.log(`✓ メールアドレス入力成功: ${selector}`);
        emailFilled = true;
        break;
      } catch (e) {
        // このセレクタは存在しない
        continue;
      }
    }
    
    if (!emailFilled) {
      console.log('❌ メールアドレス入力フィールドが見つかりません');
      // ページのHTMLを出力して確認
      const inputs = await page.$$eval('input', elements => 
        elements.map(el => ({
          name: el.name,
          type: el.type,
          id: el.id,
          placeholder: el.placeholder
        }))
      );
      console.log('HTML内のinput要素を確認:');
      console.log(inputs);
    }
    
    // パスワード入力
    const passwordSelectors = [
      'input[name="admin[password]"]',  // mogumo実際のセレクタ
      '#admin_password',
      'input[type="password"]',
      'input[name="password"]'
    ];
    
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.fill(selector, LOGIN_PASS);
        console.log(`✓ パスワード入力成功: ${selector}`);
        passwordFilled = true;
        break;
      } catch (e) {
        // このセレクタは存在しない
        continue;
      }
    }
    
    if (!passwordFilled) {
      console.log('❌ パスワード入力フィールドが見つかりません');
    }
    
    // 入力後のスクリーンショット
    await page.screenshot({ 
      path: 'screenshots/2-credentials-entered.png',
      fullPage: true 
    });
    console.log('📸 認証情報入力後: 2-credentials-entered.png');
    
    // 3. ログインボタンをクリック
    console.log('🖱️ ログインボタンを探しています...');
    
    const submitSelectors = [
      'input[type="submit"][value="ログイン"]',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("ログイン")',
      '.btn-primary[type="submit"]',
      'form button[type="submit"]'
    ];
    
    let clicked = false;
    for (const selector of submitSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        console.log(`✓ ログインボタンクリック成功: ${selector}`);
        clicked = true;
        break;
      } catch (e) {
        // このセレクタは存在しない
        continue;
      }
    }
    
    if (!clicked) {
      console.log('❌ ログインボタンが見つかりません');
      // ボタン要素を確認
      const buttons = await page.$$eval('button, input[type="submit"]', elements => 
        elements.map(el => ({
          tag: el.tagName,
          type: el.type,
          text: el.textContent || el.value,
          class: el.className
        }))
      );
      console.log('ページ内のボタン:', buttons);
    }
    
    // 4. ログイン処理を待機
    console.log('⏳ ログイン処理を待機中...');
    
    try {
      // URLが変わるか、特定の要素が表示されるまで待つ
      await Promise.race([
        page.waitForURL('**/advertisements**', { timeout: 10000 }),
        page.waitForURL('**/dashboard**', { timeout: 10000 }),
        page.waitForSelector('.alert-success', { timeout: 10000 }),
        page.waitForTimeout(10000)
      ]);
    } catch (e) {
      console.log('⏳ タイムアウトまで待機しました');
    }
    
    // ログイン後の状態確認
    const afterLoginUrl = page.url();
    console.log('📍 ログイン後のURL:', afterLoginUrl);
    
    // ログイン成功の判定
    if (afterLoginUrl.includes('advertisements') || 
        afterLoginUrl.includes('dashboard') ||
        (afterLoginUrl.includes('admin') && !afterLoginUrl.includes('login'))) {
      console.log('✅ ログイン成功！');
      
      // 広告管理ページへ移動してみる
      console.log('📊 広告管理ページへ移動を試みます...');
      await page.goto('https://mogumo.jp/admin/advertisements?q%5Btoken%5D=988dcfeb-bd02-4c2d-9b7d-966822a9be10');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'screenshots/4-advertisements-page.png',
        fullPage: true 
      });
      console.log('📸 広告管理ページ: 4-advertisements-page.png');
      
    } else {
      console.log('⚠️ ログインに失敗した可能性があります');
    }
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'screenshots/3-after-login.png',
      fullPage: true 
    });
    console.log('📸 最終画面: 3-after-login.png');
    
    // 確認のため10秒間開いたままにする
    console.log('👀 10秒後にブラウザを閉じます...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
    console.log('🏁 テスト完了');
  }
}

// 実行
loginToMogumo().catch(console.error);
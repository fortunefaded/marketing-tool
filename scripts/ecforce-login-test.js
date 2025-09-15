// ECForceログインテストスクリプト
const { chromium } = require('playwright');

async function testLogin() {
  console.log('🚀 ECForceログインテスト開始...');
  
  // ブラウザを起動（画面表示あり）
  const browser = await chromium.launch({ 
    headless: false,  // 画面を表示
    slowMo: 500      // 操作を0.5秒遅らせる（動きが見やすい）
  });
  
  try {
    const page = await browser.newPage();
    
    // 1. ログインページへアクセス
    console.log('📍 ログインページへアクセス中...');
    // TODO: 実際のURLに変更してください
    await page.goto('https://your-shop.ec-force.com/admin/login');
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: 'screenshots/1-login-page.png',
      fullPage: true 
    });
    console.log('📸 スクリーンショット保存: 1-login-page.png');
    
    // 2. ログイン情報を入力
    console.log('✍️ ログイン情報入力中...');
    
    // TODO: 実際のセレクタに変更してください
    // 一般的なパターンを試す
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      '#email',
      'input[name="login_id"]',
      'input[name="username"]'
    ];
    
    let emailFilled = false;
    for (const selector of emailSelectors) {
      try {
        await page.fill(selector, 'your-email@example.com', { timeout: 1000 });
        console.log(`✓ メールアドレス入力成功: ${selector}`);
        emailFilled = true;
        break;
      } catch (e) {
        // このセレクタは存在しない
      }
    }
    
    if (!emailFilled) {
      console.log('❌ メールアドレス入力フィールドが見つかりません');
      console.log('ページのHTMLを確認してください');
    }
    
    // パスワード入力
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      '#password'
    ];
    
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        await page.fill(selector, 'your-password', { timeout: 1000 });
        console.log(`✓ パスワード入力成功: ${selector}`);
        passwordFilled = true;
        break;
      } catch (e) {
        // このセレクタは存在しない
      }
    }
    
    if (!passwordFilled) {
      console.log('❌ パスワード入力フィールドが見つかりません');
    }
    
    await page.screenshot({ 
      path: 'screenshots/2-credentials-entered.png',
      fullPage: true 
    });
    
    // 3. ログインボタンをクリック
    console.log('🖱️ ログインボタンをクリック...');
    
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("ログイン")',
      'button:has-text("Login")',
      '.login-button'
    ];
    
    let clicked = false;
    for (const selector of submitSelectors) {
      try {
        await page.click(selector, { timeout: 1000 });
        console.log(`✓ ログインボタンクリック成功: ${selector}`);
        clicked = true;
        break;
      } catch (e) {
        // このセレクタは存在しない
      }
    }
    
    if (!clicked) {
      console.log('❌ ログインボタンが見つかりません');
    }
    
    // 4. ログイン後のページを待機
    console.log('⏳ ログイン処理を待機中...');
    await page.waitForTimeout(3000); // 3秒待機
    
    // 現在のURLを確認
    const currentUrl = page.url();
    console.log('📍 現在のURL:', currentUrl);
    
    // ログイン成功の判定
    if (currentUrl.includes('dashboard') || currentUrl.includes('admin') && !currentUrl.includes('login')) {
      console.log('✅ ログイン成功！');
    } else {
      console.log('⚠️ ログインに失敗した可能性があります');
    }
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'screenshots/3-after-login.png',
      fullPage: true 
    });
    console.log('📸 最終スクリーンショット保存: 3-after-login.png');
    
    // 10秒間開いたままにする（確認用）
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
testLogin().catch(console.error);
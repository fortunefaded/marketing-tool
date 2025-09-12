// mogumo ECForce CSVダウンロードスクリプト
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { uploadToConvex } from './ecforce-upload-to-convex.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.ecforceファイルを読み込む
dotenv.config({ path: path.join(__dirname, '..', '.env.ecforce') });

async function downloadCSVFromMogumo() {
  console.log('🚀 mogumo ECForce CSVダウンロード処理開始...');
  
  // 環境変数から認証情報を取得
  const BASIC_USER = process.env.ECFORCE_BASIC_USER;
  const BASIC_PASS = process.env.ECFORCE_BASIC_PASS;
  const LOGIN_EMAIL = process.env.ECFORCE_EMAIL;
  const LOGIN_PASS = process.env.ECFORCE_PASSWORD;
  
  // ダウンロードディレクトリを設定
  const downloadPath = path.join(__dirname, '..', 'downloads');
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
    console.log('📁 ダウンロードディレクトリを作成:', downloadPath);
  }
  
  // ブラウザを起動（画面表示あり）
  const browser = await chromium.launch({ 
    headless: false,  // 画面を表示
    slowMo: 1000      // 操作を1秒遅らせる（ゆっくり動作）
  });
  
  try {
    // BASIC認証を含むコンテキストを作成
    const context = await browser.newContext({
      httpCredentials: {
        username: BASIC_USER,
        password: BASIC_PASS
      },
      acceptDownloads: true  // ダウンロードを許可
    });
    
    const page = await context.newPage();
    
    // ダイアログ（アラート、確認）のハンドラーを設定
    page.on('dialog', async dialog => {
      console.log('📢 ダイアログを検出:');
      console.log('  タイプ:', dialog.type());
      console.log('  メッセージ:', dialog.message());
      
      // confirmダイアログの場合はOKをクリック
      if (dialog.type() === 'confirm' || dialog.type() === 'alert') {
        console.log('  → OKをクリックします');
        await dialog.accept();
      }
    });
    
    // ページのエラーをキャッチ
    page.on('pageerror', error => {
      console.log('❌ ページエラー:', error.message);
    });
    
    // コンソールメッセージをキャッチ
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ コンソールエラー:', msg.text());
      }
    });
    
    // 1. ログインページへアクセス
    console.log('📍 mogumo管理画面へアクセス中...');
    await page.goto('https://mogumo.jp/admin');
    await page.waitForLoadState('networkidle');
    
    // 2. ログイン処理
    console.log('🔑 ログイン中...');
    
    // メールアドレス入力
    await page.fill('input[name="admin[email]"]', LOGIN_EMAIL);
    console.log('✓ メールアドレス入力完了');
    
    // パスワード入力
    await page.fill('input[name="admin[password]"]', LOGIN_PASS);
    console.log('✓ パスワード入力完了');
    
    // ログインボタンをクリック
    const submitSelectors = [
      'input[type="submit"][value="ログイン"]',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("ログイン")',
      '.btn-primary[type="submit"]'
    ];
    
    let clicked = false;
    for (const selector of submitSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        console.log(`✓ ログインボタンクリック: ${selector}`);
        clicked = true;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!clicked) {
      console.log('❌ ログインボタンが見つかりません');
      throw new Error('ログインボタンが見つかりません');
    }
    
    // ログイン完了を待機
    console.log('⏳ ログイン完了を待機中...');
    await page.waitForTimeout(5000);  // 5秒待機
    
    // 3. 広告管理ページへ移動
    console.log('📊 広告管理ページへ移動中...');
    await page.goto('https://mogumo.jp/admin/advertisements?q%5Btoken%5D=988dcfeb-bd02-4c2d-9b7d-966822a9be10');
    await page.waitForLoadState('networkidle');
    
    // 現在のページのスクリーンショット
    await page.screenshot({ 
      path: 'screenshots/csv-download-page.png',
      fullPage: true 
    });
    console.log('📸 広告管理ページのスクリーンショット保存');
    
    // 4. ページ下部までスクロール（表を表示させるため）
    console.log('📜 ページ下部へスクロール中...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);  // 3秒待機
    
    // 5. 期間集計を「昨日」に設定
    console.log('📅 期間集計を設定中...');
    
    try {
      // DateRangePickerの入力フィールドを探す（期間集計の入力欄）
      // 複数のセレクタを試す
      const dateRangeSelectors = [
        'input#reportrange',
        'input.form-control[readonly]',
        'input[placeholder*="期間"]',
        'div#reportrange',
        '.daterangepicker-input',
        'input[type="text"][readonly]'
      ];
      
      let dateRangeInput = null;
      for (const selector of dateRangeSelectors) {
        dateRangeInput = await page.$(selector);
        if (dateRangeInput) {
          console.log(`✓ 日付範囲選択フィールドを発見: ${selector}`);
          break;
        }
      }
      
      if (dateRangeInput) {
        console.log('✓ 日付範囲選択フィールドを発見');
        await dateRangeInput.click();
        console.log('✓ DateRangePickerを開きました');
        
        // DateRangePickerが開くのを待つ
        await page.waitForTimeout(1000);
        
        // 「昨日」オプションをクリック
        const yesterdayOption = await page.$('li[data-range-key="昨日"]');
        
        if (yesterdayOption) {
          await yesterdayOption.click();
          console.log('✓ 「昨日」を選択しました');
          
          // 少し待機
          await page.waitForTimeout(1000);
          
          // 適用ボタンをクリック（複数のセレクタを試す）
          const applyButtonSelectors = [
            'button.applyBtn',
            '.drp-buttons button.applyBtn',
            'button:has-text("適用")',
            '.daterangepicker button.applyBtn'
          ];
          
          let applyClicked = false;
          for (const selector of applyButtonSelectors) {
            try {
              const applyButton = await page.waitForSelector(selector, { timeout: 2000 });
              if (applyButton) {
                await applyButton.click();
                console.log(`✓ 適用ボタンをクリックしました: ${selector}`);
                applyClicked = true;
                break;
              }
            } catch {
              // 次のセレクタを試す
            }
          }
          
          if (!applyClicked) {
            console.log('⚠️ 適用ボタンが見つかりません（自動適用の可能性あり）');
          }
          
          // 選択後の処理を待つ
          await page.waitForTimeout(3000);
        } else {
          console.log('⚠️ 「昨日」オプションが見つかりません');
        }
      } else {
        console.log('⚠️ DateRangePickerの入力フィールドが見つかりません');
      }
      
      // 期間集計を変更した後のスクリーンショット
      await page.screenshot({ 
        path: 'screenshots/after-date-selection.png',
        fullPage: true 
      });
      console.log('📸 期間設定後のスクリーンショット保存');
      
    } catch (e) {
      console.log('⚠️ 期間集計設定エラー:', e.message);
    }
    
    // 6. 「この条件で検索する」ボタンをクリック
    console.log('🔍 検索ボタンを探しています...');
    
    try {
      const searchButtonSelectors = [
        'button:has-text("この条件で検索する")',
        'input[type="submit"][value="この条件で検索する"]',
        'button.btn-primary:has-text("検索")',
        '.search-button',
        'form button[type="submit"]'
      ];
      
      let searchClicked = false;
      for (const selector of searchButtonSelectors) {
        try {
          const searchButton = await page.$(selector);
          if (searchButton) {
            await searchButton.click();
            console.log(`✓ 「この条件で検索する」ボタンをクリックしました: ${selector}`);
            searchClicked = true;
            
            // 検索結果が表示されるまで待機
            await page.waitForTimeout(5000);
            break;
          }
        } catch {
          // 次のセレクタを試す
        }
      }
      
      if (!searchClicked) {
        console.log('⚠️ 検索ボタンが見つかりません');
      }
      
      // 検索後のスクリーンショット
      await page.screenshot({ 
        path: 'screenshots/after-search.png',
        fullPage: true 
      });
      console.log('📸 検索後のスクリーンショット保存');
      
    } catch (e) {
      console.log('⚠️ 検索ボタンのクリックエラー:', e.message);
    }
    
    // 7. 「検索結果すべてを処理対象にする」チェックボックスにチェック
    console.log('☑️ 全選択チェックボックスを探しています...');
    
    try {
      // まず個別のチェックボックスをすべて外す
      const tableCheckboxes = await page.$$('table input[type="checkbox"]:not(:disabled)');
      console.log(`  表内の有効なチェックボックス数: ${tableCheckboxes.length}`);
      
      for (const checkbox of tableCheckboxes) {
        if (await checkbox.isChecked()) {
          await checkbox.click();
          await page.waitForTimeout(100);
        }
      }
      console.log('✓ すべてのチェックボックスを外しました');
      await page.waitForTimeout(1000);
      
      // 「検索結果すべてを処理対象にする」チェックボックスにチェック
      const fetchAllCheckbox = await page.$('#fetch_all input[type="checkbox"]');
      if (fetchAllCheckbox) {
        // チェックが入っているか確認して、入っていなければチェック
        const isChecked = await fetchAllCheckbox.isChecked();
        if (!isChecked) {
          await fetchAllCheckbox.click();
          console.log('✓ 「検索結果すべてを処理対象にする」にチェックを入れました');
          await page.waitForTimeout(3000);  // 3秒待機（処理が完了するまで）
        } else {
          // 一度外してから再度チェック
          await fetchAllCheckbox.click();
          await page.waitForTimeout(500);
          await fetchAllCheckbox.click();
          console.log('✓ 全選択チェックボックスを再チェックしました');
          await page.waitForTimeout(3000);
        }
      } else {
        console.log('⚠️ 全選択チェックボックスが見つかりません');
      }
      
      // 個別のチェックボックスの状態を確認
      console.log('📋 表内のチェックボックスを再確認中...');
      const allCheckboxes = await page.$$('table input[type="checkbox"]');
      console.log(`  表内のチェックボックス数: ${allCheckboxes.length}`);
      
      // チェックされているチェックボックスの数を確認
      let checkedCount = 0;
      for (const checkbox of allCheckboxes) {
        if (await checkbox.isChecked()) {
          checkedCount++;
        }
      }
      console.log(`  チェック済み: ${checkedCount}/${allCheckboxes.length}`);
      
      // もしチェックされていない場合は、すべてチェックする
      if (checkedCount === 0 && allCheckboxes.length > 0) {
        console.log('⚠️ チェックボックスがチェックされていません。個別にチェックします...');
        for (const checkbox of allCheckboxes) {
          const isDisabled = await checkbox.evaluate(el => el.disabled);
          if (!isDisabled) {
            const isChecked = await checkbox.isChecked();
            if (!isChecked) {
              await checkbox.click();
              await page.waitForTimeout(200);  // 各クリック後に少し待機
            }
          }
        }
        console.log('✓ すべてのチェックボックスにチェックを入れました');
        await page.waitForTimeout(2000);
      }
      
    } catch (e) {
      console.log('⚠️ チェックボックスの操作でエラー:', e.message);
    }
    
    // 8. CSVダウンロードボタンを探す
    console.log('🔍 CSVダウンロードボタンを検索中...');
    
    // 正確なセレクタでCSV一括出力（日付毎）ボタンを探す
    const csvButtonSelectors = [
      'button#by_advertiser_and_daily',  // IDで直接指定
      'button[type="submit"]:has-text("CSV一括出力（日付毎）")',
      'button:has-text("CSV一括出力（日付毎）")',
      'button:has-text("CSV一括出力")',
      'button.btn_pop.btn-pop-white.btn-xs',
      'a:has-text("CSV一括出力")',
      'a[href*=".csv"]'
    ];
    
    let downloadTriggered = false;
    let downloadButton = null;
    
    // ボタンを探す
    for (const selector of csvButtonSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          console.log(`✓ ダウンロードボタン候補を発見: ${selector} (テキスト: ${text})`);
          downloadButton = element;
          break;
        }
      } catch (e) {
        // このセレクタは存在しない
        continue;
      }
    }
    
    // リンクとボタンをすべて取得して確認
    if (!downloadButton) {
      console.log('⚠️ 標準的なCSVダウンロードボタンが見つかりません');
      console.log('📋 ページ内のリンクとボタンを確認中...');
      
      const links = await page.$$eval('a', elements => 
        elements.map(el => ({
          href: el.href,
          text: el.textContent?.trim(),
          class: el.className
        })).filter(item => item.text && (
          item.text.includes('CSV') || 
          item.text.includes('ダウンロード') || 
          item.text.includes('エクスポート') ||
          item.href?.includes('.csv')
        ))
      );
      
      if (links.length > 0) {
        console.log('📋 CSV関連のリンク:');
        links.forEach(link => {
          console.log(`  - ${link.text} (${link.href})`);
        });
      }
      
      const buttons = await page.$$eval('button, input[type="submit"]', elements => 
        elements.map(el => ({
          type: el.type,
          text: el.textContent || el.value,
          class: el.className
        })).filter(item => item.text && (
          item.text.includes('CSV') || 
          item.text.includes('ダウンロード') || 
          item.text.includes('エクスポート')
        ))
      );
      
      if (buttons.length > 0) {
        console.log('📋 CSV関連のボタン:');
        buttons.forEach(button => {
          console.log(`  - ${button.text} (${button.type})`);
        });
      }
    }
    
    // 9. CSVダウンロードを実行
    if (downloadButton) {
      console.log('💾 CSVダウンロードを開始...');
      
      try {
        // チェックされた項目のIDを取得して隠しフィールドに設定
        console.log('📝 選択項目を隠しフィールドに設定中...');
        await page.evaluate(() => {
          // チェックされているチェックボックスの値を取得
          const checkedBoxes = document.querySelectorAll('table input[type="checkbox"]:checked');
          const selectedIds = Array.from(checkedBoxes).map(cb => cb.value || cb.id);
          console.log('選択されたID:', selectedIds);
          
          // 隠しフィールドに値を設定
          const summaryLinesField = document.querySelector('#async_csv_check_lists');
          if (summaryLinesField && selectedIds.length > 0) {
            summaryLinesField.value = selectedIds.join(',');
            console.log('summary_lines に設定:', summaryLinesField.value);
          }
          
          // CSV タイプも設定
          const csvTypeField = document.querySelector('#async_csv_type');
          if (csvTypeField) {
            csvTypeField.value = 'by_advertiser_and_daily';
            console.log('csv_type に設定:', csvTypeField.value);
          }
        });
        console.log('✓ 隠しフィールド設定完了');
        
        // クリック前のスクリーンショット
        await page.screenshot({ 
          path: 'screenshots/before-csv-click.png',
          fullPage: true 
        });
        console.log('📸 クリック前のスクリーンショット保存');
        
        // ダウンロードボタンをクリック
        console.log('🖱️ CSVボタンをクリック中...');
        await downloadButton.click();
        console.log('✓ CSVダウンロードボタンをクリック');
        
        // ダイアログが処理されるのを待つ
        console.log('⏳ ダイアログ処理を待機中...');
        await page.waitForTimeout(3000);  // 3秒待機
        
        // バッチ処理ページへ移動
        console.log('📊 バッチ処理ページへ移動中...');
        await page.goto('https://mogumo.jp/admin/batches');
        await page.waitForLoadState('networkidle');
        
        // バッチ処理ページのスクリーンショット
        await page.screenshot({ 
          path: 'screenshots/batches-page.png',
          fullPage: true 
        });
        console.log('📸 バッチ処理ページのスクリーンショット保存');
            
        // バッチ処理が完了するまで待機
        console.log('⏳ バッチ処理の完了を待機中...');
        await page.waitForTimeout(5000);  // 5秒待機
        
        // ページをリロードして最新の状態を取得
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // ダウンロードリンクを探す
        console.log('🔍 CSVダウンロードリンクを検索中...');
        
        try {
          // 最初の成功したバッチ処理のダウンロードリンクを探す
          const downloadLink = await page.$('tr[data-state="success"]:first-child a[href*="/admin/attachments"]');
          
          if (downloadLink) {
            const href = await downloadLink.getAttribute('href');
            console.log('📄 ダウンロードリンクを発見:', href);
            
            // ダウンロードイベントを準備
            const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
            
            // ダウンロードリンクをクリック
            await downloadLink.click();
            console.log('✓ ダウンロードリンクをクリック');
            
            // ダウンロードを待機
            const download = await downloadPromise;
            
            // ファイル名を取得
            const suggestedFilename = download.suggestedFilename();
            console.log(`📄 ダウンロードファイル名: ${suggestedFilename}`);
            
            // ファイルを保存
            const filePath = path.join(downloadPath, suggestedFilename);
            await download.saveAs(filePath);
            
            console.log('✅ CSVファイルをダウンロード成功！');
            console.log(`  保存先: ${filePath}`);
            
            // ファイルサイズを確認
            const stats = fs.statSync(filePath);
            console.log(`  ファイルサイズ: ${stats.size} bytes`);
            
            downloadTriggered = true;
            
            // Convexへのアップロード処理（--uploadオプションが指定された場合）
            if (process.argv.includes('--upload')) {
              console.log('\n================================');
              console.log('📤 Convexへの自動アップロード開始');
              console.log('================================');
              const uploadSuccess = await uploadToConvex(filePath);
              if (uploadSuccess) {
                console.log('✅ Convexへのアップロードが完了しました！');
              } else {
                console.log('⚠️ Convexへのアップロードで問題が発生しました');
              }
            }
          } else {
            // フォールバック: より広範なセレクタで試す
            console.log('⚠️ 標準セレクタでリンクが見つかりません。別のセレクタを試します...');
            
            const anyDownloadLink = await page.$('a:has-text("ダウンロード")');
            if (anyDownloadLink) {
              const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
              await anyDownloadLink.click();
              console.log('✓ ダウンロードリンクをクリック（代替セレクタ）');
              
              const download = await downloadPromise;
              const suggestedFilename = download.suggestedFilename();
              const filePath = path.join(downloadPath, suggestedFilename);
              await download.saveAs(filePath);
              
              console.log('✅ CSVファイルをダウンロード成功！');
              console.log(`  保存先: ${filePath}`);
              
              downloadTriggered = true;
              
              // Shift-JISからUTF-8に変換
              const buffer = fs.readFileSync(filePath);
              const iconv = await import('iconv-lite');
              const utf8Text = iconv.default.decode(buffer, 'Shift_JIS');
              
              const utf8Path = filePath.replace('.csv', '_utf8.csv');
              fs.writeFileSync(utf8Path, utf8Text, 'utf-8');
              console.log(`📝 UTF-8に変換しました: ${utf8Path}`);
              
              // Convexへのアップロード処理（--uploadオプションが指定された場合）
              if (process.argv.includes('--upload')) {
                console.log('\n================================');
                console.log('📤 Convexへの自動アップロード開始');
                console.log('================================');
                const uploadSuccess = await uploadToConvex(utf8Path);
                if (uploadSuccess) {
                  console.log('✅ Convexへのアップロードが完了しました！');
                } else {
                  console.log('⚠️ Convexへのアップロードで問題が発生しました');
                }
              }
            } else {
              console.log('⚠️ バッチ処理ページにダウンロードリンクが見つかりません');
            }
          }
        } catch (e) {
          console.log('⚠️ CSVダウンロードエラー:', e.message);
        }
        
        // ダウンロードが始まらない場合のフォールバック処理
        if (!downloadTriggered) {
          await page.waitForTimeout(3000);
        
        // 新しいタブが開いた場合の処理
        const pages = context.pages();
        if (pages.length > 1) {
          console.log('📄 新しいタブが開きました');
          const newPage = pages[pages.length - 1];
          const newUrl = newPage.url();
          console.log('  新しいタブのURL:', newUrl);
          
          // CSVファイルのURLの場合、直接ダウンロード
          if (newUrl.includes('.csv')) {
            console.log('💾 CSVファイルのURLを検出、ダウンロード中...');
            
            // ダウンロードイベントをリッスン
            const downloadPromise = newPage.waitForEvent('download', { timeout: 10000 });
            
            // ページをリロードしてダウンロードをトリガー
            await newPage.reload();
            
            try {
              const download = await downloadPromise;
              const suggestedFilename = download.suggestedFilename();
              const filePath = path.join(downloadPath, suggestedFilename);
              await download.saveAs(filePath);
              
              console.log('✅ CSVファイルをダウンロード:', filePath);
              const stats = fs.statSync(filePath);
              console.log(`  ファイルサイズ: ${stats.size} bytes`);
              downloadTriggered = true;
            } catch (downloadError) {
              console.log('⚠️ ダウンロードイベントが発生しませんでした');
            }
            
            await newPage.close();
          }
        } else {
          // 同じページでダウンロードが開始される場合
          console.log('⏳ ダウンロード処理を待機中...');
          
          // ダウンロードリンクが生成される可能性があるので確認
          const downloadLinks = await page.$$eval('a[href*=".csv"]', elements => 
            elements.map(el => ({
              href: el.href,
              text: el.textContent?.trim()
            }))
          );
          
          if (downloadLinks.length > 0) {
            console.log('📄 CSVダウンロードリンクを発見:');
            downloadLinks.forEach(link => {
              console.log(`  - ${link.text || 'リンク'}: ${link.href}`);
            });
            
            // 最初のCSVリンクをクリック
            const csvLink = await page.$('a[href*=".csv"]');
            if (csvLink) {
              const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
              await csvLink.click();
              
              try {
                const download = await downloadPromise;
                const suggestedFilename = download.suggestedFilename();
                const filePath = path.join(downloadPath, suggestedFilename);
                await download.saveAs(filePath);
                
                console.log('✅ CSVファイルをダウンロード:', filePath);
                downloadTriggered = true;
              } catch (downloadError) {
                console.log('⚠️ ダウンロードが完了しませんでした');
              }
            }
          }
        }
        }
      } catch (error) {
        console.log('⚠️ ダウンロードエラー:', error.message);
      }
    } else {
      console.log('❌ CSVダウンロードボタンが見つかりませんでした');
      console.log('💡 ヒント: 手動で確認して、正しいセレクタを特定してください');
    }
    
    // 10. 確認のためのスクリーンショット
    await page.screenshot({ 
      path: 'screenshots/csv-download-final.png',
      fullPage: true 
    });
    console.log('📸 最終スクリーンショット保存');
    
    // 確認のため10秒間開いたままにする
    console.log('👀 10秒後にブラウザを閉じます...');
    await page.waitForTimeout(10000);
    
    return downloadTriggered;
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    return false;
  } finally {
    await browser.close();
    console.log('🏁 処理完了');
  }
}

// ヘルプ表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('mogumo ECForce CSVダウンロード & アップロードツール');
  console.log('');
  console.log('使用方法:');
  console.log('  node ecforce-download-csv.mjs [オプション]');
  console.log('');
  console.log('オプション:');
  console.log('  --upload    ダウンロード後、自動的にConvexデータベースにアップロード');
  console.log('  --help, -h  このヘルプを表示');
  console.log('');
  console.log('例:');
  console.log('  # CSVをダウンロードのみ');
  console.log('  node ecforce-download-csv.mjs');
  console.log('');
  console.log('  # CSVをダウンロードして自動的にConvexにアップロード');
  console.log('  node ecforce-download-csv.mjs --upload');
  process.exit(0);
}

// 実行
console.log('========================================');
console.log('🚀 ECForce CSV自動処理ツール');
console.log('========================================');
if (process.argv.includes('--upload')) {
  console.log('モード: ダウンロード & Convexアップロード');
} else {
  console.log('モード: ダウンロードのみ');
  console.log('（--upload オプションでConvexへの自動アップロードが可能）');
}
console.log('========================================\n');

downloadCSVFromMogumo()
  .then(success => {
    if (success) {
      console.log('\n✅ すべての処理が正常に完了しました！');
    } else {
      console.log('\n⚠️ 処理中に問題が発生しました');
    }
  })
  .catch(console.error);
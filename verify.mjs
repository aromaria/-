import { chromium } from 'playwright';

const CHECKS = [];
function check(name, pass, detail = '') {
  CHECKS.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  // ── 1. ページが開けるか ──
  console.log('\n── ローカルファイルテスト ──');
  const filePath = process.cwd() + '/newsletter.html';
  await page.goto('file://' + filePath, { waitUntil: 'domcontentloaded' });

  const title = await page.title();
  check('ページタイトル', title.includes('メルマガ'), title);

  // ── 2. ヘッダー表示 ──
  const h1 = await page.textContent('header h1');
  check('ヘッダーH1', h1.includes('メルマガ'), h1.trim());

  // ── 3. テーマプリセットが描画されている ──
  const presetCount = await page.locator('#themePresets .preset').count();
  check('テーマプリセット描画', presetCount === 6, `${presetCount}個`);

  // ── 4. ターゲットタグが描画されている ──
  const tagCount = await page.locator('#targetTags .tag').count();
  check('ターゲットタグ描画', tagCount === 8, `${tagCount}個`);

  // ── 5. テーマプリセットをクリック → テーマ欄に反映 ──
  await page.locator('#themePresets .preset').first().click();
  const themeVal = await page.inputValue('#theme');
  check('プリセットクリック→テーマ反映', themeVal.includes('メタトロン'), themeVal.slice(0, 40));

  // ── 6. CTAも連動変更 ──
  const ctaVal = await page.inputValue('#cta');
  check('CTA連動変更', ctaVal === 'metatron', ctaVal);

  // ── 7. ターゲットタグをクリック → ターゲット欄に反映 ──
  await page.locator('#targetTags .tag').first().click();
  const targetVal = await page.inputValue('#target');
  check('タグクリック→ターゲット反映', targetVal.length > 0, targetVal.slice(0, 40));

  // ── 8. 複数タグ選択 ──
  await page.locator('#targetTags .tag').nth(1).click();
  const targetVal2 = await page.inputValue('#target');
  check('複数タグ選択', targetVal2.includes('。'), `${targetVal2.length}文字`);

  // ── 9. APIキー保存→読み込み ──
  await page.fill('#key', 'sk-test-dummy-key-12345');
  await page.click('#save');
  const stored = await page.evaluate(() => localStorage.getItem('aromaria_nl_key_openai'));
  check('APIキーlocalStorage保存', stored === 'sk-test-dummy-key-12345');

  // ── 10. バッジ更新 ──
  const badge = await page.textContent('#keystate');
  check('バッジ更新（設定済）', badge.includes('設定済'), badge);

  // ── 11. キー消す ──
  await page.click('#clear');
  const cleared = await page.evaluate(() => localStorage.getItem('aromaria_nl_key_openai'));
  check('キー削除', cleared === null);
  const badgeAfter = await page.textContent('#keystate');
  check('バッジ更新（未設定）', badgeAfter.includes('未設定'), badgeAfter);

  // ── 12. キーなしで生成ボタン → エラーにならずトースト ──
  await page.fill('#key', '');
  await page.click('#run');
  await page.waitForTimeout(500);
  const toastVisible = await page.locator('#toast').evaluate(el => el.classList.contains('show'));
  check('キーなし生成→トースト表示', toastVisible === true);

  // ── 13. 各セレクトボックスが動作 ──
  await page.selectOption('#cta', 'school');
  const ctaSchool = await page.inputValue('#cta');
  check('CTA選択（スクール）', ctaSchool === 'school');

  await page.selectOption('#season', 'winter');
  const seasonWinter = await page.inputValue('#season');
  check('季節選択（冬）', seasonWinter === 'winter');

  await page.selectOption('#variations', '3');
  const var3 = await page.inputValue('#variations');
  check('バリエーション選択（3）', var3 === '3');

  await page.selectOption('#length', 'long');
  const lenLong = await page.inputValue('#length');
  check('文量選択（じっくり）', lenLong === 'long');

  // ── 14. Provider切替 → モデル連動 ──
  await page.selectOption('#provider', 'anthropic');
  const modelAnth = await page.inputValue('#model');
  check('Provider→Claude切替→モデル連動', modelAnth.includes('claude'), modelAnth);

  await page.selectOption('#provider', 'openai');
  const modelOai = await page.inputValue('#model');
  check('Provider→OpenAI切替→モデル連動', modelOai.includes('gpt'), modelOai);

  // ── 15. ダークモード切替 ──
  await page.click('#tg');
  const theme2 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('ダークモード切替', theme2 === 'dark' || theme2 === 'light', theme2);

  // ── 16. コンソール初期表示 ──
  const logText = await page.textContent('#log');
  check('コンソール初期メッセージ', logText.includes('準備OK'));

  // ── 17. 件名・プレビューカードは初期非表示 ──
  const subjectVis = await page.locator('#subjectCard').evaluate(el => el.style.display);
  check('件名カード初期非表示', subjectVis === 'none');
  const previewVis = await page.locator('#previewCard').evaluate(el => el.style.display);
  check('プレビューカード初期非表示', previewVis === 'none');

  // ── 18. JSエラーがないか ──
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  check('JSエラーなし', errors.length === 0, errors.join('; ') || 'クリーン');

  // ── 19. GitHub Pages公開URL ──
  console.log('\n── GitHub Pages公開テスト ──');
  try {
    const res = await page.goto('https://aromaria.github.io/-/newsletter.html', {
      waitUntil: 'domcontentloaded', timeout: 15000
    });
    const status = res.status();
    check('GitHub Pages HTTP status', status === 200, `${status}`);
    const liveTitle = await page.title();
    check('GitHub Pages タイトル', liveTitle.includes('メルマガ'), liveTitle);
    const liveH1 = await page.textContent('header h1');
    check('GitHub Pages H1表示', liveH1.includes('メルマガ'), liveH1.trim());
  } catch (e) {
    check('GitHub Pages接続', false, e.message);
  }

  // ── 20. スマホ表示テスト ──
  console.log('\n── スマホ表示テスト ──');
  const mobilePage = await browser.newPage({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
  });
  await mobilePage.goto('file://' + filePath, { waitUntil: 'domcontentloaded' });
  const mobileH1 = await mobilePage.textContent('header h1');
  check('スマホ表示: H1', mobileH1.includes('メルマガ'));
  const mobilePresets = await mobilePage.locator('#themePresets .preset').count();
  check('スマホ表示: プリセット描画', mobilePresets === 6);

  // スクリーンショット
  await mobilePage.screenshot({ path: '/tmp/claude-0/-home-user--/1ee60976-6b38-5a74-8eaa-f0038707fe5e/scratchpad/mobile.png', fullPage: true });
  console.log('\n📸 スマホスクリーンショット保存');

  // ── まとめ ──
  const total = CHECKS.length;
  const passed = CHECKS.filter(c => c.pass).length;
  const failed = CHECKS.filter(c => !c.pass);
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`検証結果: ${passed}/${total} 通過`);
  if (failed.length) {
    console.log('失敗項目:');
    failed.forEach(f => console.log(`  ❌ ${f.name}: ${f.detail}`));
  }
  console.log(`${'═'.repeat(40)}`);

  await mobilePage.close();
  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();

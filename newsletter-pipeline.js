#!/usr/bin/env node
// newsletter-pipeline.js
// メルマガ生成 → 薬機法チェック → リザスト投稿の一気通貫パイプライン
//
// 使い方:
//   RESERVESTOCK_API_KEY=rs_live_xxxx OPENAI_API_KEY=sk-xxxx node newsletter-pipeline.js
//   RESERVESTOCK_API_KEY=rs_live_xxxx ANTHROPIC_API_KEY=sk-ant-xxxx node newsletter-pipeline.js --provider anthropic
//   RESERVESTOCK_API_KEY=rs_live_xxxx GEMINI_API_KEY=xxxx node newsletter-pipeline.js --provider gemini
//
// オプション:
//   --theme "テーマ"       テーマ（デフォルト: メタトロン解析）
//   --target "ターゲット"   ターゲット読者（デフォルト: 原因不明の不調を抱える方）
//   --cta metatron|school|session|orientation|all  CTA種別（デフォルト: metatron）
//   --season spring|summer|autumn|winter|auto      季節（デフォルト: auto）
//   --length short|standard|long                   文字数（デフォルト: standard）
//   --provider openai|anthropic|gemini             AI提供元（デフォルト: openai）
//   --model "モデル名"      モデル指定（デフォルト: 各社推奨）
//   --magazine "配信グループ名"  メルマガ名（デフォルト: アロマリア 検証メルマガ）
//   --magazine-id ID        既存配信グループID（指定時は新規作成しない）
//   --dry-run               生成のみ（リザストへ投稿しない）
//   --from-json "path"      JSONファイルから記事を読み込み（AI生成をスキップ）
//   --save-json "path"      生成結果をJSONに保存
//
// 既存記事の操作:
//   --list                  メルマガ一覧＋記事一覧を表示
//   --proofread --article-id ID   リザストAIで記事を校正
//   --suggest-subject --article-id ID  AIで件名を提案
//   --rewrite --article-id ID --from-json "path"  本文をAIで書き直して上書き保存

const fs = require('fs');
const {
  createMailMagazine,
  createMailMagazineArticle,
  saveMailMagazineArticle,
  proofreadMailMagazineArticle,
  suggestMailMagazineSubject,
  searchMailMagazineArticles,
} = require('./reservestock-mail-magazine.js');

const API_INTERVAL_MS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════
//  設定値
// ═══════════════════════════════════════════════════════════

const FORBIDDEN = [
  '完治','治る','治った','治癒する','治療する',
  '癌が消','がんが消','ガンが消','腫瘍が消',
  '効果があ','効きます','必ず治','絶対に治','100%',
  '断薬でき','薬をやめ','薬が不要','薬はいらない',
  '奇跡的に治','病気が治',
];

const SEASON_WORDS = {
  spring: '春の芽吹き、花粉の季節、新生活の疲れ、デトックス、春の養生',
  summer: '夏の暑さ、冷え対策（冷房冷え）、紫外線ケア、夏バテ、夏の養生',
  autumn: '秋の乾燥、季節の変わり目、免疫ケア、秋の実り、心身の整え',
  winter: '冬の冷え、乾燥、免疫力、年末の疲れ、温活、冬の養生',
};

const CTA_TEXTS = {
  metatron: `あなたの身体の声、聴いてみませんか？☆

量子力学測定器メタトロンで、
今のあなたの細胞が何を求めているか
目に見える形でお伝えします✨

初めての方も安心の個別対応です♡

▼ メタトロン解析ケアの詳細・ご予約はこちら ▼
【リザストお申込みリンク】`,

  school: `一生ものの知識を、
あなたの手に☆

アロマリア自然療法の学校は
AEAJ総合資格認定校。

プロの自然療法家が丁寧に
あなたの学びをサポートします✨

まずは気軽にお話ししませんか？♡

▼ スクール無料説明会のお申込みはこちら ▼
【リザストお申込みリンク】`,

  session: `「私の場合はどうなんだろう？」

そう思ったあなたへ☆

個別体験セッションで
あなただけのケアプランを
一緒に見つけましょう✨

お気軽にご相談くださいね♡

▼ 体験セッションの詳細・ご予約はこちら ▼
【リザストお申込みリンク】`,

  orientation: `「ちょっと話を聞いてみたい」

その気持ちだけで十分です☆

無料オリエンテーションで
自然療法の世界を
のぞいてみませんか？✨

▼ 無料オリエンテーションのお申込みはこちら ▼
【リザストお申込みリンク】`,

  all: `あなたに合った入口を
お選びくださいね☆

🔬 メタトロン解析ケア
　→ 身体の今を細胞レベルで見る
　▼ ご予約はこちら ▼
　【リザストお申込みリンク】

🌿 個別体験セッション
　→ あなただけのケアプランを一緒に
　▼ ご予約はこちら ▼
　【リザストお申込みリンク】

🎓 自然療法スクール説明会
　→ 一生ものの知識を手にする
　▼ お申込みはこちら ▼
　【リザストお申込みリンク】`,
};

const THEME_PRESETS = {
  'メタトロン解析': '量子力学測定器メタトロンで「見えない不調」の原因を細胞レベルで可視化する — 自分の身体の声を聴く新しいケアの形',
  '自己治癒力': 'お薬に頼り切る前に、あなたの細胞が本来持っている「自己治癒力」をセルフケアで呼び覚ます方法',
  '自然療法スクール': '英国IFA認定のプロが教える本物の自然療法 — アロマリア自然療法の学校（AEAJ総合資格認定校）で一生ものの知識を手にする',
  '波動美健康': '波動・エネルギーの観点から心身魂のバランスを見直す — 内側から輝く美健康のホリスティックアプローチ',
  '心身魂': '心・身・魂はすべて繋がっている — どれか一つだけ整えても本当の健やかさには届かない理由と、今日からできること',
  'アロマ感情解放': '香りが脳と感情に直接作用するメカニズム — アロマテラピーで深層心理にアプローチし、心のブロックを優しく溶かす',
};

const DEFAULT_MODELS = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.0-flash',
};

const SUBJECT_SYSTEM = `あなたはメルマガの件名（タイトル）の専門家です。以下のルールで件名を5つ提案してください。

【ルール】
・全角18文字以内（スマホ通知で全文見える長さ）
・読者の好奇心または共感を刺激する
・岩本純子さんらしい温かみ
・記号（♡✨☆）は1つまで
・薬機法に抵触する表現は禁止
・煽りすぎない

【件名の型（これらを参考に）】
・疑問型: 「あなたの細胞、今何を求めてる？」
・共感型: 「なんとなく不調…それ、身体の声です」
・発見型: 「知らなかった！香りと感情の深い関係」
・語りかけ型: 「今日は大切なお話を♡」
・季節型: 「梅雨の身体に、このケア✨」

出力形式: JSON配列のみ。説明は不要。
["件名1","件名2","件名3","件名4","件名5"]`;

// ═══════════════════════════════════════════════════════════
//  システムプロンプト構築
// ═══════════════════════════════════════════════════════════

function detectSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function buildSystemPrompt(seasonKey, ctaKey, lengthKey) {
  const season = SEASON_WORDS[seasonKey] || SEASON_WORDS[detectSeason()];
  const ctaText = CTA_TEXTS[ctaKey] || CTA_TEXTS.metatron;
  const lengthGuide = { short: '800〜1200文字', standard: '1500〜2000文字', long: '2000〜2800文字' }[lengthKey] || '1500〜2000文字';

  return `あなたは、青森県八戸市と東京で「アロマリア自然療法の学校（AEAJ総合資格認定校）」を主宰する校長であり自然療法家の『岩本純子』として、リザスト（リザーブストック）のメルマガ「アロマリア美健康の秘訣」を執筆します。

━━━ 岩本純子の人物像（事実ベース）━━━
・英国IFA認定国際メディカルアロマセラピスト
・延べ3,000名以上の心身魂のケア・サポート実績
・自身も20代で深刻な婦人科系の問題、椎間板ヘルニアによる歩行困難を経験 → 自然療法によるセルフケアで前向きな変化を実感し、現在は30kgのキャリーバッグを軽々持って国内外を飛び回る日々
・クライアントの多くが免疫バランス、肌トラブル、慢性的な不調などでQOL向上を実感
・量子力学測定器メタトロンによる全身の細胞情報解析を導入
・健美イオン負荷ケア、フォトン負荷ケア、アルペオンクォンタムスマートによる心身魂・深層心理の解放
・信念：「人の身体には本来、驚くほどの回復力が備わっている」「心・身・魂は繋がっている」「自然療法は西洋医学のパートナー」

━━━ 文体ルール（必ず守る）━━━
1. 1文ごとに改行。意味の区切りで空行（2〜3文ごと）
2. 1行は全角35文字以内（スマホのリザスト表示で折り返さない）
3. 「☆」「♪」「♡」「✨」「💓」を温かみのアクセントに使う（1段落に2つまで）
4. 時折お茶目な表現を入れる（「ぴょん〜♪」「キラキラ✨」「ひとっ飛び♪」）
5. 「〜なんですよね」「〜なんです♡」のような語りかけ口調
6. 押し売りは絶対にしない。寄り添い→共感→気づき→自然な導線

━━━ 構成（この順番で書く）━━━
① 冒頭の挨拶（季節感＋読者への語りかけ）… 3〜5行
② テーマ導入（読者の悩みへの共感から入る）… 5〜8行
③ 本題（具体的な知識・岩本純子自身の体験・気づき）… 本文の中核
④ まとめ（読者への温かいメッセージ）… 3〜5行
⑤ CTA（以下のテキストを自然に組み込む）:

${ctaText}

⑥ 署名:
───────────
岩本純子
アロマリア自然療法の学校
（AEAJ総合資格認定校）
英国IFA認定国際メディカルアロマセラピスト
───────────

※ 体験談は個人の感想であり、
効果を保証するものではありません。
主治医とご相談の上、
セルフケアにお役立てください。

━━━ 薬機法コンプライアンス（絶対厳守）━━━
❌ 使ってはいけない表現:
・「完治」「治る」「治療」「治癒」→ ✅「ケア」「サポート」「整える」
・「癌/がんが消えた」「病気が治った」→ ✅「QOLが向上」「前向きな変化」
・「効果がある」「効く」→ ✅「多くの方が変化を実感」
・「断薬できる」→ ✅「お薬との付き合い方を見直すきっかけ」
・特定の病名＋改善の直接結合
・「必ず」「絶対に」「100%」等の断定
✅ 必須: 体験談の後に「個人の感想です」を添える

━━━ 季節の素材（活用して）━━━
${season}

━━━ 文字数 ━━━
${lengthGuide}

━━━ 心理テクニック（自然に織り込む）━━━
・共感ファースト: 読者の悩みを「わかります」と受け止めてから本題へ
・ストーリー: 岩本純子自身の体験や、名前を出さないクライアントの変化を物語として
・好奇心ギャップ: 「実は…」「ここが面白いところで」で読み進めたくなる仕掛け
・社会的証明: 「3,000名以上の方と向き合ってきた中で」を自然に
・権威性: IFA認定、AEAJ認定校を押し付けず自然に
・希少性: 「少人数制」「お一人おひとりに合わせた」
`;
}

// ═══════════════════════════════════════════════════════════
//  AI API呼び出し
// ═══════════════════════════════════════════════════════════

async function callAI(provider, model, messages, maxTokens, temperature) {
  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY が未設定です');
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `OpenAI API ${r.status}`); }
    const d = await r.json();
    return d.choices[0].message.content;
  }

  if (provider === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY が未設定です');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model, max_tokens: maxTokens, temperature,
        system: messages[0].content,
        messages: messages.slice(1).map(m => ({ role: m.role, content: m.content })),
      }),
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `Anthropic API ${r.status}`); }
    const d = await r.json();
    return d.content[0].text;
  }

  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY が未設定です');
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: messages[0].content }] },
        contents: messages.slice(1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `Gemini API ${r.status}`); }
    const d = await r.json();
    if (!d.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Geminiから有効な応答がありませんでした');
    return d.candidates[0].content.parts[0].text;
  }

  throw new Error(`未対応のプロバイダー: ${provider}`);
}

// ═══════════════════════════════════════════════════════════
//  薬機法チェック
// ═══════════════════════════════════════════════════════════

function checkCompliance(text) {
  return FORBIDDEN.filter(p => text.includes(p));
}

// ═══════════════════════════════════════════════════════════
//  CLI引数パース
// ═══════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    theme: null,
    target: '原因不明の体調不良が続き、病院では「異常なし」と言われるが辛い方',
    cta: 'metatron',
    season: 'auto',
    length: 'standard',
    provider: 'openai',
    model: null,
    magazine: 'アロマリア美健康の秘訣',
    magazineId: null,
    dryRun: false,
    fromJson: null,
    saveJson: null,
    list: false,
    proofread: false,
    suggestSubject: false,
    rewrite: false,
    articleId: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--theme': opts.theme = args[++i]; break;
      case '--target': opts.target = args[++i]; break;
      case '--cta': opts.cta = args[++i]; break;
      case '--season': opts.season = args[++i]; break;
      case '--length': opts.length = args[++i]; break;
      case '--provider': opts.provider = args[++i]; break;
      case '--model': opts.model = args[++i]; break;
      case '--magazine': opts.magazine = args[++i]; break;
      case '--magazine-id': opts.magazineId = args[++i]; break;
      case '--dry-run': opts.dryRun = true; break;
      case '--from-json': opts.fromJson = args[++i]; break;
      case '--save-json': opts.saveJson = args[++i]; break;
      case '--list': opts.list = true; break;
      case '--proofread': opts.proofread = true; break;
      case '--suggest-subject': opts.suggestSubject = true; break;
      case '--rewrite': opts.rewrite = true; break;
      case '--article-id': opts.articleId = args[++i]; break;
      default:
        if (!opts.theme && !args[i].startsWith('--')) {
          opts.theme = args[i];
        }
    }
  }

  if (!opts.theme && !opts.fromJson) {
    opts.theme = THEME_PRESETS['メタトロン解析'];
  } else if (opts.theme && THEME_PRESETS[opts.theme]) {
    opts.theme = THEME_PRESETS[opts.theme];
  }

  if (!opts.model) opts.model = DEFAULT_MODELS[opts.provider];

  return opts;
}

// ═══════════════════════════════════════════════════════════
//  メインパイプライン
// ═══════════════════════════════════════════════════════════

async function requireRsKey() {
  const rsKey = process.env.RESERVESTOCK_API_KEY;
  if (!rsKey) { console.error('❌ RESERVESTOCK_API_KEY が未設定です'); process.exit(1); }
  if (!rsKey.startsWith('rs_live_')) { console.error('❌ APIキーが rs_live_ で始まっていません'); process.exit(1); }
  return rsKey;
}

async function runList(opts) {
  const rsKey = await requireRsKey();

  const magazineId = opts.magazineId;
  if (!magazineId) {
    console.error('❌ --magazine-id が必要です。');
    console.error('  リザスト管理画面で配信グループのIDを確認してください。');
    console.error('  例: node newsletter-pipeline.js --list --magazine-id 364248');
    process.exit(1);
  }

  console.log(`📋 配信グループ ${magazineId} の記事一覧を取得中...\n`);
  const result = await searchMailMagazineArticles(magazineId, rsKey);

  if (result.articles.length === 0) {
    console.log('  記事なし');
  } else {
    for (const a of result.articles) {
      console.log(`  📄 ID: ${a.id} ｜ ${a.title}`);
    }
  }

  console.log(`\n  合計: ${result.articles.length}件`);
  console.log('\nヒント: 上記のIDを --article-id で指定して --proofread / --suggest-subject / --rewrite できます。');
}

async function runProofread(opts) {
  const rsKey = await requireRsKey();
  if (!opts.articleId) { console.error('❌ --article-id が必要です'); process.exit(1); }
  console.log(`🔍 記事 ${opts.articleId} をAI校正中...（数十秒かかります）\n`);
  const result = await proofreadMailMagazineArticle(opts.articleId, rsKey);
  console.log(`✅ 校正完了（範囲: ${result.scope}）`);
  console.log('  リザスト管理画面で校正結果を確認してください。');
}

async function runSuggestSubject(opts) {
  const rsKey = await requireRsKey();
  if (!opts.articleId) { console.error('❌ --article-id が必要です'); process.exit(1); }
  console.log(`💌 記事 ${opts.articleId} の件名を提案中...\n`);
  const result = await suggestMailMagazineSubject(opts.articleId, rsKey);
  console.log(`  現在の件名: ${result.currentSubject || '（なし）'}`);
  console.log(`  提案件名:   ${result.suggestedSubject}`);
  console.log('\n  採用する場合はリザスト管理画面で変更してください。');
}

async function runRewrite(opts) {
  const rsKey = await requireRsKey();
  if (!opts.articleId) { console.error('❌ --article-id が必要です'); process.exit(1); }
  if (!opts.fromJson) { console.error('❌ --from-json で元の本文を指定してください'); process.exit(1); }

  const raw = JSON.parse(fs.readFileSync(opts.fromJson, 'utf-8'));
  const originalSubject = raw.subject;
  const originalContext = raw.context;

  console.log(`✏️  記事 ${opts.articleId} をAIでリライト中...\n`);
  console.log(`  元の件名: ${originalSubject}`);
  console.log(`  元の本文: ${originalContext.length}文字\n`);

  const seasonKey = opts.season === 'auto' ? detectSeason() : opts.season;
  const sysProm = buildSystemPrompt(seasonKey, opts.cta, opts.length);

  console.log(`  AIプロバイダー: ${opts.provider} / ${opts.model}`);
  console.log('  リライト中...');

  const newContext = await callAI(opts.provider, opts.model, [
    { role: 'system', content: sysProm + '\n\n━━━ 追加指示 ━━━\n以下の既存メルマガをブラッシュアップしてください。元の伝えたいメッセージや構成の良い部分は活かしつつ、文体・表現・読みやすさを向上させてください。' },
    { role: 'user', content: `以下の下書きメルマガをブラッシュアップしてください。\n\n【元の件名】${originalSubject}\n\n【元の本文】\n${originalContext}` },
  ], 3000, 0.6);

  console.log(`  リライト完了（${newContext.length}文字）\n`);

  let warnings = checkCompliance(newContext);
  if (warnings.length > 0) {
    console.log(`  ⚠️ 薬機法チェック: ${warnings.length}件検出 → 自動修正中...`);
    const fixed = await callAI(opts.provider, opts.model, [
      { role: 'system', content: 'あなたは薬機法（医薬品医療機器等法）と景品表示法の専門家です。指摘された表現のみを、意味を保ちつつ薬機法準拠の表現に書き換えてください。それ以外の文章は一切変えないでください。' },
      { role: 'user', content: `以下のメルマガに薬機法リスクがあります。\n\n【検出】${warnings.map(w => '「' + w + '」').join('、')}\n\n【本文】\n${newContext}` },
    ], 3000, 0.3);
    warnings = checkCompliance(fixed);
    if (warnings.length === 0) console.log('  薬機法修正完了');
  }

  const subRaw = await callAI(opts.provider, opts.model, [
    { role: 'system', content: SUBJECT_SYSTEM },
    { role: 'user', content: `以下のメルマガ本文に最適な件名を5つ:\n\n${newContext}` },
  ], 200, 0.85);

  let subjects = [];
  try {
    const s = subRaw.indexOf('['), e = subRaw.lastIndexOf(']') + 1;
    subjects = JSON.parse(subRaw.slice(s, e));
  } catch (_) { subjects = [originalSubject]; }
  const newSubject = subjects[0] || originalSubject;

  if (opts.saveJson) {
    fs.writeFileSync(opts.saveJson, JSON.stringify({ subject: newSubject, context: newContext }, null, 2), 'utf-8');
    console.log(`  💾 JSONに保存: ${opts.saveJson}`);
  }

  if (opts.dryRun) {
    console.log('\n📋 dry-run: リザストへの保存はスキップ');
    console.log(`  新しい件名: ${newSubject}`);
    console.log(`  他の候補: ${subjects.slice(1).join(' / ')}`);
    console.log(`  本文（${newContext.length}文字）:\n${newContext.slice(0, 300)}...`);
    return;
  }

  console.log('  リザストに上書き保存中...');
  await sleep(API_INTERVAL_MS);
  const saved = await saveMailMagazineArticle({
    mailMagazineArticleId: opts.articleId,
    subject: newSubject,
    context: newContext,
    publicStatus: 'private',
  }, rsKey);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║            リライト完了                     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  記事ID: ${saved.mailMagazineArticleId}`);
  console.log(`  新しい件名: ${newSubject}`);
  if (subjects.length > 1) console.log(`  他の候補: ${subjects.slice(1).join(' / ')}`);
  console.log(`  本文: ${newContext.length}文字`);
  console.log(`  ステータス: ${saved.status}`);
  console.log('\n  → リザスト管理画面で内容を確認してください。');
}

async function main() {
  const opts = parseArgs();
  const log = (msg) => console.log(`  ${msg}`);

  if (opts.list) return runList(opts);
  if (opts.proofread) return runProofread(opts);
  if (opts.suggestSubject) return runSuggestSubject(opts);
  if (opts.rewrite) return runRewrite(opts);

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  アロマリア メルマガ → リザスト パイプライン  ║');
  console.log('╚══════════════════════════════════════════╝\n');

  let subject, context;

  // ── STEP 1: コンテンツ取得 ──
  if (opts.fromJson) {
    console.log('📄 STEP 1: JSONファイルから記事を読み込み');
    const raw = JSON.parse(fs.readFileSync(opts.fromJson, 'utf-8'));
    subject = raw.subject;
    context = raw.context;
    log(`件名: ${subject}`);
    log(`本文: ${context.length}文字`);
  } else {
    console.log(`📝 STEP 1: メルマガ本文を生成（${opts.provider} / ${opts.model}）`);
    log(`テーマ: ${opts.theme.slice(0, 50)}...`);
    log(`ターゲット: ${opts.target.slice(0, 50)}...`);

    const seasonKey = opts.season === 'auto' ? detectSeason() : opts.season;
    const sysProm = buildSystemPrompt(seasonKey, opts.cta, opts.length);
    const maxTokens = opts.length === 'long' ? 3500 : opts.length === 'short' ? 1500 : 2500;

    log('本文を生成中...');
    context = await callAI(opts.provider, opts.model, [
      { role: 'system', content: sysProm },
      { role: 'user', content: `以下の条件でメルマガを1通書いてください。\n\n【テーマ】${opts.theme}\n【ターゲット読者】${opts.target}\n\n読者が「岩本さんに相談してみたい！」「メタトロンを受けてみたい！」「スクールで学びたい！」と自然に感じる記事にしてください。` },
    ], maxTokens, 0.72);
    log(`本文生成完了（${context.length}文字）`);

    // ── 薬機法チェック ──
    console.log('\n🔍 STEP 2: 薬機法チェック');
    let warnings = checkCompliance(context);
    if (warnings.length > 0) {
      log(`${warnings.length}件検出: ${warnings.join('、')}`);
      log('自動修正中...');
      context = await callAI(opts.provider, opts.model, [
        { role: 'system', content: 'あなたは薬機法（医薬品医療機器等法）と景品表示法の専門家です。指摘された表現のみを、意味を保ちつつ薬機法準拠の表現に書き換えてください。それ以外の文章は一切変えないでください。' },
        { role: 'user', content: `以下のメルマガに薬機法リスクがあります。\n\n【検出】${warnings.map(w => '「' + w + '」').join('、')}\n\n【本文】\n${context}` },
      ], 3000, 0.3);
      warnings = checkCompliance(context);
      if (warnings.length > 0) log(`⚠️ 残存: ${warnings.join('、')}（手動確認が必要）`);
      else log('薬機法修正完了');
    } else {
      log('薬機法チェック通過');
    }

    // ── 件名生成 ──
    console.log('\n💌 STEP 3: 件名を生成');
    const subRaw = await callAI(opts.provider, opts.model, [
      { role: 'system', content: SUBJECT_SYSTEM },
      { role: 'user', content: `以下のメルマガ本文に最適な件名を5つ:\n\n${context}` },
    ], 200, 0.85);

    let subjects = [];
    try {
      const s = subRaw.indexOf('['), e = subRaw.lastIndexOf(']') + 1;
      subjects = JSON.parse(subRaw.slice(s, e));
    } catch (_) { subjects = [subRaw.trim()]; }

    subject = subjects[0];
    log(`採用件名: ${subject}`);
    if (subjects.length > 1) log(`他の候補: ${subjects.slice(1).join(' / ')}`);
  }

  // ── JSON保存 ──
  if (opts.saveJson) {
    fs.writeFileSync(opts.saveJson, JSON.stringify({ subject, context }, null, 2), 'utf-8');
    log(`\n💾 JSONに保存: ${opts.saveJson}`);
  }

  // ── dry-run チェック ──
  if (opts.dryRun) {
    console.log('\n📋 dry-run モード: リザストへの投稿はスキップ');
    console.log('\n--- 生成結果 ---');
    console.log(`件名: ${subject}`);
    console.log(`本文（${context.length}文字）:\n${context.slice(0, 200)}...`);
    return;
  }

  // ── STEP 4: リザスト投稿 ──
  const rsKey = process.env.RESERVESTOCK_API_KEY;
  if (!rsKey) {
    console.error('\n❌ RESERVESTOCK_API_KEY が未設定のため投稿できません。');
    console.error('生成結果は --save-json で保存するか、--dry-run で確認してください。');
    process.exit(1);
  }
  if (!rsKey.startsWith('rs_live_')) {
    console.error('\n❌ APIキーが rs_live_ で始まっていません。');
    process.exit(1);
  }

  console.log('\n📤 STEP 4: リザストに非公開記事として投稿');

  let magazineId = opts.magazineId;
  if (!magazineId) {
    log(`配信グループ「${opts.magazine}」を作成/取得中...`);
    const mag = await createMailMagazine({ title: opts.magazine }, rsKey);
    magazineId = mag.stepMailId;
    log(`配信グループID: ${magazineId}`);
  }

  await sleep(API_INTERVAL_MS);
  log('記事を投稿中...');
  const article = await createMailMagazineArticle({
    mailMagazineId: magazineId,
    subject,
    context,
    publicStatus: 'private',
  }, rsKey);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║              投稿完了                      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  記事ID: ${article.mailMagazineArticleId}`);
  console.log(`  件名: ${subject}`);
  console.log(`  ステータス: ${article.status}`);
  console.log(`  公開状態: ${article.publicStatus}`);
  console.log(`  本文: ${context.length}文字`);
  console.log('\n  → リザスト管理画面で内容を確認してください。');
  console.log('  → 配信は管理画面から手動で行ってください。');
}

main().catch(err => {
  console.error('\n❌ エラーが発生しました:');
  console.error(err.message);
  if (err.responseData) console.error('APIレスポンス:', JSON.stringify(err.responseData, null, 2));
  process.exit(1);
});

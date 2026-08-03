const { createMailMagazine, createMailMagazineArticle } = require('./reservestock-mail-magazine.js');
const fs = require('fs');

const API_KEY = process.env.RESERVESTOCK_API_KEY;
if (!API_KEY) {
  console.error('エラー: 環境変数 RESERVESTOCK_API_KEY が設定されていません。');
  console.error('使い方: RESERVESTOCK_API_KEY=rs_live_xxxx node post-newsletters.js');
  process.exit(1);
}

if (!API_KEY.startsWith('rs_live_')) {
  console.error('警告: APIキーが rs_live_ で始まっていません。正しいキーか確認してください。');
  process.exit(1);
}

const MAGAZINE_TITLE = 'アロマリア 検証メルマガ';

const articles = [
  { path: './content/newsletter-content-sucrose-diabetes.json', label: 'ショ糖と糖尿病' },
  { path: './content/newsletter-content-friedpotato.json', label: 'フライドポテト事故' },
];

async function postArticle(contentPath, magazineId, label) {
  const raw = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  const content = { subject: raw.subject, context: raw.context };

  console.log(`\n--- ${label} ---`);
  console.log('件名:', content.subject);

  const article = await createMailMagazineArticle(
    {
      mailMagazineId: magazineId,
      subject: content.subject,
      context: content.context,
      publicStatus: 'private',
    },
    API_KEY
  );

  console.log('記事ID:', article.mailMagazineArticleId);
  console.log('ステータス:', article.status);
  console.log('公開状態:', article.publicStatus);
  return article;
}

async function main() {
  console.log('=== リザスト メルマガ記事投稿 ===');
  console.log('配信グループを作成/取得します...');

  const magazine = await createMailMagazine({ title: MAGAZINE_TITLE }, API_KEY);
  console.log('配信グループID:', magazine.stepMailId);
  console.log('配信グループ名:', magazine.title);

  const results = [];
  for (const { path, label } of articles) {
    const result = await postArticle(path, magazine.stepMailId, label);
    results.push({ label, ...result });
  }

  console.log('\n=== 投稿結果まとめ ===');
  for (const r of results) {
    console.log(`${r.label}: 記事ID=${r.mailMagazineArticleId}, ステータス=${r.status}, 公開=${r.publicStatus}`);
  }
  console.log('\n投稿完了（すべて非公開/下書き状態）。');
  console.log('リザスト管理画面で内容を確認してください。');
}

main().catch((err) => {
  console.error('\nエラーが発生しました:');
  console.error(err.message);
  if (err.responseData) {
    console.error('APIレスポンス:', JSON.stringify(err.responseData, null, 2));
  }
  process.exit(1);
});

# メルマガ投稿 自動化セットアップ

フォルダの場所: `/Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail`

---

## A. ワンクリック実行（Macショートカット）

### 手順
1. ターミナルで以下を1回だけ実行（スクリプトに実行権限を付ける）:
```
chmod +x /Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail/scripts/post-to-reservestock.sh
```

2. 「ショートカット」アプリを開く（Spotlight で「ショートカット」と検索）
3. 左上の「＋」で新規ショートカットを作成
4. 「アクションを追加」→ 検索で「シェルスクリプト」→「シェルスクリプトを実行」を選択
5. 入力欄に以下を貼り付け:
```
/Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail/scripts/post-to-reservestock.sh
```
6. ショートカット名を「メルマガ投稿」にする
7. 完了

### 使い方
- ショートカットアプリからワンクリック
- メニューバーに追加すればいつでもワンクリック
- Siriに「メルマガ投稿を実行して」と言ってもOK

---

## B. 定期自動実行（cron）

毎朝9時に自動で投稿チェック＋実行する設定。

### 手順
1. ターミナルで以下を実行:
```
chmod +x /Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail/scripts/post-to-reservestock.sh
crontab -e
```
2. エディタが開くので、以下の1行を追加して保存:
```
0 9 * * * /Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail/scripts/post-to-reservestock.sh >> /Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail/logs/cron.log 2>&1
```
3. 保存して閉じる（vi の場合: Escキー → `:wq` → Enter）

### 補足
- 毎朝9時に実行（Macが起動していれば）
- 実行結果は `logs/cron.log` に記録される
- やめたい時: `crontab -e` で行を削除

---

## C. 新記事を検出して自動投稿（Gitフック型）

Claudeが新しい記事をプッシュしたら、10分以内に自動投稿する設定。

### 手順
1. ターミナルで以下を実行:
```
chmod +x /Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail/scripts/watch-and-post.sh
crontab -e
```
2. 以下の1行を追加して保存:
```
*/10 * * * * /Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail/scripts/watch-and-post.sh >> /Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail/logs/watch.log 2>&1
```

### 仕組み
- 10分おきにGitHubをチェック
- `content/` フォルダに新しいファイルがあれば自動投稿
- 同じ記事を二重投稿しない（投稿済みハッシュを記録）
- 投稿されるとMacに通知が出る

---

## 注意
- B と C は両方入れると二重投稿になる可能性があります。**C だけで十分**です
- A はいつでも手動で使えるので、B/C と併用OK
- おすすめ: **A（手動ワンクリック） + C（自動検出）**

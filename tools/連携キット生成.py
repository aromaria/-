# -*- coding: utf-8 -*-
"""
3システム連携キット生成ツール（Claude ＋ Obsidian ＋ NotebookLM）

新しい業務ごとに、同じ「連携の仕組み」を一発で作る。
- CLAUDE.md（Claudeが最初に読む要点の地図。トークン節約の本体）
- obsidian-vault/（知識の保管庫。00〜50の小さいメモ）
- notebooklm/資料まとめ.md（NotebookLMに入れる総合資料）
- <業務>_obsidian-vault.zip（Obsidianですぐ開ける）
- <業務>_NotebookLM資料.pdf（文字化けしないアップロード用）

使い方（Claudeが実行）:
  python3 tools/連携キット生成.py \
      --name "町内会イベント運営" \
      --desc "町内会の年間イベントを数名で分担運営する" \
      --members "玉川,岩本,藤本,田尻" \
      --facts "毎月1回の定例／会場はコミュニティセンター／会計は別Excel" \
      --url "https://example.com" \
      --out out

reportlab が無ければ PDF はスキップ（ZIPとmdは必ず出る）。
"""
import argparse, os, re, zipfile, datetime

def slugify(name):
    s = re.sub(r'\s+', '_', name.strip())
    s = re.sub(r'[\\/:*?"<>|]', '', s)
    return s or 'project'

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

def build(cfg):
    name = cfg['name']; desc = cfg['desc']
    members = [m.strip() for m in cfg['members'].split(',') if m.strip()]
    members_line = '・'.join(members) if members else '（担当者を記入）'
    facts = [x.strip() for x in re.split(r'[／/、,\n]', cfg['facts']) if x.strip()]
    facts_md = '\n'.join('- ' + f for f in facts) if facts else '- （ここに要点を書く）'
    url = cfg['url'].strip() or '（未設定）'
    today = datetime.date.today().isoformat()
    slug = slugify(name)
    outroot = os.path.join(cfg['out'], slug)
    vault = os.path.join(outroot, 'obsidian-vault')

    # --- CLAUDE.md ---
    write(os.path.join(outroot, 'CLAUDE.md'), f"""# プロジェクト地図（Claude はまずこれだけ読む）

> 目的: トークン節約。大きなファイルを毎回読み直さず、この要約から始める。
> 詳しい経緯・決定は `obsidian-vault/` を参照（必要な時だけ開く）。

## これは何
{desc}

- 関係者: {members_line}
- 関連URL: {url}
- 作成日: {today}

## 要点
{facts_md}

## ファイル構成（読むのは必要な時だけ）
- `obsidian-vault/` … 知識の保管庫（00〜50の小さいメモ）
- `notebooklm/資料まとめ.md` … NotebookLMに入れる総合資料

## 連携（トークン節約運用）
- 知識の保管 = `obsidian-vault/`（人もClaudeもここを見る）
- NotebookLMへの投入資料 = `notebooklm/` を手動アップロード（NotebookLMは公式CLI/APIなし）
- Claudeへの頼み方: 「全部見て」ではなく「CLAUDE.md と 該当メモだけ見て」と範囲を絞る
""")

    # --- obsidian-vault ---
    write(os.path.join(vault, '00_はじめに（最初に読む）.md'), f"""# はじめに — {name} の保管庫

これは **Obsidian** で開く「知識の保管庫」です。中身は普通のテキスト（.md）なので、**Claude も直接 読み書きできます**。

## Obsidianで開く手順
1. Obsidian →「Open folder as vault（フォルダーを保管庫として開く）」
2. この `obsidian-vault` フォルダーを選ぶ
3. 左の一覧から番号順に読む

## 3つのツールの役割
- **Obsidian** = ためる・見返す（本棚）
- **Claude** = 作る・整理する・直す（職人）
- **NotebookLM** = 資料に質問・要約・音声解説（無料の先生）
""")

    write(os.path.join(vault, '10_概要.md'), f"""# {name} 概要

## 何をする？
{desc}

## 関係者
{members_line}

## 要点
{facts_md}

## 関連URL
{url}
""")

    write(os.path.join(vault, '20_進め方・手順.md'), f"""# 進め方・手順

（ここに、実際の作業の流れを書く。例：受付→確認→記録→報告）

1.
2.
3.

## よくあるミス・注意
-
""")

    write(os.path.join(vault, '30_メモ・資料.md'), f"""# メモ・資料

（調べたこと、参考リンク、決まっていないこと などを自由に書く）

-
""")

    write(os.path.join(vault, '40_決定事項ログ.md'), f"""# 決定事項ログ（なぜそうしたか）

- {today} キット作成。Claude＋Obsidian＋NotebookLMの連携を開始。

## 追記ルール
大きな判断をしたら1行で足す（日付＋何を＋なぜ）。
Claudeに「決定ログに追記して」と頼めば書き足せる。
""")

    write(os.path.join(vault, '50_連携ガイド.md'), f"""# 連携ガイド — {name}

## 役割分担
| ツール | 役割 |
|---|---|
| Claude | 作る・直す・整理する |
| Obsidian | ためる・見返す（保管庫） |
| NotebookLM | 資料に質問・要約（無料） |

## 毎日の回し方
1. 調べる・質問・要約 → まず NotebookLM（無料）
2. ためる・見返す → Obsidian
3. 直す・作る・整理する → Claude（「CLAUDE.md と 該当メモだけ見て」と範囲を絞る）

## 更新のとき
- Obsidian: 最新ZIPを受け取って開き直す
- NotebookLM: 大きく変わった節目だけ、新しいPDFを入れ直す

## 注意
- NotebookLMは公式CLI/APIが無いため、資料アップロードは手動。
- APIトークンや秘密のURLは、NotebookLM・Obsidian・SNSに貼らない。
""")

    # --- notebooklm source ---
    facts_txt = '。'.join(facts) if facts else ''
    nb = f"""# {name} 総合資料（NotebookLM 投入用）

> この資料を NotebookLM に読み込ませれば、内容について無料で質問・要約・音声解説ができます。
> （NotebookLM は公式のCLI/APIが無いため、アップロードは手動です）

## 概要
{desc}

## 関係者
{members_line}

## 要点
{facts_txt}

## 関連URL
{url}

## 連携運用（トークン節約）
Obsidian＝知識の保管庫、Claude＝作成・整理・修正、NotebookLM＝資料への質問・要約。
Claudeは CLAUDE.md と obsidian-vault の小さいメモから始めることで、大きなファイルを読み直さずに済む。
"""
    write(os.path.join(outroot, 'notebooklm', '資料まとめ.md'), nb)

    # --- zip of vault ---
    zip_path = os.path.join(cfg['out'], f'{slug}_obsidian-vault.zip')
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(vault):
            for fn in files:
                full = os.path.join(root, fn)
                arc = os.path.relpath(full, outroot)
                z.write(full, arc)

    # --- PDF for NotebookLM (optional) ---
    pdf_path = os.path.join(cfg['out'], f'{slug}_NotebookLM資料.pdf')
    pdf_made = False
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.cidfonts import UnicodeCIDFont
        from reportlab.platypus import SimpleDocTemplate, Paragraph
        from reportlab.lib.styles import ParagraphStyle
        pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
        pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3'))
        st_h = ParagraphStyle('h', fontName='HeiseiKakuGo-W5', fontSize=13, leading=20, spaceBefore=12, spaceAfter=4, textColor='#1b4fd0')
        st_t = ParagraphStyle('t', fontName='HeiseiKakuGo-W5', fontSize=18, leading=26, spaceAfter=8, textColor='#102a54')
        st_b = ParagraphStyle('b', fontName='HeiseiMin-W3', fontSize=10.5, leading=17, spaceAfter=6)
        def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
        flow = [Paragraph(esc(f'{name} 総合資料（NotebookLM 投入用）'), st_t)]
        sec = [('概要', desc), ('関係者', members_line), ('要点', facts_txt or '（記入なし）'),
               ('関連URL', url),
               ('連携運用', 'Obsidian＝保管庫、Claude＝作成・整理、NotebookLM＝質問・要約。CLAUDE.mdと小さいメモから始めてトークン節約。')]
        for h, body in sec:
            flow.append(Paragraph(esc(h), st_h))
            flow.append(Paragraph(esc(body), st_b))
        SimpleDocTemplate(pdf_path, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm,
                          topMargin=18*mm, bottomMargin=18*mm, title=f'{name} 総合資料').build(flow)
        pdf_made = True
    except Exception as e:
        print('PDF skipped:', e)

    print('OK ->', outroot)
    print('ZIP:', zip_path)
    print('PDF:', pdf_path if pdf_made else '(なし: reportlab未導入)')
    return outroot

def main():
    p = argparse.ArgumentParser(description='3システム連携キット生成')
    p.add_argument('--name', required=True, help='業務名')
    p.add_argument('--desc', default='', help='一言説明')
    p.add_argument('--members', default='', help='関係者（カンマ区切り）')
    p.add_argument('--facts', default='', help='要点（／や、で区切り）')
    p.add_argument('--url', default='', help='関連URL')
    p.add_argument('--out', default='out', help='出力先フォルダ')
    build(vars(p.parse_args()))

if __name__ == '__main__':
    main()

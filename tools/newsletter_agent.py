"""
【アロマリア自然療法の学校】メルマガ生成エージェント v2
岩本純子様専用 — リザスト配信最適化済み

使い方:
  python3 tools/newsletter_agent.py --theme "テーマ" --target "ターゲット"
  python3 tools/newsletter_agent.py --theme "テーマ" --target "ターゲット" --variations 3
  python3 tools/newsletter_agent.py --interactive
"""

import os
import sys
import json
import time
import argparse
import textwrap
from dataclasses import dataclass, field
from typing import Optional

try:
    from openai import OpenAI, APIError, RateLimitError, APIConnectionError
except ImportError:
    print("openai パッケージが必要です: pip install openai")
    sys.exit(1)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  設定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODEL = "gpt-4o"
TEMPERATURE_BODY = 0.72
TEMPERATURE_SUBJECT = 0.85     # 件名はやや冒険的に
MAX_TOKENS_BODY = 2500         # リザストで読みやすい長さに収める
MAX_TOKENS_SUBJECT = 120
MAX_RETRIES = 3
RETRY_BASE_DELAY = 2           # 秒（指数バックオフ: 2, 4, 8）

TARGET_CHAR_COUNT = 1800       # 本文の目安文字数（リザスト最適）
RIZAST_LINE_WIDTH = 35         # スマホ表示で1行に収まる全角文字数目安


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  薬機法コンプライアンスフィルター
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPLIANCE_RULES = """
【薬機法・景品表示法コンプライアンス（厳守）】
以下の表現はメルマガ本文では絶対に使わないでください：

❌ 禁止表現:
・「完治」「治る」「治療」「治癒」→ ✅「ケア」「サポート」「整える」「向き合う」
・「癌が消えた」「病気が治った」→ ✅「QOLが向上した」「前向きな変化があった」「医師も驚く変化」
・「効果がある」「効く」→ ✅「多くの方が変化を実感」「可能性を感じる」
・「断薬できる」→ ✅「お薬との付き合い方を見直すきっかけ」
・特定の病名＋改善を直接結びつける表現
・「必ず」「絶対に」「100%」等の断定表現

✅ 推奨表現:
・「個人の感想であり、効果を保証するものではありません」（体験談の後に）
・「医師の判断を尊重した上で」「主治医とご相談の上」
・「心身のバランスを整える」「本来の力を引き出す」
・「セルフケア」「ホリスティック」「QOL向上」
"""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ペルソナ（事実ベース・薬機法準拠版）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERSONA = """
あなたは、青森県八戸市と東京で「アロマリア自然療法の学校（AEAJ総合資格認定校）」を主宰する校長であり、自然療法家の『岩本純子』さんとして執筆します。

【岩本純子の人物像と実績（事実ベース）】
・英国IFA認定国際メディカルアロマセラピスト
・延べ3,000名以上の心身魂のケア・サポート実績
・自身も20代で深刻な婦人科系の問題、椎間板ヘルニアによる歩行困難を経験
  → 自然療法によるセルフケアで前向きな変化を実感し、現在は国内外を飛び回る日々
・クライアントの多くが免疫バランス、肌トラブル、慢性的な不調などでQOL向上を実感
・量子力学測定器メタトロンによる全身の細胞情報解析を導入
・健美イオン負荷ケア、フォトン負荷ケア、アルペオンクォンタムスマートなど
  最新の波動・エネルギーケアを提供

【岩本純子の信念】
・「人の身体には本来、驚くほどの回復力が備わっている」
・「心・身・魂は繋がっている。どれか一つだけ整えても本当の健やかさには届かない」
・「自然療法は西洋医学の敵ではなく、パートナー。主治医と連携しながら最善を探る」
"""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  文体ルール
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STYLE_GUIDE = """
【文体・トーンルール（厳守）】

1. 改行ルール（リザスト最適化）:
   ・1文ごとに改行する
   ・意味の区切りで空行を入れる（2〜3文ごと）
   ・1行は全角35文字以内を目安にする（スマホ表示最適化）

2. 記号の使い方:
   ・「☆」「♪」「♡」「✨」「💓」を温かみのアクセントとして使う
   ・ただし1段落に2つまで。多用しすぎない
   ・見出しの装飾: ─── や ✦ を使う

3. 岩本純子らしさ:
   ・時折お茶目な比喩を入れる（「ぴょん〜♪」「ひとっ飛び♪」「キラキラ✨」など）
   ・「〜なんですよね」「〜なんです♡」のような語りかけ口調
   ・押し売りは絶対にしない。寄り添い→気づき→自然な導線

4. 構成テンプレート:
   ・冒頭の挨拶（季節感＋読者への語りかけ）: 3〜5行
   ・今日のテーマ導入（共感から入る）: 5〜8行
   ・本題（具体的な知識・体験・気づき）: 15〜25行
   ・まとめ（読者へのメッセージ）: 3〜5行
   ・CTA（行動喚起）: 5〜8行
   ・署名

5. CTA（行動喚起）のルール:
   ・「体験してみませんか？」「お気軽にご相談くださいね」等の柔らかい表現
   ・リザストの個別予約リンク先は【こちら】や「▼詳細・お申込みはこちら▼」のプレースホルダを入れる
   ・無料オリエンテーション、体験セッション、スクール説明会のいずれかに誘導
   ・「※ 体験談は個人の感想であり、効果を保証するものではありません」を自然に添える
"""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  件名生成プロンプト
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBJECT_PROMPT = """
以下のメルマガ本文に最適な「件名」を5つ提案してください。

【件名のルール】
・全角20文字以内（スマホの通知で全文見える長さ）
・読者が「開きたい！」と思う好奇心・共感を刺激する
・「！」「？」「♡」「✨」は1つまで
・煽りすぎない、岩本純子さんらしい温かみ
・薬機法に抵触する表現は絶対に使わない

出力形式（JSON配列のみ、説明不要）:
["件名1", "件名2", "件名3", "件名4", "件名5"]
"""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  データ構造
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@dataclass
class Newsletter:
    body: str
    subject_candidates: list[str] = field(default_factory=list)
    theme: str = ""
    target: str = ""
    char_count: int = 0
    compliance_checked: bool = False


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  APIコール（リトライ付き）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def api_call(client: OpenAI, messages: list, temperature: float,
             max_tokens: int) -> str:
    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except RateLimitError:
            wait = RETRY_BASE_DELAY * (2 ** attempt)
            print(f"  ⏳ レート制限。{wait}秒後にリトライ ({attempt+1}/{MAX_RETRIES})")
            time.sleep(wait)
        except APIConnectionError:
            wait = RETRY_BASE_DELAY * (2 ** attempt)
            print(f"  ⏳ 接続エラー。{wait}秒後にリトライ ({attempt+1}/{MAX_RETRIES})")
            time.sleep(wait)
        except APIError as e:
            print(f"  ❌ APIエラー: {e}")
            raise
    raise RuntimeError(f"APIコールが{MAX_RETRIES}回失敗しました")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  コンプライアンスチェック
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORBIDDEN_PATTERNS = [
    "完治", "治る", "治った", "治療する", "治癒",
    "癌が消", "がんが消", "ガンが消", "腫瘍が消",
    "効果があ", "効きます", "必ず", "絶対に", "100%",
    "断薬でき", "薬をやめ", "薬が不要",
]

def compliance_check(text: str) -> list[str]:
    warnings = []
    for pattern in FORBIDDEN_PATTERNS:
        if pattern in text:
            warnings.append(f"⚠️ 薬機法リスク: 「{pattern}」が含まれています")
    return warnings


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  本文生成
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def generate_body(client: OpenAI, theme: str, target: str) -> str:
    system = "\n\n".join([PERSONA, STYLE_GUIDE, COMPLIANCE_RULES])

    user_prompt = textwrap.dedent(f"""\
        以下の条件でメルマガを1通作成してください。

        【今週のテーマ】: {theme}
        【ターゲット読者】: {target}
        【文字数目安】: {TARGET_CHAR_COUNT}文字前後

        読者が「私も岩本さんに相談してみたい」と自然に思える記事にしてください。
        構成テンプレートに沿い、CTAは押し売りではなく寄り添う形で。
    """)

    return api_call(
        client,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
        temperature=TEMPERATURE_BODY,
        max_tokens=MAX_TOKENS_BODY,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  件名生成
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def generate_subjects(client: OpenAI, body: str) -> list[str]:
    raw = api_call(
        client,
        messages=[
            {"role": "system", "content": PERSONA},
            {"role": "user", "content": f"{SUBJECT_PROMPT}\n\n---\n{body}\n---"},
        ],
        temperature=TEMPERATURE_SUBJECT,
        max_tokens=MAX_TOKENS_SUBJECT,
    )

    try:
        start = raw.index("[")
        end = raw.rindex("]") + 1
        return json.loads(raw[start:end])
    except (ValueError, json.JSONDecodeError):
        return [raw.strip()]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  コンプライアンス自動修正
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def fix_compliance(client: OpenAI, body: str,
                   warnings: list[str]) -> str:
    fix_prompt = textwrap.dedent(f"""\
        以下のメルマガ本文に薬機法上のリスク表現が見つかりました。
        意味を保ちつつ、指摘された箇所だけを薬機法準拠の表現に書き換えてください。
        それ以外の文章は一切変えないでください。

        【指摘事項】:
        {chr(10).join(warnings)}

        【本文】:
        {body}
    """)

    return api_call(
        client,
        messages=[
            {"role": "system", "content": COMPLIANCE_RULES},
            {"role": "user", "content": fix_prompt},
        ],
        temperature=0.3,
        max_tokens=MAX_TOKENS_BODY,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  メインパイプライン
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def generate_newsletter(theme: str, target: str,
                        variations: int = 1) -> list[Newsletter]:
    client = OpenAI()
    results = []

    for i in range(variations):
        label = f"[{i+1}/{variations}] " if variations > 1 else ""
        print(f"  {label}📝 本文を生成中...")
        body = generate_body(client, theme, target)

        # コンプライアンスチェック＆自動修正
        warnings = compliance_check(body)
        if warnings:
            print(f"  {label}🔍 薬機法チェック: {len(warnings)}件の指摘 → 自動修正中...")
            body = fix_compliance(client, body, warnings)
            recheck = compliance_check(body)
            if recheck:
                print(f"  {label}⚠️  修正後も残る指摘（手動確認を推奨）:")
                for w in recheck:
                    print(f"      {w}")
        else:
            print(f"  {label}✅ 薬機法チェック: OK")

        print(f"  {label}💌 件名候補を生成中...")
        subjects = generate_subjects(client, body)

        nl = Newsletter(
            body=body,
            subject_candidates=subjects,
            theme=theme,
            target=target,
            char_count=len(body),
            compliance_checked=True,
        )
        results.append(nl)

    return results


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  出力フォーマッタ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def format_output(newsletters: list[Newsletter]) -> str:
    parts = []
    for i, nl in enumerate(newsletters, 1):
        header = f"━━━ バリエーション {i} ━━━" if len(newsletters) > 1 else ""
        subjects = "\n".join(
            f"  {j}. {s}" for j, s in enumerate(nl.subject_candidates, 1)
        )
        parts.append(textwrap.dedent(f"""\
            {header}

            ┌─── 件名候補（開封率の高い順） ───┐
            {subjects}
            └──────────────────────────────────┘

            【本文】({nl.char_count}文字)
            ────────────────────────────
            {nl.body}
            ────────────────────────────

            薬機法チェック: {'✅ 通過' if nl.compliance_checked else '⚠️ 未チェック'}
        """))

    return "\n\n".join(parts)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  インタラクティブモード
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THEME_PRESETS = {
    "1": ("自己治癒力", "お薬に頼り切る前に、細胞が本来持っている『自己治癒力』を目覚めさせるセルフケア"),
    "2": ("メタトロン", "量子力学測定器メタトロンで『見えない不調』の原因を可視化する"),
    "3": ("アロマと感情", "香りが感情と記憶に作用するメカニズムと、日常に取り入れるアロマセルフケア"),
    "4": ("季節の養生", "季節の変わり目に揺らぎやすい心身を、自然療法で穏やかに整える方法"),
    "5": ("波動とエネルギー", "波動・エネルギーの観点から心身魂のバランスを見直すホリスティックケア"),
}

TARGET_PRESETS = {
    "1": "原因不明の体調不良が続き、これ以上薬を増やしたくない方",
    "2": "アロマやハーブに興味があるが、本格的に学んだことがない方",
    "3": "心身の不調を感じつつ、どこに相談すればいいかわからない方",
    "4": "自然療法の資格取得（AEAJ等）に関心がある方",
}


def interactive_mode():
    print("\n╔══════════════════════════════════════════════╗")
    print("║  アロマリア メルマガ生成エージェント v2       ║")
    print("║  岩本純子様専用 — 薬機法準拠・リザスト最適化  ║")
    print("╚══════════════════════════════════════════════╝\n")

    print("── テーマを選んでください（番号 or 自由入力）──")
    for k, (label, desc) in THEME_PRESETS.items():
        print(f"  {k}. 【{label}】{desc[:30]}…")
    print()
    theme_input = input("テーマ: ").strip()
    if theme_input in THEME_PRESETS:
        theme = THEME_PRESETS[theme_input][1]
        print(f"  → {theme}\n")
    else:
        theme = theme_input

    print("── ターゲット読者を選んでください ──")
    for k, v in TARGET_PRESETS.items():
        print(f"  {k}. {v}")
    print()
    target_input = input("ターゲット: ").strip()
    if target_input in TARGET_PRESETS:
        target = TARGET_PRESETS[target_input]
        print(f"  → {target}\n")
    else:
        target = target_input

    variations_input = input("バリエーション数 (1-3, デフォルト1): ").strip()
    variations = int(variations_input) if variations_input.isdigit() else 1
    variations = max(1, min(3, variations))

    print(f"\n🚀 {variations}パターンのメルマガを生成します...\n")

    newsletters = generate_newsletter(theme, target, variations)
    output = format_output(newsletters)
    print(output)

    save = input("\n📁 ファイルに保存しますか？ (y/N): ").strip().lower()
    if save == "y":
        filename = f"newsletter_{time.strftime('%Y%m%d_%H%M%S')}.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"  → {filename} に保存しました ✅")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CLI エントリーポイント
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    parser = argparse.ArgumentParser(
        description="アロマリア メルマガ生成エージェント v2"
    )
    parser.add_argument("--theme", type=str, help="メルマガのテーマ")
    parser.add_argument("--target", type=str, help="ターゲット読者")
    parser.add_argument("--variations", type=int, default=1,
                        help="生成バリエーション数 (1-3)")
    parser.add_argument("--interactive", action="store_true",
                        help="対話モードで起動")
    parser.add_argument("--output", type=str, help="出力ファイルパス")

    args = parser.parse_args()

    if args.interactive:
        interactive_mode()
        return

    if not args.theme or not args.target:
        parser.print_help()
        print("\n❌ --theme と --target は必須です（--interactive で対話モードも使えます）")
        sys.exit(1)

    variations = max(1, min(3, args.variations))
    print(f"\n🚀 メルマガを{variations}パターン生成中...\n")

    newsletters = generate_newsletter(args.theme, args.target, variations)
    output = format_output(newsletters)
    print(output)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"\n📁 {args.output} に保存しました ✅")


if __name__ == "__main__":
    main()

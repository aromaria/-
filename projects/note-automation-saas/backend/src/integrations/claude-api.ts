import axios from 'axios';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_BASE = 'https://api.anthropic.com/v1';

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeAPI {
  private static instance: ClaudeAPI;

  private constructor() {}

  static getInstance(): ClaudeAPI {
    if (!ClaudeAPI.instance) {
      ClaudeAPI.instance = new ClaudeAPI();
    }
    return ClaudeAPI.instance;
  }

  async generateTheme(input: {
    background: string;
    interests: string[];
    targetAudience: string;
  }): Promise<{
    title: string;
    description: string;
    sellPotential: number;
    estimatedPrice: number;
  }> {
    const prompt = `
ユーザーの背景と興味から、note で売れる記事テーマを提案してください。

【ユーザー情報】
背景: ${input.background}
得意分野: ${input.interests.join(', ')}
ターゲット: ${input.targetAudience}

【要件】
1. ユーザーの経験を生かしたテーマを提案する
2. 実際に売れやすいテーマであること
3. 初心者向けで理解しやすい内容
4. 2024-2026年の最新トレンドを反映

【出力形式】
JSON形式で以下を返してください：
{
  "title": "テーマタイトル",
  "description": "詳細説明（100文字程度）",
  "sellPotential": 1-10,
  "estimatedPrice": 推定販売価格,
  "relatedKeywords": ["キーワード1", "キーワード2", ...]
}

JSON以外の説明は不要。JSONのみ返してください。
    `.trim();

    try {
      const response = await axios.post<ClaudeResponse>(
        `${CLAUDE_API_BASE}/messages`,
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      const textContent = response.data.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude API');
      }

      const result = JSON.parse(textContent.text);
      return {
        title: result.title,
        description: result.description,
        sellPotential: result.sellPotential,
        estimatedPrice: result.estimatedPrice,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate theme');
    }
  }

  async generateOutline(input: {
    theme: string;
    researchSummary: string;
    wordCount: number;
  }): Promise<{
    sections: Array<{
      title: string;
      description: string;
      wordCount: number;
    }>;
  }> {
    const prompt = `
以下のテーマとリサーチ内容から、${input.wordCount}文字の記事の詳細な構成を作成してください。

【テーマ】
${input.theme}

【リサーチサマリー】
${input.researchSummary}

【要件】
1. 初心者向けで分かりやすい構成
2. 各セクションは完全で独立している
3. 最初に結論を書く（PREP法）
4. 合計${input.wordCount}文字を目安

【出力形式】
JSON形式で以下を返してください：
{
  "sections": [
    {
      "title": "セクションタイトル",
      "description": "セクションの説明",
      "wordCount": 推定文字数
    },
    ...
  ]
}

JSON以外の説明は不要。JSONのみ返してください。
    `.trim();

    try {
      const response = await axios.post<ClaudeResponse>(
        `${CLAUDE_API_BASE}/messages`,
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      const textContent = response.data.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude API');
      }

      const result = JSON.parse(textContent.text);
      return {
        sections: result.sections,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate outline');
    }
  }

  async generateArticleSection(input: {
    theme: string;
    sectionTitle: string;
    sectionDescription: string;
    researchContent: string;
    wordCount: number;
  }): Promise<string> {
    const prompt = `
以下の指定に従い、記事のセクションを執筆してください。

【テーマ】
${input.theme}

【セクション】
タイトル: ${input.sectionTitle}
説明: ${input.sectionDescription}

【リサーチ内容】
${input.researchContent}

【要件】
1. ${input.wordCount}文字程度
2. Markdown形式
3. 初心者向けで分かりやすい
4. 敬語を使う
5. 具体例を含める
6. 売上につながる内容にする

セクション本文のみ返してください。Markdown見出し（#）は含めないでください。
    `.trim();

    try {
      const response = await axios.post<ClaudeResponse>(
        `${CLAUDE_API_BASE}/messages`,
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      const textContent = response.data.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude API');
      }

      return textContent.text;
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate article section');
    }
  }
}

export default ClaudeAPI.getInstance();

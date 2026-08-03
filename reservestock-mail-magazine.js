// reservestock-mail-magazine.js
// アロマリア メルマガ配信グループ・記事管理モジュール
// ReserveStock（リザスト）API連携
//
// 既存のNode.js自動化システム（~/Desktop/aromaria-mail/）に
// そのまま追加できる形で作成しています。

const RESERVESTOCK_BASE = 'https://www.reservestock.jp/api';

async function parseJsonResponse(response) {
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('json')) {
    throw new Error(`リザストAPIがJSON以外を返しました（${response.status}）。しばらく待ってから再実行してください`);
  }
  return response.json();
}

/**
 * メルマガ配信グループを新規作成する
 *
 * エンドポイント: POST /api/create_mail_magazine
 *
 * @param {Object} params
 * @param {string} params.title - メルマガ（配信グループ）のタイトル（必須）
 * @param {string} [params.description] - 読者登録フォーム説明文（未指定時は管理画面「新規」と同様のテンプレートを自動生成）
 * @param {string} [params.wellComeMailSubject]
 * @param {string} [params.completeMailSubject]
 * @param {string} [params.completeMailBody]
 * @param {string} [params.postMessage]
 * @param {string} [params.wellComeMailContext]
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} 作成された配信グループ情報
 */
async function createMailMagazine(params, apiKey) {
  if (!params || !params.title) {
    throw new Error('title は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const body = {
    title: params.title,
    description: params.description,
    well_come_mail_subject: params.wellComeMailSubject,
    complete_mail_subject: params.completeMailSubject,
    complete_mail_body: params.completeMailBody,
    post_message: params.postMessage,
    well_come_mail_context: params.wellComeMailContext,
  };

  // undefined のキーは送らない（未指定時は管理画面と同様の定型文が自動適用される仕様のため）
  Object.keys(body).forEach((key) => body[key] === undefined && delete body[key]);

  const response = await fetch(`${RESERVESTOCK_BASE}/create_mail_magazine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガ作成に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    stepMailId: data.step_mail.id, // = step_mail_id
    title: data.step_mail.title,
    mailGroupType: data.step_mail.mail_group_type, // "mail_magazine"
    readyStatus: data.step_mail.ready_to_inform_subscribers_status, // "reception"
    publicStatus: data.step_mail.public_status,
    createdAt: data.step_mail.created_at,
    updatedAt: data.step_mail.updated_at,
  };
}

// createMailMagazineArticle の camelCase パラメータ名 → リザストAPIのフィールド名
const ARTICLE_FIELD_MAP = {
  mailMagazineId: 'mail_magazine_id', // 必須。step_mails.id（配信グループID）。記事IDではない
  subject: 'subject', // 必須。件名
  context: 'context', // 必須。本文（テンプレートの本文部分に差し込まれる）
  theme: 'theme', // 色味テンプレート。例: autumn。未指定時は simple
  contentHtmlTextPart: 'content_html_text_part', // HTMLメール時のテキストパート
  publicStatus: 'public_status', // public / private / backnumber。未指定時は public
  fontSize: 'font_size', // 17 / 19 / 21。未指定時は19
  enableEvent: 'enable_event',
  enableSupportEvent: 'enable_support_event',
  enableAssociationEvents: 'enable_association_events',
  enableSharedProject: 'enable_shared_project',
  enableConclusion: 'enable_conclusion',
  enableInquiryForm: 'enable_inquiry_form',
  enableOpenThread: 'enable_open_thread',
  enableGroupReserve: 'enable_group_reserve',
  enableReserve: 'enable_reserve',
  enableShop: 'enable_shop',
  enableAgency: 'enable_agency',
  enableComment: 'enable_comment', // 未指定時 true
  enableTip: 'enable_tip', // 未指定時は決済設定に応じて自動
  enableLine: 'enable_line', // 未指定時はLINE設定に応じて自動
  enableImpressions: 'enable_impressions', // 未指定時 true（APIの別名 enable_impressoins は使わない）
  impressionsLimit: 'impressions_limit', // 1〜30。未指定時は5
  enableSurvey: 'enable_survey',
  surveyLimit: 'survey_limit', // 1〜20。未指定時は4
  enableLike: 'enable_like', // 未指定時 true
};

// 指定可能なありがとうチップ金額（tipPrices で使える値）
const VALID_TIP_PRICES = [200, 300, 500, 888, 1000, 3000, 5000, 8888, 10000, 12000, 15000];

/**
 * メルマガに記事を作成する
 *
 * エンドポイント: POST /api/create_mail_magazine_article
 *
 * 保存API（記事の更新）は本文（main_text）の差し替えのみに対応しており、
 * theme や enable_* 系の変更はできない仕様のため、テンプレート構成は
 * この作成時点で確定させる必要がある。
 *
 * @param {Object} params
 * @param {string} params.mailMagazineId - 配信グループID（createMailMagazine の戻り値 stepMailId）（必須）
 * @param {string} params.subject - 件名（必須）
 * @param {string} params.context - 本文（必須）
 * @param {string} [params.theme] - 色味テンプレート（例: autumn）。GET /api/mail_magazine_themes で一覧取得可能
 * @param {string} [params.contentHtmlTextPart]
 * @param {'public'|'private'|'backnumber'} [params.publicStatus]
 * @param {17|19|21} [params.fontSize]
 * @param {boolean} [params.enableEvent]
 * @param {boolean} [params.enableSupportEvent]
 * @param {boolean} [params.enableAssociationEvents]
 * @param {boolean} [params.enableSharedProject]
 * @param {boolean} [params.enableConclusion]
 * @param {boolean} [params.enableInquiryForm]
 * @param {boolean} [params.enableOpenThread]
 * @param {boolean} [params.enableGroupReserve]
 * @param {boolean} [params.enableReserve]
 * @param {boolean} [params.enableShop]
 * @param {boolean} [params.enableAgency]
 * @param {boolean} [params.enableComment]
 * @param {boolean} [params.enableTip]
 * @param {number[]} [params.tipPrices] - ありがとうチップ金額を4つ（VALID_TIP_PRICES から選択）
 * @param {boolean} [params.enableLine]
 * @param {boolean} [params.enableImpressions]
 * @param {number} [params.impressionsLimit] - 1〜30
 * @param {boolean} [params.enableSurvey]
 * @param {number} [params.surveyLimit] - 1〜20
 * @param {boolean} [params.enableLike]
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} 作成された記事情報
 */
async function createMailMagazineArticle(params, apiKey) {
  if (!params || !params.mailMagazineId) {
    throw new Error('mailMagazineId は必須です');
  }
  if (!params.subject) {
    throw new Error('subject は必須です');
  }
  if (!params.context) {
    throw new Error('context（本文）は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }
  if (params.tipPrices) {
    if (params.tipPrices.length !== 4) {
      throw new Error('tipPrices は4つ指定してください');
    }
    const invalid = params.tipPrices.filter((p) => !VALID_TIP_PRICES.includes(p));
    if (invalid.length > 0) {
      throw new Error(`tipPrices に指定できない金額があります: ${invalid.join(', ')}`);
    }
  }

  const body = {};
  Object.entries(ARTICLE_FIELD_MAP).forEach(([camelKey, snakeKey]) => {
    if (params[camelKey] !== undefined) {
      body[snakeKey] = params[camelKey];
    }
  });
  if (params.tipPrices) {
    body.tip_prices = params.tipPrices.join(',');
  }

  const response = await fetch(`${RESERVESTOCK_BASE}/create_mail_magazine_article`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガ記事作成に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    mailMagazineArticleId: data.mail_magazine_article.id,
    context: data.mail_magazine_article.context, // テンプレート込みの記事本文
    contentHtmlTextPart: data.mail_magazine_article.content_html_text_part,
    status: data.mail_magazine_article.status,
  };
}

/**
 * 配信前のメルマガ記事を保存（更新）する
 *
 * エンドポイント: POST /api/save_mail_magazine_article
 *
 * ⚠️ 配信前の記事だけ保存できる仕様。配信済み記事には使えない。
 * ⚠️ theme や enable_* 系のテンプレート構成はここでは変更できない
 *    （createMailMagazineArticle 作成時点で確定済みのものが維持される）。
 *    変更できるのは subject / context / content_html_text_part / public_status のみ。
 *
 * @param {Object} params
 * @param {string} params.mailMagazineArticleId - メルマガ記事ID（必須）
 * @param {string} [params.subject] - 件名
 * @param {string} [params.context] - 本文（指定した場合はテンプレートの本文部分に差し替え）
 * @param {string} [params.contentHtmlTextPart]
 * @param {'public'|'private'|'backnumber'} [params.publicStatus]
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} 更新後の記事情報
 */
async function saveMailMagazineArticle(params, apiKey) {
  if (!params || !params.mailMagazineArticleId) {
    throw new Error('mailMagazineArticleId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const body = {
    mail_magazine_article_id: params.mailMagazineArticleId,
    subject: params.subject,
    context: params.context,
    content_html_text_part: params.contentHtmlTextPart,
    public_status: params.publicStatus,
  };
  Object.keys(body).forEach((key) => body[key] === undefined && delete body[key]);

  const response = await fetch(`${RESERVESTOCK_BASE}/save_mail_magazine_article`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガ記事保存に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    mailMagazineArticleId: data.mail_magazine_article.id,
    context: data.mail_magazine_article.context,
    status: data.mail_magazine_article.status,
  };
}

// 配信停止・登録解除の案内として一般的な表現（いずれかが本文に含まれているか確認する）
const UNSUBSCRIBE_KEYWORDS = ['登録解除', '配信停止', '配信解除', 'unsubscribe'];

/**
 * メルマガ記事を配信する
 *
 * エンドポイント: POST /api/publish_mail_magazine_article
 *
 * ⚠️ 特定電子メール法対応：本文には読者登録解除リンクが必要（API仕様書に明記）。
 *    未指定のまま配信すると法令違反のおそれがあるため、本文に配信停止関連の
 *    文言が見当たらない場合はデフォルトでエラーにする（skipUnsubscribeCheck: true で回避可能）。
 *
 * @param {Object} params
 * @param {string} params.mailMagazineArticleId - メルマガ記事ID（必須）
 * @param {string} [params.publishTime] - 配信予約時刻（YYYY-MM-DD HH:MM:SS または ISO8601）。未指定時は即時配信
 * @param {string} [params.articleContext] - 配信前の本文チェック用（保有していれば渡す。省略時はチェックをスキップ）
 * @param {boolean} [params.skipUnsubscribeCheck] - 配信停止リンクチェックを無効化する場合はtrue
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} 配信予約された記事情報
 */
async function publishMailMagazineArticle(params, apiKey) {
  if (!params || !params.mailMagazineArticleId) {
    throw new Error('mailMagazineArticleId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }
  if (
    params.articleContext &&
    !params.skipUnsubscribeCheck &&
    !UNSUBSCRIBE_KEYWORDS.some((kw) => params.articleContext.includes(kw))
  ) {
    throw new Error(
      '本文に配信停止（登録解除）の案内が見当たりません。特定電子メール法対応のため、配信停止リンクを本文に含めてください（意図的に省略する場合は skipUnsubscribeCheck: true を指定）'
    );
  }

  const body = {
    mail_magazine_article_id: params.mailMagazineArticleId,
    publish_time: params.publishTime,
  };
  Object.keys(body).forEach((key) => body[key] === undefined && delete body[key]);

  const response = await fetch(`${RESERVESTOCK_BASE}/publish_mail_magazine_article`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガ記事配信に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    mailMagazineArticle: data.mail_magazine_article,
  };
}

/**
 * メルマガ記事を削除する
 *
 * エンドポイント: POST /api/delete_mail_magazine_article
 *
 * @param {string} mailMagazineArticleId - メルマガ記事ID（必須）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} 削除した記事ID
 * @throws {Error} 送信中・配信待ちなど編集ロック中の場合（error_code: mail_magazine_article_locked, 409）
 * @throws {Error} メルマガ配信グループ以外の記事を指定した場合（error_code: invalid_article_for_delete, 422）
 */
async function deleteMailMagazineArticle(mailMagazineArticleId, apiKey) {
  if (!mailMagazineArticleId) {
    throw new Error('mailMagazineArticleId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const response = await fetch(`${RESERVESTOCK_BASE}/delete_mail_magazine_article`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ mail_magazine_article_id: mailMagazineArticleId }),
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガ記事削除に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    deletedMailMagazineArticleId: data.mail_magazine_article_id,
  };
}

/**
 * メルマガ記事をAIで文章校正する（管理画面の「文章校正」ボタンと同じ挙動）
 *
 * エンドポイント: POST /api/proofread_mail_magazine_article
 *
 * ⚠️ OpenAIへの問い合わせを伴うため、レスポンスまで数十秒〜かかる場合がある。
 *    呼び出し側のタイムアウト設定に注意すること。
 * ⚠️ HTMLメール（html_enabled=true）かつテンプレートに <section id="main_text"> がある場合、
 *    その内側の日本語のみが校正対象になる。
 *
 * @param {string} mailMagazineArticleId - メルマガ記事ID（必須）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} 校正結果を反映した記事情報とscope（main_text / full）
 * @throws {Error} 無償プラン契約時（error_code: free_plan_not_supported, 403）
 * @throws {Error} 編集ロック中（error_code: mail_magazine_article_locked, 409）
 * @throws {Error} 本文（context）が空（error_code: article_context_blank, 422）
 * @throws {Error} 同一記事で校正／HTML→テキスト処理が同時実行中（error_code: article_busy, 429）
 * @throws {Error} OpenAI側の通信失敗・空レスポンス（error_code: openai_request_failed / openai_empty_response, 502）
 */
async function proofreadMailMagazineArticle(mailMagazineArticleId, apiKey) {
  if (!mailMagazineArticleId) {
    throw new Error('mailMagazineArticleId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const response = await fetch(`${RESERVESTOCK_BASE}/proofread_mail_magazine_article`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ mail_magazine_article_id: mailMagazineArticleId }),
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガ記事の文章校正に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    scope: data.scope, // "main_text" または "full"
    mailMagazineArticle: data.mail_magazine_article,
  };
}

/**
 * メルマガ記事のHTML本文からテキストメール（プレーンテキスト）パートをAI生成する
 * （管理画面の「HTML➡キャリアメール」ボタンと同じ挙動）
 *
 * エンドポイント: POST /api/generate_text_part_for_mail_magazine_article
 *
 * ⚠️ OpenAIへの問い合わせを伴うため時間がかかる場合がある。
 * ⚠️ OpenAI失敗時はフォールバックせず502を返し、保存もされない
 *    （content_html_text_part は更新前の状態のまま）。
 *
 * @param {string} mailMagazineArticleId - メルマガ記事ID（必須）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} content_html_text_part を反映した記事情報
 * @throws {Error} 編集ロック中（error_code: mail_magazine_article_locked, 409）
 * @throws {Error} 本文（context）が空（error_code: article_context_blank, 422）
 * @throws {Error} 同一記事で校正／HTML→テキスト処理が同時実行中（error_code: article_busy, 429）
 * @throws {Error} OpenAI側の通信失敗（error_code: openai_request_failed, 502）
 */
async function generateTextPartForMailMagazineArticle(mailMagazineArticleId, apiKey) {
  if (!mailMagazineArticleId) {
    throw new Error('mailMagazineArticleId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const response = await fetch(
    `${RESERVESTOCK_BASE}/generate_text_part_for_mail_magazine_article`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ mail_magazine_article_id: mailMagazineArticleId }),
    }
  );

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `テキストメール生成に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    mailMagazineArticle: data.mail_magazine_article,
  };
}

/**
 * メルマガ記事の本文をAI（GPT-4.1-mini）に読ませ、開封率が高くなる件名を1件提案させる
 *
 * エンドポイント: GET /api/suggest_mail_magazine_subject
 *
 * ⚠️ GETリクエスト（他のAPIはPOST）。パラメータはクエリ文字列で渡す。
 * ⚠️ 本文は最大2000文字（マルチバイト文字単位）までしか参照されない。
 * ⚠️ OpenAIへの問い合わせを伴うため、レスポンスまで数秒〜30秒かかることがある。
 *
 * @param {string} mailMagazineArticleId - メルマガ記事ID（必須）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @param {string} [currentSubject] - 現在の件名。指定するとそれより尖ったタイトルを提案する
 * @returns {Promise<Object>} 提案された件名と現在の件名
 * @throws {Error} 無償プラン契約時（error_code: plan_upgrade_required, 403）
 * @throws {Error} 本文（context）が空（error_code: body_empty, 422）
 * @throws {Error} OpenAI側の通信失敗（error_code: ai_error, 503）
 */
async function suggestMailMagazineSubject(mailMagazineArticleId, apiKey, currentSubject) {
  if (!mailMagazineArticleId) {
    throw new Error('mailMagazineArticleId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const query = new URLSearchParams({ mail_magazine_article_id: mailMagazineArticleId });
  if (currentSubject) {
    query.set('current_subject', currentSubject);
  }

  const response = await fetch(
    `${RESERVESTOCK_BASE}/suggest_mail_magazine_subject?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `AIタイトル提案に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    suggestedSubject: data.suggested_subject,
    currentSubject: data.current_subject,
    mailMagazineArticleId: data.mail_magazine_article_id,
  };
}

/**
 * 指定したメルマガ内の記事を件名で検索する（本文は検索対象外）
 *
 * エンドポイント: GET /api/mail_magazine_articles
 *
 * 本文も含めて横断検索したい場合は「メルマガ記事横断検索」の別APIを使うこと（未実装）。
 *
 * @param {string} mailMagazineId - メルマガID（必須）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @param {string} [keyword] - 記事件名の検索キーワード
 * @returns {Promise<Object>} 記事一覧（id, title のみ）
 */
async function searchMailMagazineArticles(mailMagazineId, apiKey, keyword) {
  if (!mailMagazineId) {
    throw new Error('mailMagazineId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const query = new URLSearchParams({ mail_magazine_id: mailMagazineId });
  if (keyword) {
    query.set('keyword', keyword);
  }

  const response = await fetch(`${RESERVESTOCK_BASE}/mail_magazine_articles?${query.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガ記事検索に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    mailMagazineId: data.mail_magazine_id,
    articles: (data.mail_magazine_articles || []).map((a) => ({
      id: a.id,
      title: a.title,
    })),
  };
}

/**
 * 自分のメルマガ（配信グループ）一覧をIDと読者数付きで取得する
 *
 * エンドポイント: GET /api/mail_magazines
 *
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object[]>} メルマガ一覧（id, name, subscribersCount）
 */
async function listMailMagazines(apiKey) {
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const response = await fetch(`${RESERVESTOCK_BASE}/mail_magazines`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガ一覧取得に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return (data.mail_magazines || []).map((m) => ({
    id: m.id,
    name: m.name,
    subscribersCount: m.subscribers_count,
  }));
}

/**
 * メルマガのLP（読者登録フォームの告知文）を取得する（管理画面「LPの編集」と同一データ）
 *
 * エンドポイント: GET /api/mail_magazine_lp
 *
 * @param {string} mailMagazineId - メルマガ配信グループID（必須）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} LP本文HTMLと最終更新日時
 */
async function getMailMagazineLp(mailMagazineId, apiKey) {
  if (!mailMagazineId) {
    throw new Error('mailMagazineId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const query = new URLSearchParams({ mail_magazine_id: mailMagazineId });
  const response = await fetch(`${RESERVESTOCK_BASE}/mail_magazine_lp?${query.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガLP取得に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    mailMagazineId: data.mail_magazine_id,
    description: data.lp.description, // 告知文(LP)本文HTML
    updatedAt: data.lp.updated_at,
  };
}

/**
 * 配信済み（送信完了）のメルマガ記事一覧を、開封率などの統計付きで取得する
 *
 * エンドポイント: GET /api/mail_magazine_sent_articles
 *
 * @param {Object} params
 * @param {string} params.mailMagazineId - メルマガID（必須）
 * @param {string} [params.sentFrom] - 配信日時の開始（ISO8601 または YYYY-MM-DD）
 * @param {string} [params.sentTo] - 配信日時の終了（日付のみの場合はその日の23:59:59まで）
 * @param {number} [params.limit] - 最大件数（既定50、上限100）
 * @param {number} [params.offset] - スキップ件数（既定0。ページングに使用）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} 配信済み記事一覧（新しい配信順）と件数情報
 */
async function listSentMailMagazineArticles(params, apiKey) {
  if (!params || !params.mailMagazineId) {
    throw new Error('mailMagazineId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const query = new URLSearchParams({ mail_magazine_id: params.mailMagazineId });
  if (params.sentFrom) query.set('sent_from', params.sentFrom);
  if (params.sentTo) query.set('sent_to', params.sentTo);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));

  const response = await fetch(
    `${RESERVESTOCK_BASE}/mail_magazine_sent_articles?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `配信済み記事一覧の取得に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    mailMagazineId: data.mail_magazine_id,
    total: data.total,
    limit: data.limit,
    offset: data.offset,
    sentArticles: (data.sent_articles || []).map((a) => ({
      id: a.id,
      title: a.title,
      sentTime: a.sent_time,
      deliveryCount: a.delivery_count,
      openCount: a.open_count,
      openUniqueUsers: a.open_unique_users,
      openRatePercent: a.open_rate_percent,
      likesCount: a.likes_count,
      tipTotalYen: a.tip_total_yen,
    })),
  };
}

/**
 * メルマガ記事を件名・テキスト本文・HTML本文の全てから横断検索する
 * （searchMailMagazineArticles は件名のみが対象。こちらは本文も含む）
 *
 * エンドポイント: GET /api/search_mail_magazine_articles
 *
 * ⚠️ HTML本文にはタグも含めて検索されるため、"<a" のようなHTMLタグの断片で
 *    検索すると意図せずヒットする場合がある。
 * ⚠️ 記事ステータス（下書き／配信中／配信済み）は問わない。
 *
 * @param {string} keyword - 検索キーワード（必須。半角全角・大文字小文字を無視した部分一致）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @param {string} [mailMagazineId] - 指定すると該当メルマガ配下の記事のみに絞り込む
 * @returns {Promise<Object[]>} ヒットした記事一覧（最大100件、更新日時降順）
 * @throws {Error} keyword未指定（error_code: keyword_required, 400）
 */
async function searchMailMagazineArticlesAcross(keyword, apiKey, mailMagazineId) {
  if (!keyword) {
    throw new Error('keyword は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const query = new URLSearchParams({ keyword });
  if (mailMagazineId) {
    query.set('mail_magazine_id', mailMagazineId);
  }

  const response = await fetch(
    `${RESERVESTOCK_BASE}/search_mail_magazine_articles?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `メルマガ記事横断検索に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return (data.mail_magazine_articles || []).map((a) => ({
    id: a.id,
    title: a.title,
  }));
}

/**
 * 自分のステップメール（ステップ配信シナリオ）一覧をIDと読者数付きで取得する
 * （メルマガとは別機能。step_mails はステップメール専用のリソース）
 *
 * エンドポイント: GET /api/step_mails
 *
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object[]>} ステップメール一覧（id, title, subscribersCount）
 */
async function listStepMails(apiKey) {
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const response = await fetch(`${RESERVESTOCK_BASE}/step_mails`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `ステップメール一覧取得に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return (data.step_mails || []).map((s) => ({
    id: s.id,
    title: s.title,
    subscribersCount: s.subscribers_count,
  }));
}

/**
 * ステップメール（配信グループ／シナリオ）を新規作成する
 * （createMailMagazine とほぼ同一仕様。mail_group_type が step_mail になる点が異なる）
 *
 * エンドポイント: POST /api/create_step_mail
 *
 * 「ステップメール記事追加」とは別。こちらはシナリオ自体の新規作成。
 *
 * @param {Object} params
 * @param {string} params.title - ステップメール（配信グループ）のタイトル（必須）
 * @param {string} [params.description]
 * @param {string} [params.wellComeMailSubject]
 * @param {string} [params.completeMailSubject]
 * @param {string} [params.completeMailBody]
 * @param {string} [params.postMessage]
 * @param {string} [params.wellComeMailContext]
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} 作成された配信グループ情報
 * @throws {Error} シナリオ上限超過時（error_code: step_mail_limit_exceeded, 422）
 */
async function createStepMail(params, apiKey) {
  if (!params || !params.title) {
    throw new Error('title は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const body = {
    title: params.title,
    description: params.description,
    well_come_mail_subject: params.wellComeMailSubject,
    complete_mail_subject: params.completeMailSubject,
    complete_mail_body: params.completeMailBody,
    post_message: params.postMessage,
    well_come_mail_context: params.wellComeMailContext,
  };
  Object.keys(body).forEach((key) => body[key] === undefined && delete body[key]);

  const response = await fetch(`${RESERVESTOCK_BASE}/create_step_mail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `ステップメール作成に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    stepMailId: data.step_mail.id,
    mailGroupType: data.step_mail.mail_group_type, // "step_mail"
    readyStatus: data.step_mail.ready_to_inform_subscribers_status,
  };
}

/**
 * ステップメールのLP（読者登録フォームの告知文）を取得する（管理画面「LPの編集」と同一データ）
 *
 * エンドポイント: GET /api/step_mail_lp
 *
 * @param {string} stepMailId - ステップメール配信グループID（必須）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} LP本文HTMLと最終更新日時
 */
async function getStepMailLp(stepMailId, apiKey) {
  if (!stepMailId) {
    throw new Error('stepMailId は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const query = new URLSearchParams({ step_mail_id: stepMailId });
  const response = await fetch(`${RESERVESTOCK_BASE}/step_mail_lp?${query.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `ステップメールLP取得に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    stepMailId: data.step_mail_id,
    description: data.lp.description,
    updatedAt: data.lp.updated_at,
  };
}

/**
 * ステップメールのLP（告知文）を保存・更新する（管理画面のLP保存と同じ検証を実施）
 *
 * エンドポイント: POST /api/update_step_mail_lp
 *
 * ⚠️ サーバー側の検証内容（base64埋め込み画像禁止・サイズ上限・特定外部フォームURL禁止）に加え、
 *    base64埋め込み画像だけはクライアント側でも事前チェックする（明らかな違反を早期に検知するため）。
 *
 * @param {string} stepMailId - ステップメール配信グループID（必須）
 * @param {string} description - 告知文(LP)本文HTML（必須。空文字列で内容クリア）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @returns {Promise<Object>} 保存後のdescriptionとupdated_at
 */
async function updateStepMailLp(stepMailId, description, apiKey) {
  if (!stepMailId) {
    throw new Error('stepMailId は必須です');
  }
  if (description === undefined || description === null) {
    throw new Error('description は必須です（内容をクリアする場合は空文字列を指定）');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }
  if (/data:image\/[a-zA-Z]+;base64,/.test(description)) {
    throw new Error(
      'description にbase64埋め込み画像が含まれています。リザストの仕様上禁止されているため、画像は別途アップロードしてURLで参照してください。'
    );
  }

  const response = await fetch(`${RESERVESTOCK_BASE}/update_step_mail_lp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ step_mail_id: stepMailId, description }),
  });

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `ステップメールLP保存に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return {
    stepMailId: data.step_mail_id,
    description: data.lp.description,
    updatedAt: data.lp.updated_at,
  };
}

/**
 * ステップメール記事をタイトル・テキスト本文・HTML本文から横断検索する
 *
 * エンドポイント: GET /api/search_step_mail_tomes
 *
 * ⚠️ HTML本文にはタグも含めて検索されるため、"<a" のようなHTMLタグの断片で
 *    検索すると意図せずヒットする場合がある。
 *
 * @param {string} keyword - 検索キーワード（必須。半角全角・大文字小文字を無視した部分一致）
 * @param {string} apiKey - リザストAPIキー（rs_live_ で始まる文字列）
 * @param {string} [stepMailId] - 指定すると該当ステップメール配下の記事のみに絞り込む
 * @returns {Promise<Object[]>} ヒットした記事一覧（最大100件、更新日時降順）
 * @throws {Error} keyword未指定（error_code: keyword_required, 400）
 */
async function searchStepMailTomes(keyword, apiKey, stepMailId) {
  if (!keyword) {
    throw new Error('keyword は必須です');
  }
  if (!apiKey) {
    throw new Error('apiKey は必須です');
  }

  const query = new URLSearchParams({ keyword });
  if (stepMailId) {
    query.set('step_mail_id', stepMailId);
  }

  const response = await fetch(
    `${RESERVESTOCK_BASE}/search_step_mail_tomes?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const data = await parseJsonResponse(response);

  if (data.result !== 'success') {
    const err = new Error(
      `ステップメール記事検索に失敗しました: ${data.error_code || '不明なエラー'}`
    );
    err.responseData = data;
    throw err;
  }

  return (data.step_mail_tomes || []).map((t) => ({
    id: t.id,
    title: t.title,
  }));
}

module.exports = {
  createMailMagazine,
  createMailMagazineArticle,
  saveMailMagazineArticle,
  publishMailMagazineArticle,
  deleteMailMagazineArticle,
  proofreadMailMagazineArticle,
  generateTextPartForMailMagazineArticle,
  suggestMailMagazineSubject,
  searchMailMagazineArticles,
  listMailMagazines,
  getMailMagazineLp,
  listSentMailMagazineArticles,
  searchMailMagazineArticlesAcross,
  listStepMails,
  createStepMail,
  getStepMailLp,
  updateStepMailLp,
  searchStepMailTomes,
  VALID_TIP_PRICES,
};

/**
 * 電話対応ソフト ← → Google Drive 共有 の「受け皿」
 *
 * このスクリプトは、あなた自身のGoogleアカウントで実行されます。
 * ・ソフトから送られた申込データを、Driveフォルダ内のスプレッドシートに保存します。
 * ・保存先スプレッドシートが無ければ、初回に自動で作成します。
 * ・APIトークンなどの秘密情報は使いません（このスクリプトのURLだけをソフトに設定します）。
 *
 * 使い方は同フォルダの SETUP.md を参照してください。
 */

// 保存先フォルダ（「超古代PJ事務局・電話対応ソフト」）
var FOLDER_ID = '1pFy2yPycE8hjoqVVtVm1bmN5OyhPGRkl';
// 保存先スプレッドシートのファイル名（無ければ自動作成）
var FILE_NAME = '電話対応ソフト_申込データ';

// 人が読むための列（最後の列に、ソフト復元用の生データJSONを保持）
var HEADERS = [
  'id', '受付日時', '姓', '名', 'せい', 'めい', 'メールアドレス', '携帯電話番号',
  '領収書宛名', '電話申込者', '参加回', '参加方法', '支払方法', '振込予定日',
  'ステータス', '対応者', '備考', '_データ（編集しないでください）'
];

var METHOD_LABEL = {
  venue: '会場参加＋アーカイブ',
  zoom: 'Zoom参加＋アーカイブ',
  archive: 'アーカイブ視聴のみ'
};

function getSheet_() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var it = folder.getFilesByName(FILE_NAME);
  var ss;
  if (it.hasNext()) {
    ss = SpreadsheetApp.open(it.next());
  } else {
    ss = SpreadsheetApp.create(FILE_NAME);
    var file = DriveApp.getFileById(ss.getId());
    folder.addFile(file);
    try { DriveApp.getRootFolder().removeFile(file); } catch (e) {}
  }
  var sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function sessionsLabel_(list) {
  if (!list || !list.length) return '';
  if (list.length === 5) return '全5回';
  return list.map(function (n) { return '第' + n + '回'; }).join('・');
}

function recToRow_(rec) {
  return [
    rec.id || '',
    rec.receivedAt || '',
    rec.sei || '', rec.mei || '',
    rec.furiSei || '', rec.furiMei || '',
    rec.email || '', rec.phone || '',
    (rec.receiptName || ((rec.sei || '') + ' ' + (rec.mei || ''))),
    rec.applicant || '',
    sessionsLabel_(rec.sessions),
    (rec.method ? (METHOD_LABEL[rec.method] || rec.method) : ''),
    rec.payment || '',
    rec.transferDate || '',
    rec.status || '',
    rec.handler || '',
    rec.note || '',
    JSON.stringify(rec)
  ];
}

function rowToRec_(row) {
  var raw = row[HEADERS.length - 1];
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  // 生データが無い場合の最低限の復元
  return { id: row[0], receivedAt: row[1], sei: row[2], mei: row[3],
           furiSei: row[4], furiMei: row[5], email: row[6], phone: row[7],
           receiptName: row[8], applicant: row[9], payment: row[12],
           transferDate: row[13], status: row[14], handler: row[15], note: row[16],
           sessions: [], method: null };
}

// 1件を追加または更新（id単位）
function upsertRecord_(rec) {
  var sh = getSheet_();
  var row = recToRow_(rec);
  var last = sh.getLastRow();
  var found = -1;
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(rec.id)) { found = i + 2; break; }
    }
  }
  if (found > 0) {
    sh.getRange(found, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
}

// ソフトからの保存（POST。httpsで開いた場合に使用）
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var body = JSON.parse(e.postData.contents);
    var rec = body.record;
    if (!rec || !rec.id) return json_({ ok: false, error: 'no record' });
    upsertRecord_(rec);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// GET：action=save の場合は保存、それ以外は一覧返却（JSONP対応）
// ローカルファイル(file://)からはPOSTが弾かれるため、保存もGETで受け取れるようにする
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'save') {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var rec = JSON.parse(e.parameter.record);
      if (!rec || !rec.id) return reply_(e, { ok: false, error: 'no record' });
      upsertRecord_(rec);
      return reply_(e, { ok: true, saved: rec.id });
    } catch (err) {
      return reply_(e, { ok: false, error: String(err) });
    } finally {
      lock.releaseLock();
    }
  }
  var records = [];
  try {
    var sh = getSheet_();
    var values = sh.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === '' && values[i][17] === '') continue;
      records.push(rowToRec_(values[i]));
    }
  } catch (err) {
    return reply_(e, { ok: false, error: String(err) });
  }
  return reply_(e, { ok: true, records: records });
}

function reply_(e, obj) {
  var payload = JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + payload + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * COCC Articles 用：スプレッドシートから「サイトに反映する」を実行する
 *
 * 入れ方は docs/SPREADSHEET_GUIDE.md を見てください。
 * GitHub の鍵（トークン）は、このファイルには書かず、
 * 「スクリプト プロパティ」の GITHUB_TOKEN に入れます。
 */
var GITHUB_OWNER = 'Chigasaki-Outrigger-Canoe-Club';
var GITHUB_REPO = 'github.io';
var WORKFLOW_FILE = 'generate-posts-v4.yml';
var PUBLISH_SHEET = '公開';      // チェックボックスを置くシートの名前
var PUBLISH_CELL = 'B2';         // チェックボックスのセル
var STATUS_CELL = 'B3';          // 結果を書くセル

/** パソコンで開いたとき、メニューに「サイト」を足す（スマホのアプリではメニューは出ません） */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('サイト')
    .addItem('サイトに反映する', 'publishFromMenu')
    .addToUi();
}

function publishFromMenu() {
  var message = runPublish();
  SpreadsheetApp.getUi().alert(message);
}

/** GitHub の「Generate Posts」を動かす */
function runPublish() {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) return 'GitHub の鍵（GITHUB_TOKEN）が登録されていません。';
  var url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO +
            '/actions/workflows/' + WORKFLOW_FILE + '/dispatches';
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ ref: 'main' }),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code === 204) return '反映を始めました。3〜5分ほどでサイトに出ます。';
  return '反映を始められませんでした（' + code + '）。鍵の期限や権限を確かめてください。';
}

/**
 * スマホ用：「公開」シートのチェックボックスにチェックを入れると反映する。
 * この関数は、下の setupMobileTrigger を 1 回実行すると動くようになります。
 */
function onPublishCheckbox(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== PUBLISH_SHEET || e.range.getA1Notation() !== PUBLISH_CELL) return;
  if (String(e.value).toUpperCase() !== 'TRUE') return;
  var message = runPublish();
  var now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
  sheet.getRange(STATUS_CELL).setValue(now + '  ' + message);
  e.range.setValue(false);   // チェックを戻して、次も使えるようにする
}

/** 最初に 1 回だけ実行する：「公開」シートを作り、チェックボックスで動くようにする */
function setupMobileTrigger() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(PUBLISH_SHEET) || ss.insertSheet(PUBLISH_SHEET, 0);
  sheet.getRange('A1').setValue('サイトへの反映');
  sheet.getRange('A2').setValue('ここにチェックを入れると、サイトに反映します →');
  sheet.getRange(PUBLISH_CELL).insertCheckboxes().setValue(false);
  sheet.getRange('A3').setValue('前回の結果');
  sheet.setColumnWidth(1, 360);
  sheet.setColumnWidth(2, 420);
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onPublishCheckbox') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onPublishCheckbox').forSpreadsheet(ss).onEdit().create();
}

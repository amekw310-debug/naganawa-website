# TODO.md — タスク一覧

最終更新: 2026-08-07
凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了 / `[!]` 要ユーザー判断

---

## 進行中・未クローズ

- [~] **GA4 導入確認**
  - [x] 測定ID `G-54DCFCLL2R` がサイト全体で単一であること
  - [x] 全10ページの `<head>` 先頭に gtag.js（TOP/新着一覧/新着詳細/施工実績一覧/
        施工実績詳細/事業内容/ICT/採用/会社情報/お問い合わせ）
  - [x] 重複読込が無い（loader=1 / config=1）
  - [x] 非SPAのため各ページで page_view 送信（`gtag('config',…)`）
  - [!] **実ブラウザで DebugView / Tag Assistant による page_view 実測**
        （ユーザーが Pages URL で確認）
  - [ ] （任意）`test-ga.mjs` をコンテキスト使い回し＋`waitUntil:'load'` で高速化して再実行

- [!] **デバッグ用 `console.log` の削除**（`js/microcms.js`）
  - `[news] category sample:` / `[works] 件数:` / `[works detail] item:`
  - microCMS の実フィールドID・カテゴリ値が確定してから撤去

## バックログ（改善）

- [ ] レガシー資産の整理判断: `scripts/build.mjs`・`templates/`・
      `scripts/microcms.config.mjs`・`scripts/sample-data/`
- [ ] `package.json` の `description` / `build` スクリプトを現行方式（クライアント取得）
      に合わせて更新
- [ ] `contact_confirm.html` に GA を入れるか（対象10ページ外だが要否を確認）
- [ ] 共通ヘッダ/フッタの各HTML直書きと `partials/*.html` の同期維持（手作業）

## 本番反映（ユーザー明示依頼が前提）

- [!] CANONET 本番へ反映する場合のみ `deploy.yml` を手動実行（Actions → Run workflow）
      ※ 依頼が無い限り実行しない

---

## 完了済み（記録）

- [x] お問い合わせフォームのメール不達修正（`-f` エンベロープ送信者・二重エンコード解消）
- [x] 送信元を `naganawa.com@ace.ocn.ne.jp` に統一しフォーム再開
- [x] 本番 `js/microcms.js` 404 復旧（Secrets からデプロイ時注入）
- [x] 新着ページ 旧デザイン表示の修正（CSS `?v=` 不一致）
- [x] 新着 詳細のサムネイル画像（microCMS `thumbnail`）表示
- [x] 施工実績（works）microCMS 連携（一覧・詳細・カテゴリ・Coming Soon）
- [x] 公開日時判定を日本時間・時刻まで厳密化（一覧・詳細とも）
- [x] カテゴリ絞り込みの堅牢化（trim/NFKC/複数カテゴリ/型ゆらぎ吸収）

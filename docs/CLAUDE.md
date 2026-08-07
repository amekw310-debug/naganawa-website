# CLAUDE.md — プロジェクト概要（長縄工務店 新HP）

> このファイルは、Claude（および開発者）がプロジェクト全体を素早く把握するための
> 概要ドキュメントです。細かい経緯は `HANDOVER.md` / `CHANGELOG.md`、
> やること一覧は `TODO.md`、microCMS連携の詳細は `docs/microcms.md` を参照。

---

## 1. これは何か

株式会社 **長縄工務店**（愛知県／土木・舗装・ICT施工）のコーポレートサイト（新HP）。

- **技術構成**: フレームワーク無しの静的HTML / CSS / 素のJavaScript（**非SPA**）。
- **お知らせ・施工実績**: **microCMS**（ヘッドレスCMS）から**ブラウザ側で取得して描画**。
- **お問い合わせフォーム**: **PHP**（本番 CANONET サーバー上で動作）。
- **アクセス解析**: **Google Analytics 4（GA4 / gtag.js）**。

### リポジトリ

- `amekw310-debug/naganawa-website`（**このリポジトリ。開発の正**）
  - 開発ブランチ: `main`
- 参考: 別リポジトリ `amekw310-debug/my-company-site` にも過去のミラーがあるが、
  **現行の正は naganawa-website**。my-company-site 側は旧「ビルド時生成」構成のまま
  取り残されており、内容が乖離している。

---

## 2. デプロイ先（2系統）

| 環境 | URL | ワークフロー | トリガー |
|------|-----|--------------|----------|
| **プレビュー**（GitHub Pages） | https://amekw310-debug.github.io/naganawa-website/ | `.github/workflows/preview-pages.yml` | **main への push で自動** ＋ 手動 ＋ `repository_dispatch(microcms-publish)` |
| **本番**（CANONET / FTP） | https://naganawa-k.co.jp/ | `.github/workflows/deploy.yml` | **手動のみ（workflow_dispatch）**。push トリガーはコメントアウト中 |

> ⚠️ **重要な運用ルール**: 現在は「プレビューで確認しながら仕上げる」フェーズ。
> **本番（CANONET）へは、明示的な依頼があるまでデプロイしない。**
> main への push はプレビュー(GitHub Pages)を更新するだけで、本番には影響しない
> （deploy.yml は手動実行専用のため）。

---

## 3. ページ構成（全10ページ ＋ フォーム関連）

| ページ | ファイル | 内容 |
|--------|----------|------|
| TOP | `index.html` | トップ。最新の新着情報を数件表示 |
| 新着情報 一覧 | `news/index.html` | microCMS `news` 一覧＋カテゴリ絞り込み |
| 新着情報 詳細 | `news/detail.html?id=…` | `news` 1件（サムネイル `thumbnail`／本文リッチテキスト） |
| 施工実績 一覧 | `works/index.html` | microCMS `works` 一覧＋カテゴリ絞り込み |
| 施工実績 詳細 | `works/detail.html?id=…` | `works` 1件（メイン画像・施工写真・工事概要） |
| 事業内容 | `business.html` | 静的 |
| ICT施工・技術力 | `technology.html` | 静的 |
| 採用情報 | `recruit.html` | 静的 |
| 会社情報 | `about.html` | 静的 |
| お問い合わせ | `contact.html` | PHP フォームへ POST |
| （送信完了） | `contact_thanks.html` | フォーム送信後 |
| （送信エラー） | `contact_error.html` | フォームエラー時 |

共通ヘッダー／フッターは各HTMLに直書き（正は `partials/header.html`・`partials/footer.html`）。

---

## 4. microCMS 連携（要点）

詳細は **`docs/microcms.md`**。現行方式は「**クライアント取得 ＋ APIキーのビルド時注入**」。

- **サービスドメイン**: `naganawa-k`（公開情報なので `js/microcms.js` に直書き）
- **エンドポイント**: `news`（新着情報）／`works`（施工実績）
- **共通モジュール**: `js/microcms.js`（IIFE。`window.NaganawaNews` を公開）
  - `initTop` / `initList` / `initDetail` / `initWorksList` / `initWorksDetail` ＋ fetch ヘルパ
- **APIキーの扱い（重要・セキュリティ）**:
  - リポジトリの `js/microcms.js` にはプレースホルダー `__MICROCMS_API_KEY__` のみ。
    **実キーは絶対にコミットしない。**
  - デプロイ時に GitHub Secrets `MICROCMS_API_KEY` を、公開用コピー
    `_site/js/microcms.js` にのみ注入（`scripts/inject-microcms-key.mjs`）。
  - 公開前に microCMS へ実 GET して 200 を確認、プレースホルダー残存を grep 検証。
- **公開日時ゲート**: `isPublished()` が日本時間（Asia/Tokyo）・**時刻まで**判定。
  未来日時の記事は一覧・詳細（URL直アクセス）とも非表示。
- **カテゴリ絞り込み**: `extractCategories`＋`normCat`（trim＋NFKC）＋`categoryMatches`
  （複数カテゴリは「いずれか一致」）。文字列／配列／オブジェクトのどの形でも吸収。
- **空状態**: 施工実績が全0件→「Coming Soon」カード×3／カテゴリ0件→
  「該当する施工実績はありません。」／新着カテゴリ0件→「該当する記事はありません。」

---

## 5. Google Analytics（GA4）

- **測定ID**: `G-54DCFCLL2R`（サイト全体で単一）
- gtag.js スニペットを**全10ページの `<head>` 先頭**に設置。重複読込なし。
- 非SPAのため、各ページの全読込ごとに `gtag('config', …)` が page_view を送信。
- 静的監査は合格済み。実ブラウザでの DebugView/Tag Assistant 確認はユーザー側で実施。

---

## 6. お問い合わせフォーム（PHP）

- `contact.html` → `contact_mail.php`（`config.php` を読込）。CANONET 上で動作。
- 送信先／送信元（Return-Path）: **`naganawa.com@ace.ocn.ne.jp`**
  - `mb_send_mail` の第5引数に **`-f{$mailfrom}`**（エンベロープ送信者）を指定し、
    From ドメインと Return-Path を一致させて OCN での不達を回避。
- Reply-To: 管理者宛メール＝フォーム入力者／自動返信メール＝会社。
- `$form_suspended = false`（フォームは稼働中）。
- ⚠️ **メール設定ファイル（`config.php` / `contact_mail.php`）は、依頼が無い限り変更しない。**

---

## 7. GitHub Actions ワークフロー一覧

| ファイル | 役割 | トリガー |
|----------|------|----------|
| `preview-pages.yml` | GitHub Pages プレビュー配信（キー注入＋検証） | push(main) / 手動 / repository_dispatch |
| `deploy.yml` | 本番 CANONET へ FTP デプロイ（キー注入＋FTP＋検証） | **手動のみ** |
| `diagnose-form.yml` | 本番フォームの疎通診断（curl） | 手動 |
| `form-test-deploy.yml` | `/htdocs/form-test/` へフォーム一式を配置 | 手動 |
| `preview-shot.yml` | プレビューの Playwright スクショ | 手動 |

### GitHub Secrets（必要）
`MICROCMS_API_KEY`, `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`

---

## 8. ディレクトリ構成（抜粋）

```
naganawa-website/
├── index.html / about.html / business.html / technology.html / recruit.html
├── contact.html / contact_thanks.html / contact_error.html
├── contact_mail.php / config.php        # PHPフォーム（本番のみ動作）
├── news/     index.html, detail.html
├── works/    index.html, detail.html
├── js/microcms.js                       # 共通: microCMS取得＆描画（NaganawaNews）
├── assets/components.css                # 施工実績・お知らせ用コンポーネントCSS
├── style.css                            # サイト全体CSS
├── partials/ header.html, footer.html   # 共通ヘッダ/フッタの「正」
├── images/
├── scripts/
│   ├── inject-microcms-key.mjs          # ★現行: デプロイ時のキー注入
│   ├── build.mjs / microcms.config.mjs / sample-data/   # ▲レガシー(旧ビルド時生成)
├── templates/*.html                     # ▲レガシー(旧ビルド時生成の雛形)
├── docs/  CLAUDE.md / HANDOVER.md / TODO.md / CHANGELOG.md / microcms.md
└── .github/workflows/*.yml
```

> ▲**レガシー**: `scripts/build.mjs`・`templates/`・`microcms.config.mjs` は旧「microCMS→
> 静的HTML生成」方式の名残り。現行のプレビュー配信では `preview-pages.yml` が
> これらを**除外**しており使用していない（`package.json` の説明文も旧方式のまま）。
> 撤去可否は `TODO.md` 参照。

---

## 9. ローカル確認のヒント

- 静的HTMLはローカルHTTPサーバーで確認可能。ただしサンドボックスからは
  `*.microcms.io` / `googletagmanager.com` へ到達できないため、実データ・GA送信の
  最終確認は GitHub Pages プレビュー上（実ブラウザ）で行う。
- 検証には `scratchpad/test-*.mjs`（Playwright ヘッドレス）を使用。外部ホストは
  `ctx.route` でスタブする。

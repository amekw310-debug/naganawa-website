# microCMS 連携（新着情報 / 施工実績）

新着情報（news）と施工実績（works）を microCMS で管理し、
GitHub Actions で静的HTML（`news/*.html`, `works/*.html`）を
生成して GitHub Pages プレビューへ公開します。

APIキーはブラウザに出しません。取得〜生成はすべてビルド時
（GitHub Actions 上）で行い、公開されるのは生成後の静的HTMLだけです。

---

## 1. 仕組み（全体像）

```
microCMS ──(ビルド時に取得)── GitHub Actions ──(生成)── 静的HTML ── GitHub Pages
```

- 生成スクリプト: `scripts/build.mjs`
- 設定（フィールドID・カテゴリー）: `scripts/microcms.config.mjs` ← 調整はここ1か所
- テンプレート（デザイン雛形）: `templates/*.html`
- ワークフロー: `.github/workflows/preview-pages.yml`

生成されるファイル:

| 種別 | 一覧 | 詳細 |
|------|------|------|
| 新着情報 | `news/index.html` | `news/<コンテンツID>.html` |
| 施工実績 | `works/index.html` | `works/<コンテンツID>.html` |

一覧は公開日の新しい順に並び、カテゴリー絞り込み（ボタン）は
クライアント側のJSで動作します（APIキー不要）。

---

## 2. 事前準備（microCMS 側）

### API（エンドポイント）
- `news`（新着情報） … リスト形式
- `works`（施工実績） … リスト形式

名前が異なる場合は `scripts/microcms.config.mjs` の `ENDPOINTS`、
または環境変数 `MICROCMS_NEWS_ENDPOINT` / `MICROCMS_WORKS_ENDPOINT` で変更します。

### フィールドID（★実スキーマに合わせて必ず確認）
`scripts/microcms.config.mjs` の `FIELDS` に想定値を入れています。
**実際の microCMS のフィールドIDと一致しているか確認してください。**
違う場合はこのファイルの値を実際のIDへ直すだけでOKです（他は触らなくて大丈夫）。

想定している主なフィールド:

- news: `title`（タイトル） / `content`（本文・リッチエディタ） /
  `category`（カテゴリー） / `publishDate`（公開日） / `description`（任意）
- works: `title`（工事名） / `content`（工事内容） / `category`（工事種別） /
  `workDate`（完成年月） / `mainImage`（メイン画像） / `thumbnail`（一覧サムネ・任意） /
  `gallery`（施工写真＝画像の繰り返しフィールド） / `place`（施工場所・任意）

> 未設定・IDが違うフィールドは「空欄」として安全にスキップされ、
> ページやサイトが壊れることはありません。

### カテゴリー表記
`scripts/microcms.config.mjs` の `NEWS_CATEGORY_CLASS` / `WORKS_CATEGORY_CLASS`
のキー（＝microCMS上のカテゴリー表示名）を実際の名称に合わせてください。

- 新着情報: お知らせ / 採用情報 / 会社情報 / その他
- 施工実績: 舗装工事 / 土木工事 / その他

`category` は **select**（文字列/配列）でも **コンテンツ参照**（オブジェクト）でも
自動で表示名を取り出せるようにしています。想定外の値は「その他」になります。

---

## 3. GitHub 側の設定（Secrets）

リポジトリの **Settings → Secrets and variables → Actions** で登録します:

| Secret 名 | 内容 |
|-----------|------|
| `MICROCMS_SERVICE_ID` | サービスID（`https://<これ>.microcms.io`） |
| `MICROCMS_API_KEY` | 読み取り用 APIキー（GET権限） |

- **未登録のうちは**ビルドは生成をスキップし、リポジトリ内の静的HTML
  （現状の暫定ページ）をそのまま公開します。→ プレビューは止まりません。
- 登録後、`main` への push か手動実行で microCMS の内容が反映されます。

---

## 4. 公開（更新）される流れ

`.github/workflows/preview-pages.yml` が以下のいずれかで起動します:

1. `main` へ push
2. Actions タブ → **Run workflow**（手動）
3. microCMS の Webhook（下記）

### microCMS Webhook で自動更新（任意）
記事を公開/更新したら自動で再生成したい場合:

1. GitHub で **repository_dispatch** を叩くための Fine-grained PAT を用意
   （このリポジトリの "Contents: read/write" 権限で可）。
2. microCMS の各API → **Webhook → カスタム通知** で、以下へ POST 設定:
   - URL: `https://api.github.com/repos/<owner>/naganawa-website/dispatches`
   - Header: `Authorization: Bearer <PAT>`, `Accept: application/vnd.github+json`
   - Body: `{"event_type":"microcms-publish"}`

> PAT を microCMS 側に置くのが難しい場合は、当面は「push / 手動実行」での
> 更新でも運用できます。

---

## 5. 安全設計（サイトを壊さない）

- **APIキー未設定** → 生成スキップ・正常終了（既存の静的HTMLを維持）
- **取得エラー（HTTPエラー等）** → ビルドを失敗終了。デプロイは走らないため、
  **直前に公開済みのサイトはそのまま**残ります。
- APIキーはログに出力しません（エラー時もHTTPステータスのみ表示）。

---

## 6. ローカルで動作確認

APIキーが無くても、サンプルデータで生成結果を確認できます:

```bash
# サンプルデータで news/works を生成（scripts/sample-data を使用）
npm run build:sample
# → news/index.html, news/<id>.html, works/index.html, works/<id>.html が生成されます

# 本番（要 環境変数）
MICROCMS_SERVICE_ID=xxxx MICROCMS_API_KEY=xxxx npm run build

# 出力先を変えたいとき（例: _site）
OUT_DIR=_site npm run build:sample
```

> `npm run build:sample` はリポジトリ直下の `news/` `works/` を上書きします。
> 確認後は `git checkout -- news works` などで元に戻すか、`OUT_DIR` で別フォルダへ
> 出力してください。

---

## 7. 見た目（デザイン）を変えたいとき

一覧・詳細の枠組みは `templates/*.html` です。ヘッダー/フッターを他ページで
変更した場合は、これらのテンプレートにも同じ変更を反映してください
（生成HTMLはテンプレートのヘッダー/フッターを使います）。
カード内やお知らせ行の細かなHTMLは `scripts/build.mjs` 内の生成部分にあります。

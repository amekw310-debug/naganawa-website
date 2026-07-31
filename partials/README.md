# partials/ — 共通パーツ（ヘッダー・フッター）の正本

このフォルダは、全ページで共通しているヘッダー／フッターの
**「正（マスター）」＝修正を集約する場所** です。

現在のサイトはビルド工程のない静的HTMLのため、実際の各ページには
ヘッダー／フッターのHTMLが**そのまま複製**されています。
共通部分を直すときは、まずここを直し、次に各ページへ反映する運用にします。

## ファイル

| ファイル | 役割 |
|---|---|
| `header.html` | 共通ヘッダーの正本（ロゴ＋PCナビ＋モバイルナビ） |
| `footer.html` | 共通フッターの正本（SNS＋フッターナビ＋著作権表記） |

## 各ページ側の対応ブロック

各HTMLには、貼り付け先を示すコメントマーカーがあります。

```html
<!-- 共通ヘッダー START -->
   …（partials/header.html の内容）…
<!-- 共通ヘッダー END -->

<!-- 共通フッター START -->
   …（partials/footer.html の内容）…
<!-- 共通フッター END -->
```

## 修正のしかた（手順）

1. `partials/header.html` または `partials/footer.html` を編集する。
2. 各ページの `START 〜 END` ブロックへ内容を反映する。
3. 下記「パスのルール」「現在地の強調」を、ページごとに調整する。

## パスのルール（重要）

- **ルート直下のページ**（`index.html` / `about.html` / `business.html` /
  `technology.html` / `recruit.html` / `contact.html`）
  → partials の記述を**そのまま**使う（プレフィックス無し）。
- **サブフォルダ配下のページ**（`news/` / `works/`）
  → `href` / `src` の先頭に `../` を付ける。
  （同フォルダ内リンクは `../` 無しの `index.html`）

例：
```
ルート : <a href="works/index.html">施工実績</a>
news/  : <a href="../works/index.html">施工実績</a>
works/ : <a href="index.html">施工実績</a>   ← 同フォルダ
```

## 現在地の強調（nav-active）

そのページに対応するナビ項目へ `class="nav-active"` を付けます。

```
施工実績ページ : <a href="index.html" class="nav-active">施工実績</a>
```

## ナビ項目の並び順（全ページ統一）

```
TOP / 新着情報 / 事業内容 / 施工実績 / ICT施工・技術力 / 採用情報 / 会社情報 / お問い合わせ
```

## 将来（microCMS 連携・本番化のとき）

- この複製運用は、次のいずれかで**本当の一元化**に置き換えられます。
  - サーバーの SSI（`<!--#include -->`）
  - ビルドツール（部分テンプレートのインクルード）
  - JSでの読み込み（`fetch` して `START〜END` に差し込む）
  - microCMS 等のヘッドレスCMS／テンプレートエンジン
- どの方式でも「正本＝partials/」という考え方はそのまま使えます。

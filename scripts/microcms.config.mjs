// ============================================================
//  microCMS 連携設定（ここ1か所だけで調整できます）
// ------------------------------------------------------------
//  ★重要★ フィールドID・カテゴリーの表記は、実際の microCMS の
//  スキーマに合わせて必ず確認・修正してください。
//  下記は「想定値」をデフォルトとして置いています。実スキーマと
//  違う場合、その項目は空欄として安全にスキップされます
//  （サイトは壊れません）。差異があればこのファイルだけ直せばOKです。
// ============================================================

// --- サービス情報（GitHub Secrets / 環境変数から注入）--------
//   MICROCMS_SERVICE_ID … 例: naganawa（ https://<これ>.microcms.io ）
//   MICROCMS_API_KEY    … 読み取り用 APIキー（GET権限）
export const SERVICE_ID = process.env.MICROCMS_SERVICE_ID || '';
export const API_KEY = process.env.MICROCMS_API_KEY || '';

// --- APIエンドポイント名（microCMSの「API」ID）---------------
export const ENDPOINTS = {
  news: process.env.MICROCMS_NEWS_ENDPOINT || 'news',
  works: process.env.MICROCMS_WORKS_ENDPOINT || 'works',
};

// --- フィールドID対応表（★実スキーマに合わせて要確認）-------
export const FIELDS = {
  news: {
    title: 'title',          // タイトル
    body: 'content',         // 本文（リッチエディタ / HTML）
    category: 'category',    // カテゴリー（selectでもコンテンツ参照でも可）
    date: 'publishDate',     // 公開日（無ければ microCMS の publishedAt を使用）
    description: 'description', // メタ説明（任意。無ければ本文先頭から自動生成）
  },
  works: {
    title: 'title',          // 工事名
    body: 'content',         // 工事内容（リッチエディタ / HTML）
    category: 'category',    // 工事種別
    date: 'workDate',        // 完成年月（無ければ publishedAt を使用）
    mainImage: 'mainImage',  // メイン画像
    thumbnail: 'thumbnail',  // 一覧サムネ（無ければ mainImage を使用）
    gallery: 'gallery',      // 施工写真（画像の繰り返しフィールド）
    place: 'place',          // 施工場所（任意）
    description: 'description', // メタ説明（任意）
  },
};

// --- カテゴリー表記 → タグ色クラス（★実カテゴリー名に合わせる）
//   キー = microCMS 上のカテゴリー表示名 / 値 = 一覧カードのクラス
//   （詳細ページ用クラスは work-card__category → work-detail__category
//    へ自動変換します）
export const NEWS_CATEGORY_CLASS = {
  'お知らせ': 'news-tag--info',
  '採用情報': 'news-tag--recruit',
  '会社情報': 'news-tag--company',
  'その他': 'news-tag--other',
};
export const WORKS_CATEGORY_CLASS = {
  '舗装工事': 'work-card__category--paving',
  '土木工事': 'work-card__category--civil',
  'その他': 'work-card__category--other',
};

// --- 絞り込みボタンに並べるカテゴリー（表示順）----------------
export const NEWS_FILTERS = ['お知らせ', '採用情報', '会社情報', 'その他'];
export const WORKS_FILTERS = ['舗装工事', '土木工事', 'その他'];

// カテゴリー未設定 / 未知の値のときのフォールバック
export const NEWS_FALLBACK_CATEGORY = 'その他';
export const WORKS_FALLBACK_CATEGORY = 'その他';

// トップページに出す新着お知らせの最大件数（将来利用・現状未使用）
export const TOP_NEWS_LIMIT = 3;

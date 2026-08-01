// ============================================================
//  microCMS → 静的HTML 生成スクリプト
// ------------------------------------------------------------
//  ・news / works を microCMS から取得し、テンプレートへ流し込んで
//    news/index.html, news/<id>.html, works/index.html,
//    works/<id>.html を生成します。
//  ・APIキー未設定時 … 生成をスキップ（既存の静的HTMLを維持）→ 正常終了
//  ・取得失敗時       … 非ゼロ終了（＝デプロイさせない。公開中サイトは無傷）
//  ・サンプルモード   … MICROCMS_SAMPLE=1 で scripts/sample-data を使用
//
//  使い方:
//    node scripts/build.mjs                # 本番（要 環境変数）
//    MICROCMS_SAMPLE=1 node scripts/build.mjs   # サンプルで動作確認
//    OUT_DIR=_site node scripts/build.mjs  # 出力先を変更（既定=リポジトリ直下）
// ============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  SERVICE_ID, API_KEY, ENDPOINTS, FIELDS,
  NEWS_CATEGORY_CLASS, WORKS_CATEGORY_CLASS,
  NEWS_FILTERS, WORKS_FILTERS,
  NEWS_FALLBACK_CATEGORY, WORKS_FALLBACK_CATEGORY,
} from './microcms.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const TPL_DIR = join(REPO_ROOT, 'templates');
const OUT_ROOT = process.env.OUT_DIR ? resolve(process.env.OUT_DIR) : REPO_ROOT;
const SAMPLE = process.env.MICROCMS_SAMPLE === '1' || process.argv.includes('--sample');

// ---------- 小さなユーティリティ ----------
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const stripTags = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const log = (...a) => console.log('[microcms]', ...a);

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDot(v) {
  const d = parseDate(v);
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}
function fmtJp(v) {
  const d = parseDate(v);
  if (!d) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

// microCMS のカテゴリー値（select配列 / 参照オブジェクト / 文字列）を
// 表示名（文字列）に解決する。想定外の形でも落とさない。
function resolveCategory(val) {
  if (val == null) return '';
  if (Array.isArray(val)) return resolveCategory(val[0]);
  if (typeof val === 'object') {
    for (const k of ['name', 'category', 'label', 'title', 'value']) {
      if (typeof val[k] === 'string' && val[k]) return val[k];
    }
    // 参照コンテンツで上記が無い場合は最初の文字列値
    const s = Object.values(val).find((x) => typeof x === 'string' && x);
    return s || '';
  }
  return String(val);
}

// microCMS の画像フィールド（{url} / 文字列）→ URL文字列
function imgUrl(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && typeof val.url === 'string') return val.url;
  return '';
}
// 施工写真の繰り返しフィールド → URL配列（要素が {url} でも {image:{url}} でも可）
function galleryUrls(val) {
  if (!Array.isArray(val)) {
    const u = imgUrl(val);
    return u ? [u] : [];
  }
  return val.map((item) => {
    let u = imgUrl(item);
    if (u) return u;
    if (item && typeof item === 'object') {
      for (const v of Object.values(item)) {
        u = imgUrl(v);
        if (u) return u;
      }
    }
    return '';
  }).filter(Boolean);
}

function fill(tpl, map) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in map ? map[k] : ''));
}

// ---------- データ取得 ----------
async function fetchAll(endpoint) {
  const base = `https://${SERVICE_ID}.microcms.io/api/v1/${endpoint}`;
  const limit = 100;
  let offset = 0;
  const all = [];
  // 無限ループ防止の上限（1000件）
  while (offset < 1000) {
    const url = `${base}?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': API_KEY } });
    if (!res.ok) {
      // ステータスのみ記載（キー等の機微情報は出さない）
      throw new Error(`microCMS 取得失敗: ${endpoint} -> HTTP ${res.status}`);
    }
    const json = await res.json();
    const contents = json.contents || [];
    all.push(...contents);
    const total = typeof json.totalCount === 'number' ? json.totalCount : all.length;
    if (all.length >= total || contents.length === 0) break;
    offset += limit;
  }
  return all;
}

async function loadContents(kind) {
  const endpoint = ENDPOINTS[kind];
  if (SAMPLE) {
    const dir = process.env.SAMPLE_DIR ? resolve(process.env.SAMPLE_DIR) : join(__dirname, 'sample-data');
    const p = join(dir, `${kind}.json`);
    const json = JSON.parse(await readFile(p, 'utf8'));
    return json.contents || [];
  }
  return fetchAll(endpoint);
}

// ---------- 生成: フィルターボタン ----------
function filterButtons(categories) {
  const all = '<button class="works-filter__item is-active" type="button" data-filter="">すべて</button>';
  const rest = categories.map(
    (c) => `<button class="works-filter__item" type="button" data-filter="${esc(c)}">${esc(c)}</button>`
  ).join('\n        ');
  return `${all}\n        ${rest}`;
}

// ---------- 生成: 新着情報 ----------
function buildNews(items, tplList, tplDetail) {
  const F = FIELDS.news;
  const rows = items.map((it) => {
    const rawCat = resolveCategory(it[F.category]);
    const cat = NEWS_CATEGORY_CLASS[rawCat] ? rawCat : NEWS_FALLBACK_CATEGORY;
    const tagClass = NEWS_CATEGORY_CLASS[cat] || NEWS_CATEGORY_CLASS[NEWS_FALLBACK_CATEGORY];
    const dateRaw = it[F.date] || it.publishedAt || it.createdAt;
    return {
      id: it.id,
      title: it[F.title] || '（無題）',
      body: it[F.body] || '',
      description: it[F.description] || stripTags(it[F.body]).slice(0, 110),
      catLabel: cat,
      tagClass,
      dateRaw,
      dateDot: fmtDot(dateRaw),
    };
  }).sort((a, b) => new Date(b.dateRaw || 0) - new Date(a.dateRaw || 0));

  // 一覧
  let listItems;
  if (rows.length === 0) {
    listItems = '<li class="news-empty">現在、お知らせはありません。</li>';
  } else {
    listItems = rows.map((r) => (
      `<li class="news-item" data-category="${esc(r.catLabel)}">\n` +
      `          <span class="news-date">${esc(r.dateDot)}</span>\n` +
      `          <span class="news-tag ${r.tagClass}">${esc(r.catLabel)}</span>\n` +
      `          <a href="${esc(r.id)}.html" class="news-title">${esc(r.title)}</a>\n` +
      `        </li>`
    )).join('\n        ');
  }
  const listHtml = fill(tplList, {
    FILTER_BUTTONS: filterButtons(NEWS_FILTERS),
    NEWS_ITEMS: listItems,
  });

  // 詳細
  const details = rows.map((r) => ({
    path: `news/${r.id}.html`,
    html: fill(tplDetail, {
      TITLE: esc(r.title),
      DESCRIPTION: esc(r.description),
      DATE: esc(r.dateDot),
      TAG_CLASS: r.tagClass,
      CAT_LABEL: esc(r.catLabel),
      BODY_HTML: r.body, // リッチエディタHTMLをそのまま
    }),
  }));

  return { listHtml, details, count: rows.length };
}

// ---------- 生成: 施工実績 ----------
function comingSoonCards() {
  const one = (
    '<div class="work-card work-card--coming" aria-disabled="true">\n' +
    '          <div class="work-card__image work-card__image--placeholder">\n' +
    '            <span class="work-card__coming">Coming Soon</span>\n' +
    '          </div>\n' +
    '          <div class="work-card__body">\n' +
    '            <span class="work-card__category">施工実績</span>\n' +
    '            <h3 class="work-card__title">施工実績を準備中です</h3>\n' +
    '            <p class="work-card__date">掲載準備中</p>\n' +
    '          </div>\n' +
    '        </div>'
  );
  return [one, one, one].join('\n        ');
}

function buildWorks(items, tplList, tplDetail) {
  const F = FIELDS.works;
  const rows = items.map((it) => {
    const rawCat = resolveCategory(it[F.category]);
    const cat = WORKS_CATEGORY_CLASS[rawCat] ? rawCat : WORKS_FALLBACK_CATEGORY;
    const cardClass = WORKS_CATEGORY_CLASS[cat] || WORKS_CATEGORY_CLASS[WORKS_FALLBACK_CATEGORY];
    const detailClass = cardClass.replace('work-card__category', 'work-detail__category');
    const dateRaw = it[F.date] || it.publishedAt || it.createdAt;
    const main = imgUrl(it[F.mainImage]);
    const thumb = imgUrl(it[F.thumbnail]) || main;
    return {
      id: it.id,
      title: it[F.title] || '（無題）',
      body: it[F.body] || '',
      description: it[F.description] || stripTags(it[F.body]).slice(0, 110),
      catLabel: cat,
      cardClass,
      detailClass,
      place: it[F.place] || '',
      dateRaw,
      dateJp: fmtJp(dateRaw),
      main,
      thumb,
      gallery: galleryUrls(it[F.gallery]),
    };
  }).sort((a, b) => new Date(b.dateRaw || 0) - new Date(a.dateRaw || 0));

  // 一覧
  let gridItems;
  if (rows.length === 0) {
    // データ未受領/0件時は Coming Soon プレースホルダー
    gridItems = comingSoonCards();
  } else {
    gridItems = rows.map((r) => {
      const image = r.thumb
        ? `<div class="work-card__image"><img src="${esc(r.thumb)}" alt="${esc(r.title)}"></div>`
        : '<div class="work-card__image work-card__image--placeholder"></div>';
      return (
        `<a class="work-card" href="${esc(r.id)}.html" data-category="${esc(r.catLabel)}">\n` +
        `          ${image}\n` +
        `          <div class="work-card__body">\n` +
        `            <span class="work-card__category ${r.cardClass}">${esc(r.catLabel)}</span>\n` +
        `            <h3 class="work-card__title">${esc(r.title)}</h3>\n` +
        `            <p class="work-card__date">${esc(r.dateJp)}</p>\n` +
        `          </div>\n` +
        `        </a>`
      );
    }).join('\n        ');
  }
  const listHtml = fill(tplList, {
    FILTER_BUTTONS: filterButtons(WORKS_FILTERS),
    WORKS_ITEMS: gridItems,
  });

  // 詳細
  const details = rows.map((r) => {
    const metaItems = [
      `<li class="work-detail__meta-item"><span class="work-detail__meta-label">工事種別</span><span class="work-detail__meta-value">${esc(r.catLabel)}</span></li>`,
      r.place ? `<li class="work-detail__meta-item"><span class="work-detail__meta-label">施工場所</span><span class="work-detail__meta-value">${esc(r.place)}</span></li>` : '',
      r.dateJp ? `<li class="work-detail__meta-item"><span class="work-detail__meta-label">完成年月</span><span class="work-detail__meta-value">${esc(r.dateJp)}</span></li>` : '',
    ].filter(Boolean).join('\n          ');

    let gallerySection = '';
    if (r.gallery.length) {
      const figs = r.gallery.map((u, i) =>
        `<figure class="work-detail__gallery-item"><img src="${esc(u)}" alt="施工写真${i + 1}"></figure>`
      ).join('\n          ');
      gallerySection =
        '<h2 class="work-detail__section-title">施工写真</h2>\n' +
        '        <div class="work-detail__gallery">\n          ' + figs + '\n        </div>';
    }

    return {
      path: `works/${r.id}.html`,
      html: fill(tplDetail, {
        TITLE: esc(r.title),
        DESCRIPTION: esc(r.description),
        CAT_CLASS: r.detailClass,
        CAT_LABEL: esc(r.catLabel),
        MAIN_IMAGE: esc(r.main),
        META_ITEMS: metaItems,
        CONTENT_HTML: r.body,
        GALLERY_SECTION: gallerySection,
      }),
    };
  });

  return { listHtml, details, count: rows.length };
}

// ---------- 書き出し ----------
async function writeOut(rel, html) {
  const abs = join(OUT_ROOT, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, html, 'utf8');
  log('生成:', rel);
}

// ---------- メイン ----------
async function main() {
  if (!SAMPLE) {
    if (!API_KEY || !SERVICE_ID) {
      log('MICROCMS_API_KEY / MICROCMS_SERVICE_ID が未設定のため、microCMS生成をスキップします（既存の静的HTMLを維持）。');
      return; // 正常終了（公開サイトはそのまま）
    }
    log(`microCMS から取得します（service: ${SERVICE_ID}）`);
  } else {
    log('サンプルデータで生成します（scripts/sample-data）');
  }

  const [newsTplList, newsTplDetail, worksTplList, worksTplDetail] = await Promise.all([
    readFile(join(TPL_DIR, 'news-list.html'), 'utf8'),
    readFile(join(TPL_DIR, 'news-detail.html'), 'utf8'),
    readFile(join(TPL_DIR, 'works-list.html'), 'utf8'),
    readFile(join(TPL_DIR, 'works-detail.html'), 'utf8'),
  ]);

  const [newsRaw, worksRaw] = await Promise.all([
    loadContents('news'),
    loadContents('works'),
  ]);
  log(`取得件数 — news: ${newsRaw.length} / works: ${worksRaw.length}`);

  const news = buildNews(newsRaw, newsTplList, newsTplDetail);
  const works = buildWorks(worksRaw, worksTplList, worksTplDetail);

  await writeOut('news/index.html', news.listHtml);
  for (const d of news.details) await writeOut(d.path, d.html);
  await writeOut('works/index.html', works.listHtml);
  for (const d of works.details) await writeOut(d.path, d.html);

  log(`完了 — news ${news.count}件 / works ${works.count}件 を生成しました。`);
}

main().catch((err) => {
  console.error('[microcms] エラー:', err.message);
  process.exit(1); // 非ゼロ終了 → Actionを失敗させ、デプロイを止める
});

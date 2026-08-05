/* ============================================================
 *  microCMS 連携（トップ / 新着情報一覧 / 詳細で共通利用）
 *  ------------------------------------------------------------
 *  ★設定はこのファイル1か所に集約しています（全ページ共通）。
 *   APIエンドポイント・サービスドメイン・APIキー・取得処理は
 *   すべてここを参照します。変更はここだけ直せばOKです。
 * ============================================================ */
(function (global) {
  'use strict';

  /* ── 接続設定（★実際の値に合わせてください）────────────────
   *  SERVICE_DOMAIN … 管理画面URL https://<これ>.microcms.io の <これ>
   *                   ※値が違うと取得できません。まずここを確認。
   *  API_KEY        … GET（参照）専用のAPIキー。
   *                   ★実値はリポジトリにコミットしません。
   *                   下のプレースホルダー __MICROCMS_API_KEY__ は、
   *                   GitHub Actions がデプロイ時に Secrets の
   *                   MICROCMS_API_KEY から差し込みます
   *                   （.github/workflows/preview-pages.yml 参照）。
   *                   ※クライアント配信のため、公開後のJSからは閲覧可能に
   *                     なります。必ず GET 専用キーにしてください。
   *  NEWS_ENDPOINT  … microCMS の「API」ID（エンドポイント名）。
   * ------------------------------------------------------------ */
  var SERVICE_DOMAIN = 'naganawa-k'; // ← あなたのサービスドメイン（公開情報）
  var API_KEY        = '__MICROCMS_API_KEY__'; // ← デプロイ時にSecretsから注入（実値はコミットしない）
  var NEWS_ENDPOINT  = 'news';

  var API_BASE = 'https://' + SERVICE_DOMAIN + '.microcms.io/api/v1/';

  /* カテゴリー表示名 → タグ色クラス（既存デザインのクラスに対応） */
  var CATEGORY_CLASS = {
    'お知らせ': 'news-tag--info',
    '採用情報': 'news-tag--recruit',
    '会社情報': 'news-tag--company',
    'その他':   'news-tag--other'
  };

  /* ── 取得処理（全ページ共通）──────────────────────────── */
  function request(path) {
    return fetch(API_BASE + path, {
      headers: { 'X-MICROCMS-API-KEY': API_KEY }
    }).then(function (res) {
      if (!res.ok) throw new Error('microCMS ' + res.status + ' ' + res.statusText);
      return res.json();
    });
  }
  function fetchNewsList(limit) {
    return request(NEWS_ENDPOINT + '?orders=-publishDate,-publishedAt&limit=' + (limit || 100))
      .then(function (data) { return (data && data.contents) || []; });
  }
  function fetchNewsOne(id) {
    return request(NEWS_ENDPOINT + '/' + encodeURIComponent(id));
  }

  /* ── フィールド抽出（スキーマ差異に強く）──────────────── */
  function pickDate(item) {
    var raw = item.publishDate || item.date || item.publishedAt || item.createdAt || '';
    if (!raw) return '';
    var d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '.' + mm + '.' + dd;
  }
  function pickCategory(item) {
    var c = item.category;
    if (c == null) return '';
    if (Array.isArray(c)) c = c[0];
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object') return c.name || c.title || c.label || c.value || '';
    return String(c);
  }
  function pickTitle(item) { return item.title || item.name || '（無題）'; }
  function pickBody(item) { return item.content || item.body || item.text || ''; }
  function categoryClass(cat) { return CATEGORY_CLASS[cat] || 'news-tag--other'; }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  /* ── 状態表示 ─────────────────────────────────────────── */
  function showLoading(el) { el.innerHTML = '<li class="news-loading">読み込み中...</li>'; }
  function showEmpty(el) { el.innerHTML = '<li class="news-empty">現在、お知らせはありません。</li>'; }

  /* ── 一覧の1件 <li> ───────────────────────────────────── */
  function itemHtml(item, hrefPrefix) {
    var date = pickDate(item);
    var cat = pickCategory(item);
    var title = pickTitle(item);
    var href = hrefPrefix + 'detail.html?id=' + encodeURIComponent(item.id);
    var tag = cat
      ? '<span class="news-tag ' + categoryClass(cat) + '">' + escapeHtml(cat) + '</span>'
      : '';
    return '<li class="news-item" data-category="' + escapeHtml(cat) + '">' +
      '<span class="news-date">' + escapeHtml(date) + '</span>' +
      tag +
      '<a href="' + href + '" class="news-title">' + escapeHtml(title) + '</a>' +
      '</li>';
  }
  function renderList(el, items, hrefPrefix) {
    if (!items || !items.length) { showEmpty(el); return; }
    el.innerHTML = items.map(function (it) { return itemHtml(it, hrefPrefix); }).join('');
  }

  /* ── トップページ：最新N件 ────────────────────────────── */
  function initTop(options) {
    options = options || {};
    var el = document.getElementById(options.listId || 'news-latest');
    if (!el) return;
    var hrefPrefix = options.hrefPrefix != null ? options.hrefPrefix : 'news/';
    var limit = options.limit || 3;
    showLoading(el);
    fetchNewsList(limit)
      .then(function (items) { renderList(el, items.slice(0, limit), hrefPrefix); })
      .catch(function (err) { console.error('[microCMS] 取得に失敗しました:', err); showEmpty(el); });
  }

  /* ── 新着情報一覧：全件＋カテゴリー絞り込み ────────────── */
  function initList(options) {
    options = options || {};
    var el = document.getElementById(options.listId || 'news-list');
    if (!el) return;
    var hrefPrefix = options.hrefPrefix != null ? options.hrefPrefix : '';
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll(options.filterSelector || '.works-filter__item')
    );
    var all = [];
    var active = 'すべて';

    function apply() {
      var list = (active === 'すべて')
        ? all
        : all.filter(function (it) { return pickCategory(it) === active; });
      renderList(el, list, hrefPrefix);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        active = (btn.textContent || '').trim();
        apply();
      });
    });

    showLoading(el);
    fetchNewsList(100)
      .then(function (items) { all = items; apply(); })
      .catch(function (err) { console.error('[microCMS] 取得に失敗しました:', err); showEmpty(el); });
  }

  /* ── 詳細ページ：?id= の1件を表示 ─────────────────────── */
  function initDetail(options) {
    options = options || {};
    var el = document.getElementById(options.rootId || 'news-detail');
    if (!el) return;
    var crumb = options.crumbId ? document.getElementById(options.crumbId) : null;
    var params = new URLSearchParams(global.location.search);
    var id = params.get('id');
    if (!id) {
      el.innerHTML = '<p class="news-empty">記事が指定されていません。</p>';
      return;
    }
    el.innerHTML = '<p class="news-loading">読み込み中...</p>';
    fetchNewsOne(id).then(function (item) {
      var date = pickDate(item);
      var cat = pickCategory(item);
      var title = pickTitle(item);
      var body = pickBody(item);
      var tag = cat
        ? '<span class="news-tag ' + categoryClass(cat) + '">' + escapeHtml(cat) + '</span>'
        : '';
      el.innerHTML =
        '<article class="news-article">' +
          '<div class="news-article-header">' +
            '<div class="news-article-meta">' +
              '<span class="news-date">' + escapeHtml(date) + '</span>' + tag +
            '</div>' +
            '<h1 class="news-article-title">' + escapeHtml(title) + '</h1>' +
          '</div>' +
          '<div class="news-article-body">' + body + '</div>' +
        '</article>';
      if (crumb) crumb.textContent = title;
      global.document.title = title + '｜新着情報｜長縄工務店';
    }).catch(function (err) {
      console.error('[microCMS] 取得に失敗しました:', err);
      el.innerHTML = '<p class="news-empty">現在、お知らせはありません。</p>';
    });
  }

  global.NaganawaNews = {
    initTop: initTop,
    initList: initList,
    initDetail: initDetail,
    fetchNewsList: fetchNewsList,
    fetchNewsOne: fetchNewsOne
  };
})(window);

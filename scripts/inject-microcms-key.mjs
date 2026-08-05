/* ============================================================
 *  GitHub Actions 専用スクリプト（デプロイ時のみ実行）
 *  ------------------------------------------------------------
 *  Secrets の microCMS APIキー(MICROCMS_API_KEY)を、公開用に
 *  コピーした _site/js/microcms.js のプレースホルダーへ差し込む。
 *  ・リポジトリ本体の js/microcms.js は常にプレースホルダーのまま
 *    （実値はコミットしない）。
 *  ・キー値は一切ログ出力しない。
 * ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';

const FILE = process.env.INJECT_TARGET || '_site/js/microcms.js';
const PLACEHOLDER = '__MICROCMS_API_KEY__';
const key = (process.env.MICROCMS_API_KEY || '').trim();

if (!key) {
  console.error('::error::MICROCMS_API_KEY が空です。Secret 名（MICROCMS_API_KEY）が正しいか確認してください。');
  process.exit(1);
}

let src;
try {
  src = await readFile(FILE, 'utf8');
} catch (e) {
  console.error(`::error::${FILE} を読み込めません: ${e.message}`);
  process.exit(1);
}

if (!src.includes(PLACEHOLDER)) {
  console.error(`::error::プレースホルダー ${PLACEHOLDER} が ${FILE} に見つかりません。`);
  process.exit(1);
}

src = src.split(PLACEHOLDER).join(key);
await writeFile(FILE, src);
console.log(`microCMS APIキーを ${FILE} に注入しました（値は非表示）。`);

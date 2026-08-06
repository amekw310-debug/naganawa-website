<?php
// ============================
// NICONICO MAIL Ver.1.18 互換
// 送信処理・確認画面生成
// ============================

require_once('config.php');

// 文字コード設定（件名・本文の日本語を文字化けさせないため）
mb_language("Japanese");
mb_internal_encoding("UTF-8");

// ----------------------------------------
// エラーログ出力（送信失敗の原因調査用）
// ※個人情報（本文・お客様のアドレス等）は記録しません。
//   宛先・送信可否・PHPエラー内容など技術情報のみ記録します。
// ----------------------------------------
function log_mail($message) {
    global $error_log_file;
    $line = "[" . date("Y-m-d H:i:s") . "] " . $message . "\n";
    error_log("contact_mail: " . $message);
    if (!empty($error_log_file)) {
        @file_put_contents($error_log_file, $line, FILE_APPEND | LOCK_EX);
    }
}

$phase = isset($_POST['phase']) ? $_POST['phase'] : '';

// ----------------------------------------
// スパム対策（ハニーポット）
// 入力フォームに人間には見えない項目 "website" を置いています。
// bot はこれを自動入力しがちなので、値が入っていれば送信せず破棄します。
// ----------------------------------------
if (!empty($_POST['website'])) {
    log_mail("ハニーポット検知のため破棄しました（bot判定）。");
    header("Location: {$thanks_url}");
    exit;
}

// ----------------------------------------
// 入力値の取得・サニタイズ
// ----------------------------------------
$data = [];
foreach ($column as $key => $label) {
    $val = isset($_POST[$key]) ? $_POST[$key] : '';
    $val = str_replace(["\r\n", "\r"], "\n", $val);
    $val = htmlspecialchars(trim($val), ENT_QUOTES, 'UTF-8');
    $data[$key] = $val;
}

// ----------------------------------------
// バリデーション
// ----------------------------------------
function validate($data, $required, $column) {
    $errors = [];
    foreach ($required as $key) {
        if ($data[$key] === '') {
            $errors[] = $column[$key] . ' は必須項目です。';
        }
    }
    if ($data['email'] !== '' && !filter_var(htmlspecialchars_decode($data['email']), FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'メールアドレスの形式が正しくありません。';
    }
    if ($data['phone'] !== '' && !preg_match('/^[\d\-\(\)\+\s]+$/', htmlspecialchars_decode($data['phone']))) {
        $errors[] = '電話番号は半角数字・ハイフンで入力してください。';
    }
    return $errors;
}

// ----------------------------------------
// メール本文生成（項目を分かりやすく整形）
// ----------------------------------------
function build_mail_body($data, $column) {
    $body = '';
    foreach ($column as $key => $label) {
        $val = $data[$key] !== '' ? htmlspecialchars_decode($data[$key]) : '（未入力）';
        $body .= "【{$label}】\n{$val}\n\n";
    }
    return rtrim($body) . "\n";
}

// ----------------------------------------
// phase: check → 確認画面を表示
// ----------------------------------------
if ($phase === 'check') {
    $errors = validate($data, $required, $column);

    if (!empty($errors)) {
        // エラーがある場合はエラーページへ
        $params = http_build_query(['errors' => implode('|', $errors)]);
        header("Location: {$error_url}?{$params}");
        exit;
    }

    // 確認画面を出力（サイトデザインに合わせたHTML）
    $hidden_fields = '';
    foreach ($column as $key => $label) {
        $hidden_fields .= '<input type="hidden" name="' . $key . '" value="' . $data[$key] . '">' . "\n";
    }

    $rows = '';
    foreach ($column as $key => $label) {
        $val = $data[$key] !== '' ? nl2br($data[$key]) : '<span style="color:#9ca3af;">（未入力）</span>';
        $rows .= '<tr><th>' . $label . '</th><td>' . $val . '</td></tr>' . "\n";
    }

    echo <<<HTML
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="images/favicon.png" type="image/png">
  <title>入力内容の確認｜長縄工務店</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css?v=7">
</head>
<body>

<header class="header scrolled" id="top">
  <div class="inner header-inner">
    <a href="index.html" class="logo">
      <img src="images/logo.png" alt="長縄工務店 ロゴマーク" class="logo-img">
      <span class="logo-name">株式会社 長縄工務店</span>
    </a>
    <nav class="nav">
      <a href="index.html">TOP</a>
      <a href="news/index.html">新着情報</a>
      <a href="business.html">事業内容</a>
      <a href="technology.html">ICT施工・技術力</a>
      <a href="recruit.html">採用情報</a>
      <a href="about.html">会社情報</a>
      <a href="contact.html" class="nav-active">お問い合わせ</a>
    </nav>
    <button class="hamburger" id="hamburger" aria-label="メニューを開く">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="nav-mobile" id="nav-mobile">
    <a href="index.html">TOP</a>
    <a href="news/index.html">新着情報</a>
    <a href="business.html">事業内容</a>
    <a href="technology.html">ICT施工・技術力</a>
    <a href="recruit.html">採用情報</a>
    <a href="about.html">会社情報</a>
    <a href="contact.html">お問い合わせ</a>
  </div>
</header>

<main>
  <section class="section section--gray" style="padding-top:120px;">
    <div class="inner">
      <div class="section-header">
        <p class="section-label">Confirm</p>
        <h2 class="section-title">入力内容の確認</h2>
      </div>
      <div style="max-width:640px;margin:0 auto;">
        <p style="text-align:center;margin-bottom:32px;color:var(--text-sub);">
          以下の内容でよろしければ「送信する」ボタンを押してください。
        </p>
        <table class="company-table" style="margin-bottom:32px;">
          <tbody>
            {$rows}
          </tbody>
        </table>
        <form action="contact_mail.php" method="post">
          <input type="hidden" name="phase" value="send">
          {$hidden_fields}
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <button type="button" onclick="history.back()" class="btn btn-lg" style="flex:1;background:#6b7280;color:#fff;border:none;cursor:pointer;">
              ← 入力に戻る
            </button>
            <button type="submit" class="btn btn-accent btn-lg" style="flex:2;">
              送信する
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="inner footer-inner">
    <div class="footer-sns">
      <a href="https://www.instagram.com/naganawa_k/" class="footer-sns-link" aria-label="Instagram" target="_blank" rel="noopener">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.42 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.42-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.42-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.42 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13-.67-.66-1.34-1.07-2.13-1.38-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm6.41-10.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z"/></svg>
      </a>
      <a href="https://www.tiktok.com/@naganawa_k" class="footer-sns-link" aria-label="TikTok" target="_blank" rel="noopener">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
      </a>
      <a href="https://lin.ee/V9wp3np" class="footer-sns-link" aria-label="LINE" target="_blank" rel="noopener">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><mask id="lineMask"><rect width="24" height="24" fill="#fff"/><g stroke="#000" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8.4v4.1h1.9"/><path d="M9.9 8.4v4.1"/><path d="M11.5 12.5V8.4l2.5 4.1V8.4"/><path d="M17.3 8.4h-1.9v4.1h1.9"/><path d="M15.4 10.45h1.6"/></g></mask><path fill="currentColor" mask="url(#lineMask)" d="M12 3C6.75 3 2.5 6.43 2.5 10.66c0 3.79 3.37 6.96 7.92 7.56.31.07.73.2.83.47.09.24.06.61.03.85l-.13.82c-.04.24-.19.94.83.51 1.02-.43 5.5-3.24 7.5-5.54 1.38-1.51 2.04-3.05 2.04-4.76C21.5 6.43 17.25 3 12 3z"/></svg>
      </a>
    </div>
    <p class="footer-address">〒486-0842　愛知県春日井市六軒屋町4丁目63</p>
    <nav class="footer-nav">
      <a href="business.html">事業内容</a>
      <a href="technology.html">ICT施工・技術力</a>
      <a href="recruit.html">採用情報</a>
      <a href="about.html">会社情報</a>
      <a href="contact.html">お問い合わせ</a>
    </nav>
    <p class="footer-copy">© 2026 長縄工務店. All rights reserved.</p>
  </div>
</footer>

<script>
  const hamburger = document.getElementById('hamburger');
  const navMobile = document.getElementById('nav-mobile');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navMobile.classList.toggle('open');
  });
</script>
</body>
</html>
HTML;
    exit;
}

// ----------------------------------------
// phase: send → メール送信
// ----------------------------------------
if ($phase === 'send') {
    $errors = validate($data, $required, $column);

    if (!empty($errors)) {
        log_mail("送信フェーズでバリデーションエラー: " . implode(' / ', $errors));
        header("Location: {$error_url}");
        exit;
    }

    date_default_timezone_set('Asia/Tokyo');

    // --- 件名を動的生成（お名前を挿入）---
    // 名前に改行が含まれてもヘッダーインジェクションされないよう CR/LF を除去。
    $name_for_subject = trim(preg_replace('/[\r\n]+/', ' ', htmlspecialchars_decode($data['name'])));
    if ($name_for_subject === '') { $name_for_subject = 'お客様'; }
    $subject = str_replace('{name}', $name_for_subject, $subject_template);

    // --- 本文（整形）---
    $mail_body = build_mail_body($data, $column);
    $mail_body .= "\n----------------------------------------\n";
    $mail_body .= "送信日時：" . date("Y-m-d H:i:s") . "\n";
    $mail_body .= "送信元IP：" . (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '') . "\n";

    $visitor_email = htmlspecialchars_decode($data['email']);

    // 管理者宛メール本文（冒頭に案内文を付与）
    $admin_text  = "ホームページのお問い合わせフォームより、以下のお問い合わせがありました。\n";
    $admin_text .= "お客様への返信は、このメールにそのまま「返信」してください（返信先＝お客様のアドレス）。\n\n";
    $admin_text .= $mail_body;

    // ============================================================
    // ① 管理者宛メール（会社受信箱への通知）＝ 最重要
    //   To          : $mailto（会社の受信先 naganawa.com@ace.ocn.ne.jp）
    //   From        : $mailfrom（自社ドメイン。Canonetで送信可能なアドレス）
    //   Reply-To    : お客様のアドレス（管理者が「返信」でそのままお客様へ）
    //   Return-Path : $mailfrom を -f で明示（★今回の修正の要点）
    //
    //   ▼原因：これまで -f（エンベロープFrom＝Return-Path）を指定していなかったため、
    //     Return-Path がサーバ既定（例：apache@サーバホスト名）になり、From の
    //     自社ドメインと不一致に。OCN(ace.ocn.ne.jp)はこの不一致を「なりすまし」と
    //     見なし、ローカルMTA受理後に破棄していた。そのため mb_send_mail は true を
    //     返し「送信完了画面」は出るのに、会社宛だけ届かない状態だった。
    //     （お客様宛の自動返信は受信側が緩く到達していた。）
    //   本文・件名の文字コード変換は mb_send_mail に一任（本文はUTF-8のまま渡す。
    //     以前は mb_convert_encoding で ISO-2022-JP に変換してから mb_send_mail に
    //     渡しており、二重変換で文字化けの原因になっていた）。
    // ============================================================
    // -f の値は設定ファイルの定数（$mailfrom）のみ。ユーザー入力は使わない（安全）。
    $envelope_param = "-f{$mailfrom}";

    $admin_headers  = "From: " . mb_encode_mimeheader($mailfrom_name) . " <{$mailfrom}>\r\n";
    if ($visitor_email !== '') {
        $admin_headers .= "Reply-To: {$visitor_email}\r\n";
    }
    // Content-Type は mb_send_mail が付与するため手動指定しない。

    $admin_ok = @mb_send_mail($mailto, $subject, $admin_text, $admin_headers, $envelope_param);

    // ② 自動返信メール（お客様宛）
    //   From＝$mailfrom＋会社名。Reply-To＝会社受信箱($mailto)。Return-Path も -f で明示。
    $reply_ok = null; // 送信しなかった場合は null（判定対象外）
    if ($auto_reply && $visitor_email !== '') {
        $reply_body = str_replace(
            ['{name}', '{mail_body}'],
            [htmlspecialchars_decode($data['name']), $mail_body],
            $auto_reply_body
        );
        $reply_headers  = "From: " . mb_encode_mimeheader($auto_reply_from_name) . " <{$mailfrom}>\r\n";
        $reply_headers .= "Reply-To: {$mailto}\r\n";

        $reply_ok = @mb_send_mail($visitor_email, $auto_reply_subject, $reply_body, $reply_headers, $envelope_param);
    }

    // ============================================================
    // 戻り値を「別々に」判定する（#8）
    // ============================================================
    // --- 自動返信の結果を記録（失敗しても致命的ではないので継続）---
    if ($reply_ok === false) {
        $last = error_get_last();
        log_mail("WARN: 自動返信メール送信に失敗。to=お客様 PHPエラー=" . ($last ? $last['message'] : '不明'));
    } elseif ($reply_ok === true) {
        log_mail("OK: 自動返信メール送信（ローカルMTA受理）。");
    }

    // --- 管理者宛の結果を判定（#9：失敗時は「完了」にせずエラー画面＋ログ）---
    if ($admin_ok === false) {
        $last = error_get_last();
        log_mail(
            "NG: 管理者宛メール送信に失敗（mb_send_mail=false）。" .
            "to={$mailto} from={$mailfrom} envelope(Return-Path)={$mailfrom} " .
            "件名バイト長=" . strlen($subject) . " PHPエラー=" . ($last ? $last['message'] : '不明')
        );
        header("Location: {$error_url}");
        exit;
    }
    log_mail("OK: 管理者宛メール送信（ローカルMTA受理）。to={$mailto} envelope(Return-Path)={$mailfrom}");

    // ここまで来た場合のみ「送信完了」とする
    header("Location: {$thanks_url}");
    exit;
}

// phaseが不正の場合はフォームへ
header("Location: contact.html");
exit;

<?php
// ============================
// NICONICO MAIL Ver.1.18 互換
// 送信処理・確認画面生成
// ============================

require_once('config.php');

// 文字コード設定
mb_language("Japanese");
mb_internal_encoding("UTF-8");

$phase = isset($_POST['phase']) ? $_POST['phase'] : '';

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
// メール本文生成
// ----------------------------------------
function build_mail_body($data, $column) {
    $body = '';
    foreach ($column as $key => $label) {
        $val = $data[$key] !== '' ? htmlspecialchars_decode($data[$key]) : '（未入力）';
        $body .= "{$label}：{$val}\n";
    }
    return $body;
}

// ----------------------------------------
// phase: check → 確認画面を表示
// ----------------------------------------
if ($phase === 'check') {
    $errors = validate($data, $required, $column);

    if (!empty($errors)) {
        // エラーがある場合はエラーページへ
        $_SESSION_ERRORS = $errors; // セッション不使用のためURLパラメータで渡す
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
  <link rel="icon" href="images/favicon.png" type="image/png">
  <title>入力内容の確認｜長縄工務店</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
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
        header("Location: {$error_url}");
        exit;
    }

    date_default_timezone_set('Asia/Tokyo');

    // メール本文（UTF-8で組み立て。mb_send_mail が ISO-2022-JP へ自動変換）
    $mail_body = build_mail_body($data, $column);

    // 送信者情報を付加（旧サイト踏襲）
    $mail_body .= "\n----------------------------------------\n";
    $mail_body .= "送信日時：" . date("Y-m-d H:i:s") . "\n";
    $mail_body .= "送信元IP：" . (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '') . "\n";

    $visitor_email = htmlspecialchars_decode($data['email']);

    // 管理者宛メール送信
    // 差出人＝送信者本人のアドレス（旧サイト踏襲。レンタルサーバーから
    // 自社受信箱へ迷惑メール判定されず確実に届くための設定。返信もそのまま
    // お客様へ返せる）。件名・本文は mb_send_mail が ISO-2022-JP に自動変換。
    $headers = "From: {$visitor_email}\r\n"
             . "Reply-To: {$visitor_email}";
    $result = mb_send_mail($mailto, $subject, $mail_body, $headers);

    if (!$result) {
        header("Location: {$error_url}");
        exit;
    }

    // 自動返信メール送信（差出人＝会社アドレス）
    if ($auto_reply && $visitor_email !== '') {
        $reply_body = str_replace(
            ['{name}', '{mail_body}'],
            [htmlspecialchars_decode($data['name']), $mail_body],
            $auto_reply_body
        );
        $reply_from    = mb_encode_mimeheader($auto_reply_from_name) . " <{$mailto}>";
        $reply_headers = "From: {$reply_from}";
        mb_send_mail($visitor_email, $auto_reply_subject, $reply_body, $reply_headers);
    }

    header("Location: {$thanks_url}");
    exit;
}

// phaseが不正の場合はフォームへ
header("Location: contact.html");
exit;

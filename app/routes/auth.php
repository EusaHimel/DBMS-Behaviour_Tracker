<?php
function user_out(array $u): array {
  return ['id'=>(int)$u['user_id'],'name'=>$u['name'],'email'=>$u['email'],'age_group'=>$u['age_group'],'occupation'=>$u['occupation'],
    'nickname'=>$u['nickname'],'username'=>$u['username'],'avatar_type'=>$u['avatar_type'],'avatar_id'=>$u['avatar_id'],
    'avatar_path'=>$u['avatar_path'],'active_season'=>$u['active_season']];
}
function start_session(int $id): void {
  session_regenerate_id(true);
  $_SESSION['uid'] = $id;
  $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
return function (string $m, array $q): void {
  $a = $q['a'] ?? ''; $db = db();
  if ($a === 'me' && $m === 'GET') {
    if (empty($_SESSION['uid'])) out(['user' => null]);
    $st = $db->prepare('SELECT * FROM users WHERE user_id = ?'); $st->execute([$_SESSION['uid']]);
    $u = $st->fetch(); if (!$u) { session_destroy(); out(['user' => null]); }
    out(['user' => user_out($u), 'csrf' => $_SESSION['csrf']]);
  }
  if ($a === 'signup' && $m === 'POST') {
    $b = body();
    $name = str($b, 'name', 40); $email = strtolower(str($b, 'email', 120)); $pw = (string)($b['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Enter a valid email');
    if (strlen($pw) < 6 || strlen($pw) > 200) fail('Password must be 6 or more characters');
    $st = $db->prepare('SELECT 1 FROM users WHERE email = ?'); $st->execute([$email]);
    if ($st->fetch()) fail('That email already has an account', 409);
    $db->beginTransaction();
    $db->prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)')->execute([$name, $email, password_hash($pw, PASSWORD_BCRYPT)]);
    $id = (int)$db->lastInsertId();
    $db->prepare('INSERT INTO user_settings (user_id) VALUES (?)')->execute([$id]);
    $db->prepare("INSERT INTO user_seasons (user_id,season_id) VALUES (?, 'classic')")->execute([$id]);
    $db->commit();
    start_session($id);
    $st = $db->prepare('SELECT * FROM users WHERE user_id = ?'); $st->execute([$id]);
    out(['user' => user_out($st->fetch()), 'csrf' => $_SESSION['csrf']], 201);
  }
  if ($a === 'login' && $m === 'POST') {
    $b = body(); $who = strtolower(trim((string)($b['email'] ?? ''))); $pw = (string)($b['password'] ?? '');
    $st = $db->prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1'); $st->execute([$who, $who]);
    $u = $st->fetch();
    // same message and same work whether the account exists or not
    $hash = $u['password_hash'] ?? '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';
    if (!password_verify($pw, $hash) || !$u) fail('Wrong email or password', 401);
    $db->prepare('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE user_id = ?')->execute([$u['user_id']]);
    start_session((int)$u['user_id']);
    out(['user' => user_out($u), 'csrf' => $_SESSION['csrf']]);
  }
  if ($a === 'logout' && $m === 'POST') {
    csrf_check();
    $_SESSION = []; session_destroy();
    out(['ok' => true]);
  }
  fail('Not found', 404);
};

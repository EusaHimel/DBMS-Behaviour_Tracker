<?php
// Profile: about-you fields, preset avatars, and the uploaded profile photo (profile&a=photo).
const AVATAR_DIR = __DIR__ . '/../../public/uploads/avatars';
const AVATAR_NAME = '/^u\d+_[0-9a-f]{16}\.jpg$/';          // the only file names this code ever creates or deletes
const AVATAR_MAX_BYTES = 300 * 1024;

function profile_out(PDO $db, int $u): array {
  $st = $db->prepare('SELECT * FROM users WHERE user_id = ?'); $st->execute([$u]); $r = $st->fetch();
  if (!$r) fail('Account not found', 404);
  return ['id'=>(int)$r['user_id'],'name'=>$r['name'],'email'=>$r['email'],'age_group'=>$r['age_group'],'occupation'=>$r['occupation'],
    'nickname'=>$r['nickname'],'username'=>$r['username'],'avatar_type'=>$r['avatar_type'],'avatar_id'=>$r['avatar_id'],
    'avatar_path'=>$r['avatar_path'],'active_season'=>$r['active_season']];
}
function avatar_unlink(?string $name): void {
  if ($name !== null && preg_match(AVATAR_NAME, $name)) @unlink(AVATAR_DIR . '/' . $name);   // pattern check: a stored value can never point outside the folder
}
// The page sends the cropped picture as a data URL (or bare base64) in {image}. Returns the raw bytes after the size checks.
function photo_bytes(array $b): string {
  $s = $b['image'] ?? null; if (!is_string($s) || $s === '') fail('Missing image');
  if (preg_match('#^data:image/(?:jpeg|png|webp);base64,#i', $s, $mm)) $s = substr($s, strlen($mm[0]));
  if (strlen($s) > 420000) fail('That photo is too big (300 KB at most)', 413);          // checked before decoding
  $raw = base64_decode($s, true);
  if ($raw === false || $raw === '') fail('The image data is not valid');
  if (strlen($raw) > AVATAR_MAX_BYTES) fail('That photo is too big (300 KB at most)', 413);
  return $raw;
}
// Checks that the bytes really are a JPEG, PNG or WebP picture, then redraws it as a 240x240 JPEG.
// Redrawing throws away everything else in the file (metadata, comments, anything appended after the image).
function avatar_jpeg(string $raw): string {
  if (!function_exists('imagecreatefromstring') || !function_exists('imagejpeg')) fail('Photo uploads are not available on this server', 500);
  $info = @getimagesizefromstring($raw);                                                   // reads the header only, so a huge picture cannot use up memory here
  if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) fail('Please choose a JPEG, PNG or WebP image');
  [$w, $h] = $info;
  if ($w < 32 || $h < 32 || $w > 4096 || $h > 4096 || $w * $h > 8000000) fail('That picture is too small or too large (32 to 4096 pixels on each side)');
  $src = @imagecreatefromstring($raw); if (!$src) fail('That image could not be read');
  $side = min($w, $h); $dst = imagecreatetruecolor(240, 240);
  imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));                          // transparent areas become white
  imagecopyresampled($dst, $src, 0, 0, intdiv($w - $side, 2), intdiv($h - $side, 2), 240, 240, $side, $side);   // centre square
  ob_start(); $ok = imagejpeg($dst, null, 85); $jpg = (string)ob_get_clean();
  if (!$ok || $jpg === '') fail('That image could not be processed', 500);
  return $jpg;
}

return function (string $m, array $q): void {
  $u = uid(); $db = db(); $a = $q['a'] ?? '';
  if ($m === 'GET' && $a === '') out(profile_out($db, $u));

  if ($m === 'POST' && $a === 'photo') {
    $jpg = avatar_jpeg(photo_bytes(body()));
    if (!is_dir(AVATAR_DIR) && !@mkdir(AVATAR_DIR, 0755, true) && !is_dir(AVATAR_DIR)) fail('Could not save the photo', 500);
    $name = 'u' . $u . '_' . bin2hex(random_bytes(8)) . '.jpg';                            // random name: nothing the user typed is used
    $path = AVATAR_DIR . '/' . $name;
    if (file_put_contents($path, $jpg, LOCK_EX) === false) fail('Could not save the photo', 500);
    @chmod($path, 0644);
    try {
      $db->beginTransaction();
      $o = $db->prepare('SELECT avatar_path FROM users WHERE user_id=? FOR UPDATE'); $o->execute([$u]); $prev = $o->fetchColumn();
      $db->prepare("UPDATE users SET avatar_type='photo', avatar_path=? WHERE user_id=?")->execute([$name, $u]);
      $db->commit();
    } catch (Throwable $e) {
      if ($db->inTransaction()) $db->rollBack();
      @unlink($path); error_log($e->getMessage()); fail('Could not save the photo', 500);
    }
    avatar_unlink(is_string($prev) ? $prev : null);                                         // the replaced photo is deleted
    out(profile_out($db, $u), 201);
  }
  if ($m === 'DELETE' && $a === 'photo') {                                                  // back to a preset avatar
    $db->beginTransaction();
    $o = $db->prepare('SELECT avatar_path FROM users WHERE user_id=? FOR UPDATE'); $o->execute([$u]); $prev = $o->fetchColumn();
    $db->prepare("UPDATE users SET avatar_type='preset', avatar_path=NULL, avatar_id=COALESCE(avatar_id,'sprout') WHERE user_id=?")->execute([$u]);
    $db->commit();
    avatar_unlink(is_string($prev) ? $prev : null);
    out(profile_out($db, $u));
  }

  if ($m === 'PUT' && $a === '') {
    $b = body(); $set = []; $p = []; $dropPhoto = false;
    if (array_key_exists('name', $b))       { $set[] = 'name=?';       $p[] = str($b, 'name', 40); }
    if (array_key_exists('nickname', $b))   { $set[] = 'nickname=?';   $p[] = str($b, 'nickname', 20, false); }
    if (array_key_exists('occupation', $b)) { $set[] = 'occupation=?'; $p[] = str($b, 'occupation', 40, false); }
    if (array_key_exists('age_group', $b))  { $set[] = 'age_group=?';  $p[] = pick($b, 'age_group', 'age_group', false); }
    if (array_key_exists('username', $b)) {
      $un = str($b, 'username', 20, false);
      if ($un !== null && !preg_match('/^[A-Za-z0-9_]{3,20}$/', $un)) fail('Usernames use 3 to 20 letters, numbers, or underscores.');
      $set[] = 'username=?'; $p[] = $un;
    }
    if (array_key_exists('avatar_type', $b) && $b['avatar_type'] !== 'preset') fail('Upload a photo to use one (profile photo).');   // a photo can only arrive through a checked upload
    if (array_key_exists('avatar_id', $b) || array_key_exists('avatar_type', $b)) {
      if (array_key_exists('avatar_id', $b)) {
        $c = $db->prepare('SELECT 1 FROM avatars WHERE avatar_id=?'); $c->execute([(string)$b['avatar_id']]);
        if (!$c->fetch()) fail('Unknown avatar');
        $set[] = 'avatar_id=?'; $p[] = (string)$b['avatar_id'];
      }
      $set[] = "avatar_type='preset'"; $set[] = 'avatar_path=NULL'; $dropPhoto = true;
    }
    if ($set) {
      try {
        $db->beginTransaction();
        $o = $db->prepare('SELECT avatar_path FROM users WHERE user_id=? FOR UPDATE'); $o->execute([$u]); $prev = $o->fetchColumn();
        $p[] = $u; $db->prepare('UPDATE users SET ' . implode(',', $set) . ' WHERE user_id=?')->execute($p);   // column names come from the fixed list above
        $db->commit();
      } catch (PDOException $e) {
        if ($db->inTransaction()) $db->rollBack();
        if ($e->getCode() === '23000') fail('That username is already taken', 409);
        throw $e;
      }
      if ($dropPhoto) avatar_unlink(is_string($prev) ? $prev : null);
    }
    out(profile_out($db, $u));
  }
  fail('Not found', 404);
};

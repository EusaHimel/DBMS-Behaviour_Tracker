<?php
function settings_out(array $s): array {
  return ['sfx_on'=>(bool)$s['sfx_on'],'volume'=>(float)$s['volume'],'focus_track'=>$s['focus_track'],'theme'=>$s['theme']];
}
return function (string $m, array $q): void {
  $u = uid(); $db = db();
  if ($m === 'POST' && ($q['a'] ?? '') === 'reset') {          // "Reset my data": everything the person made goes, the account stays
    if (empty(body()['confirm'])) fail('Please confirm the reset');
    $db->beginTransaction(); lock_user($db, $u);
    foreach (['garden_decorations','goals','tasks','events','pets','user_food','user_accessories','user_home_items','coin_transactions','diamond_transactions','notifications'] as $t)
      $db->prepare("DELETE FROM $t WHERE user_id=?")->execute([$u]);       // table names come from this fixed list; details cascade (check-ins, subtasks, event patterns, notes...)
    $db->prepare("DELETE FROM user_seasons WHERE user_id=? AND season_id<>'classic'")->execute([$u]);   // diamonds are gone, so paid themes go too
    $db->prepare("UPDATE users SET active_season='classic' WHERE user_id=?")->execute([$u]);
    $db->commit();
    out(['ok' => true]);
  }
  if ($m === 'PUT') {
    $b = body(); $set = []; $p = [];
    if (array_key_exists('sfx_on', $b))  { $set[] = 'sfx_on=?';  $p[] = empty($b['sfx_on']) ? 0 : 1; }
    if (array_key_exists('volume', $b))  { $set[] = 'volume=?';  $p[] = num($b,'volume',0,1); }
    if (array_key_exists('theme', $b))   { $set[] = 'theme=?';   $p[] = pick($b,'theme','theme'); }
    if (array_key_exists('focus_track', $b)) { $set[] = 'focus_track=?'; $p[] = $b['focus_track'] === null ? null : pick($b,'focus_track','focus_track'); }
    if ($set) { $p[] = $u; $db->prepare('UPDATE user_settings SET ' . implode(',', $set) . ' WHERE user_id=?')->execute($p); }
  }
  $st = $db->prepare('SELECT * FROM user_settings WHERE user_id=?'); $st->execute([$u]);
  $s = $st->fetch(); if (!$s) fail('Settings not found', 404);
  out(settings_out($s));
};

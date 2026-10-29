<?php
const SHOP = ['acc' => ['accessories','accessory_id','user_accessories'], 'food' => ['foods','food_id','user_food'], 'home' => ['home_items','home_id','user_home_items']];
const SLOT_COL = ['hat' => 'hat_id', 'face' => 'face_id', 'neck' => 'neck_id'];
function pet_out(array $p): array {
  return ['id'=>(int)$p['pet_id'],'kind'=>$p['kind_id'],'variant'=>(int)$p['variant_index'],'name'=>$p['name'],'fullness'=>(int)$p['fullness'],'joy'=>(int)$p['joy'],
    'stats_updated_at'=>ms($p['stats_updated_at']),'adopted_at'=>ms($p['adopted_at']),'x'=>(float)$p['garden_x'],'y'=>(float)$p['garden_y'],
    'hat'=>$p['hat_id'],'face'=>$p['face_id'],'neck'=>$p['neck_id']];
}
function my_pets(PDO $db, int $u, ?int $only = null): array {
  $st = $db->prepare('SELECT * FROM pets WHERE user_id = ?' . ($only ? ' AND pet_id = ?' : '') . ' ORDER BY pet_id'); $st->execute($only ? [$u, $only] : [$u]);
  $h = home_count($db, $u); $now = gmdate('Y-m-d H:i:s');
  return array_map(fn($p) => pet_out(array_merge($p, pet_now($p, $h), ['stats_updated_at' => $now])), $st->fetchAll());   // hunger and joy are worked out here
}
return function (string $m, array $q): void {
  $u = uid(); $db = db(); $id = isset($q['id']) ? (int)$q['id'] : 0; $a = $q['a'] ?? '';
  if ($m === 'GET') {
    $all = fn(string $sql) => $db->query($sql)->fetchAll();
    $var = []; foreach ($all('SELECT * FROM pet_variants ORDER BY kind_id, variant_index') as $v) $var[$v['kind_id']][] = ['index'=>(int)$v['variant_index'],'name'=>$v['name'],'color_a'=>$v['color_a'],'color_b'=>$v['color_b']];
    $one = function (string $sql, array $p) use ($db) { $st = $db->prepare($sql); $st->execute($p); return $st->fetchAll(PDO::FETCH_COLUMN); };
    $food = []; $f = $db->prepare('SELECT food_id,quantity FROM user_food WHERE user_id=?'); $f->execute([$u]); foreach ($f->fetchAll() as $r) $food[$r['food_id']] = (int)$r['quantity'];
    $act = $db->prepare('SELECT active_season FROM users WHERE user_id=?'); $act->execute([$u]);
    out(['catalog' => [
        'pet_kinds'   => array_map(fn($k) => ['id'=>$k['kind_id'],'name'=>$k['name'],'price'=>(int)$k['price_coins'],'sound'=>$k['sound'],'blurb'=>$k['blurb'],'variants'=>$var[$k['kind_id']] ?? []], $all('SELECT * FROM pet_kinds ORDER BY price_coins, kind_id')),
        'accessories' => array_map(fn($x) => ['id'=>$x['accessory_id'],'slot'=>$x['slot'],'name'=>$x['name'],'price'=>(int)$x['price_coins']], $all('SELECT * FROM accessories ORDER BY slot, price_coins')),
        'foods'       => array_map(fn($x) => ['id'=>$x['food_id'],'name'=>$x['name'],'price'=>(int)$x['price_coins'],'fill'=>(int)$x['fill_amount'],'loves_kind'=>$x['loves_kind'],'blurb'=>$x['blurb']], $all('SELECT * FROM foods ORDER BY price_coins')),
        'home_items'  => array_map(fn($x) => ['id'=>$x['home_id'],'name'=>$x['name'],'price'=>(int)$x['price_coins'],'blurb'=>$x['blurb'],'x'=>(float)$x['garden_x'],'y'=>(float)$x['garden_y'],'width'=>(float)$x['width_pct']], $all('SELECT * FROM home_items ORDER BY price_coins')),
        'seasons'     => array_map(fn($x) => ['id'=>$x['season_id'],'name'=>$x['name'],'blurb'=>$x['blurb'],'price'=>(int)$x['price_diamonds']], $all('SELECT * FROM seasons ORDER BY price_diamonds')),
        'avatars'     => array_map(fn($x) => ['id'=>$x['avatar_id'],'bg'=>$x['bg_color']], $all('SELECT * FROM avatars ORDER BY avatar_id')),
      ],
      'mine' => ['pets' => my_pets($db, $u),
        'accessories' => $one('SELECT accessory_id FROM user_accessories WHERE user_id=? ORDER BY purchased_at', [$u]),
        'food' => (object)$food,
        'home' => $one('SELECT home_id FROM user_home_items WHERE user_id=? ORDER BY purchased_at', [$u]),
        'seasons' => $one('SELECT season_id FROM user_seasons WHERE user_id=? ORDER BY unlocked_at', [$u]),
        'active_season' => $act->fetchColumn()]]);
  }
  if ($m === 'PUT' && $id && ($a === 'rename' || $a === 'equip')) {
    $own = $db->prepare('SELECT 1 FROM pets WHERE pet_id=? AND user_id=?'); $own->execute([$id, $u]);
    if (!$own->fetch()) fail('Pet not found', 404);
    $b = body();
    if ($a === 'rename') {
      $db->prepare('UPDATE pets SET name=? WHERE pet_id=? AND user_id=?')->execute([str($b, 'name', 16), $id, $u]);
    } else {
      $slot = $b['slot'] ?? null; if (!is_string($slot) || !isset(SLOT_COL[$slot])) fail('Invalid slot');
      $acc = $b['accessory_id'] ?? null;
      if ($acc !== null) {
        $c = $db->prepare('SELECT a.slot FROM user_accessories ua JOIN accessories a ON a.accessory_id = ua.accessory_id WHERE ua.user_id=? AND ua.accessory_id=?');
        $c->execute([$u, (string)$acc]); $row = $c->fetch();
        if (!$row) fail('You do not own that accessory', 403);
        if ($row['slot'] !== $slot) fail('That accessory does not go in the ' . $slot . ' slot');
      }
      $db->prepare('UPDATE pets SET ' . SLOT_COL[$slot] . '=? WHERE pet_id=? AND user_id=?')->execute([$acc === null ? null : (string)$acc, $id, $u]);   // column name comes from a fixed list
    }
    out(my_pets($db, $u, $id)[0]);
  }
  // ---- spending and caring for pets (all price and stat rules are checked here) ----
  if ($m === 'POST' && $a === 'adopt') {
    $b = body(); $kind = str($b, 'kind', 10); $vi = (int)num($b, 'variant', 0, 9);
    $db->beginTransaction(); lock_user($db, $u);
    $k = $db->prepare('SELECT * FROM pet_kinds WHERE kind_id=?'); $k->execute([$kind]); $kr = $k->fetch();
    if (!$kr) { $db->rollBack(); fail('Unknown pet', 404); }
    $v = $db->prepare('SELECT 1 FROM pet_variants WHERE kind_id=? AND variant_index=?'); $v->execute([$kind, $vi]);
    if (!$v->fetch()) { $db->rollBack(); fail('Unknown colour'); }
    $price = (int)$kr['price_coins']; $bal = coin_balance($db, $u);
    if ($bal < $price) { $db->rollBack(); fail('Not enough coins yet. You need ' . ($price - $bal) . ' more, and finishing tasks earns them.', 402); }
    $name = str($b, 'name', 16, false) ?? $kr['name']; [$x, $y] = place_pet($db, $u);
    $db->prepare('INSERT INTO pets (user_id,kind_id,variant_index,name,fullness,joy,garden_x,garden_y) VALUES (?,?,?,?,70,80,?,?)')->execute([$u, $kind, $vi, $name, $x, $y]);
    $pid = (int)$db->lastInsertId();
    add_coins($db, $u, -$price, 'Adopted ' . $name . ' the ' . strtolower($kr['name']), 'adoption');
    $db->commit();
    out(['pet' => my_pets($db, $u, $pid)[0], 'balance' => coin_balance($db, $u)], 201);
  }
  if ($m === 'POST' && $a === 'buy') {
    $b = body(); $type = $b['type'] ?? ''; if (!is_string($type) || !isset(SHOP[$type])) fail('Invalid item type');
    [$cat, $col, $own] = SHOP[$type]; $item = str($b, 'id', 20);                     // table and column names come from the fixed list above
    $db->beginTransaction(); lock_user($db, $u);
    $it = $db->prepare("SELECT name, price_coins FROM $cat WHERE $col=?"); $it->execute([$item]); $row = $it->fetch();
    if (!$row) { $db->rollBack(); fail('Item not found', 404); }
    if ($type !== 'food') { $has = $db->prepare("SELECT 1 FROM $own WHERE user_id=? AND $col=?"); $has->execute([$u, $item]); if ($has->fetch()) { $db->rollBack(); fail('You already own this.', 409); } }
    $price = (int)$row['price_coins']; $bal = coin_balance($db, $u);
    if ($bal < $price) { $db->rollBack(); fail('Not enough coins yet. You need ' . ($price - $bal) . ' more, and finishing tasks earns them.', 402); }
    if ($type === 'food') $db->prepare('INSERT INTO user_food (user_id,food_id,quantity) VALUES (?,?,1) ON DUPLICATE KEY UPDATE quantity=quantity+1')->execute([$u, $item]);
    else $db->prepare("INSERT INTO $own (user_id,$col) VALUES (?,?)")->execute([$u, $item]);
    add_coins($db, $u, -$price, 'Bought ' . $row['name'], 'purchase');
    $db->commit();
    out(['name' => $row['name'], 'balance' => coin_balance($db, $u)], 201);
  }
  if ($m === 'POST' && $id && ($a === 'feed' || $a === 'cuddle')) {
    $db->beginTransaction(); lock_user($db, $u);
    $ps = $db->prepare('SELECT * FROM pets WHERE pet_id=? AND user_id=? FOR UPDATE'); $ps->execute([$id, $u]); $p = $ps->fetch();
    if (!$p) { $db->rollBack(); fail('Pet not found', 404); }
    $n = commit_pet($db, $u, $p);                                        // start from today's hunger and joy
    if ($a === 'cuddle') {
      $db->prepare('UPDATE pets SET joy=? WHERE pet_id=?')->execute([min(100, $n['joy'] + 8), $id]);
      $db->commit(); out(['pet' => my_pets($db, $u, $id)[0]]);
    }
    if ($n['fullness'] >= 95) { $db->commit(); out(['fed' => false, 'reason' => 'full', 'pet' => my_pets($db, $u, $id)[0]]); }
    $fs = $db->prepare('SELECT f.food_id,f.name,f.fill_amount,f.loves_kind FROM user_food uf JOIN foods f ON f.food_id=uf.food_id WHERE uf.user_id=? AND uf.quantity>0 ORDER BY f.price_coins, f.food_id');
    $fs->execute([$u]); $foods = $fs->fetchAll(); $pick = null;
    foreach ([fn($f) => $f['loves_kind'] === $p['kind_id'], fn($f) => $f['loves_kind'] === null, fn($f) => true] as $test) { foreach ($foods as $f) if ($test($f)) { $pick = $f; break 2; } }
    if (!$pick) { $db->commit(); out(['fed' => false, 'reason' => 'nofood', 'pet' => my_pets($db, $u, $id)[0]]); }
    $love = $pick['loves_kind'] === $p['kind_id'];
    $db->prepare('UPDATE user_food SET quantity=quantity-1 WHERE user_id=? AND food_id=?')->execute([$u, $pick['food_id']]);
    $db->prepare('UPDATE pets SET fullness=?, joy=? WHERE pet_id=?')->execute([min(100, $n['fullness'] + (int)$pick['fill_amount']), min(100, $n['joy'] + ($love ? 15 : 5)), $id]);
    $db->commit();
    out(['fed' => true, 'food' => $pick['name'], 'loved' => $love, 'pet' => my_pets($db, $u, $id)[0]]);
  }
  if ($m === 'PUT' && $a === 'season') {
    $sid = str(body(), 'season_id', 10);
    $c = $db->prepare('SELECT 1 FROM user_seasons WHERE user_id=? AND season_id=?'); $c->execute([$u, $sid]);
    if (!$c->fetch()) fail('That season is not unlocked yet', 403);
    $db->prepare('UPDATE users SET active_season=? WHERE user_id=?')->execute([$sid, $u]);
    out(['active_season' => $sid]);
  }
  if ($m === 'POST' && $a === 'unlock') {
    $sid = str(body(), 'season_id', 10);
    $db->beginTransaction(); lock_user($db, $u);
    $s = $db->prepare('SELECT * FROM seasons WHERE season_id=?'); $s->execute([$sid]); $row = $s->fetch();
    if (!$row) { $db->rollBack(); fail('Season not found', 404); }
    $c = $db->prepare('SELECT 1 FROM user_seasons WHERE user_id=? AND season_id=?'); $c->execute([$u, $sid]);
    if ($c->fetch()) { $db->rollBack(); fail('Already unlocked', 409); }
    $price = (int)$row['price_diamonds']; $bal = dia_balance($db, $u);
    if ($bal < $price) { $db->rollBack(); fail('Not enough diamonds yet. You need ' . ($price - $bal) . ' more. Earn them by closing goals on time.', 402); }
    add_diamonds($db, $u, -$price, 'Unlocked ' . $row['name'] . ' theme', null, $sid);
    $db->prepare('INSERT INTO user_seasons (user_id,season_id) VALUES (?,?)')->execute([$u, $sid]);
    $db->prepare('UPDATE users SET active_season=? WHERE user_id=?')->execute([$sid, $u]);
    $db->commit();
    out(['season_id' => $sid, 'name' => $row['name'], 'diamond_balance' => dia_balance($db, $u)], 201);
  }
  fail('Not found', 404);
};

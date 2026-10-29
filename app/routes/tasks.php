<?php
function task_out(array $t): array {
  return ['id'=>(int)$t['task_id'],'title'=>$t['title'],'task_type'=>$t['task_type'],'effort'=>$t['effort'],'skip_rating'=>(bool)$t['skip_rating'],
    'difficulty'=>$t['difficulty'],'coins_value'=>COIN_BASE[$t['difficulty']] ?? 1,'difficulty_score'=>$t['difficulty_score']===null?null:(float)$t['difficulty_score'],'status'=>$t['status'],
    'created_at'=>ms($t['created_at']),'deadline'=>ms($t['deadline']),'completed_at'=>ms($t['completed_at']),'timing'=>$t['timing'],
    'coins_earned'=>$t['coins_earned']===null?null:(int)$t['coins_earned'],'garden_x'=>$t['garden_x']===null?null:(float)$t['garden_x'],
    'garden_y'=>$t['garden_y']===null?null:(float)$t['garden_y'],'plant_variant'=>$t['plant_variant']===null?null:(int)$t['plant_variant'],'plant_wilted'=>(bool)$t['plant_wilted']];
}
return function (string $m, array $q): void {
  $u = uid(); $db = db(); $id = isset($q['id']) ? (int)$q['id'] : 0; $a = $q['a'] ?? '';
  if ($m === 'GET' && $a === 'preview') {        // live difficulty preview for the add-task form
    $dl = (int)floor(((float)($q['deadline'] ?? 0)) / 1000);
    if ($dl <= time()) fail('Pick a deadline that is still ahead of you');
    $skip = !empty($q['skip']) && $q['skip'] !== 'false' && $q['skip'] !== '0';
    $type = pick($q, 'type', 'task_type'); $eff = pick($q, 'effort', 'effort');
    $d = task_difficulty($db, $u, $type, $eff, $skip, time(), $dl); $c = COIN_BASE[$d['label']];
    out($d + ['coins_ontime' => $c, 'coins_early' => $c + (int)ceil($c / 2)]);
  }
  if ($m === 'GET') {
    $st = $db->prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY deadline'); $st->execute([$u]);
    out(array_map('task_out', $st->fetchAll()));
  }
  if ($m === 'POST' && !$id) {
    $b = body(); $skip = empty($b['skip_rating']) ? 0 : 1; $dl = to_dt($b['deadline'] ?? null);
    if (strtotime($dl . ' UTC') <= time()) fail('The deadline must be in the future');
    $type = pick($b, 'task_type', 'task_type'); $eff = pick($b, 'effort', 'effort');
    $d = task_difficulty($db, $u, $type, $eff, (bool)$skip, time(), strtotime($dl . ' UTC'));   // the server decides the difficulty
    [$gx, $gy] = place_plant($db, $u);
    $db->prepare('INSERT INTO tasks (user_id,title,task_type,effort,skip_rating,difficulty,difficulty_score,deadline,garden_x,garden_y) VALUES (?,?,?,?,?,?,?,?,?,?)')
       ->execute([$u, str($b,'title',90), $type, $eff, $skip, $d['label'], $d['score'], $dl, $gx, $gy]);
    $st = $db->prepare('SELECT * FROM tasks WHERE task_id = ?'); $st->execute([$db->lastInsertId()]);
    out(task_out($st->fetch()), 201);
  }
  if ($m === 'POST' && $id && $a === 'complete') {
    $db->beginTransaction(); lock_user($db, $u);
    $st = $db->prepare('SELECT * FROM tasks WHERE task_id=? AND user_id=? FOR UPDATE'); $st->execute([$id, $u]); $t = $st->fetch();
    if (!$t) { $db->rollBack(); fail('Task not found', 404); }
    if ($t['status'] !== 'pending') { $db->rollBack(); fail('That task is already completed', 409); }
    $now = time(); $tm = timing_of(strtotime($t['created_at'] . ' UTC'), strtotime($t['deadline'] . ' UTC'), $now); $coins = reward_for($t['difficulty'], $tm);
    $db->prepare("UPDATE tasks SET status='completed', completed_at=UTC_TIMESTAMP(), timing=?, coins_earned=?, plant_variant=?, plant_wilted=? WHERE task_id=?")
       ->execute([$tm, $coins, random_int(0, 4), $tm === 'late' ? 1 : 0, $id]);
    add_coins($db, $u, $coins, 'Completed "' . $t['title'] . '"', 'task', $id);
    after_task_completed($db, $u, $id);          // step 4: Dropped routines reads habit and health tasks
    $db->commit();
    $st = $db->prepare('SELECT * FROM tasks WHERE task_id=?'); $st->execute([$id]);
    out(['task' => task_out($st->fetch()), 'coins' => $coins, 'timing' => $tm, 'balance' => coin_balance($db, $u)]);
  }
  if ($m === 'PUT' && $id) {
    $b = body();
    $st = $db->prepare("UPDATE tasks SET title = ?, deadline = ? WHERE task_id = ? AND user_id = ? AND status = 'pending'");
    $st->execute([str($b,'title',90), to_dt($b['deadline'] ?? null), $id, $u]);
    if (!$st->rowCount()) fail('Task not found or already completed', 404);
    $st = $db->prepare('SELECT * FROM tasks WHERE task_id = ?'); $st->execute([$id]); out(task_out($st->fetch()));
  }
  if ($m === 'DELETE' && $id) {
    $st = $db->prepare('DELETE FROM tasks WHERE task_id = ? AND user_id = ?'); $st->execute([$id, $u]);
    if (!$st->rowCount()) fail('Task not found', 404);
    sync_goals($db, $u);                       // a deleted habit or health task leaves Dropped routines
    out(['ok' => true]);
  }
  fail('Not found', 404);
};

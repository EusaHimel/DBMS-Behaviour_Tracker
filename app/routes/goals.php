<?php
return function (string $m, array $q): void {
  $u = uid(); $db = db(); $id = isset($q['id']) ? (int)$q['id'] : 0; $sid = isset($q['sid']) ? (int)$q['sid'] : 0; $a = $q['a'] ?? '';

  if ($m === 'GET' && $a === 'start') {          // the starting level for the goal form
    sync_overdue_routines($db, $u);
    out(goal_start_level($db, $u, pick($q, 'goal_type', 'goal_type')));
  }
  if ($m === 'GET') { sync_goals($db, $u); out(goals_out($db, $u, $id ?: null)); }

  if ($m === 'POST' && !$id && $a === '') {
    $b = body(); $type = pick($b, 'goal_type', 'goal_type'); $title = str($b, 'title', 90);
    $tgt = round(num($b, 'target', 0, 1), 3); $dl = to_dt($b['deadline'] ?? null);
    sync_overdue_routines($db, $u); $start = goal_start_level($db, $u, $type);
    $hand = isset($b['baseline']) && $b['baseline'] !== '';                              // the person set the starting level with the bar
    if ($hand) $base = round(num($b, 'baseline', 0, 1), 3);
    elseif ($start['enough']) $base = round((float)$start['strength'], 2);       // whole percent, exactly what the form shows               // otherwise counted by the server from the last 30 days of logs
    else fail('Only ' . $start['relevant'] . ' relevant events are logged for this behavior so far (5 are needed). Enter how strong it is now.');
    if ($base < 0.05) fail('The starting level is already below 5%, so there is nothing to lower yet.');
    if ($tgt > $base - 0.05 + 1e-9) fail($start['enough'] && !$hand ? 'Your logged events put this behavior at ' . round($base * 100) . '%, so the target must be ' . (int)floor(($base - 0.05) * 100 + 1e-6) . '% or lower.' : 'The target must be at least 5 points below the starting level.');
    $cur = $base;
    if (strtotime($dl . ' UTC') <= time()) fail('The deadline must be in the future');
    $db->beginTransaction();
    $db->prepare('INSERT INTO goals (user_id,title,goal_type,baseline,target,current_score,deadline) VALUES (?,?,?,?,?,?,?)')->execute([$u,$title,$type,$base,$tgt,$cur,$dl]);
    $gid = (int)$db->lastInsertId();
    $db->prepare('INSERT INTO goal_checkins (goal_id,score,source) VALUES (?,?,?)')->execute([$gid, $base, $hand ? 'manual' : 'auto']);
    $db->commit();
    out(goals_out($db, $u, $gid)[0], 201);
  }
  if ($m === 'PUT' && $id && $a === '') {
    $g = own_goal($db, $u, $id); if ($g['status'] !== 'active') fail('A closed goal cannot be edited', 409);
    $b = body(); $title = str($b, 'title', 90); $tgt = round(num($b, 'target', 0, 1), 3); $dl = to_dt($b['deadline'] ?? null);
    if ($tgt > (float)$g['baseline'] - 0.05 + 1e-9) fail('The target must be at least 5 points below the starting level');
    $db->prepare('UPDATE goals SET title=?, target=?, deadline=? WHERE goal_id=? AND user_id=?')->execute([$title, $tgt, $dl, $id, $u]);
    out(goals_out($db, $u, $id)[0]);
  }
  if ($m === 'DELETE' && $id && $a === '') {
    own_goal($db, $u, $id);
    $db->prepare('DELETE FROM goals WHERE goal_id=? AND user_id=?')->execute([$id, $u]);
    out(['ok' => true]);
  }
  if ($m === 'POST' && $id && $a === 'close') out(close_goal($db, $u, $id));

  // ---- progress set by hand (replaces the weekly slider; goes back to automatic after the next relevant log) ----
  if ($m === 'POST' && $id && $a === 'manual') {
    $g = own_goal($db, $u, $id); if ($g['status'] !== 'active') fail('A closed goal cannot be changed', 409);
    $has = $db->prepare('SELECT 1 FROM goal_subtasks WHERE goal_id=? LIMIT 1'); $has->execute([$id]);
    if ($has->fetch()) fail('This goal is tracked from its subtasks, so progress cannot be set by hand', 409);
    $p = round(num(body(), 'progress', 0, 1), 3);
    $score = round(clampf((float)$g['baseline'] - $p * ((float)$g['baseline'] - (float)$g['target']), 0, 1), 3);
    $db->beginTransaction();
    $db->prepare('UPDATE goals SET manual_progress=?, manual_set_at=UTC_TIMESTAMP() WHERE goal_id=?')->execute([$p, $id]);
    $db->prepare("INSERT INTO goal_checkins (goal_id,score,source) VALUES (?,?,'manual')")->execute([$id, $score]);
    $db->commit();
    $bee = maybe_award_bee($db, $u, $id); $o = goals_out($db, $u, $id)[0]; $o['bee_event'] = $bee;
    out($o, 201);
  }
  if ($m === 'DELETE' && $id && $a === 'manual') {
    $g = own_goal($db, $u, $id); if ($g['status'] !== 'active') fail('A closed goal cannot be changed', 409);
    $db->prepare('UPDATE goals SET manual_progress=NULL, manual_set_at=NULL WHERE goal_id=?')->execute([$id]);
    sync_goals($db, $u);
    out(goals_out($db, $u, $id)[0]);
  }

  // ---- subtasks (one level of nesting) ----
  if ($m === 'POST' && $id && $a === 'subtask') {
    $g = own_goal($db, $u, $id); if ($g['status'] !== 'active') fail('A closed goal cannot be changed', 409);
    $b = body(); $title = str($b, 'title', 80); $pid = isset($b['parent_id']) && $b['parent_id'] !== '' ? (int)$b['parent_id'] : null;
    $n = $db->prepare('SELECT COUNT(*) FROM goal_subtasks WHERE goal_id=?'); $n->execute([$id]); if ((int)$n->fetchColumn() >= 30) fail('A goal can have at most 30 subtasks');
    if ($pid !== null) {
      $p = $db->prepare('SELECT parent_id FROM goal_subtasks WHERE subtask_id=? AND goal_id=?'); $p->execute([$pid, $id]); $par = $p->fetch();
      if (!$par) fail('Parent subtask not found', 404);
      if ($par['parent_id'] !== null) fail('Subtasks can only be nested one level deep');
    }
    $mx = $db->prepare('SELECT COALESCE(MAX(sort_order),-1)+1 FROM goal_subtasks WHERE goal_id=? AND parent_id <=> ?'); $mx->execute([$id, $pid]);
    $db->beginTransaction();
    $db->prepare('INSERT INTO goal_subtasks (goal_id,parent_id,title,sort_order) VALUES (?,?,?,?)')->execute([$id, $pid, $title, (int)$mx->fetchColumn()]);
    if ($pid !== null) $db->prepare('UPDATE goal_subtasks SET is_done=0 WHERE subtask_id=?')->execute([$pid]);   // a parent is done only through its sub-items
    $db->commit();
    out(goals_out($db, $u, $id)[0], 201);
  }
  if ($a === 'subtask' && $sid && ($m === 'PUT' || $m === 'DELETE')) {
    $s = own_subtask($db, $u, $sid); if ($s['goal_status'] !== 'active') fail('A closed goal cannot be changed', 409);
    if ($m === 'DELETE') { $db->prepare('DELETE FROM goal_subtasks WHERE subtask_id=?')->execute([$sid]); $bee = maybe_award_bee($db, $u, (int)$s['goal_id']); $o = goals_out($db, $u, (int)$s['goal_id'])[0]; $o['bee_event'] = $bee; out($o); }
    $b = body(); $set = []; $p = [];
    if (array_key_exists('title', $b)) { $set[] = 'title=?'; $p[] = str($b, 'title', 80); }
    if (array_key_exists('done', $b)) {
      $has = $db->prepare('SELECT 1 FROM goal_subtasks WHERE parent_id=? LIMIT 1'); $has->execute([$sid]);
      if ($has->fetch()) fail('Tick its sub-items instead');
      $set[] = 'is_done=?'; $p[] = empty($b['done']) ? 0 : 1;
    }
    if (!$set) fail('Nothing to update');
    $p[] = $sid; $db->prepare('UPDATE goal_subtasks SET ' . implode(',', $set) . ' WHERE subtask_id=?')->execute($p);
    $bee = maybe_award_bee($db, $u, (int)$s['goal_id']); $o = goals_out($db, $u, (int)$s['goal_id'])[0]; $o['bee_event'] = $bee;
    out($o);
  }
  fail('Not found', 404);
};

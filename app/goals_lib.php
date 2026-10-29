<?php
declare(strict_types=1);
/* Goal helpers shared by the goals route and by the code that runs when events and tasks are saved. */
function goals_out(PDO $db, int $u, ?int $only = null): array {
  $sql = 'SELECT * FROM goals WHERE user_id = ?'; $p = [$u];
  if ($only) { $sql .= ' AND goal_id = ?'; $p[] = $only; }
  $st = $db->prepare($sql . " ORDER BY status, deadline"); $st->execute($p); $rows = $st->fetchAll();
  if (!$rows) return [];
  $ids = array_column($rows, 'goal_id'); $in = implode(',', array_fill(0, count($ids), '?'));
  $c = $db->prepare("SELECT goal_id,score,source,logged_at FROM goal_checkins WHERE goal_id IN ($in) ORDER BY logged_at, checkin_id"); $c->execute($ids);
  $s = $db->prepare("SELECT * FROM goal_subtasks WHERE goal_id IN ($in) ORDER BY sort_order, subtask_id"); $s->execute($ids);
  $C = []; foreach ($c->fetchAll() as $r) $C[$r['goal_id']][] = ['score'=>(float)$r['score'],'source'=>$r['source'],'at'=>ms($r['logged_at'])];
  $top = []; $kids = [];
  foreach ($s->fetchAll() as $r) {
    $o = ['id'=>(int)$r['subtask_id'],'title'=>$r['title'],'done'=>(bool)$r['is_done']];
    if ($r['parent_id'] === null) $top[$r['goal_id']][$r['subtask_id']] = $o + ['children' => []]; else $kids[] = [$r['goal_id'], $r['parent_id'], $o];
  }
  foreach ($kids as [$g, $pid, $o]) if (isset($top[$g][$pid])) $top[$g][$pid]['children'][] = $o;
  foreach ($top as $gid => $list) foreach ($list as $sid => $n) if ($n['children']) $top[$gid][$sid]['rate'] = round(count(array_filter($n['children'], fn($c) => $c['done'])) / count($n['children']), 3);
  return array_map(fn($g) => ['id'=>(int)$g['goal_id'],'title'=>$g['title'],'goal_type'=>$g['goal_type'],'baseline'=>(float)$g['baseline'],'target'=>(float)$g['target'],
    'current_score'=>(float)$g['current_score'],'manual_progress'=>$g['manual_progress']===null?null:(float)$g['manual_progress'],'manual_set_at'=>ms($g['manual_set_at']),
    'created_at'=>ms($g['created_at']),'deadline'=>ms($g['deadline']),'status'=>$g['status'],'closed_at'=>ms($g['closed_at']),
    'completion'=>$g['completion']===null?null:(float)$g['completion'],'result'=>$g['result'],'coin_points'=>$g['coin_points']===null?null:(int)$g['coin_points'],
    'diamond_points'=>$g['diamond_points']===null?null:(int)$g['diamond_points'],'closed_on_time'=>$g['closed_on_time']===null?null:(bool)$g['closed_on_time'],
    'bee_awarded'=>(bool)$g['bee_awarded'],'progress'=>goal_progress($g, array_values($top[$g['goal_id']] ?? [])),'progress_source'=>(empty($top[$g['goal_id']]) && $g['manual_progress']!==null) ? 'manual' : 'auto','checkins'=>$C[$g['goal_id']] ?? [],'subtasks'=>array_values($top[$g['goal_id']] ?? [])], $rows);
}
// A bee visits when a goal passes 50% before its deadline (once per goal).
function maybe_award_bee(PDO $db, int $u, int $id): bool {
  $g = own_goal($db, $u, $id);
  if ($g['status'] !== 'active' || $g['bee_awarded'] || time() > strtotime($g['deadline'] . ' UTC')) return false;
  if (goals_out($db, $u, $id)[0]['progress'] < 0.5) return false;
  [$x, $y] = place_sky($db, $u);
  $db->prepare('UPDATE goals SET bee_awarded=1 WHERE goal_id=?')->execute([$id]);
  $db->prepare("INSERT INTO garden_decorations (user_id,goal_id,kind,x,y) VALUES (?,?,'bee',?,?)")->execute([$u, $id, $x, $y]);
  return true;
}
// Closing a goal: result, coins and diamonds all come from the final progress.
function close_goal(PDO $db, int $u, int $id): array {
  $db->beginTransaction(); lock_user($db, $u);
  $g = own_goal($db, $u, $id);
  if ($g['status'] !== 'active') { $db->rollBack(); fail('This goal is already closed', 409); }
  sync_goals($db, $u);                          // close using today's numbers
  maybe_award_bee($db, $u, $id);
  $rate = goals_out($db, $u, $id)[0]['progress'];
  $onTime = time() <= strtotime($g['deadline'] . ' UTC');
  $result = $rate >= 1 ? 'bird' : ($rate >= 0.7 ? 'butterfly' : 'none');
  $pts = $rate >= 0.3 ? (int)round(min($rate, 1) * 40) : -10;
  $dia = $rate >= 0.3 ? (int)round(min($rate, 1) * 10) * ($onTime ? 1 : -1) : 0;
  $db->prepare("UPDATE goals SET status='done', closed_at=UTC_TIMESTAMP(), completion=?, result=?, coin_points=?, diamond_points=?, closed_on_time=? WHERE goal_id=?")
     ->execute([max(-99.0, min(99.0, $rate)), $result, $pts, $dia, $onTime ? 1 : 0, $id]);
  if ($result !== 'none') { [$x, $y] = place_sky($db, $u); $db->prepare('INSERT INTO garden_decorations (user_id,goal_id,kind,x,y) VALUES (?,?,?,?,?)')->execute([$u, $id, $result, $x, $y]); }
  add_coins($db, $u, $pts, 'Goal closed: "' . $g['title'] . '"', 'goal', null, $id);
  if ($dia !== 0) add_diamonds($db, $u, $dia, ($dia > 0 ? 'Goal closed on time: "' : 'Goal closed late: "') . $g['title'] . '"', $id);
  $db->commit();
  return ['goal' => goals_out($db, $u, $id)[0], 'result' => $result, 'progress' => $rate, 'coins' => $pts, 'diamonds' => $dia, 'on_time' => $onTime,
          'balance' => coin_balance($db, $u), 'diamond_balance' => dia_balance($db, $u)];
}
function own_goal(PDO $db, int $u, int $id): array {
  $st = $db->prepare('SELECT * FROM goals WHERE goal_id = ? AND user_id = ?'); $st->execute([$id, $u]);
  $g = $st->fetch(); if (!$g) fail('Goal not found', 404); return $g;
}
function own_subtask(PDO $db, int $u, int $sid): array {
  $st = $db->prepare('SELECT s.*, g.status AS goal_status FROM goal_subtasks s JOIN goals g ON g.goal_id = s.goal_id WHERE s.subtask_id = ? AND g.user_id = ?');
  $st->execute([$sid, $u]); $s = $st->fetch(); if (!$s) fail('Subtask not found', 404); return $s;
}

// ---------- the starting level: counted from the last 30 days of logs ----------
function goal_start_level(PDO $db, int $u, string $type): array {
  [$m, $h] = pattern_counts($db, $u)[$type];
  return ['goal_type' => $type, 'matches' => $m, 'healthy' => $h, 'relevant' => $m + $h, 'strength' => strength_of($m, $h), 'enough' => ($m + $h) >= 5];
}
// A hand-set progress value holds until something new is logged for that goal's pattern (an event, or a habit/health task finishing or going overdue).
function manual_override_active(PDO $db, array $g): bool {
  if ($g['manual_progress'] === null) return false;
  $st = $db->prepare("SELECT 1 FROM (
      SELECT e.created_at AS at FROM event_patterns ep JOIN events e ON e.event_id = ep.event_id WHERE e.user_id=? AND ep.pattern=?
      UNION ALL
      SELECT COALESCE(t.completed_at, t.deadline) FROM task_patterns tp JOIN tasks t ON t.task_id = tp.task_id WHERE t.user_id=? AND tp.pattern=?
    ) x WHERE x.at > ? LIMIT 1");
  $st->execute([$g['user_id'], $g['goal_type'], $g['user_id'], $g['goal_type'], $g['manual_set_at']]);
  return !$st->fetch();
}
// Keeps every active goal in step with the live pattern strength. Called whenever patterns can have changed.
function sync_goals(PDO $db, int $u): void {
  sync_overdue_routines($db, $u);
  $st = $db->prepare("SELECT * FROM goals WHERE user_id=? AND status='active'"); $st->execute([$u]); $goals = $st->fetchAll();
  if (!$goals) return;
  $counts = pattern_counts($db, $u);
  foreach ($goals as $g) {
    if ($g['manual_progress'] !== null) {
      if (manual_override_active($db, $g)) continue;                    // the hand-set value stays
      $db->prepare('UPDATE goals SET manual_progress=NULL, manual_set_at=NULL WHERE goal_id=?')->execute([$g['goal_id']]);
    }
    $s = strength_of(...$counts[$g['goal_type']]);
    if ($s === null) continue;
    if (abs($s - (float)$g['current_score']) > 0.0004) $db->prepare('UPDATE goals SET current_score=? WHERE goal_id=?')->execute([$s, $g['goal_id']]);
    $db->prepare("INSERT INTO goal_checkins (goal_id,score,source) SELECT ?, ?, 'auto' FROM DUAL
                  WHERE NOT EXISTS (SELECT 1 FROM goal_checkins WHERE goal_id=? AND source='auto' AND logged_at > (UTC_TIMESTAMP() - INTERVAL 7 DAY))")
       ->execute([$g['goal_id'], $s, $g['goal_id']]);                   // at most one automatic check-in per 7 days
    maybe_award_bee($db, $u, (int)$g['goal_id']);
  }
}

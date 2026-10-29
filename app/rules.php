<?php
declare(strict_types=1);
/* ============================================================================
   All game rules and calculations live here (nothing is calculated in the browser).
   Pattern rules are added in step 4 (rules for patterns), goal baselines in step 6.
   ============================================================================ */
const DAYSEC = 86400;
const COIN_BASE = ['Easy' => 5, 'Medium' => 10, 'Hard' => 20, 'N/A' => 1];
const EFFORT_W  = ['Low' => .2, 'Medium' => .5, 'High' => .9];

function rnd(float $a, float $b): float { return $a + mt_rand() / mt_getrandmax() * ($b - $a); }
function clampf(float $v, float $a, float $b): float { return max($a, min($b, $v)); }

// ---- balances: always a SUM over the ledger ----
function coin_balance(PDO $db, int $u): int { $s = $db->prepare('SELECT COALESCE(SUM(amount),0) FROM coin_transactions WHERE user_id=?'); $s->execute([$u]); return (int)$s->fetchColumn(); }
function dia_balance(PDO $db, int $u): int { $s = $db->prepare('SELECT COALESCE(SUM(amount),0) FROM diamond_transactions WHERE user_id=?'); $s->execute([$u]); return (int)$s->fetchColumn(); }
function lock_user(PDO $db, int $u): void { $s = $db->prepare('SELECT user_id FROM users WHERE user_id=? FOR UPDATE'); $s->execute([$u]); $s->fetchAll(); }   // serialises spending
function add_coins(PDO $db, int $u, int $amt, string $reason, string $src, ?int $task = null, ?int $goal = null): void {
  $db->prepare('INSERT INTO coin_transactions (user_id,amount,reason,source,task_id,goal_id) VALUES (?,?,?,?,?,?)')->execute([$u, $amt, mb_substr($reason, 0, 160), $src, $task, $goal]);
}
function add_diamonds(PDO $db, int $u, int $amt, string $reason, ?int $goal = null, ?string $season = null): void {
  $db->prepare('INSERT INTO diamond_transactions (user_id,amount,reason,goal_id,season_id) VALUES (?,?,?,?,?)')->execute([$u, $amt, mb_substr($reason, 0, 160), $goal, $season]);
}

// ---- tasks ----
function task_difficulty(PDO $db, int $u, string $type, string $effort, bool $skip, int $created, int $deadline): array {
  if ($skip) return ['label' => 'N/A', 'score' => null, 'pressure' => null, 'eff' => null, 'hist' => 0.0];
  $pressure = min(1.0, 1 / max(($deadline - $created) / DAYSEC, 0.04));
  $eff = EFFORT_W[$effort] ?? .5;
  $st = $db->prepare("SELECT COUNT(*) n, COALESCE(SUM(timing='late' OR status='pending'),0) late FROM tasks WHERE user_id=? AND task_type=? AND (status='completed' OR deadline < UTC_TIMESTAMP())");
  $st->execute([$u, $type]); $r = $st->fetch(); $n = (int)$r['n'];
  $hist = $n >= 3 ? (int)$r['late'] / $n : 0.0;                      // history only counts once there are 3 comparable tasks
  $score = .4 * $pressure + .6 * $eff + .1 * $hist;
  return ['label' => $score < .3 ? 'Easy' : ($score < .55 ? 'Medium' : 'Hard'), 'score' => round($score, 3), 'pressure' => $pressure, 'eff' => $eff, 'hist' => $hist];
}
function timing_of(int $created, int $deadline, int $at): string {
  if ($at > $deadline) return 'late';
  return ($deadline - $at >= ($deadline - $created) * .25) ? 'early' : 'ontime';     // early = at least a quarter of the time left
}
function reward_for(string $diff, string $timing): int {
  $b = COIN_BASE[$diff] ?? 1;
  return $timing === 'late' ? intdiv($b, 2) : ($timing === 'early' ? $b + (int)ceil($b / 2) : $b);
}

// ---- placing things in the garden ----
function place_spot(array $pts, float $x0, float $x1, float $y0, float $y1, float $ys, int $tries): array {
  $best = [($x0 + $x1) / 2, ($y0 + $y1) / 2]; $bd = -1;
  for ($i = 0; $i < $tries; $i++) {
    $x = rnd($x0, $x1); $y = rnd($y0, $y1); $d = 1e9;
    foreach ($pts as $p) $d = min($d, hypot($p[0] - $x, ($p[1] - $y) * $ys));
    if ($d > $bd) { $bd = $d; $best = [round($x, 2), round($y, 2)]; }
  }
  return $best;
}
function spots(PDO $db, string $sql, int $u): array { $s = $db->prepare($sql); $s->execute([$u]); return array_map(fn($r) => [(float)$r[0], (float)$r[1]], $s->fetchAll(PDO::FETCH_NUM)); }
function place_plant(PDO $db, int $u): array { return place_spot(spots($db, 'SELECT garden_x,garden_y FROM tasks WHERE user_id=? AND garden_x IS NOT NULL', $u), 6, 94, 60, 94, 1.6, 40); }
function place_sky(PDO $db, int $u): array { return place_spot(spots($db, 'SELECT x,y FROM garden_decorations WHERE user_id=?', $u), 10, 90, 14, 40, 1.0, 30); }
function place_pet(PDO $db, int $u): array { return place_spot(spots($db, 'SELECT garden_x,garden_y FROM pets WHERE user_id=?', $u), 10, 90, 76, 92, 2.0, 30); }

// ---- goals ----
// Progress = (start - current) / (start - target), clamped 0 to 1; a hand-set value replaces it; subtasks replace both.
// $top = top-level subtasks, each ['done'=>bool,'children'=>[['done'=>bool],...]]. With subtasks, progress is the share done; otherwise it is the score progress.
function goal_progress(array $g, array $top): float {
  if ($top) {
    $sum = 0.0;
    foreach ($top as $n) { $k = $n['children'] ?? []; $sum += $k ? count(array_filter($k, fn($c) => $c['done'])) / count($k) : ($n['done'] ? 1 : 0); }
    return round($sum / count($top), 4);
  }
  if (($g['manual_progress'] ?? null) !== null) return round(clampf((float)$g['manual_progress'], 0, 1), 4);   // set by hand until the next relevant log
  $span = (float)$g['baseline'] - (float)$g['target'];
  return $span > 0 ? round(clampf(((float)$g['baseline'] - (float)$g['current_score']) / $span, 0, 1), 4) : 0.0;   // (start - current) / (start - target), 0 to 1
}

// ---- pets: hunger and joy fall over time (joy falls slower with 2+ home items) ----
function pet_now(array $p, int $homeCount): array {
  $m = max(0, (time() - strtotime($p['stats_updated_at'] . ' UTC')) / 60);
  return ['fullness' => (int)round(clampf((float)$p['fullness'] - $m / 12, 0, 100)), 'joy' => (int)round(clampf((float)$p['joy'] - $m / ($homeCount >= 2 ? 40 : 20), 0, 100))];
}
function home_count(PDO $db, int $u): int { $s = $db->prepare('SELECT COUNT(*) FROM user_home_items WHERE user_id=?'); $s->execute([$u]); return (int)$s->fetchColumn(); }
function commit_pet(PDO $db, int $u, array $p): array {          // write the decayed values so a change starts from "now"
  $n = pet_now($p, home_count($db, $u));
  $db->prepare('UPDATE pets SET fullness=?, joy=?, stats_updated_at=UTC_TIMESTAMP() WHERE pet_id=?')->execute([$n['fullness'], $n['joy'], $p['pet_id']]);
  return $n;
}

// ---- notifications: due soon and goal ending (called whenever the page asks for notifications) ----
function left_text(int $sec): string {
  if ($sec < 3600) return max(1, (int)ceil($sec / 60)) . ' min';
  if ($sec < 48 * 3600) return (int)floor($sec / 3600) . 'h';
  return (int)floor($sec / DAYSEC) . ' days';
}
function sync_notifications(PDO $db, int $u): void {
  $now = time();
  $t = $db->prepare("SELECT task_id,title,deadline FROM tasks WHERE user_id=? AND status='pending' AND notified=0 AND deadline > UTC_TIMESTAMP() AND deadline < (UTC_TIMESTAMP() + INTERVAL 30 HOUR)");
  $t->execute([$u]);
  foreach ($t->fetchAll() as $r) {
    $db->prepare("INSERT INTO notifications (user_id,text,target_page) VALUES (?,?,'tasks')")->execute([$u, 'Task "' . $r['title'] . '" is due in ' . left_text(strtotime($r['deadline'] . ' UTC') - $now) . '.']);
    $db->prepare('UPDATE tasks SET notified=1 WHERE task_id=?')->execute([$r['task_id']]);
  }
  $g = $db->prepare("SELECT goal_id,title,deadline FROM goals WHERE user_id=? AND status='active' AND notified=0 AND deadline > UTC_TIMESTAMP() AND deadline < (UTC_TIMESTAMP() + INTERVAL 7 DAY)");
  $g->execute([$u]);
  foreach ($g->fetchAll() as $r) {
    $db->prepare("INSERT INTO notifications (user_id,text,target_page) VALUES (?,?,'goals')")->execute([$u, 'Your goal "' . $r['title'] . '" ends in ' . left_text(strtotime($r['deadline'] . ' UTC') - $now) . '.']);
    $db->prepare('UPDATE goals SET notified=1 WHERE goal_id=?')->execute([$r['goal_id']]);
  }
}

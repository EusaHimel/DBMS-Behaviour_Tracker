<?php
declare(strict_types=1);
/* ============================================================================
   PATTERN RULES: the one place where the five behaviour patterns are defined and calculated.

   Each pattern has three lists of conditions:
     relevant  the situation fits. The event counts for this pattern only if ANY of these is true.
     match     the unhelpful behaviour happened. Each condition that is true adds 1 to the event's match score.
     healthy   a healthy alternative happened. Each condition that is true adds 1 to its healthy score.
   A condition is a set of fields and allowed values. ALL its fields must fit (so it is JSON friendly
   and the page can use the very same rules for the live preview in step 5).

   Logging rule for one event:
     1. If the event matches at least one pattern, only MATCHES are logged: the patterns it is relevant to and has
        a match score above 0. One pattern = logged once, two = both, three or more = the strongest two
        (ties are broken in PATTERN_ORDER).
     2. If it matches none, the same rule is applied to HEALTHY scores.
     3. Anything else is neutral and ignored.
   Strength = matches / (matches + healthy) over the last 30 days. Detected = 3 or more matches.
   Dropped routines also reads habit and health tasks: late or overdue = match, on time or early = healthy.
   ============================================================================ */
const PATTERN_ORDER = ['avoid', 'procrast', 'impulse', 'escape', 'skip'];
const ROUTINE_TASK_TYPES = ['habit', 'health'];

function pattern_rules(): array {
  static $r = null; if ($r !== null) return $r;
  $avoidB = ['Opened social media', 'Watched videos', 'Cleaned instead', 'Stayed in bed'];
  $screen = ['Opened social media', 'Watched videos'];
  $startD = ['Chose to start now', 'Chose to break it into steps'];
  return $r = [
    'avoid' => ['name' => 'Deadline avoidance',
      'rule' => 'Three or more avoidance choices (social media, videos, cleaning, staying in bed, skipping or taking the quick reward) while a deadline is close, within 30 days.',
      'relevant' => [['trigger' => ['Deadline is close (within a day)']], ['context' => ['Due Task', 'Stress']]],
      'match'    => [['behavior' => $avoidB], ['decision' => ['Chose to skip', 'Chose the quick reward']]],
      'healthy'  => [['behavior' => ['Started the task', 'Asked for help', 'Talked to a friend about it']], ['decision' => [...$startD, 'Chose to ask for help']]]],
    'procrast' => ['name' => 'Late starts',
      'rule' => 'Three or more delays, rushed finishes or missed deadlines on tasks, team work, or busy days, within 30 days.',
      'relevant' => [['context' => ['Due Task', 'Team work', 'Busy']]],
      'match'    => [['decision' => ['Chose to delay']], ['result' => ['Rushed finish', 'Missed the deadline']]],
      'healthy'  => [['decision' => $startD], ['result' => ['Finished on time']]]],
    'impulse' => ['name' => 'Impulsive choices',
      'rule' => 'Three or more quick-reward choices after a notification, boredom, an invitation, or social media, within 30 days.',
      'relevant' => [['trigger' => ['Got a phone notification', 'Feeling bored', 'A friend invited me somewhere', 'Saw something on social media']]],
      'match'    => [['decision' => ['Chose the quick reward']], ['decision' => ['Chose to skip'], 'trigger' => ['A friend invited me somewhere']]],
      'healthy'  => [['behavior' => ['Silenced my phone', 'Read a book']], ['decision' => ['Chose to wind down', 'Chose to start now']]]],
    'escape' => ['name' => 'Screen escape',
      'rule' => 'Three or more times opening social media or watching videos late at night, when alone, stressed, bored, or overwhelmed, within 30 days.',
      'relevant' => [['context' => ['Late night hours', 'Alone at home', 'Stress']], ['trigger' => ['Feeling overwhelmed', 'Feeling bored', 'Feeling anxious', 'Feeling lonely', 'Saw something on social media']]],
      'match'    => [['behavior' => $screen]],
      'healthy'  => [['behavior' => ['Read a book', 'Silenced my phone', 'Took a short break', 'Talked to a friend about it']], ['decision' => ['Chose to wind down']]]],
    'skip' => ['name' => 'Dropped routines',
      'rule' => 'Three or more skipped or late routines when low on energy, busy, or stressed, within 30 days.',
      'relevant' => [['context' => ['Feeling low on energy', 'Busy', 'Stress']]],
      'match'    => [['decision' => ['Chose to skip']], ['behavior' => ['Stayed in bed']]],
      'healthy'  => [['decision' => ['Chose to start now', 'Chose to wind down']], ['behavior' => ['Took a short break']], ['result' => ['Felt calmer']]]],
  ];
}

// ---------- evaluating one event ----------
function cond_met(array $cond, array $e): bool {
  foreach ($cond as $field => $allowed) if (!in_array($e[$field] ?? null, $allowed, true)) return false;
  return true;
}
function count_met(array $conds, array $e): int { $n = 0; foreach ($conds as $c) if (cond_met($c, $e)) $n++; return $n; }
function event_for_rules(array $row): array {      // database column trigger_cue is called "trigger" in the rules
  return ['context' => $row['context'], 'trigger' => $row['trigger_cue'] ?? $row['trigger'], 'behavior' => $row['behavior'], 'decision' => $row['decision'], 'result' => $row['result']];
}
function pattern_eval(array $e): array {
  $out = [];
  foreach (pattern_rules() as $id => $d) {
    $rel = false; foreach ($d['relevant'] as $c) if (cond_met($c, $e)) { $rel = true; break; }
    $out[$id] = ['relevant' => $rel, 'match' => $rel ? count_met($d['match'], $e) : 0, 'healthy' => $rel ? count_met($d['healthy'], $e) : 0];
  }
  return $out;
}
// returns [[pattern, outcome, condition_count, rank_no], ...]  (at most 2)
function pattern_choose(array $eval): array {
  $cand = []; $outcome = 'match';
  foreach (PATTERN_ORDER as $p) if ($eval[$p]['match'] > 0) $cand[] = [$p, $eval[$p]['match']];
  if (!$cand) { $outcome = 'healthy'; foreach (PATTERN_ORDER as $p) if ($eval[$p]['healthy'] > 0) $cand[] = [$p, $eval[$p]['healthy']]; }
  usort($cand, fn($a, $b) => $b[1] <=> $a[1] ?: array_search($a[0], PATTERN_ORDER) <=> array_search($b[0], PATTERN_ORDER));
  $rows = []; foreach (array_slice($cand, 0, 2) as $i => [$p, $n]) $rows[] = [$p, $outcome, $n, $i + 1];
  return $rows;
}
function write_event_patterns(PDO $db, int $eventId, array $rows): void {
  $db->prepare('DELETE FROM event_patterns WHERE event_id=?')->execute([$eventId]);
  $ins = $db->prepare('INSERT INTO event_patterns (event_id,pattern,outcome,condition_count,rank_no) VALUES (?,?,?,?,?)');
  foreach ($rows as [$p, $o, $n, $rk]) $ins->execute([$eventId, $p, $o, $n, $rk]);
}

// ---------- counting ----------
// matches and healthy events in a 30 day window that ended $endDaysAgo days ago
function pattern_counts(PDO $db, int $u, int $endDaysAgo = 0, int $windowDays = 30): array {
  $st = $db->prepare("SELECT x.pattern, SUM(x.outcome='match') m, SUM(x.outcome='healthy') h FROM (
      SELECT ep.pattern, ep.outcome FROM event_patterns ep JOIN events e ON e.event_id = ep.event_id
        WHERE e.user_id=? AND e.occurred_at > (UTC_TIMESTAMP() - INTERVAL ? DAY) AND e.occurred_at <= (UTC_TIMESTAMP() - INTERVAL ? DAY + INTERVAL 10 MINUTE)
      UNION ALL
      SELECT tp.pattern, tp.outcome FROM task_patterns tp JOIN tasks t ON t.task_id = tp.task_id
        WHERE t.user_id=? AND COALESCE(t.completed_at,t.deadline) > (UTC_TIMESTAMP() - INTERVAL ? DAY) AND COALESCE(t.completed_at,t.deadline) <= (UTC_TIMESTAMP() - INTERVAL ? DAY + INTERVAL 10 MINUTE)
    ) x GROUP BY x.pattern");
  $start = $endDaysAgo + $windowDays; $st->execute([$u, $start, $endDaysAgo, $u, $start, $endDaysAgo]);
  $o = array_fill_keys(PATTERN_ORDER, [0, 0]);
  foreach ($st->fetchAll() as $r) $o[$r['pattern']] = [(int)$r['m'], (int)$r['h']];
  return $o;
}
function strength_of(int $m, int $h): ?float { return $m + $h ? round($m / ($m + $h), 3) : null; }   // neutral events are never counted
function detected_set(PDO $db, int $u): array { $c = pattern_counts($db, $u); return array_values(array_filter(PATTERN_ORDER, fn($p) => $c[$p][0] >= 3)); }
function trend_of(array $weekly): array {
  $pts = array_values(array_filter($weekly, fn($w) => $w['strength'] !== null));
  if (count($pts) < 2) return ['label' => 'Not enough data', 'class' => 'b-na', 'delta' => null];
  $d = round($pts[count($pts) - 1]['strength'] - $pts[count($pts) - 2]['strength'], 3);
  if ($d <= -0.05) return ['label' => 'Weakening', 'class' => 'b-high', 'delta' => $d];
  if ($d >= 0.05)  return ['label' => 'Strengthening', 'class' => 'b-low', 'delta' => $d];
  return ['label' => 'Steady', 'class' => 'b-mid', 'delta' => $d];
}
function pattern_stats(PDO $db, int $u): array {
  $now = pattern_counts($db, $u); $weeks = [];
  for ($k = 5; $k >= 0; $k--) $weeks[$k] = pattern_counts($db, $u, $k * 7);
  $ids = $db->prepare('SELECT ep.pattern, ep.outcome, ep.event_id FROM event_patterns ep JOIN events e ON e.event_id=ep.event_id WHERE e.user_id=? AND e.occurred_at > (UTC_TIMESTAMP() - INTERVAL 30 DAY) ORDER BY e.occurred_at');
  $ids->execute([$u]); $byP = [];
  foreach ($ids->fetchAll() as $r) $byP[$r['pattern']][$r['outcome']][] = (int)$r['event_id'];
  $out = [];
  foreach (pattern_rules() as $id => $d) {
    $weekly = []; for ($k = 5; $k >= 0; $k--) $weekly[] = ['weeks_ago' => $k, 'matches' => $weeks[$k][$id][0], 'healthy' => $weeks[$k][$id][1], 'strength' => strength_of($weeks[$k][$id][0], $weeks[$k][$id][1])];
    [$m, $h] = $now[$id];
    $out[] = ['id' => $id, 'name' => $d['name'], 'rule' => $d['rule'], 'matches' => $m, 'healthy' => $h, 'strength' => strength_of($m, $h), 'detected' => $m >= 3,
              'trend' => trend_of($weekly), 'weekly' => $weekly, 'match_event_ids' => $byP[$id]['match'] ?? [], 'healthy_event_ids' => $byP[$id]['healthy'] ?? []];
  }
  return $out;
}

// ---------- events: called whenever an event is saved ----------
// Re-logs the event and creates a notification when a pattern newly reaches 3 matches. Returns the newly detected patterns.
function log_event_patterns(PDO $db, int $u, int $eventId): array {
  $st = $db->prepare('SELECT * FROM events WHERE event_id=? AND user_id=?'); $st->execute([$eventId, $u]); $e = $st->fetch();
  if (!$e) return [];
  $before = detected_set($db, $u);
  write_event_patterns($db, $eventId, pattern_choose(pattern_eval(event_for_rules($e))));
  $new = [];
  foreach (array_diff(detected_set($db, $u), $before) as $p) {
    $d = pattern_rules()[$p];
    $db->prepare("INSERT INTO notifications (user_id,text,target_page,pattern) VALUES (?,?,'insights',?)")->execute([$u, 'Pattern detected: ' . $d['name'] . '. ' . $d['rule'], $p]);
    $new[] = ['id' => $p, 'name' => $d['name'], 'notification_id' => (int)$db->lastInsertId()];
  }
  return $new;
}

// ---------- tasks: Dropped routines also reads habit and health tasks ----------
function log_routine_task(PDO $db, int $taskId): void {
  $st = $db->prepare('SELECT task_type, status, timing FROM tasks WHERE task_id=?'); $st->execute([$taskId]); $t = $st->fetch();
  if (!$t || !in_array($t['task_type'], ROUTINE_TASK_TYPES, true) || $t['status'] !== 'completed') return;
  $db->prepare("INSERT INTO task_patterns (task_id,pattern,outcome) VALUES (?, 'skip', ?) ON DUPLICATE KEY UPDATE outcome=VALUES(outcome)")
     ->execute([$taskId, $t['timing'] === 'late' ? 'match' : 'healthy']);
}
function sync_overdue_routines(PDO $db, int $u): void {      // an overdue habit or health task counts as a match until it is done
  $db->prepare("INSERT IGNORE INTO task_patterns (task_id,pattern,outcome)
                SELECT task_id,'skip','match' FROM tasks WHERE user_id=? AND status='pending' AND deadline < UTC_TIMESTAMP() AND task_type IN ('habit','health')")->execute([$u]);
}

// ---------- rebuild everything (run this after you change a rule) ----------
function recalc_patterns(PDO $db, ?int $only = null): array {
  $w = $only ? ' WHERE user_id = ' . (int)$only : '';
  $n = 0; foreach ($db->query('SELECT * FROM events' . $w)->fetchAll() as $e) { write_event_patterns($db, (int)$e['event_id'], pattern_choose(pattern_eval(event_for_rules($e)))); $n++; }
  $db->exec('DELETE FROM task_patterns WHERE task_id IN (SELECT task_id FROM tasks' . $w . ')');
  $tasks = $db->query("SELECT task_id FROM tasks" . ($w ? $w . ' AND' : ' WHERE') . " status='completed' AND task_type IN ('habit','health')")->fetchAll(PDO::FETCH_COLUMN);
  foreach ($tasks as $id) log_routine_task($db, (int)$id);
  $users = $only ? [$only] : $db->query('SELECT user_id FROM users')->fetchAll(PDO::FETCH_COLUMN);
  foreach ($users as $u) sync_overdue_routines($db, (int)$u);
  return ['events' => $n, 'routine_tasks' => count($tasks)];
}

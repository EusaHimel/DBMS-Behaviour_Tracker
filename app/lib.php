<?php
declare(strict_types=1);
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Allowed values. These match the ENUM columns in behavioralx.sql exactly.
const LISTS = [
  'task_type'  => ['academic','health','habit','occasion','growth'],
  'effort'     => ['Low','Medium','High'],
  'difficulty' => ['Easy','Medium','Hard','N/A'],
  'context'    => ['Due Task','Stress','Team work','Late night hours','Feeling low on energy','Hanging out with friends','Family time','Alone at home','Busy'],
  'trigger'    => ['Deadline is close (within a day)','Got a phone notification','Feeling overwhelmed','Feeling bored','A friend invited me somewhere','Not sure what to do next','Feeling anxious','Saw something on social media','Someone criticized me','Feeling lonely'],
  'behavior'   => ['Started the task','Asked for help','Silenced my phone','Read a book','Opened social media','Watched videos','Cleaned instead','Stayed in bed','Talked to a friend about it','Took a short break'],
  'decision'   => ['Chose to start now','Chose to break it into steps','Chose to ask for help','Chose to wind down','Chose to delay','Chose to skip','Chose the quick reward'],
  'result'     => ['Finished on time','Made progress','Felt calmer','Rushed finish','Lost time','Missed the deadline'],
  'success'    => ['Low','Medium','High'],
  'goal_type'  => ['avoid','procrast','impulse','escape','skip'],
  'focus_track'=> ['lofi','box','rain','ocean','forest','pad'],
  'theme'      => ['system','light','dark'],
  'age_group'  => ['Under 18','18 to 24','25 to 34','35 to 44','45 and over'],
];

// Works even when the mbstring extension is not installed.
if (!function_exists('mb_strlen')) { function mb_strlen(string $s): int { return (int)preg_match_all('/./su', $s); } }
if (!function_exists('mb_substr')) { function mb_substr(string $s, int $start, ?int $len = null): string { preg_match_all('/./su', $s, $m); return implode('', array_slice($m[0], $start, $len)); } }

require_once __DIR__ . '/rules.php';
require_once __DIR__ . '/patterns.php';     // the five pattern rules and their counting
require_once __DIR__ . '/goals_lib.php';    // goal helpers (starting level, live score, bee, closing)

function db(): PDO {
  static $p = null;
  if ($p === null) {
    $c = require __DIR__ . '/config.php';
    $p = new PDO($c['dsn'], $c['user'], $c['pass'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $p->exec("SET time_zone = '+00:00'");   // everything is stored and compared in UTC
  }
  return $p;
}
function out($data, int $code = 200): never { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 400): never { out(['error' => $msg], $code); }
function body(): array {
  static $b = null;
  if ($b === null) { $raw = file_get_contents('php://input'); $b = $raw ? json_decode($raw, true) : []; if (!is_array($b)) fail('Invalid JSON'); }
  return $b;
}
function uid(): int { if (empty($_SESSION['uid'])) fail('Not signed in', 401); return (int)$_SESSION['uid']; }
function csrf_check(): void {
  $t = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $t)) fail('Bad or missing CSRF token', 403);
}

// ---- input helpers: validate everything, never trust the page ----
function pick(array $in, string $k, string $list, bool $req = true): ?string {
  $v = $in[$k] ?? null;
  if ($v === null || $v === '') { if ($req) fail("Missing $k"); return null; }
  if (!is_string($v) || !in_array($v, LISTS[$list], true)) fail("Invalid $k");
  return $v;
}
function str(array $in, string $k, int $max, bool $req = true): ?string {
  $v = isset($in[$k]) ? trim((string)$in[$k]) : '';
  if ($v === '') { if ($req) fail("Missing $k"); return null; }
  if (mb_strlen($v) > $max) fail("$k is too long (max $max)");
  return $v;
}
function num(array $in, string $k, float $min, float $max, bool $req = true): ?float {
  $v = $in[$k] ?? null;
  if ($v === null || $v === '') { if ($req) fail("Missing $k"); return null; }
  if (!is_numeric($v) || $v < $min || $v > $max) fail("Invalid $k");
  return (float)$v;
}
// Dates: the page sends epoch milliseconds (or an ISO string); the database stores UTC DATETIME.
function to_dt($v): string {
  $t = is_numeric($v) ? (int)floor($v / 1000) : strtotime((string)$v);
  if (!$t) fail('Invalid date');
  return gmdate('Y-m-d H:i:s', $t);
}
function ms(?string $s): ?int { return $s === null ? null : strtotime($s . ' UTC') * 1000; }

// Called by the routes whenever patterns can have changed. Goal scores follow the live pattern strength.
function after_task_completed(PDO $db, int $userId, int $taskId): void { log_routine_task($db, $taskId); sync_goals($db, $userId); }
function after_event_saved(PDO $db, int $userId, int $eventId): array { $new = log_event_patterns($db, $userId, $eventId); sync_goals($db, $userId); return $new; }

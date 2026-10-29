<?php
// Pattern strength, detection and weekly trend, worked out from the logged events and routine tasks.
return function (string $m, array $q): void {
  $u = uid(); $db = db();
  if ($m !== 'GET') fail('Not found', 404);
  if (($q['a'] ?? '') === 'rules') out(['order' => PATTERN_ORDER, 'rules' => pattern_rules()]);   // the page evaluates the live preview with these very rules
  sync_goals($db, $u);          // brings overdue routines and goal scores up to date
  out(['patterns' => pattern_stats($db, $u)]);
};

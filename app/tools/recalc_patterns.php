<?php
// Rebuilds event_patterns and task_patterns from the rules in app/patterns.php.
// Run after changing a rule:   php app/tools/recalc_patterns.php [user_id]
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../lib.php';
$r = recalc_patterns(db(), isset($argv[1]) ? (int)$argv[1] : null);
echo "Recalculated {$r['events']} events and {$r['routine_tasks']} habit/health tasks.\n";

<?php
function save_event(PDO $db, int $u, int $id, array $b): array {
  $f = [pick($b,'context','context'), pick($b,'trigger','trigger'), pick($b,'behavior','behavior'), pick($b,'decision','decision'),
        pick($b,'result','result'), pick($b,'success','success', false) ?? 'Medium'];
  $at = to_dt($b['occurred_at'] ?? null);
  if (strtotime($at . ' UTC') > time() + 300) fail('An event cannot be in the future');
  $dur = num($b,'duration_min',1,1440,false); $mood = num($b,'mood',0,100,false); $stress = num($b,'stress',0,100,false);
  $alts = array_slice(array_values(array_filter(array_map(fn($x) => mb_substr(trim((string)$x), 0, 80), (array)($b['alternatives'] ?? [])))), 0, 10);
  $db->beginTransaction();
  if ($id) {
    $st = $db->prepare('UPDATE events SET occurred_at=?,context=?,trigger_cue=?,behavior=?,decision=?,result=?,success=?,duration_min=?,mood=?,stress=? WHERE event_id=? AND user_id=?');
    $st->execute([$at,$f[0],$f[1],$f[2],$f[3],$f[4],$f[5],$dur,$mood,$stress,$id,$u]);
    $own = $db->prepare('SELECT 1 FROM events WHERE event_id=? AND user_id=?'); $own->execute([$id,$u]);
    if (!$own->fetch()) { $db->rollBack(); fail('Event not found', 404); }
    $db->prepare('DELETE FROM event_alternatives WHERE event_id=?')->execute([$id]);
  } else {
    $db->prepare('INSERT INTO events (user_id,occurred_at,context,trigger_cue,behavior,decision,result,success,duration_min,mood,stress) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
       ->execute([$u,$at,$f[0],$f[1],$f[2],$f[3],$f[4],$f[5],$dur,$mood,$stress]);
    $id = (int)$db->lastInsertId();
  }
  $ins = $db->prepare('INSERT INTO event_alternatives (event_id,text) VALUES (?,?)');
  foreach ($alts as $t) $ins->execute([$id, $t]);
  $note = str($b,'note',2000,false);
  if ($note !== null) $db->prepare('INSERT INTO event_notes (event_id,text) VALUES (?,?)')->execute([$id, $note]);
  $new = after_event_saved($db, $u, $id);   // logs the patterns and alerts when one is newly detected
  $db->commit();
  return ['id' => $id, 'new_patterns' => $new];
}
function events_out(PDO $db, int $u, ?int $only = null, int $days = 0): array {
  $sql = 'SELECT * FROM events WHERE user_id = ?'; $p = [$u];
  if ($only) { $sql .= ' AND event_id = ?'; $p[] = $only; }
  if ($days) { $sql .= ' AND occurred_at >= (UTC_TIMESTAMP() - INTERVAL ? DAY)'; $p[] = $days; }
  $st = $db->prepare($sql . ' ORDER BY occurred_at DESC'); $st->execute($p); $rows = $st->fetchAll();
  if (!$rows) return [];
  $ids = array_column($rows, 'event_id'); $in = implode(',', array_fill(0, count($ids), '?'));
  $alt = $db->prepare("SELECT event_id,text FROM event_alternatives WHERE event_id IN ($in) ORDER BY alternative_id"); $alt->execute($ids);
  $nt = $db->prepare("SELECT event_id,text,created_at FROM event_notes WHERE event_id IN ($in) ORDER BY created_at"); $nt->execute($ids);
  $pt = $db->prepare("SELECT event_id,pattern,outcome,rank_no FROM event_patterns WHERE event_id IN ($in) ORDER BY rank_no"); $pt->execute($ids);
  $P = []; foreach ($pt->fetchAll() as $r) $P[$r['event_id']][] = ['pattern'=>$r['pattern'],'outcome'=>$r['outcome'],'rank'=>(int)$r['rank_no']];
  $A = []; foreach ($alt->fetchAll() as $r) $A[$r['event_id']][] = $r['text'];
  $N = []; foreach ($nt->fetchAll() as $r) $N[$r['event_id']][] = ['text'=>$r['text'],'at'=>ms($r['created_at'])];
  return array_map(fn($e) => ['id'=>(int)$e['event_id'],'occurred_at'=>ms($e['occurred_at']),'context'=>$e['context'],'trigger'=>$e['trigger_cue'],
    'behavior'=>$e['behavior'],'decision'=>$e['decision'],'result'=>$e['result'],'success'=>$e['success'],'duration_min'=>$e['duration_min']===null?null:(int)$e['duration_min'],
    'mood'=>$e['mood']===null?null:(int)$e['mood'],'stress'=>$e['stress']===null?null:(int)$e['stress'],
    'alternatives'=>$A[$e['event_id']] ?? [],'notes'=>$N[$e['event_id']] ?? [],'patterns'=>$P[$e['event_id']] ?? []], $rows);
}
return function (string $m, array $q): void {
  $u = uid(); $db = db(); $id = isset($q['id']) ? (int)$q['id'] : 0; $a = $q['a'] ?? '';
  if ($m === 'GET') out(events_out($db, $u, $id ?: null, isset($q['days']) ? (int)$q['days'] : 0));
  if ($m === 'POST' && !$id) { $r = save_event($db, $u, 0, body()); $o = events_out($db, $u, $r['id'])[0]; $o['new_patterns'] = $r['new_patterns']; out($o, 201); }
  if ($m === 'PUT' && $id)   { $r = save_event($db, $u, $id, body()); $o = events_out($db, $u, $id)[0]; $o['new_patterns'] = $r['new_patterns']; out($o); }
  if ($m === 'POST' && $id && $a === 'note') {
    $own = $db->prepare('SELECT 1 FROM events WHERE event_id=? AND user_id=?'); $own->execute([$id, $u]);
    if (!$own->fetch()) fail('Event not found', 404);
    $db->prepare('INSERT INTO event_notes (event_id,text) VALUES (?,?)')->execute([$id, str(body(), 'text', 2000)]);
    out(events_out($db, $u, $id)[0], 201);
  }
  if ($m === 'DELETE' && $id) {
    $st = $db->prepare('DELETE FROM events WHERE event_id=? AND user_id=?'); $st->execute([$id, $u]);
    if (!$st->rowCount()) fail('Event not found', 404);
    sync_goals($db, $u);                       // goal scores follow the pattern strength
    out(['ok' => true]);
  }
  fail('Not found', 404);
};

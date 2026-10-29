<?php
return function (string $m, array $q): void {
  $u = uid(); $db = db();
  if ($m === 'GET') {
    sync_notifications($db, $u);                 // creates due-soon and goal-ending alerts
    $st = $db->prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'); $st->execute([$u]);
    out(array_map(fn($n) => ['id'=>(int)$n['notification_id'],'text'=>$n['text'],'read'=>(bool)$n['is_read'],'page'=>$n['target_page'],'pattern'=>$n['pattern'],'at'=>ms($n['created_at'])], $st->fetchAll()));
  }
  if ($m === 'PUT') {          // mark one (?id=) or all as read
    $id = isset($q['id']) ? (int)$q['id'] : 0;
    $st = $id ? $db->prepare('UPDATE notifications SET is_read=1 WHERE user_id=? AND notification_id=?') : $db->prepare('UPDATE notifications SET is_read=1 WHERE user_id=?');
    $st->execute($id ? [$u, $id] : [$u]);
    out(['ok' => true]);
  }
  if ($m === 'DELETE') {       // clear all
    $db->prepare('DELETE FROM notifications WHERE user_id=?')->execute([$u]);
    out(['ok' => true]);
  }
  fail('Not found', 404);
};

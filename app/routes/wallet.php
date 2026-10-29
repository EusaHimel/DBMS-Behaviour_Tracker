<?php
// Read-only: coin and diamond ledgers and garden visitors. Balance = SUM of the ledger, calculated on the server.
return function (string $m, array $q): void {
  $u = uid(); $db = db();
  if ($m !== 'GET') fail('Not found', 404);
  $c = $db->prepare('SELECT tx_id,amount,reason,created_at FROM coin_transactions WHERE user_id=? ORDER BY created_at, tx_id'); $c->execute([$u]);
  $d = $db->prepare('SELECT tx_id,amount,reason,created_at FROM diamond_transactions WHERE user_id=? ORDER BY created_at, tx_id'); $d->execute([$u]);
  $g = $db->prepare('SELECT d.deco_id,d.kind,d.goal_id,d.x,d.y,d.created_at,g.title FROM garden_decorations d JOIN goals g ON g.goal_id=d.goal_id WHERE d.user_id=? ORDER BY d.created_at'); $g->execute([$u]);
  $tx = fn($r) => ['id'=>(int)$r['tx_id'],'amount'=>(int)$r['amount'],'reason'=>$r['reason'],'at'=>ms($r['created_at'])];
  out(['coin_balance'=>coin_balance($db, $u), 'diamond_balance'=>dia_balance($db, $u),        // the balances are the SUM of the ledgers, counted here
       'coins'=>array_map($tx, $c->fetchAll()), 'diamonds'=>array_map($tx, $d->fetchAll()),
       'decos'=>array_map(fn($r) => ['id'=>(int)$r['deco_id'],'kind'=>$r['kind'],'goal_id'=>(int)$r['goal_id'],'x'=>(float)$r['x'],'y'=>(float)$r['y'],'title'=>$r['title'],'at'=>ms($r['created_at'])], $g->fetchAll())]);
};

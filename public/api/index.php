<?php
declare(strict_types=1);
require __DIR__ . '/../../app/lib.php';       // code and passwords live outside the public folder

$routes = ['auth','tasks','events','notifications','settings','patterns','goals','shop','profile','wallet'];
$r = $_GET['r'] ?? '';
if (!in_array($r, $routes, true)) fail('Not found', 404);
$m = $_SERVER['REQUEST_METHOD'];
if (!in_array($m, ['GET','POST','PUT','DELETE'], true)) fail('Method not allowed', 405);

$open = $r === 'auth' && in_array($_GET['a'] ?? '', ['login','signup','me'], true);
if ($m !== 'GET' && !$open) csrf_check();

try {
  (require __DIR__ . "/../../app/routes/$r.php")($m, $_GET);
} catch (PDOException $e) {
  error_log($e->getMessage());
  fail('Server error', 500);
}

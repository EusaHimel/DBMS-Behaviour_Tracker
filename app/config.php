<?php
// Copy your real values in here (or read them from environment variables).
return [
  'dsn'  => getenv('BX_DSN')  ?: 'mysql:host=127.0.0.1;dbname=behavioralx;charset=utf8mb4',
  'user' => getenv('BX_USER') ?: 'root',
  'pass' => getenv('BX_PASS') ?: '',
];

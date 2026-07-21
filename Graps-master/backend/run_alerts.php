<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$c = app()->make('App\Http\Controllers\Api\V1\AnalyticsController');
$m = new ReflectionMethod($c, 'generateDynamicAlerts');
$m->setAccessible(true);
$m->invoke($c);
echo "Done";

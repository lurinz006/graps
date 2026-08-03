<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

echo "Counting current records...\n";
$total = DB::table('spatial_data')->count();
echo 'Total before: '.$total."\n";

echo "Finding duplicates...\n";
$duplicates = DB::select('
    SELECT MIN(id) as min_id, latitude, longitude, date_committed, time_committed, offense, count(*)
    FROM spatial_data
    GROUP BY latitude, longitude, date_committed, time_committed, offense
    HAVING count(*) > 1
');

$deletedCount = 0;
foreach ($duplicates as $dup) {
    $deleted = DB::table('spatial_data')
        ->where('latitude', $dup->latitude)
        ->where('longitude', $dup->longitude)
        ->where('date_committed', $dup->date_committed)
        ->where('time_committed', $dup->time_committed)
        ->where('offense', $dup->offense)
        ->where('id', '!=', $dup->min_id)
        ->delete();
    $deletedCount += $deleted;
}

echo "Deleted $deletedCount duplicate rows.\n";

$totalAfter = DB::table('spatial_data')->count();
echo 'Total after: '.$totalAfter."\n";

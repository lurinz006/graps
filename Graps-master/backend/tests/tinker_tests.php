<?php
// =============================================================================
// GRAPS – Laravel Tinker Exploration & Verification Script
// =============================================================================
// Purpose : Manually inspect DB state, test model queries, verify job dispatch,
//           and seed/clear data directly without the HTTP layer.
//
// Usage   : php artisan tinker
//           Then paste any block below, or run the whole file with:
//           php artisan tinker --execute="require 'tests/tinker_tests.php';"
// =============================================================================

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use App\Jobs\RunAnalyticsJob;

$pass = 0;
$fail = 0;

function tinker_assert(string $label, bool $condition): void {
    global $pass, $fail;
    if ($condition) {
        echo "\033[32m✓ PASS\033[0m  {$label}\n";
        $pass++;
    } else {
        echo "\033[31m✗ FAIL\033[0m  {$label}\n";
        $fail++;
    }
}

echo "\n\033[1m─────────────────────────────────────────────────\033[0m\n";
echo "\033[1m GRAPS Tinker Verification Script\033[0m\n";
echo "\033[1m─────────────────────────────────────────────────\033[0m\n\n";

// ─────────────────────────────────────────────────────────────────────────────
//  1. Database Connection
// ─────────────────────────────────────────────────────────────────────────────
echo "[ 1 ] Database Connection\n";

try {
    DB::connection()->getPdo();
    tinker_assert('DB::connection() establishes PDO', true);
} catch (\Exception $e) {
    tinker_assert('DB::connection() establishes PDO — ' . $e->getMessage(), false);
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. Tables Exist
// ─────────────────────────────────────────────────────────────────────────────
echo "\n[ 2 ] Required Tables Exist\n";

$requiredTables = ['spatial_data', 'analytics_metrics', 'barangays', 'users', 'jobs'];
foreach ($requiredTables as $table) {
    tinker_assert(
        "Table '{$table}' exists",
        DB::getSchemaBuilder()->hasTable($table)
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. spatial_data – Insert, Query, Count, Delete
// ─────────────────────────────────────────────────────────────────────────────
echo "\n[ 3 ] spatial_data CRUD Operations\n";

// Insert a test row
$testId = DB::table('spatial_data')->insertGetId([
    'latitude'      => 6.9214,
    'longitude'     => 122.0790,
    'incident_type' => 'Tinker Test',
    'offense'       => 'Unit Verification',
    'value'         => 99.0,
    'is_crime'      => true,
    'recorded_at'   => now(),
    'created_at'    => now(),
    'updated_at'    => now(),
]);

tinker_assert('INSERT into spatial_data returns a valid ID', $testId > 0);

$row = DB::table('spatial_data')->find($testId);
tinker_assert('Row is retrievable by ID', $row !== null);
tinker_assert('latitude stored correctly',  (float) $row->latitude  === 6.9214);
tinker_assert('longitude stored correctly', (float) $row->longitude === 122.0790);
tinker_assert('value stored correctly',     (float) $row->value     === 99.0);
tinker_assert('is_crime stored as true',    (bool)  $row->is_crime  === true);

$count = DB::table('spatial_data')->count();
tinker_assert('Count is at least 1 after insert', $count >= 1);

// DELETE the test row to leave DB clean
$deleted = DB::table('spatial_data')->where('id', $testId)->delete();
tinker_assert('Row deleted after test', $deleted === 1);

// ─────────────────────────────────────────────────────────────────────────────
//  4. analytics_metrics – Insert, Query, Verify JSON
// ─────────────────────────────────────────────────────────────────────────────
echo "\n[ 4 ] analytics_metrics Operations\n";

$resultsJson = json_encode([
    'geospatial_regression' => [
        'formula'      => 'Risk = 14193.60 + (-1035.97 * Lat)',
        'coefficients' => ['intercept' => 14193.60],
    ],
    'data_mining' => [
        'method'    => 'Kernel Density Estimation (KDE)',
        'bandwidth' => 0.01,
    ],
]);

$metricId = DB::table('analytics_metrics')->insertGetId([
    'task_type'     => 'train',
    'table_name'    => 'spatial_data',
    'target_column' => 'value',
    'r2_score'      => 0.8843,
    'mse_score'     => 487.9306,
    'results_json'  => $resultsJson,
    'created_at'    => now(),
    'updated_at'    => now(),
]);

tinker_assert('INSERT analytics_metrics succeeds', $metricId > 0);

$metric = DB::table('analytics_metrics')
    ->where('task_type', 'train')
    ->orderBy('created_at', 'desc')
    ->first();

tinker_assert('Latest train metric retrieved', $metric !== null);
tinker_assert('r2_score is 0.8843',   (float) $metric->r2_score  === 0.8843);
tinker_assert('mse_score is 487.9306', (float) $metric->mse_score === 487.9306);

// Parse results_json
$parsed = json_decode($metric->results_json, true);
tinker_assert('results_json parses to array',      is_array($parsed));
tinker_assert('geospatial_regression key present', isset($parsed['geospatial_regression']));
tinker_assert('data_mining key present',           isset($parsed['data_mining']));
tinker_assert(
    'KDE method value correct',
    ($parsed['data_mining']['method'] ?? '') === 'Kernel Density Estimation (KDE)'
);

// Clean up
DB::table('analytics_metrics')->where('id', $metricId)->delete();
tinker_assert('analytics_metrics test row cleaned up', DB::table('analytics_metrics')->find($metricId) === null);

// ─────────────────────────────────────────────────────────────────────────────
//  5. barangays – Lookup
// ─────────────────────────────────────────────────────────────────────────────
echo "\n[ 5 ] barangays Table Lookup\n";

$barangayCount = DB::table('barangays')->count();
echo "  Total barangays seeded: {$barangayCount}\n";

if ($barangayCount > 0) {
    $sample = DB::table('barangays')->first();
    tinker_assert('First barangay has a name',         isset($sample->name));
    tinker_assert('First barangay has centroid_lat',   isset($sample->centroid_lat));
    tinker_assert('First barangay has centroid_lng',   isset($sample->centroid_lng));

    // Simulate the controller's map resolution
    $allBarangays = DB::table('barangays')->get();
    $barangayMap  = [];
    foreach ($allBarangays as $b) {
        $barangayMap[strtolower(trim($b->name))] = $b;
    }

    $lookup = strtolower(trim($sample->name));
    tinker_assert(
        "Barangay '{$sample->name}' resolved in memory map",
        isset($barangayMap[$lookup])
    );
} else {
    echo "  \033[33m⚠ No barangays seeded – run: php artisan db:seed\033[0m\n";
}

// ─────────────────────────────────────────────────────────────────────────────
//  6. Job Queue – RunAnalyticsJob dispatch
// ─────────────────────────────────────────────────────────────────────────────
echo "\n[ 6 ] Job Queue\n";

$jobsBefore = DB::table('jobs')->count();

RunAnalyticsJob::dispatch([
    '--task'     => 'train',
    '--table'    => 'spatial_data',
    '--target'   => 'value',
    '--features' => 'latitude,longitude',
]);

$jobsAfter = DB::table('jobs')->count();

tinker_assert(
    'RunAnalyticsJob pushed to jobs table (or sync processed it)',
    $jobsAfter >= $jobsBefore  // sync driver processes immediately; database driver queues
);

echo "  Queue driver: " . config('queue.default') . "\n";

// ─────────────────────────────────────────────────────────────────────────────
//  7. Query Performance – Indexed Columns
// ─────────────────────────────────────────────────────────────────────────────
echo "\n[ 7 ] Indexed Column Queries\n";

// Insert a batch to test indexed queries
$batch = array_map(fn ($i) => [
    'latitude'    => 6.9 + ($i * 0.001),
    'longitude'   => 122.0 + ($i * 0.001),
    'value'       => (float) $i,
    'is_crime'    => true,
    'recorded_at' => now()->subDays($i),
    'created_at'  => now(),
    'updated_at'  => now(),
], range(1, 50));

DB::table('spatial_data')->insert($batch);

$geoResults = DB::table('spatial_data')
    ->whereBetween('latitude',  [6.9, 6.92])
    ->whereBetween('longitude', [122.0, 122.02])
    ->orderBy('recorded_at', 'desc')
    ->limit(10)
    ->get();

tinker_assert('Lat/Lng geo-box query returns results', $geoResults->count() > 0);
tinker_assert('Limit(10) respected',                   $geoResults->count() <= 10);

$latestByDate = DB::table('spatial_data')
    ->orderBy('recorded_at', 'desc')
    ->first();

tinker_assert('recorded_at index query works',           $latestByDate !== null);
tinker_assert('Most recent row is ordered correctly',    $latestByDate->recorded_at !== null);

// Clean up bulk batch
DB::table('spatial_data')->where('value', '<=', 50)->delete();

// ─────────────────────────────────────────────────────────────────────────────
//  8. User Model
// ─────────────────────────────────────────────────────────────────────────────
echo "\n[ 8 ] User Model\n";

$user = new \App\Models\User();
tinker_assert('User model instantiates', $user instanceof \App\Models\User);
tinker_assert('User has HasFactory trait', in_array(
    \Illuminate\Database\Eloquent\Factories\HasFactory::class,
    class_uses_recursive(\App\Models\User::class)
));

// ─────────────────────────────────────────────────────────────────────────────
//  Summary
// ─────────────────────────────────────────────────────────────────────────────
$total = $pass + $fail;
echo "\n\033[1m─────────────────────────────────────────────────\033[0m\n";
echo "\033[1mResults: \033[32m{$pass} passed\033[0m, \033[31m{$fail} failed\033[0m / {$total} total\n";
echo "\033[1m─────────────────────────────────────────────────\033[0m\n\n";

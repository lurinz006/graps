<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use App\Jobs\RunAnalyticsJob;

uses(RefreshDatabase::class);

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: seed a barangay row so geo-resolution tests work
// ─────────────────────────────────────────────────────────────────────────────
function seedBarangay(string $name = 'canelar', float $lat = 6.9100, float $lng = 122.0700): void
{
    DB::table('barangays')->insert([
        'name'         => $name,
        'centroid_lat' => $lat,
        'centroid_lng' => $lng,
        'created_at'   => now(),
        'updated_at'   => now(),
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: seed an analytics_metrics row
// ─────────────────────────────────────────────────────────────────────────────
function seedMetrics(string $taskType = 'train'): void
{
    DB::table('analytics_metrics')->insert([
        'task_type'     => $taskType,
        'table_name'    => 'spatial_data',
        'target_column' => 'value',
        'r2_score'      => 0.8843,
        'mse_score'     => 487.9306,
        'results_json'  => json_encode([
            'geospatial_regression' => [
                'formula'    => 'Risk = 14193.60 + (-1035.97 * Lat) + (-57.10 * Lng)',
                'coefficients' => ['intercept' => 14193.60, 'latitude' => -1035.97, 'longitude' => -57.10],
            ],
            'data_mining' => [
                'method'    => 'Kernel Density Estimation (KDE)',
                'bandwidth' => 0.01,
            ],
        ]),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/spatial-data
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/spatial-data', function () {

    it('returns an empty array when no data exists', function () {
        $response = $this->getJson('/api/v1/spatial-data');

        $response->assertOk()
                 ->assertJsonCount(0);
    });

    it('returns all spatial data records ordered by recorded_at desc', function () {
        DB::table('spatial_data')->insert([
            ['latitude' => 6.91, 'longitude' => 122.07, 'value' => 1.0, 'recorded_at' => now()->subDays(2), 'is_crime' => true, 'created_at' => now(), 'updated_at' => now()],
            ['latitude' => 6.92, 'longitude' => 122.08, 'value' => 2.0, 'recorded_at' => now(),              'is_crime' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $response = $this->getJson('/api/v1/spatial-data');

        $response->assertOk()
                 ->assertJsonCount(2);

        // Most recent first – latitude is returned as numeric or string depending on driver
        $lat = $response->json('0.latitude');
        expect((float) $lat)->toBe(6.92);
    });

    it('handles db errors gracefully', function () {
        // Force a schema issue by dropping the table temporarily – use mocking instead
        DB::shouldReceive('table')->andThrow(new \Exception('Connection failed'));

        $response = $this->getJson('/api/v1/spatial-data');

        $response->assertStatus(500)
                 ->assertJsonStructure(['error']);
    })->skip('Requires DB mock – enable when running isolated');

});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/spatial-data (uploadData)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/spatial-data (uploadData)', function () {

    beforeEach(function () {
        Queue::fake();
    });

    it('fails with 422 when data field is missing', function () {
        $response = $this->postJson('/api/v1/spatial-data/upload', []);

        $response->assertStatus(422)
                 ->assertJsonStructure(['error']);
    });

    it('fails with 422 when data is not an array', function () {
        $response = $this->postJson('/api/v1/spatial-data/upload', ['data' => 'not-an-array']);

        $response->assertStatus(422);
    });

    it('fails with 422 when task value is invalid', function () {
        $response = $this->postJson('/api/v1/spatial-data/upload', [
            'data' => [['lat' => 6.91, 'lng' => 122.07]],
            'task' => 'invalid_task',
        ]);

        $response->assertStatus(422);
    });

    it('inserts valid spatial data points and dispatches train job', function () {
        $payload = [
            'data' => [
                [
                    'lat'           => 6.9100,
                    'lng'           => 122.0700,
                    'incidentType'  => 'Robbery',
                    'offense'       => 'Theft',
                    'dateCommitted' => '2025-01-15',
                    'timeCommitted' => '14:30:00',
                    'value'         => 1.0,
                ],
            ],
            'task'           => 'train',
            'target_column'  => 'value',
            'feature_columns' => 'latitude,longitude',
        ];

        $response = $this->postJson('/api/v1/spatial-data/upload', $payload);

        $response->assertOk()
                 ->assertJson(['success' => true])
                 ->assertJsonStructure(['success', 'message']);

        $this->assertDatabaseCount('spatial_data', 1);
        $this->assertDatabaseHas('spatial_data', [
            'incident_type' => 'Robbery',
        ]);

        Queue::assertPushed(RunAnalyticsJob::class);
    });

    it('resolves barangay geo-coordinates when lat/lng are absent', function () {
        seedBarangay('canelar', 6.9100, 122.0700);

        $payload = [
            'data' => [
                ['barangay' => 'Canelar', 'incidentType' => 'Assault', 'value' => 1.0],
            ],
            'task' => 'train',
        ];

        $response = $this->postJson('/api/v1/spatial-data/upload', $payload);
        $response->assertOk();

        $this->assertDatabaseHas('spatial_data', [
            'barangay' => 'Canelar',
        ]);
    });

    it('dispatches forecast job when task is forecast', function () {
        $payload = [
            'data' => [
                ['lat' => 6.91, 'lng' => 122.07, 'value' => 1.0],
            ],
            'task'          => 'forecast',
            'target_column' => 'value',
        ];

        $this->postJson('/api/v1/spatial-data/upload', $payload)->assertOk();

        Queue::assertPushed(RunAnalyticsJob::class);
    });

    it('bulk inserts multiple records in one request', function () {
        $records = array_fill(0, 10, [
            'lat'   => 6.91,
            'lng'   => 122.07,
            'value' => 1.0,
        ]);

        $response = $this->postJson('/api/v1/spatial-data/upload', ['data' => $records, 'task' => 'train']);
        $response->assertOk();

        $this->assertDatabaseCount('spatial_data', 10);
    });

    it('defaults value to 1.0 when value field is missing', function () {
        $payload = ['data' => [['lat' => 6.91, 'lng' => 122.07]], 'task' => 'train'];

        $this->postJson('/api/v1/spatial-data/upload', $payload)->assertOk();

        $this->assertDatabaseHas('spatial_data', ['value' => 1.0]);
    });

    it('defaults is_crime to true when iscime field is absent', function () {
        $payload = ['data' => [['lat' => 6.91, 'lng' => 122.07]], 'task' => 'train'];

        $this->postJson('/api/v1/spatial-data/upload', $payload)->assertOk();

        $this->assertDatabaseHas('spatial_data', ['is_crime' => true]);
    });

    it('sets is_crime false when iscime is "no"', function () {
        $payload = ['data' => [['lat' => 6.91, 'lng' => 122.07, 'iscime' => 'no']], 'task' => 'train'];

        $this->postJson('/api/v1/spatial-data/upload', $payload)->assertOk();

        $this->assertDatabaseHas('spatial_data', ['is_crime' => false]);
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/spatial-data/upload-file (uploadFile)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/spatial-data/upload-file (uploadFile)', function () {

    beforeEach(function () {
        Queue::fake();
    });

    it('fails with 422 when no file is attached', function () {
        $response = $this->postJson('/api/v1/spatial-data/upload-file', []);

        $response->assertStatus(422);
    });

    it('rejects unsupported file extensions', function () {
        $file = UploadedFile::fake()->create('data.xlsx', 100, 'application/vnd.ms-excel');

        $response = $this->post('/api/v1/spatial-data/upload-file', ['file' => $file], [
            'Accept' => 'application/json',
        ]);

        $response->assertStatus(400)
                 ->assertJsonStructure(['error']);
    });

    it('accepts and parses a valid JSON file', function () {
        $json = json_encode([
            ['lat' => 6.91, 'lng' => 122.07, 'incidentType' => 'Robbery', 'value' => 1.0],
            ['lat' => 6.92, 'lng' => 122.08, 'incidentType' => 'Assault', 'value' => 1.0],
        ]);

        $file = UploadedFile::fake()->createWithContent('incidents.json', $json);

        $response = $this->post('/api/v1/spatial-data/upload-file', [
            'file' => $file,
            'task' => 'train',
        ], ['Accept' => 'application/json']);

        $response->assertOk()
                 ->assertJson(['success' => true]);

        $this->assertDatabaseCount('spatial_data', 2);
        Queue::assertPushed(RunAnalyticsJob::class);
    });

    it('accepts and parses a valid CSV file', function () {
        $csv = "lat,lng,incidentType,value\n6.91,122.07,Robbery,1.0\n6.92,122.08,Assault,1.0\n";

        $file = UploadedFile::fake()->createWithContent('incidents.csv', $csv);

        $response = $this->post('/api/v1/spatial-data/upload-file', [
            'file' => $file,
            'task' => 'train',
        ], ['Accept' => 'application/json']);

        $response->assertOk()
                 ->assertJson(['success' => true]);

        $this->assertDatabaseCount('spatial_data', 2);
    });

    it('returns 422 when JSON file has no valid records', function () {
        $file = UploadedFile::fake()->createWithContent('empty.json', '[]');

        $response = $this->post('/api/v1/spatial-data/upload-file', [
            'file' => $file,
        ], ['Accept' => 'application/json']);

        $response->assertStatus(422)
                 ->assertJsonStructure(['error']);
    });

    it('returns 422 when JSON is not an array of records', function () {
        $file = UploadedFile::fake()->createWithContent('bad.json', '"just-a-string"');

        $response = $this->post('/api/v1/spatial-data/upload-file', [
            'file' => $file,
        ], ['Accept' => 'application/json']);

        $response->assertStatus(422);
    });

    it('resolves barangay centroid for CSV rows without lat/lng', function () {
        seedBarangay('canelar', 6.9100, 122.0700);

        $csv = "barangay,incidentType,value\ncanelar,Robbery,1.0\n";
        $file = UploadedFile::fake()->createWithContent('geo.csv', $csv);

        $response = $this->post('/api/v1/spatial-data/upload-file', [
            'file' => $file,
            'task' => 'train',
        ], ['Accept' => 'application/json']);

        $response->assertOk();

        $this->assertDatabaseHas('spatial_data', [
            'barangay'  => 'canelar',
            'latitude'  => 6.9100,
            'longitude' => 122.0700,
        ]);
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE /api/v1/spatial-data/clear (clearSpatialData)
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/spatial-data/clear', function () {

    it('truncates all spatial data records', function () {
        DB::table('spatial_data')->insert([
            ['latitude' => 6.91, 'longitude' => 122.07, 'value' => 1.0, 'is_crime' => true, 'created_at' => now(), 'updated_at' => now()],
            ['latitude' => 6.92, 'longitude' => 122.08, 'value' => 1.0, 'is_crime' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $response = $this->deleteJson('/api/v1/spatial-data/clear');

        $response->assertOk()
                 ->assertJson(['success' => true]);

        $this->assertDatabaseCount('spatial_data', 0);
    });

    it('returns success even when table is already empty', function () {
        $response = $this->deleteJson('/api/v1/spatial-data/clear');

        $response->assertOk()
                 ->assertJson(['success' => true]);
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/analytics/trigger (triggerAnalytics)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/analytics/trigger', function () {

    beforeEach(function () {
        Queue::fake();
    });

    it('returns 422 when required fields are missing', function () {
        $response = $this->postJson('/api/v1/analytics/trigger', []);

        $response->assertStatus(422)
                 ->assertJsonStructure(['error']);
    });

    it('returns 422 when task is invalid', function () {
        $response = $this->postJson('/api/v1/analytics/trigger', [
            'task'          => 'invalid',
            'target_column' => 'value',
        ]);

        $response->assertStatus(422);
    });

    it('dispatches train job with correct options', function () {
        $response = $this->postJson('/api/v1/analytics/trigger', [
            'task'            => 'train',
            'target_column'   => 'value',
            'feature_columns' => 'latitude,longitude',
        ]);

        $response->assertOk()
                 ->assertJson(['success' => true]);

        Queue::assertPushed(RunAnalyticsJob::class);
    });

    it('dispatches forecast job', function () {
        $response = $this->postJson('/api/v1/analytics/trigger', [
            'task'          => 'forecast',
            'target_column' => 'value',
        ]);

        $response->assertOk()
                 ->assertJson(['success' => true]);

        Queue::assertPushed(RunAnalyticsJob::class);
    });

    it('response message mentions the dispatched task type', function () {
        $response = $this->postJson('/api/v1/analytics/trigger', [
            'task'          => 'train',
            'target_column' => 'value',
        ]);

        $response->assertOk()
                 ->assertJsonPath('message', fn ($msg) => str_contains($msg, 'train'));
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/analytics/metrics (getMetrics)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/analytics/metrics', function () {

    it('returns null values when no metrics have been stored yet', function () {
        $response = $this->getJson('/api/v1/analytics/metrics');

        $response->assertOk()
                 ->assertJsonStructure(['training', 'forecast'])
                 ->assertJsonPath('training', null)
                 ->assertJsonPath('forecast', null);
    });

    it('returns the latest training metrics', function () {
        seedMetrics('train');

        $response = $this->getJson('/api/v1/analytics/metrics');

        $response->assertOk()
                 ->assertJsonPath('training.task_type', 'train');

        // r2/mse returned as string or float depending on DB driver; cast for comparison
        $r2  = (float) $response->json('training.r2_score');
        $mse = (float) $response->json('training.mse_score');
        expect($r2)->toBeGreaterThan(0.88)->and($r2)->toBeLessThan(0.89);
        expect($mse)->toBeGreaterThan(487)->and($mse)->toBeLessThan(488);
    });

    it('returns the latest forecast metrics', function () {
        seedMetrics('forecast');

        $response = $this->getJson('/api/v1/analytics/metrics');

        $response->assertOk()
                 ->assertJsonPath('forecast.task_type', 'forecast');
    });

    it('returns both training and forecast metrics simultaneously', function () {
        seedMetrics('train');
        seedMetrics('forecast');

        $response = $this->getJson('/api/v1/analytics/metrics');

        $response->assertOk()
                 ->assertJsonPath('training.task_type', 'train')
                 ->assertJsonPath('forecast.task_type', 'forecast');
    });

    it('returns only the most recent training record when multiple exist', function () {
        seedMetrics('train');

        DB::table('analytics_metrics')->insert([
            'task_type'     => 'train',
            'table_name'    => 'spatial_data',
            'target_column' => 'value',
            'r2_score'      => 0.9500,
            'mse_score'     => 200.0000,
            'results_json'  => null,
            'created_at'    => now()->addMinute(),
            'updated_at'    => now()->addMinute(),
        ]);

        $response = $this->getJson('/api/v1/analytics/metrics');

        $response->assertOk();

        // Most recent r2 should be 0.95 (cast for driver-agnostic comparison)
        $r2 = (float) $response->json('training.r2_score');
        expect($r2)->toBeGreaterThan(0.94)->and($r2)->toBeLessThan(0.96);
    });

});

describe('New API Aggregation and Officer/Alert Endpoints', function () {

    it('returns all officers', function () {
        DB::table('officers')->insert([
            'badge_number' => 'PCG-2024001',
            'full_name' => 'Juan Cruz',
            'rank' => 'Patrolman',
            'assigned_barangay' => 'Santa Maria',
            'shift' => 'Day',
            'status' => 'Active',
            'police_station' => 'PS 07',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $response = $this->getJson('/api/v1/officers');

        $response->assertOk()
                 ->assertJsonCount(1)
                 ->assertJsonPath('0.badge_number', 'PCG-2024001')
                 ->assertJsonPath('0.full_name', 'Juan Cruz');
    });

    it('returns all alerts', function () {
        DB::table('alerts')->insert([
            'type' => 'Spike',
            'severity' => 'CRITICAL',
            'title' => 'Theft Spike in Tetuan',
            'message' => 'Detail message',
            'barangay' => 'Tetuan',
            'acknowledged' => true,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $response = $this->getJson('/api/v1/alerts');

        $response->assertOk()
                 ->assertJsonCount(1)
                 ->assertJsonPath('0.type', 'Spike')
                 ->assertJsonPath('0.title', 'Theft Spike in Tetuan');
    });

    it('generates predictive staff reduction alerts', function () {
        Queue::fake();

        // 1. Seed a barangay
        DB::table('barangays')->insert([
            'name' => 'Ayala',
            'centroid_lat' => 6.9602,
            'centroid_lng' => 121.9680,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // 2. Seed 10 incidents for Ayala in the previous month (which is >= 5 incidents limit)
        $incidents = [];
        $recordedAt = now()->subMonth();
        for ($i = 0; $i < 10; $i++) {
            $incidents[] = [
                'barangay' => 'Ayala',
                'recorded_at' => $recordedAt,
                'value' => 1.0,
                'created_at' => now(),
                'updated_at' => now()
            ];
        }
        DB::table('spatial_data')->insert($incidents);

        // 3. Seed 2 officers but make one On-Leave (so active staff = 1, which is < total staff = 2)
        // Assign the active one to 'Day' (Morning) shift, leaving Afternoon, Evening, Dawn empty (coverage gap)
        DB::table('officers')->insert([
            [
                'badge_number' => 'PCG-1000001',
                'full_name' => 'Officer Active',
                'rank' => 'Patrolman',
                'assigned_barangay' => 'Ayala',
                'status' => 'Active',
                'shift' => 'Day',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'badge_number' => 'PCG-1000002',
                'full_name' => 'Officer Leave',
                'rank' => 'Patrolman',
                'assigned_barangay' => 'Ayala',
                'status' => 'On-Leave',
                'shift' => 'Evening',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        // Triggering alert generation by posting to upload
        $payload = [
            'data' => [
                ['barangay' => 'Ayala', 'value' => 1.0, 'dateCommitted' => now()->format('Y-m-d')]
            ],
            'task' => 'train'
        ];

        $response = $this->postJson('/api/v1/spatial-data/upload', $payload);
        $response->assertOk();

        // 5. Verify that a Predictive alert for Ayala exists in the database
        $this->assertDatabaseHas('alerts', [
            'type' => 'Predictive',
            'barangay' => 'AYALA',
            'severity' => 'HIGH',
        ]);
        
        $alert = DB::table('alerts')->where('type', 'Predictive')->where('barangay', 'AYALA')->first();
        expect($alert->title)->toContain('Staff Reduction in AYALA');
        expect($alert->message)->toContain('Active patrol staff in Barangay Ayala has been reduced to 1 (Previous: 2)');
        expect($alert->message)->toContain('logged 10 incident records');
        expect($alert->message)->toContain('recommended to deploy 1 officer(s) to match the previous staff count of 2');
    });

    it('generates predictive stagnant incidents alerts', function () {
        Queue::fake();

        // 1. Seed a barangay
        DB::table('barangays')->insert([
            'name' => 'StagnantZone',
            'centroid_lat' => 6.9602,
            'centroid_lng' => 121.9680,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // 2. Seed 10 incidents in previous month and 10 incidents in current month (stagnant)
        $incidents = [];
        for ($i = 0; $i < 10; $i++) {
            $incidents[] = [
                'barangay' => 'StagnantZone',
                'recorded_at' => now()->subMonth(),
                'value' => 1.0,
                'created_at' => now(),
                'updated_at' => now()
            ];
            $incidents[] = [
                'barangay' => 'StagnantZone',
                'recorded_at' => now(),
                'value' => 1.0,
                'created_at' => now(),
                'updated_at' => now()
            ];
        }
        DB::table('spatial_data')->insert($incidents);

        // 3. Seed 1 active officer (target is ceil(10 / 8) = 2, so 1 active is < 2, triggering stagnant alert)
        DB::table('officers')->insert([
            [
                'badge_number' => 'PCG-2000001',
                'full_name' => 'Officer Active',
                'rank' => 'Patrolman',
                'assigned_barangay' => 'StagnantZone',
                'status' => 'Active',
                'shift' => 'Day',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        $payload = [
            'data' => [
                ['barangay' => 'StagnantZone', 'value' => 1.0, 'dateCommitted' => now()->format('Y-m-d')]
            ],
            'task' => 'train'
        ];

        $response = $this->postJson('/api/v1/spatial-data/upload', $payload);
        $response->assertOk();

        // 5. Verify stagnant alert is generated
        $this->assertDatabaseHas('alerts', [
            'type' => 'Predictive',
            'barangay' => 'STAGNANTZONE',
            'severity' => 'HIGH',
        ]);
        
        $alert = DB::table('alerts')->where('type', 'Predictive')->where('barangay', 'STAGNANTZONE')->first();
        expect($alert->title)->toContain('Stagnant Incidents in STAGNANTZONE');
        expect($alert->message)->toContain('stagnant incident volume');
        expect($alert->message)->toContain('Deploy 1 officer(s) to establish visible deterrence');
    });

    it('generates predictive resource optimization alerts', function () {
        Queue::fake();

        // 1. Seed two barangays
        DB::table('barangays')->insert([
            [
                'name' => 'OverstaffedZone',
                'centroid_lat' => 6.9602,
                'centroid_lng' => 121.9680,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'UnderstaffedZone',
                'centroid_lat' => 6.9100,
                'centroid_lng' => 122.0700,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        // 2. Seed 0 incidents for OverstaffedZone in previous month
        // Seed 20 incidents for UnderstaffedZone in previous month
        $incidents = [];
        for ($i = 0; $i < 20; $i++) {
            $incidents[] = [
                'barangay' => 'UnderstaffedZone',
                'recorded_at' => now()->subMonth(),
                'value' => 1.0,
                'created_at' => now(),
                'updated_at' => now()
            ];
        }
        DB::table('spatial_data')->insert($incidents);

        // 3. Seed 3 active officers for OverstaffedZone (so it is overstaffed)
        // Seed 0 active officers for UnderstaffedZone (target is ceil(20 / 8) = 3)
        DB::table('officers')->insert([
            [
                'badge_number' => 'PCG-3000001',
                'full_name' => 'Officer 1',
                'rank' => 'Patrolman',
                'assigned_barangay' => 'OverstaffedZone',
                'status' => 'Active',
                'shift' => 'Day',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'badge_number' => 'PCG-3000002',
                'full_name' => 'Officer 2',
                'rank' => 'Patrolman',
                'assigned_barangay' => 'OverstaffedZone',
                'status' => 'Active',
                'shift' => 'Evening',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'badge_number' => 'PCG-3000003',
                'full_name' => 'Officer 3',
                'rank' => 'Patrolman',
                'assigned_barangay' => 'OverstaffedZone',
                'status' => 'Active',
                'shift' => 'Night',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        $payload = [
            'data' => [
                ['barangay' => 'OverstaffedZone', 'value' => 1.0, 'dateCommitted' => now()->format('Y-m-d')]
            ],
            'task' => 'train'
        ];

        $response = $this->postJson('/api/v1/spatial-data/upload', $payload);
        $response->assertOk();

        // 4. Verify optimization alert is generated
        $this->assertDatabaseHas('alerts', [
            'type' => 'Predictive',
            'barangay' => 'OVERSTAFFEDZONE',
            'severity' => 'MEDIUM',
        ]);
        
        $alert = DB::table('alerts')->where('type', 'Predictive')->where('barangay', 'OVERSTAFFEDZONE')->first();
        expect($alert->title)->toContain('Resource Optimization in OVERSTAFFEDZONE');
        expect($alert->message)->toContain('Resource mismatch detected');
        expect($alert->message)->toContain('redeploy 2 officer(s) to UNDERSTAFFEDZONE');
    });

    it('acknowledges an alert', function () {
        $id = DB::table('alerts')->insertGetId([
            'type' => 'Spike',
            'severity' => 'CRITICAL',
            'title' => 'Theft Spike in Tetuan',
            'message' => 'Detail message',
            'barangay' => 'Tetuan',
            'acknowledged' => false,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $response = $this->postJson("/api/v1/alerts/{$id}/acknowledge", [
            'user' => 'ZCPO Chief of Police'
        ]);

        $response->assertOk()
                 ->assertJsonPath('success', true);

        $alert = DB::table('alerts')->where('id', $id)->first();
        expect((bool)$alert->acknowledged)->toBeTrue()
             ->and($alert->acknowledged_by)->toBe('ZCPO Chief of Police');
    });

    it('returns aggregated barangay incident statistics', function () {
        DB::table('barangays')->insert([
            'name' => 'Ayala',
            'centroid_lat' => 6.9602,
            'centroid_lng' => 121.9680,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        DB::table('spatial_data')->insert([
            'barangay' => 'Ayala',
            'recorded_at' => '2026-01-15 10:00:00',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $response = $this->getJson('/api/v1/barangays?year=2026');

        $response->assertOk()
                 ->assertJsonCount(1)
                 ->assertJsonPath('0.name', 'Ayala')
                 ->assertJsonPath('0.incidents', 1);
    });

    it('returns rich analytics data package', function () {
        DB::table('spatial_data')->insert([
            'barangay' => 'Ayala',
            'recorded_at' => '2026-01-15 10:00:00',
            'incident_type' => 'Theft',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $response = $this->getJson('/api/v1/analytics?year=2026');

        $response->assertOk()
                 ->assertJsonStructure([
                     'crimeTypes',
                     'hourly',
                     'monthly' => ['labels', 'actual', 'forecast'],
                     'associationRules',
                     'regression'
                 ]);
    });

    it('returns top 5 incident spatial clusters', function () {
        DB::table('barangays')->insert([
            'name' => 'Ayala',
            'centroid_lat' => 6.9602,
            'centroid_lng' => 121.9680,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        DB::table('spatial_data')->insert([
            'barangay' => 'Ayala',
            'recorded_at' => '2026-01-15 10:00:00',
            'incident_type' => 'Theft',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $response = $this->getJson('/api/v1/clusters?year=2026');

        $response->assertOk()
                 ->assertJsonCount(1)
                 ->assertJsonPath('0.core', 'Ayala')
                 ->assertJsonPath('0.crime', 'Theft');
    });

});

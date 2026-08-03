<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AlertSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('alerts')->truncate();

        $mockAlerts = [
            [
                'type' => 'Spike',
                'severity' => 'CRITICAL',
                'title' => 'Theft Incident Spike in TETUAN',
                'message' => 'A sudden 35% increase in theft crimes has been detected in Barangay Tetuan during evening hours over the past 7 days.',
                'barangay' => 'TETUAN',
                'acknowledged' => false,
                'acknowledged_by' => null,
                'acknowledged_at' => null,
                'created_at' => now()->subHours(2),
                'updated_at' => now()->subHours(2),
            ],
            [
                'type' => 'Hotspot',
                'severity' => 'HIGH',
                'title' => 'New Critical Crime Hotspot in SANGALI',
                'message' => 'DBSCAN clustering has identified a dense crime cluster near Sangali highway, primarily involving vehicular accidents.',
                'barangay' => 'SANGALI',
                'acknowledged' => false,
                'acknowledged_by' => null,
                'acknowledged_at' => null,
                'created_at' => now()->subHours(4),
                'updated_at' => now()->subHours(4),
            ],
            [
                'type' => 'Patrol',
                'severity' => 'MEDIUM',
                'title' => 'Patrol Coverage Gap in MAMPANG',
                'message' => 'Barangay Mampang currently has 0 active officers assigned despite rising crime reports this week.',
                'barangay' => 'MAMPANG',
                'acknowledged' => false,
                'acknowledged_by' => null,
                'acknowledged_at' => null,
                'created_at' => now()->subHours(8),
                'updated_at' => now()->subHours(8),
            ],
            [
                'type' => 'Predictive',
                'severity' => 'HIGH',
                'title' => 'AI Predicted Spike: VITALI',
                'message' => 'Geospatial regression forecasts a high probability of road accidents in Vitali this coming weekend based on historical weather and holiday patterns.',
                'barangay' => 'VITALI',
                'acknowledged' => true,
                'acknowledged_by' => 'ZCPO Chief of Police',
                'acknowledged_at' => now()->subHours(10),
                'created_at' => now()->subHours(12),
                'updated_at' => now()->subHours(10),
            ],
        ];

        DB::table('alerts')->insert($mockAlerts);
    }
}

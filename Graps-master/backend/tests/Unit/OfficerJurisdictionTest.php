<?php

namespace Tests\Unit;

use Tests\TestCase;
use Database\Seeders\OfficerSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;

class OfficerJurisdictionTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_12_police_stations_have_guaranteed_standby_officers(): void
    {
        $this->seed(OfficerSeeder::class);

        $stations = [
            'PS 01', 'PS 02', 'PS 03', 'PS 04', 'PS 05', 'PS 06',
            'PS 07', 'PS 08', 'PS 09', 'PS 10', 'PS 11', 'PS 12'
        ];

        foreach ($stations as $ps) {
            $count = DB::table('officers')
                ->where('police_station', $ps)
                ->where('status', 'Active')
                ->whereNull('assigned_barangay')
                ->count();

            $this->assertGreaterThanOrEqual(4, $count, "Station {$ps} does not have at least 4 standby officers.");
        }
    }
}

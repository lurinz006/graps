<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IncidentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('spatial_data')->truncate();

        $jsonPath = __DIR__.'/all_incidents.json';
        if (! file_exists($jsonPath)) {
            return;
        }

        $json = file_get_contents($jsonPath);
        $incidents = json_decode($json, true);

        if (! is_array($incidents)) {
            return;
        }

        // Cache barangays in memory for fast lookup
        $allBarangays = DB::table('barangays')->get();
        $barangayMap = [];
        foreach ($allBarangays as $b) {
            $barangayMap[strtolower(trim($b->name))] = $b->id;
        }

        $insertData = [];
        foreach ($incidents as $point) {
            $recordedAt = null;
            $dateStr = $point['date'] ?? null;
            if (! empty($dateStr)) {
                $parts = explode('-', $dateStr);
                if (count($parts) === 3) {
                    $year = (int) $parts[0];
                    $month = (int) $parts[1];
                    $day = (int) $parts[2];

                    if (! checkdate($month, $day, $year)) {
                        // Clamp to last day of month
                        $day = cal_days_in_month(CAL_GREGORIAN, $month, $year);
                        $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $day);
                    }
                }
                $time = ! empty($point['time']) ? $point['time'] : '00:00:00';
                $recordedAt = date('Y-m-d H:i:s', strtotime($dateStr.' '.$time));
            }

            $lat = (isset($point['lat']) && is_numeric($point['lat'])) ? (float) $point['lat'] : null;
            $lng = (isset($point['lng']) && is_numeric($point['lng'])) ? (float) $point['lng'] : null;
            $barangayName = $point['barangay'] ?? null;
            $barangayId = null;

            if (! empty($barangayName)) {
                $cleanName = strtolower(trim($barangayName));
                if (isset($barangayMap[$cleanName])) {
                    $barangayId = $barangayMap[$cleanName];
                }
            }

            // Severity mapping logic to float values for target/value column
            $value = 1.0;
            $severity = strtolower(trim($point['severity'] ?? ''));
            if ($severity === 'critical') {
                $value = 100.0;
            } elseif ($severity === 'high') {
                $value = 50.0;
            } elseif ($severity === 'medium') {
                $value = 25.0;
            }

            $insertData[] = [
                'pro' => $point['pro'] ?? 'PRO 9',
                'ppo' => $point['ppo'] ?? 'ZAMBOANGA CPO',
                'stn' => $point['ps'] ?? null,
                'region' => $point['region'] ?? 'ZAMBOANGA PENINSULA',
                'province' => $point['province'] ?? 'ZAMBOANGA CITY PO',
                'municipal' => $point['municipal'] ?? null,
                'barangay' => $barangayName,
                'barangay_id' => $barangayId,
                'monthly_cycle' => $point['monthly'] ?? null,
                'date_reported' => $dateStr,
                'time_reported' => $point['time'] ?? null,
                'date_committed' => $dateStr,
                'time_committed' => $point['time'] ?? null,
                'recorded_at' => $recordedAt ?? now(),
                'incident_type' => $point['type'] ?? null,
                'is_crime' => in_array(strtolower(trim($point['iscime'] ?? 'yes')), ['yes', 'y', 'true', '1', '']),
                'stage_of_felony' => $point['stageoffelony'] ?? 'CONSUMMATED',
                'offense' => $point['law'] ?? null,
                'offense_type' => $point['offenseType'] ?? null,
                'latitude' => $lat,
                'longitude' => $lng,
                'value' => $value,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        $chunks = array_chunk($insertData, 500);
        foreach ($chunks as $chunk) {
            DB::table('spatial_data')->insert($chunk);
        }
    }
}

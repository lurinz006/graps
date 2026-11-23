<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OfficerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('officers')->truncate();

        // 12 ZCPO Police Stations mapping to Zamboanga City Barangays
        $stationJurisdiction = [
            'PS 01' => ['Vitali', 'Tagasilay', 'Tictapul', 'Licomo', 'Mangusu', 'Sibulao', 'Tigbalabag'],
            'PS 02' => ['Manicahan', 'Lamisahan', 'Cacao', 'Calabasa', 'Victoria'],
            'PS 03' => ['Sangali', 'Bolong', 'Bunguiao', 'Dulian (Upper Bunguiao)', 'Panubigan', 'Quiniput', 'Lapakan'],
            'PS 04' => ['Culianan', 'Pasobolong', 'Mercedes', 'Guisao', 'Cabaluay', 'Talabaan', 'Landang Gua', 'Landang Laum', 'Pangapuyan', 'Muti'],
            'PS 05' => ['Divisoria', 'Lunzuran', 'Putik', 'Boalan', 'Lumayang', 'Dulian (Upper Pasonanca)'],
            'PS 06' => ['Tetuan', 'Canelar', 'Guiwan', 'Mampang', 'Tugbungan', 'Kasanyangan'],
            'PS 07' => ['Santa Maria', 'Pasonanca', 'Tumaga', 'Cabatangan', 'Dita', 'Capisan'],
            'PS 08' => ['Sinunuc', 'Calarian', 'Upper Calarian', 'Malagutay', 'Maasin', 'Pamucutan', 'Taluksangay'],
            'PS 09' => ['Ayala', 'Talisayan', 'Recodo', 'Cawit', 'Tulungatung'],
            'PS 10' => ['Labuan', 'Sinubung', 'Patalon', 'Limpapa', 'La Paz', 'Baluno'],
            'PS 11' => ['San Jose Gusu', 'San Roque', 'San Jose Cawa-cawa', 'Campo Islam', 'Baliwasan'],
            'PS 12' => [
                'Talon-talon', 'Santa Catalina', 'Sta. Catalina', 'Camino Nuevo', 'Santo Niño', 
                'Arena Blanco', 'Rio Hondo', 'Mariki', 'Busay', 
                'Barangay Zone I', 'Barangay Zone II', 'Barangay Zone III', 'Barangay Zone IV',
                'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone I', 'Zone II', 'Zone III', 'Zone IV'
            ],
        ];

        $firstNames = ['Juan', 'Pedro', 'Maria', 'Jose', 'Manuel', 'Ramon', 'Antonio', 'Francisco', 'Rolando', 'Lorence', 'Al-Ghazali', 'Sarah', 'Jessica', 'Michael', 'Christopher', 'David', 'Ryan', 'Efraim', 'Mohammad', 'Fatima', 'Eduardo', 'Arnel', 'Danilo', 'Grace', 'Leah'];
        $lastNames = ['Santos', 'Reyes', 'Cruz', 'Diaz', 'Gonzales', 'Bautista', 'Aquino', 'Marquez', 'Torres', 'Salazar', 'Lim', 'Tan', 'Abdullah', 'Jamil', 'Garcia', 'Villanueva', 'Fernandez', 'Flores', 'Bernardo', 'Ramos', 'Mendoza', 'Delos Santos', 'Navarro'];
        $ranks = ['Patrolman', 'Patrolwoman', 'Police Corporal', 'Police Staff Sergeant', 'Police Master Sergeant', 'Police Senior Master Sergeant', 'Police Chief Master Sergeant', 'Police Lieutenant', 'Police Captain'];
        $shifts = ['Day', 'Evening', 'Night'];

        $officers = [];
        $counter = 1;

        foreach ($stationJurisdiction as $ps => $localBrgys) {
            // Seed 12 dedicated officers per station (144 total)
            for ($j = 1; $j <= 12; $j++) {
                $badge = 'PCG-' . (2024000 + $counter);
                $name = $firstNames[array_rand($firstNames)] . ' ' . $lastNames[array_rand($lastNames)];
                $rank = $ranks[array_rand($ranks)];
                $shift = $shifts[array_rand($shifts)];

                // 4 guaranteed standby/available officers per station (Active & Unassigned)
                if ($j <= 4) {
                    $assignedBrgy = null;
                    $status = 'Active';
                } elseif ($j <= 10) {
                    // Active patrol assigned to jurisdiction
                    $assignedBrgy = $localBrgys[array_rand($localBrgys)];
                    $status = 'Active';
                } elseif ($j === 11) {
                    $assignedBrgy = $localBrgys[array_rand($localBrgys)];
                    $status = 'Deployed';
                } else {
                    $assignedBrgy = null;
                    $status = 'Off-Duty';
                }

                $officers[] = [
                    'badge_number' => $badge,
                    'full_name' => $name,
                    'rank' => $rank,
                    'assigned_barangay' => $assignedBrgy,
                    'shift' => $shift,
                    'status' => $status,
                    'police_station' => $ps,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $counter++;
            }
        }

        DB::table('officers')->insert($officers);
    }
}

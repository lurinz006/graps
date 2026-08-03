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

        // 12 stations (PS 01 through PS 12, skipping PS 02)
        $psMap = [
            'Vitali' => 'PS 01', 'Tagasilay' => 'PS 01', 'Tulungatung' => 'PS 01',
            'Sangali' => 'PS 03', 'Victoria' => 'PS 03', 'Cabaluay' => 'PS 03', 'Bunguiao' => 'PS 03',
            'Bolong' => 'PS 03', 'Lamisahan' => 'PS 03', 'Mangusu' => 'PS 03', 'Pangapuyan' => 'PS 03',
            'Sibulao' => 'PS 03', 'Licomo' => 'PS 03', 'Capisan' => 'PS 03', 'Quiniput' => 'PS 03',
            'Lapakan' => 'PS 03', 'Tictapul' => 'PS 03',
            'Culianan' => 'PS 04', 'Pasobolong' => 'PS 04', 'Mercedes' => 'PS 04', 'Kasangyangan' => 'PS 04',
            'Muti' => 'PS 04', 'Talabaan' => 'PS 04', 'Landang Gua' => 'PS 04', 'Landang Laum' => 'PS 04',
            'Panubigan' => 'PS 04', 'Tolosa' => 'PS 04', 'Tigbalabag' => 'PS 04', 'Tugbungan' => 'PS 04',
            'Divisoria' => 'PS 05', 'Lunzuran' => 'PS 05', 'Putik' => 'PS 05', 'Boalan' => 'PS 05',
            'Guisao' => 'PS 05', 'La Paz' => 'PS 05', 'Lumayang' => 'PS 05', 'Limpapa' => 'PS 05',
            'Tetuan' => 'PS 06', 'Canelar' => 'PS 06', 'Guiwan' => 'PS 06', 'Mampang' => 'PS 06',
            'Campo Islam' => 'PS 06', 'Rio Hondo' => 'PS 06', 'Baliwasan' => 'PS 06',
            'Santa Maria' => 'PS 07', 'Pasonanca' => 'PS 07', 'Tumaga' => 'PS 07', 'Cabatangan' => 'PS 07',
            'Dita' => 'PS 07', 'Mariki' => 'PS 07',
            'Sinunuc' => 'PS 08', 'Calarian' => 'PS 08', 'Maasin' => 'PS 08', 'Malagutay' => 'PS 08',
            'Pamucutan' => 'PS 08', 'Upper Calarian' => 'PS 08', 'Taluksangay' => 'PS 08',
            'Ayala' => 'PS 09', 'Talisayan' => 'PS 09', 'Recodo' => 'PS 09',
            'Labuan' => 'PS 10', 'Sinubung' => 'PS 10', 'Patalon' => 'PS 10',
            'San Jose Gusu' => 'PS 11', 'San Roque' => 'PS 11', 'San Jose Cawa-cawa' => 'PS 11',
            'Talon-talon' => 'PS 12', 'Santa Catalina' => 'PS 12', 'Sta. Catalina' => 'PS 12',
            'Camino Nuevo' => 'PS 12', 'Cawit' => 'PS 12', 'Santo Niño' => 'PS 12', 'Arena Blanco' => 'PS 12',
            'Kasanyangan' => 'PS 04',
            'Zone 1' => 'PS 12', 'Zone 2' => 'PS 12', 'Zone 3' => 'PS 12', 'Zone 4' => 'PS 12',
            'Zone I' => 'PS 12', 'Zone II' => 'PS 12', 'Zone III' => 'PS 12', 'Zone IV' => 'PS 12',
        ];

        $firstNames = ['Juan', 'Pedro', 'Maria', 'Jose', 'Manuel', 'Ramon', 'Antonio', 'Francisco', 'Rolando', 'Lorence', 'Al-Ghazali', 'Sarah', 'Jessica', 'Michael', 'Christopher', 'David', 'Ryan', 'Efraim', 'Mohammad', 'Fatima'];
        $lastNames = ['Santos', 'Reyes', 'Cruz', 'Diaz', 'Gonzales', 'Bautista', 'Aquino', 'Marquez', 'Torres', 'Salazar', 'Lim', 'Tan', 'Abdullah', 'Jamil', 'Garcia', 'Villanueva', 'Fernandez', 'Flores', 'Bernardo', 'Ramos'];
        $ranks = ['Patrolman', 'Patrolwoman', 'Police Corporal', 'Police Staff Sergeant', 'Police Master Sergeant', 'Police Senior Master Sergeant', 'Police Chief Master Sergeant', 'Police Lieutenant', 'Police Captain'];
        $shifts = ['Day', 'Evening', 'Night'];
        $statuses = ['Active', 'Deployed', 'Off-Duty', 'On-Leave'];

        $barangays = DB::table('barangays')->pluck('name')->toArray();

        $officers = [];
        for ($i = 1; $i <= 150; $i++) {
            $badge = 'PCG-'.(2024000 + $i);
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $name = $firstName.' '.$lastName;
            $rank = $ranks[array_rand($ranks)];
            $shift = $shifts[array_rand($shifts)];
            $status = (rand(1, 100) > 15) ? 'Active' : $statuses[array_rand($statuses)];
            $assignedBrgy = ! empty($barangays) ? $barangays[array_rand($barangays)] : 'Santa Maria';

            // Resolve PS
            $ps = $psMap[$assignedBrgy] ?? 'PS 12';

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
        }

        DB::table('officers')->insert($officers);
    }
}

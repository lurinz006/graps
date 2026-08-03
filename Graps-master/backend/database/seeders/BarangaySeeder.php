<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BarangaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clean table to prevent duplicates
        DB::table('barangays')->truncate();

        $barangays = [
            ['Arena Blanco', 6.8920, 122.0910],
            ['Ayala', 6.9602, 121.9680],
            ['Baliwasan', 6.9142, 122.0592],
            ['Baluno', 7.0210, 121.9980],
            ['Boalan', 6.9580, 122.1020],
            ['Bolong', 7.0750, 122.2150],
            ['Buenavista', 7.2340, 122.1890],
            ['Bunguiao', 7.0980, 122.1670],
            ['Busay', 6.8850, 122.1120],
            ['Cabaluay', 7.0120, 122.1450],
            ['Cabatangan', 6.9482, 122.0498],
            ['Cacao', 7.1560, 122.1340],
            ['Calabasa', 7.1980, 122.1560],
            ['Calarian', 6.9277, 122.0182],
            ['Campo Islam', 6.9100, 122.0520],
            ['Canelar', 6.9150, 122.0700],
            ['Cawit', 6.9420, 121.9920],
            ['Culianan', 6.9850, 122.1420],
            ['Curuan', 7.2450, 122.2540],
            ['Dita', 7.1890, 122.1980],
            ['Divisoria', 6.9620, 122.1120],
            ['Dulian (Upper Bunguiao)', 7.1250, 122.1780],
            ['Dulian (Upper Pasonanca)', 6.9920, 122.0620],
            ['Guisao', 6.9950, 122.1220],
            ['Guiwan', 6.9380, 122.0910],
            ['La Paz', 7.0080, 121.9450],
            ['Labuan', 7.0920, 121.9020],
            ['Lamisahan', 7.1120, 122.1920],
            ['Landang Gua', 6.9100, 122.2340],
            ['Landang Laum', 6.8920, 122.2450],
            ['Lanzones', 7.0150, 122.1620],
            ['Lapakan', 7.2540, 122.2210],
            ['Latuan', 7.0850, 122.1920],
            ['Limaong', 7.3340, 122.2890],
            ['Limpapa', 7.1450, 121.9010],
            ['Lubigan', 7.1450, 122.1620],
            ['Lumayang', 6.9720, 122.0810],
            ['Lumbangan', 6.9650, 122.0890],
            ['Lunzuran', 6.9580, 122.0810],
            ['Maasin', 6.9210, 121.9990],
            ['Malagutay', 6.9340, 122.0310],
            ['Mampang', 6.9180, 122.1150],
            ['Manalipa', 6.8890, 122.2890],
            ['Mangusu', 7.2780, 122.2420],
            ['Manicahan', 7.0320, 122.1890],
            ['Mariki', 6.9010, 122.0820],
            ['Mercedes', 6.9950, 122.1620],
            ['Muti', 7.2890, 122.2890],
            ['Pamucutan', 6.9720, 121.9420],
            ['Pangapuyan', 6.8790, 122.1620],
            ['Panubigan', 7.3120, 122.2620],
            ['Pasilmanta', 6.8820, 122.1920],
            ['Pasonanca', 6.9520, 122.0620],
            ['Patalon', 7.0450, 121.9540],
            ['Barangay Zone I', 6.9020, 122.0790],
            ['Barangay Zone II', 6.9040, 122.0740],
            ['Barangay Zone III', 6.9010, 122.0720],
            ['Barangay Zone IV', 6.9000, 122.0760],
            ['Putik', 6.9380, 122.1020],
            ['Quiniput', 7.1580, 122.2120],
            ['Recodo', 6.9650, 121.9890],
            ['Rio Hondo', 6.9040, 122.0890],
            ['Salaan', 6.9920, 122.0990],
            ['San Jose Cawa-cawa', 6.9100, 122.0640],
            ['San Jose Gusu', 6.9182, 122.0398],
            ['San Roque', 6.9420, 122.0520],
            ['Sangali', 7.0890, 122.1980],
            ['Santa Barbara', 6.9040, 122.0790],
            ['Santa Catalina', 6.9080, 122.0920],
            ['Santa Maria', 6.9214, 122.0790],
            ['Santo Niño', 6.9050, 122.0450],
            ['Sibulao', 7.3540, 122.2890],
            ['Sinubung', 7.0650, 121.9210],
            ['Sinunoc', 6.9320, 122.0120],
            ['Tagasilay', 7.1250, 122.2340],
            ['Taguiti', 7.2120, 122.2210],
            ['Talabaan', 6.9820, 122.1720],
            ['Talisayan', 6.9890, 121.9680],
            ['Talon-talon', 6.9080, 122.1080],
            ['Taluksangay', 6.9580, 122.1580],
            ['Tetuan', 6.9210, 122.0910],
            ['Tictapul', 7.3020, 122.2980],
            ['Tigbalabag', 7.1890, 122.2340],
            ['Tigtabon', 6.8920, 122.1680],
            ['Tolosa', 7.0540, 122.1620],
            ['Tugbungan', 6.9250, 122.0990],
            ['Tulungatung', 6.9520, 122.0020],
            ['Tumaga', 6.9380, 122.0720],
            ['Tumalutab', 6.8620, 122.3120],
            ['Tumitus', 7.0980, 121.9120],
            ['Vitali', 7.3620, 122.2890],
            ['Capisan', 6.9620, 122.0120],
            ['Camino Nuevo', 6.9110, 122.0740],
            ['Licomo', 7.3780, 122.3120],
            ['Kasanyangan', 6.9180, 122.0880],
            ['Pasobolong', 6.9850, 122.1150],
            ['Victoria', 7.1950, 122.2120],
            ['Zambowood', 6.9450, 122.1290],
        ];

        $data = [];
        foreach ($barangays as $b) {
            $data[] = [
                'name' => $b[0],
                'centroid_lat' => $b[1],
                'centroid_lng' => $b[2],
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('barangays')->insert($data);
    }
}

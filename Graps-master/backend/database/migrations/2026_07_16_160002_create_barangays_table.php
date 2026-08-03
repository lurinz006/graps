<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('barangays', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->decimal('centroid_lat', 10, 8)->nullable();
            $table->decimal('centroid_lng', 11, 8)->nullable();
            $table->timestamps();
        });
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE barangays ADD COLUMN geom geography(Point, 4326) GENERATED ALWAYS AS (CASE WHEN centroid_lng IS NOT NULL AND centroid_lat IS NOT NULL THEN ST_SetSRID(ST_Point(centroid_lng, centroid_lat), 4326)::geography ELSE NULL END) STORED;');
            DB::statement('CREATE INDEX barangays_geom_gist ON barangays USING GIST (geom);');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('barangays');
    }
};

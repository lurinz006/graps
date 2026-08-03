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
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS postgis;');
        }

        Schema::create('spatial_data', function (Blueprint $table) {
            $table->id();
            // Administrative & Police levels
            $table->string('pro')->nullable();
            $table->string('ppo')->nullable();
            $table->string('stn')->nullable();

            // Location divisions
            $table->string('region')->nullable();
            $table->string('province')->nullable();
            $table->string('municipal')->nullable();
            $table->string('barangay')->nullable();
            $table->bigInteger('barangay_id')->nullable(); // Resolved during ingestion

            // Temporal indicators
            $table->string('monthly_cycle')->nullable(); // Maps to 'MONHTLY'
            $table->date('date_reported')->nullable();
            $table->time('time_reported')->nullable();
            $table->date('date_committed')->nullable();
            $table->time('time_committed')->nullable();
            $table->timestamp('recorded_at')->nullable(); // Integrated date/time committed for queries

            // Incident details
            $table->string('incident_type')->nullable(); // Maps to 'incidentType'
            $table->boolean('is_crime')->default(true); // Maps to 'iscime'
            $table->string('stage_of_felony')->nullable(); // Maps to 'stageoffelony'
            $table->text('offense')->nullable();
            $table->string('offense_type')->nullable(); // Maps to 'offenseType'

            // Geographic Coordinates
            $table->decimal('latitude', 10, 8)->nullable(); // Maps to 'lat'
            $table->decimal('longitude', 11, 8)->nullable(); // Maps to 'lng'
            $table->decimal('value', 12, 4)->nullable(); // Numeric weight for ML density analysis

            $table->timestamps();

            // Indexing strategy
            $table->index(['latitude', 'longitude']);
            $table->index('recorded_at');
            $table->index('offense');
            $table->index('barangay');
        });
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE spatial_data ADD COLUMN geom geography(Point, 4326) GENERATED ALWAYS AS (CASE WHEN longitude IS NOT NULL AND latitude IS NOT NULL THEN ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography ELSE NULL END) STORED;');
            DB::statement('CREATE INDEX spatial_data_geom_gist ON spatial_data USING GIST (geom);');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spatial_data');
    }
};

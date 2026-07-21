<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // Spike, Hotspot, Patrol, Trend
            $table->string('severity'); // Critical, High, Medium, Low
            $table->string('title');
            $table->text('message')->nullable();
            $table->string('barangay')->nullable();
            $table->boolean('acknowledged')->default(false);
            $table->string('acknowledged_by')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};

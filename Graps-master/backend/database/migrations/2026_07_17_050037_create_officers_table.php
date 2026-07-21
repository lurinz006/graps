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
        Schema::create('officers', function (Blueprint $table) {
            $table->id();
            $table->string('badge_number')->unique();
            $table->string('full_name');
            $table->string('rank');
            $table->string('assigned_barangay')->nullable();
            $table->string('shift')->nullable();
            $table->string('status')->default('Active');
            $table->string('police_station')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('officers');
    }
};

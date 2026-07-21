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
        Schema::create('analytics_metrics', function (Blueprint $table) {
            $table->id();
            $table->string('task_type'); // 'train' or 'forecast'
            $table->string('table_name');
            $table->string('target_column')->nullable();
            $table->decimal('r2_score', 8, 4)->nullable(); // Scikit-learn validation score
            $table->decimal('mse_score', 8, 4)->nullable(); // Mean Squared Error
            $table->jsonb('results_json')->nullable(); // Store predictions / forecast steps array
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analytics_metrics');
    }
};

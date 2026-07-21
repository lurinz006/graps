<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AnalyticsController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::prefix('v1')->group(function () {
    // Spatial coordinates endpoints
    Route::get('/spatial-data', [AnalyticsController::class, 'getSpatialData']);
    Route::post('/spatial-data/upload', [AnalyticsController::class, 'uploadData']);
    Route::post('/spatial-data/upload-file', [AnalyticsController::class, 'uploadFile']);
    Route::delete('/spatial-data/clear', [AnalyticsController::class, 'clearSpatialData']);
    Route::delete('/spatial-data/{id}', [AnalyticsController::class, 'deleteSpatialPoint']);
    
    // Analytics & ML triggering endpoints
    Route::post('/analytics/trigger', [AnalyticsController::class, 'triggerAnalytics']);
    Route::get('/analytics/metrics', [AnalyticsController::class, 'getMetrics']);
    
    // Officers & Alerts endpoints
    Route::get('/officers', [AnalyticsController::class, 'getOfficers']);
    Route::post('/officers/upload', [AnalyticsController::class, 'uploadOfficers']);
    Route::post('/officers', [AnalyticsController::class, 'createOfficer']);
    Route::put('/officers/{id}', [AnalyticsController::class, 'updateOfficer']);
    Route::delete('/officers/{id}', [AnalyticsController::class, 'deleteOfficer']);
    Route::get('/alerts', [AnalyticsController::class, 'getAlerts']);
    Route::post('/alerts/{id}/acknowledge', [AnalyticsController::class, 'acknowledgeAlert']);

    // Aggregations & algorithm results
    Route::get('/barangays', [AnalyticsController::class, 'getBarangays']);
    Route::get('/analytics', [AnalyticsController::class, 'getAnalytics']);
    Route::get('/clusters', [AnalyticsController::class, 'getClusters']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


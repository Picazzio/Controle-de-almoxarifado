<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\FixedAssetController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\StockRequestController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications', [NotificationController::class, 'clear']);

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/sector-consumption', [DashboardController::class, 'sectorConsumption']);
    Route::get('/dashboard/low-stock-report', [DashboardController::class, 'lowStockReport']);
    Route::apiResource('categories', CategoryController::class);

    Route::apiResource('departments', DepartmentController::class);

    Route::apiResource('fixed-assets', FixedAssetController::class);
    Route::post('/fixed-assets/import', [FixedAssetController::class, 'import']);

    Route::get('/catalog', [CatalogController::class, 'index']);
    Route::apiResource('stock-requests', StockRequestController::class)->only(['index', 'store', 'show', 'update']);
    Route::post('/stock-requests/{stockRequest}/start-separation', [StockRequestController::class, 'startSeparation']);
    Route::post('/stock-requests/{stockRequest}/fulfill', [StockRequestController::class, 'fulfill']);

    Route::apiResource('products', ProductController::class)->parameters(['products' => 'product']);
    Route::post('/products/{product}/withdraw', [ProductController::class, 'withdraw'])->name('products.withdraw');
    Route::post('/products/{product}/entry', [ProductController::class, 'entry'])->name('products.entry');

    Route::get('/movements', [StockMovementController::class, 'index']);

    Route::apiResource('users', UserController::class);

    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/roles/permissions', [RoleController::class, 'permissions']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::get('/roles/{role}', [RoleController::class, 'show'])->scopeBindings();
    Route::put('/roles/{role}', [RoleController::class, 'update'])->scopeBindings();
    Route::delete('/roles/{role}', [RoleController::class, 'destroy']);

    Route::get('/logs', [ActivityLogController::class, 'index']);
});

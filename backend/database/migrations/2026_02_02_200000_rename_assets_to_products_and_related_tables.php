<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Refatoração: assets -> products; asset_movements -> stock_movements (asset_id -> product_id);
     * stock_request_items.asset_id -> product_id.
     */
    public function up(): void
    {
        Schema::rename('assets', 'products');

        Schema::table('asset_movements', function (Blueprint $table) {
            $table->dropForeign(['asset_id']);
        });
        Schema::table('asset_movements', function (Blueprint $table) {
            $table->renameColumn('asset_id', 'product_id');
        });
        Schema::table('asset_movements', function (Blueprint $table) {
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });
        Schema::rename('asset_movements', 'stock_movements');

        Schema::table('stock_request_items', function (Blueprint $table) {
            $table->dropForeign(['asset_id']);
        });
        Schema::table('stock_request_items', function (Blueprint $table) {
            $table->renameColumn('asset_id', 'product_id');
        });
        Schema::table('stock_request_items', function (Blueprint $table) {
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });

        if (Schema::hasTable('activity_log')) {
            DB::table('activity_log')->where('subject_type', 'App\Models\Asset')->update(['subject_type' => 'App\Models\Product']);
            DB::table('activity_log')->where('subject_type', 'App\Models\AssetMovement')->update(['subject_type' => 'App\Models\StockMovement']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_request_items', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
        });
        Schema::table('stock_request_items', function (Blueprint $table) {
            $table->renameColumn('product_id', 'asset_id');
        });
        Schema::table('stock_request_items', function (Blueprint $table) {
            $table->foreign('asset_id')->references('id')->on('products')->cascadeOnDelete();
        });

        Schema::rename('stock_movements', 'asset_movements');
        Schema::table('asset_movements', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
        });
        Schema::table('asset_movements', function (Blueprint $table) {
            $table->renameColumn('product_id', 'asset_id');
        });
        Schema::table('asset_movements', function (Blueprint $table) {
            $table->foreign('asset_id')->references('id')->on('products')->cascadeOnDelete();
        });

        Schema::rename('products', 'assets');

        if (Schema::hasTable('activity_log')) {
            DB::table('activity_log')->where('subject_type', 'App\Models\Product')->update(['subject_type' => 'App\Models\Asset']);
            DB::table('activity_log')->where('subject_type', 'App\Models\StockMovement')->update(['subject_type' => 'App\Models\AssetMovement']);
        }
    }
};

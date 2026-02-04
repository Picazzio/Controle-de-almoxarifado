<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE asset_movements MODIFY department_id BIGINT UNSIGNED NULL');
        } else {
            Schema::table('asset_movements', function ($table) {
                $table->unsignedBigInteger('department_id')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE asset_movements MODIFY department_id BIGINT UNSIGNED NOT NULL');
        } else {
            Schema::table('asset_movements', function ($table) {
                $table->unsignedBigInteger('department_id')->nullable(false)->change();
            });
        }
    }
};

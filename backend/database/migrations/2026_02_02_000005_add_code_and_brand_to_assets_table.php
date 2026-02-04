<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->string('code', 20)->nullable()->after('id');
            $table->string('brand', 255)->nullable()->after('name');
        });

        $assets = DB::table('assets')->orderBy('id')->get();
        foreach ($assets as $index => $a) {
            $code = str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);
            DB::table('assets')->where('id', $a->id)->update(['code' => $code]);
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->unique('code');
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn(['code', 'brand']);
        });
    }
};

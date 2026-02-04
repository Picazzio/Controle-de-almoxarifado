<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->string('code', 20)->nullable()->after('id');
        });

        $departments = DB::table('departments')->orderBy('id')->get();
        foreach ($departments as $index => $dept) {
            $num = $index + 1;
            $code = 'SET-' . str_pad($num, 3, '0', STR_PAD_LEFT);
            DB::table('departments')->where('id', $dept->id)->update(['code' => $code]);
        }

        Schema::table('departments', function (Blueprint $table) {
            $table->unique('code');
        });
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->dropColumn('code');
        });
    }
};

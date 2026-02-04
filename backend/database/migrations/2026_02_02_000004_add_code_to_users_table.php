<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('code', 20)->nullable()->after('id');
        });

        $users = DB::table('users')->orderBy('id')->get();
        foreach ($users as $index => $u) {
            $code = str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);
            DB::table('users')->where('id', $u->id)->update(['code' => $code]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique('code');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('code');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $departments = DB::table('departments')->orderBy('id')->get();
        foreach ($departments as $index => $dept) {
            $tempCode = 'TMP-' . ($index + 1);
            DB::table('departments')->where('id', $dept->id)->update(['code' => $tempCode]);
        }
        foreach ($departments as $index => $dept) {
            $code = str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);
            DB::table('departments')->where('id', $dept->id)->update(['code' => $code]);
        }
    }

    public function down(): void
    {
        $departments = DB::table('departments')->orderBy('id')->get();
        foreach ($departments as $index => $dept) {
            DB::table('departments')->where('id', $dept->id)->update(['code' => 'TMP-' . ($index + 1)]);
        }
        foreach ($departments as $index => $dept) {
            $code = str_pad((string) $index, 4, '0', STR_PAD_LEFT);
            DB::table('departments')->where('id', $dept->id)->update(['code' => $code]);
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $departments = DB::table('departments')->orderBy('id')->get();
        foreach ($departments as $index => $dept) {
            $code = str_pad((string) $index, 4, '0', STR_PAD_LEFT);
            DB::table('departments')->where('id', $dept->id)->update(['code' => $code]);
        }
    }

    public function down(): void
    {
        // Reverter para formato SET-XXX (opcional)
        $departments = DB::table('departments')->orderBy('id')->get();
        foreach ($departments as $index => $dept) {
            $code = 'SET-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
            DB::table('departments')->where('id', $dept->id)->update(['code' => $code]);
        }
    }
};

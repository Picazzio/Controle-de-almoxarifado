<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $names = ['Almoxarifado', 'Financeiro', 'Informática', 'RH', 'Marketing', 'Vendas'];

        $nextCode = $this->nextDepartmentCode();

        foreach ($names as $name) {
            $department = Department::firstOrCreate(['name' => $name]);
            if (empty($department->code)) {
                $department->update(['code' => str_pad((string) $nextCode, 4, '0', STR_PAD_LEFT)]);
                $nextCode++;
            }
        }
    }

    private function nextDepartmentCode(): int
    {
        $last = Department::whereNotNull('code')->get()->max(function ($d) {
            if (preg_match('/^SET-(\d+)$/', $d->code ?? '', $m)) {
                return (int) $m[1];
            }
            if (preg_match('/^\d{4}$/', $d->code ?? '')) {
                return (int) $d->code;
            }
            return 0;
        });

        return ($last ?? 0) + 1;
    }
}

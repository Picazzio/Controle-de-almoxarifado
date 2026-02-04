<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = ['Financeiro', 'TI', 'RH', 'Marketing', 'Vendas'];
        foreach ($departments as $name) {
            Department::firstOrCreate(['name' => $name]);
        }
    }
}

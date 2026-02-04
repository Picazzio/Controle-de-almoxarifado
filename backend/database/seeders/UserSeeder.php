<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $ti = Department::where('name', 'TI')->first();
        $admin = User::firstOrCreate(
            ['email' => 'admin@empresa.com'],
            [
                'name' => 'Administrador',
                'password' => Hash::make('password'),
                'department_id' => $ti?->id,
                'status' => 'active',
                'join_date' => now(),
            ]
        );
        if (!$admin->code) {
            $last = User::whereNotNull('code')->get()->max(fn ($u) => preg_match('/^\d{4}$/', (string) $u->code) ? (int) $u->code : 0);
            $admin->code = str_pad((string) (($last ?? 0) + 1), 4, '0', STR_PAD_LEFT);
            $admin->save();
        }
        $admin->assignRole('Admin');
    }
}

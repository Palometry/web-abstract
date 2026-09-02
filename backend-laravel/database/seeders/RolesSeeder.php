<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        $roles = ['admin', 'editor', 'editor_user_manager', 'client'];
        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(['name' => $role], ['name' => $role]);
        }
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');
        $fullName = env('ADMIN_FULL_NAME', 'Admin');

        if (!$email || !$password) {
            return;
        }

        $user = DB::table('users')->where('email', $email)->first();
        if (!$user) {
            $userId = DB::table('users')->insertGetId([
                'email' => $email,
                'password_hash' => Hash::make($password),
                'full_name' => $fullName,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $userId = $user->id;
        }

        $role = DB::table('roles')->where('name', 'admin')->first();
        if ($role) {
            DB::table('user_roles')->updateOrInsert(
                ['user_id' => $userId, 'role_id' => $role->id],
                ['user_id' => $userId, 'role_id' => $role->id]
            );
        }
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing users to prevent duplicates
        DB::table('users')->truncate();

        $users = [
            [
                'name' => 'ZCPO Administrator',
                'email' => 'admin@graps.gov',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ZCPO Intelligence Analyst',
                'email' => 'analyst@graps.gov',
                'password' => Hash::make('password'),
                'role' => 'analyst',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ZCPO Chief of Police',
                'email' => 'chief@graps.gov',
                'password' => Hash::make('password'),
                'role' => 'decision_maker',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ];

        DB::table('users')->insert($users);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Officer extends Model
{
    use HasFactory;

    protected $fillable = [
        'badge_number',
        'full_name',
        'rank',
        'assigned_barangay',
        'shift',
        'status',
        'police_station',
    ];
}

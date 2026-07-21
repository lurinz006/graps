<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Alert extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'severity',
        'title',
        'message',
        'barangay',
        'acknowledged',
        'acknowledged_by',
        'acknowledged_at',
    ];

    protected $casts = [
        'acknowledged' => 'boolean',
        'acknowledged_at' => 'datetime',
    ];
}

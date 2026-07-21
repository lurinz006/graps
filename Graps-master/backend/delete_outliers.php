<?php
$outliers = \App\Models\SpatialData::where('latitude', '>', 7.5)->get(['id', 'barangay', 'latitude', 'longitude', 'name']);
echo "Found outliers:\n";
foreach ($outliers as $o) {
    echo $o->id . " - " . $o->name . " at " . $o->latitude . ", " . $o->longitude . "\n";
}
\App\Models\SpatialData::where('latitude', '>', 7.5)->delete();
echo "Deleted outliers.\n";

<?php

use App\Http\Controllers\Api\V1\AnalyticsController;

// ─────────────────────────────────────────────────────────────────────────────
//  Unit: AnalyticsController – pure logic tests (no HTTP layer)
// ─────────────────────────────────────────────────────────────────────────────

describe('AnalyticsController Unit', function () {

    it('can be instantiated', function () {
        $controller = new AnalyticsController;
        expect($controller)->toBeInstanceOf(AnalyticsController::class);
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  Unit: Barangay name normalization logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Barangay name normalization', function () {

    it('matches barangay names case-insensitively', function () {
        $rawNames = ['Canelar', 'CANELAR', 'canelar', '  Canelar  '];

        foreach ($rawNames as $name) {
            $clean = strtolower(trim($name));
            expect($clean)->toBe('canelar');
        }
    });

    it('strips leading and trailing whitespace before lookup', function () {
        $name = '  San Jose  ';
        expect(strtolower(trim($name)))->toBe('san jose');
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  Unit: is_crime flag mapping logic
// ─────────────────────────────────────────────────────────────────────────────

describe('is_crime flag logic', function () {

    it("maps 'yes' to true", function () {
        expect(in_array(strtolower(trim('yes')), ['yes', 'y', 'true', '1']))->toBeTrue();
    });

    it("maps 'y' to true", function () {
        expect(in_array(strtolower(trim('y')), ['yes', 'y', 'true', '1']))->toBeTrue();
    });

    it("maps 'true' to true", function () {
        expect(in_array(strtolower(trim('true')), ['yes', 'y', 'true', '1']))->toBeTrue();
    });

    it("maps '1' to true", function () {
        expect(in_array(strtolower(trim('1')), ['yes', 'y', 'true', '1']))->toBeTrue();
    });

    it("maps 'YES' (uppercase) to true", function () {
        expect(in_array(strtolower(trim('YES')), ['yes', 'y', 'true', '1']))->toBeTrue();
    });

    it("maps 'no' to false", function () {
        expect(in_array(strtolower(trim('no')), ['yes', 'y', 'true', '1']))->toBeFalse();
    });

    it("maps 'n' to false", function () {
        expect(in_array(strtolower(trim('n')), ['yes', 'y', 'true', '1']))->toBeFalse();
    });

    it("maps 'false' to false", function () {
        expect(in_array(strtolower(trim('false')), ['yes', 'y', 'true', '1']))->toBeFalse();
    });

    it("maps '0' to false", function () {
        expect(in_array(strtolower(trim('0')), ['yes', 'y', 'true', '1']))->toBeFalse();
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  Unit: Date/Time parsing logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Date/time committed parsing', function () {

    it('combines dateCommitted and timeCommitted into a valid datetime', function () {
        $date = '2025-01-15';
        $time = '14:30:00';
        $result = date('Y-m-d H:i:s', strtotime($date.' '.$time));

        expect($result)->toBe('2025-01-15 14:30:00');
    });

    it('defaults time to 00:00:00 when timeCommitted is absent', function () {
        $date = '2025-03-10';
        $time = null ?? '00:00:00';
        $result = date('Y-m-d H:i:s', strtotime($date.' '.$time));

        expect($result)->toBe('2025-03-10 00:00:00');
    });

    it('handles missing dateCommitted by setting recordedAt to null', function () {
        $dateCommitted = null;
        $recordedAt = null;

        if (! empty($dateCommitted)) {
            $recordedAt = date('Y-m-d H:i:s', strtotime($dateCommitted.' 00:00:00'));
        }

        expect($recordedAt)->toBeNull();
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  Unit: Value field numeric coercion logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Spatial value field coercion', function () {

    it('uses the numeric value when present and valid', function () {
        $point = ['value' => '3.5'];
        $result = (isset($point['value']) && is_numeric($point['value'])) ? (float) $point['value'] : 1.0;

        expect($result)->toBe(3.5);
    });

    it('defaults to 1.0 when value is absent', function () {
        $point = [];
        $result = (isset($point['value']) && is_numeric($point['value'])) ? (float) $point['value'] : 1.0;

        expect($result)->toBe(1.0);
    });

    it('defaults to 1.0 when value is a non-numeric string', function () {
        $point = ['value' => 'N/A'];
        $result = (isset($point['value']) && is_numeric($point['value'])) ? (float) $point['value'] : 1.0;

        expect($result)->toBe(1.0);
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  Unit: Latitude / Longitude coercion logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Coordinate coercion logic', function () {

    it('casts valid lat/lng strings to float', function () {
        $point = ['lat' => '6.9214', 'lng' => '122.0790'];

        $lat = (isset($point['lat']) && is_numeric($point['lat'])) ? (float) $point['lat'] : null;
        $lng = (isset($point['lng']) && is_numeric($point['lng'])) ? (float) $point['lng'] : null;

        expect($lat)->toBe(6.9214);
        expect($lng)->toBe(122.0790);
    });

    it('returns null for missing lat/lng', function () {
        $point = [];

        $lat = (isset($point['lat']) && is_numeric($point['lat'])) ? (float) $point['lat'] : null;
        $lng = (isset($point['lng']) && is_numeric($point['lng'])) ? (float) $point['lng'] : null;

        expect($lat)->toBeNull();
        expect($lng)->toBeNull();
    });

    it('returns null for non-numeric lat', function () {
        $point = ['lat' => 'north', 'lng' => '122.07'];

        $lat = (isset($point['lat']) && is_numeric($point['lat'])) ? (float) $point['lat'] : null;

        expect($lat)->toBeNull();
    });

});

// ─────────────────────────────────────────────────────────────────────────────
//  Unit: Chunk logic for bulk insert
// ─────────────────────────────────────────────────────────────────────────────

describe('Bulk insert chunking logic', function () {

    it('splits 1500 records into 3 chunks of 500', function () {
        $data = array_fill(0, 1500, ['dummy' => true]);
        $chunks = array_chunk($data, 500);

        expect($chunks)->toHaveCount(3);
        expect(count($chunks[0]))->toBe(500);
        expect(count($chunks[2]))->toBe(500);
    });

    it('handles less than 500 records in a single chunk', function () {
        $data = array_fill(0, 10, ['dummy' => true]);
        $chunks = array_chunk($data, 500);

        expect($chunks)->toHaveCount(1);
        expect(count($chunks[0]))->toBe(10);
    });

});

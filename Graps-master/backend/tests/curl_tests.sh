#!/usr/bin/env bash
# =============================================================================
# GRAPS – cURL API Test Script
# =============================================================================
# Tests every endpoint in /api/v1/* against a running Laravel backend.
#
# Usage:
#   chmod +x curl_tests.sh
#   ./curl_tests.sh
#
# Prerequisites:
#   - Laravel dev server running: php artisan serve  (at 127.0.0.1:8000)
#   - jq installed for pretty JSON output (sudo apt install jq)
# =============================================================================

BASE="http://127.0.0.1:8000/api/v1"
PASS=0
FAIL=0
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RESET="\033[0m"

# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────
divider() { echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }

assert_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    echo -e "  ${GREEN}✓ PASS${RESET} ${label} [HTTP $actual]"
    ((PASS++))
  else
    echo -e "  ${RED}✗ FAIL${RESET} ${label} [Expected HTTP $expected, got $actual]"
    ((FAIL++))
  fi
}

assert_json_contains() {
  local label="$1"
  local body="$2"
  local key="$3"
  if echo "$body" | jq -e ".$key" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ PASS${RESET} ${label} (key '${key}' present)"
    ((PASS++))
  else
    echo -e "  ${RED}✗ FAIL${RESET} ${label} (key '${key}' MISSING in response)"
    ((FAIL++))
  fi
}

assert_json_value() {
  local label="$1"
  local body="$2"
  local key="$3"
  local expected="$4"
  local actual
  actual=$(echo "$body" | jq -r ".$key" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓ PASS${RESET} ${label} ($key = '$actual')"
    ((PASS++))
  else
    echo -e "  ${RED}✗ FAIL${RESET} ${label} ($key = '$actual', expected '$expected')"
    ((FAIL++))
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
#  Check server availability
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}GRAPS API – cURL Test Suite${RESET}"
divider

if ! curl -sf --connect-timeout 3 "$BASE/spatial-data" > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Laravel server not reachable at $BASE${RESET}"
  echo "Start it with: cd backend && php artisan serve"
  exit 1
fi
echo -e "${GREEN}Server reachable ✓${RESET}"

# ─────────────────────────────────────────────────────────────────────────────
#  1. GET /api/v1/spatial-data
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}1. GET /api/v1/spatial-data${RESET}"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/spatial-data" \
  -H "Accept: application/json")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "GET spatial-data returns 200" 200 "$STATUS"
echo "  Response body (truncated): $(echo "$BODY" | head -c 200)..."

# ─────────────────────────────────────────────────────────────────────────────
#  2. POST /api/v1/spatial-data (uploadData) – VALID
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}2. POST /api/v1/spatial-data – valid payload${RESET}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/spatial-data" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "data": [
      {
        "lat":           6.9214,
        "lng":           122.0790,
        "incidentType":  "Robbery",
        "offense":       "Theft",
        "dateCommitted": "2025-06-01",
        "timeCommitted": "09:00:00",
        "value":         1.0
      },
      {
        "lat":           6.9100,
        "lng":           122.0700,
        "incidentType":  "Assault",
        "offense":       "Physical Injury",
        "barangay":      "Canelar",
        "value":         2.0
      }
    ],
    "task":            "train",
    "target_column":   "value",
    "feature_columns": "latitude,longitude"
  }')
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "POST spatial-data returns 200" 200 "$STATUS"
assert_json_value "Response success = true" "$BODY" "success" "true"
assert_json_contains "Response contains message" "$BODY" "message"
echo "  Message: $(echo "$BODY" | jq -r '.message')"

# ─────────────────────────────────────────────────────────────────────────────
#  3. POST /api/v1/spatial-data – MISSING data field (expect 422)
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}3. POST /api/v1/spatial-data – missing 'data' field (422)${RESET}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/spatial-data" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"task":"train"}')
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "POST without data returns 422" 422 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
#  4. POST /api/v1/spatial-data – INVALID task value (expect 422)
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}4. POST /api/v1/spatial-data – invalid task value (422)${RESET}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/spatial-data" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"data":[{"lat":6.91,"lng":122.07}],"task":"invalid_task"}')
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "POST with invalid task returns 422" 422 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
#  5. POST /api/v1/spatial-data/upload-file – CSV upload
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}5. POST /api/v1/spatial-data/upload-file – CSV file${RESET}"

CSV_FILE=$(mktemp /tmp/graps_test_XXXXXX.csv)
cat > "$CSV_FILE" << 'EOF'
lat,lng,incidentType,offense,value
6.9214,122.0790,Robbery,Theft,1.0
6.9100,122.0700,Assault,Physical Injury,1.0
6.9300,122.0800,Homicide,Murder,3.0
EOF

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/spatial-data/upload-file" \
  -H "Accept: application/json" \
  -F "file=@${CSV_FILE};type=text/csv" \
  -F "task=train" \
  -F "target_column=value" \
  -F "feature_columns=latitude,longitude")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "CSV upload returns 200" 200 "$STATUS"
assert_json_value "CSV upload success = true" "$BODY" "success" "true"
echo "  Message: $(echo "$BODY" | jq -r '.message')"
rm -f "$CSV_FILE"

# ─────────────────────────────────────────────────────────────────────────────
#  6. POST /api/v1/spatial-data/upload-file – JSON upload
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}6. POST /api/v1/spatial-data/upload-file – JSON file${RESET}"

JSON_FILE=$(mktemp /tmp/graps_test_XXXXXX.json)
cat > "$JSON_FILE" << 'EOF'
[
  {"lat": 6.9214, "lng": 122.0790, "incidentType": "Robbery", "value": 1.0},
  {"lat": 6.9100, "lng": 122.0700, "incidentType": "Assault", "value": 2.0}
]
EOF

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/spatial-data/upload-file" \
  -H "Accept: application/json" \
  -F "file=@${JSON_FILE};type=application/json" \
  -F "task=train")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "JSON file upload returns 200" 200 "$STATUS"
assert_json_value "JSON upload success = true" "$BODY" "success" "true"
rm -f "$JSON_FILE"

# ─────────────────────────────────────────────────────────────────────────────
#  7. POST /api/v1/spatial-data/upload-file – Unsupported format (400)
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}7. POST /api/v1/spatial-data/upload-file – .xlsx (400)${RESET}"

XLSX_FILE=$(mktemp /tmp/graps_test_XXXXXX.xlsx)
echo "fake xlsx" > "$XLSX_FILE"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/spatial-data/upload-file" \
  -H "Accept: application/json" \
  -F "file=@${XLSX_FILE};type=application/vnd.ms-excel")
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "XLSX upload returns 400" 400 "$STATUS"
rm -f "$XLSX_FILE"

# ─────────────────────────────────────────────────────────────────────────────
#  8. POST /api/v1/analytics/trigger – valid train job
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}8. POST /api/v1/analytics/trigger – train job${RESET}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/analytics/trigger" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "task":            "train",
    "target_column":   "value",
    "feature_columns": "latitude,longitude"
  }')
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "Trigger train returns 200" 200 "$STATUS"
assert_json_value "Trigger success = true" "$BODY" "success" "true"
echo "  Message: $(echo "$BODY" | jq -r '.message')"

# ─────────────────────────────────────────────────────────────────────────────
#  9. POST /api/v1/analytics/trigger – valid forecast job
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}9. POST /api/v1/analytics/trigger – forecast job${RESET}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/analytics/trigger" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"task":"forecast","target_column":"value"}')
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "Trigger forecast returns 200" 200 "$STATUS"
assert_json_value "Forecast success = true" "$BODY" "success" "true"

# ─────────────────────────────────────────────────────────────────────────────
#  10. POST /api/v1/analytics/trigger – missing required field (422)
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}10. POST /api/v1/analytics/trigger – missing target_column (422)${RESET}"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/analytics/trigger" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"task":"train"}')
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "Trigger without target returns 422" 422 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
#  11. GET /api/v1/analytics/metrics
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}11. GET /api/v1/analytics/metrics${RESET}"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/analytics/metrics" \
  -H "Accept: application/json")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "GET metrics returns 200" 200 "$STATUS"
assert_json_contains "Response has training key"  "$BODY" "training"
assert_json_contains "Response has forecast key" "$BODY" "forecast"
echo "  Training R²:  $(echo "$BODY" | jq -r '.training.r2_score  // "null"')"
echo "  Training MSE: $(echo "$BODY" | jq -r '.training.mse_score // "null"')"

# ─────────────────────────────────────────────────────────────────────────────
#  12. DELETE /api/v1/spatial-data/clear
# ─────────────────────────────────────────────────────────────────────────────
divider
echo -e "${BOLD}12. DELETE /api/v1/spatial-data/clear${RESET}"

RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/spatial-data/clear" \
  -H "Accept: application/json")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)

assert_status "DELETE clear returns 200" 200 "$STATUS"
assert_json_value "Clear success = true" "$BODY" "success" "true"

# ─────────────────────────────────────────────────────────────────────────────
#  Summary
# ─────────────────────────────────────────────────────────────────────────────
divider
TOTAL=$((PASS + FAIL))
echo -e "${BOLD}Results: ${GREEN}${PASS} passed${RESET}, ${RED}${FAIL} failed${RESET} / ${TOTAL} total assertions"
divider

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

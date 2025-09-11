#!/bin/bash

# Test script để debug update app API
echo "=== Testing Update App API ==="

# Base URL và JWT token
BASE_URL="http://localhost:3001/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoyLCJyb2xlIjoidXNlciIsImlhdCI6MTc1NzU1Nzk3MywiZXhwIjoxNzU3NjQ0MzczfQ.ha-_Usj249m0Rlk4eJMDpPkdUtPPJRW286FnzzcFJzg"

# Test 1: Update với tất cả fields
echo "1. Testing PATCH with all fields..."
curl -X PATCH "$BASE_URL/apps/12" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Google Drive Updated",
    "url": "https://drive.google.com",
    "icon": "cloud"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq

echo -e "\n2. Testing PATCH with only name..."
curl -X PATCH "$BASE_URL/apps/12" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Google Drive Test"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq

echo -e "\n3. Testing PATCH with invalid URL..."
curl -X PATCH "$BASE_URL/apps/12" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Google Drive",
    "url": "invalid-url"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq

echo -e "\n4. Testing PATCH with empty name..."
curl -X PATCH "$BASE_URL/apps/12" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "",
    "url": "https://drive.google.com"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq

echo -e "\n=== Test completed! ==="

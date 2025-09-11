#!/bin/bash

# Test script cho trang quản lý apps
echo "=== Testing Apps Management Page ==="

# Base URL và JWT token
BASE_URL="http://localhost:3001/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoyLCJyb2xlIjoidXNlciIsImlhdCI6MTc1NzU1Nzk3MywiZXhwIjoxNzU3NjQ0MzczfQ.ha-_Usj249m0Rlk4eJMDpPkdUtPPJRW286FnzzcFJzg"

echo "1. Testing GET /apps (list all apps)..."
curl -s -X GET "$BASE_URL/apps" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n2. Testing POST /apps (create new app)..."
curl -s -X POST "$BASE_URL/apps" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Netflix",
    "url": "https://netflix.com",
    "icon": "play-circle"
  }' | jq

echo -e "\n3. Testing GET /apps again (after creation)..."
curl -s -X GET "$BASE_URL/apps" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n4. Creating more test apps..."
curl -s -X POST "$BASE_URL/apps" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Spotify",
    "url": "https://spotify.com",
    "icon": "sound"
  }' | jq

curl -s -X POST "$BASE_URL/apps" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Discord",
    "url": "https://discord.com",
    "icon": "message"
  }' | jq

echo -e "\n5. Final list of all apps:"
curl -s -X GET "$BASE_URL/apps" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== Test completed! ==="
echo "Frontend: http://localhost:3000/manage-apps"
echo "Login with: admin@example.com / admin123"

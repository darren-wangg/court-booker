#!/bin/bash

# Test script to verify the API endpoint works
# This tests the GetUpcomingReservationsByAmenity endpoint you discovered

echo "🧪 Testing API endpoint..."
echo ""

AMENITY_KEY="dd5c4252-e044-4012-a1e3-ec2e1a8cdddf"
TOMORROW=$(date -v+1d "+%-m/%-d/%Y")
TIMESTAMP=$(date +%s)000

echo "📅 Testing date: $TOMORROW"
echo "🔑 Amenity key: $AMENITY_KEY"
echo ""

URL="https://www.avalonaccess.com/Information/Information/GetUpcomingReservationsByAmenity?amenity=${AMENITY_KEY}&date=${TOMORROW}&_=${TIMESTAMP}"

echo "🌐 Making request to:"
echo "$URL"
echo ""

# Make the request
curl -v \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  -H "Accept: application/json, text/javascript, */*; q=0.01" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Referer: https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=${AMENITY_KEY}" \
  "$URL" 2>&1 | tee api-response.txt

echo ""
echo "================================"
echo "Response saved to api-response.txt"
echo ""
echo "💡 Check if you got:"
echo "   - HTML with login form → Need authentication"
echo "   - HTML with reservation table → API works!"
echo "   - JSON data → API works!"
echo "================================"

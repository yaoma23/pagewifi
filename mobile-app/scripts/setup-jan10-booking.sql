-- Script to set up Sonderborg Perlegade 2 booking for January 10-17, 2026
-- Check-in: January 10, 2026 at 2 minutes from now (for video recording)
-- Check-out: January 17, 2026 at 8 minutes after check-in
-- This booking shows as "Sonderborg Perlegade 2" in the app due to UI overrides
-- Run this in Supabase SQL Editor

-- Update the specific booking ID
-- Set check-in to January 10, 2026 at 2 minutes from now
-- Set checkout to January 17, 2026 at 8 minutes after check-in time
UPDATE bookings
SET 
  status = 'confirmed',
  check_in = ('2026-01-10'::date + (NOW() + INTERVAL '2 minutes')::time)::timestamp, -- Jan 10, 2026 at 2 minutes from now
  check_out = ('2026-01-17'::date + ((NOW() + INTERVAL '2 minutes')::time + INTERVAL '8 minutes'))::timestamp -- Jan 17, 2026 at 8 minutes after check-in
WHERE id = '6679b55d-6d3c-47b0-80da-f89e3fcd297b'
RETURNING 
  id,
  status,
  check_in,
  check_out,
  property_id,
  renter_id;

-- Verify it was updated
SELECT 
  b.id,
  b.status,
  b.check_in,
  b.check_out,
  EXTRACT(EPOCH FROM (b.check_in - NOW())) / 60 as minutes_until_checkin,
  EXTRACT(EPOCH FROM (b.check_out - NOW())) / 60 as minutes_until_checkout,
  p.name as property_name,
  p.address as property_address,
  u.email as renter_email
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.renter_id = u.id
WHERE b.id = '6679b55d-6d3c-47b0-80da-f89e3fcd297b';


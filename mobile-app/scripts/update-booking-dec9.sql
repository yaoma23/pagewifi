-- Simple script to update the booking for testing transitions
-- Check-in: 2 minutes from now
-- Check-out: 3 minutes after check-in (5 minutes from now)
-- This booking shows as "Sonderborg Perlegade 2" in the app due to UI overrides
-- Run this in Supabase SQL Editor

-- Update the specific booking ID
-- Check-in: 2 minutes from now
-- Check-out: 3 minutes after check-in (5 minutes from now)
UPDATE bookings
SET 
  status = 'confirmed',
  check_in = NOW() + INTERVAL '2 minutes', -- 2 minutes from now
  check_out = NOW() + INTERVAL '5 minutes' -- 5 minutes from now (3 minutes after check-in)
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


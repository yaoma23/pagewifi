-- Script to create/update a booking for December 9th at 14:20 for testing
-- This will target an existing property for a@a.com
-- Run this in Supabase SQL Editor

-- First, let's see what properties exist for this user's bookings
SELECT DISTINCT
  p.id as property_id,
  p.name as property_name,
  p.address as property_address
FROM properties p
JOIN bookings b ON b.property_id = p.id
JOIN users u ON b.renter_id = u.id
WHERE u.email = 'a@a.com'
ORDER BY p.name;

-- Option 1: Update the booking for "The house" at "Alsion" (check-in Dec 26)
-- This is the one that's showing 17 days away
UPDATE bookings
SET 
  status = 'confirmed',
  check_in = '2025-12-09 14:20:00'::timestamp, -- December 9th at 2:20 PM (2025)
  check_out = '2025-12-09 14:30:00'::timestamp -- 10 minutes after check-in (for testing checkout transition)
WHERE id = '6679b55d-6d3c-47b0-80da-f89e3fcd297b' -- The Dec 26 booking ID from your results
RETURNING 
  id,
  status,
  check_in,
  check_out,
  (SELECT name FROM properties WHERE id = bookings.property_id) as property_name,
  (SELECT address FROM properties WHERE id = bookings.property_id) as property_address;

-- Option 2: If you want to create a NEW booking instead, use this:
-- (Uncomment and run if you prefer a new booking)
/*
WITH property_user AS (
  SELECT 
    p.id as property_id,
    u.id as renter_id
  FROM properties p
  CROSS JOIN users u
  WHERE u.email = 'a@a.com'
    AND p.name = 'The house' -- or use any property name from above
  LIMIT 1
)
INSERT INTO bookings (
  renter_id,
  property_id,
  status,
  check_in,
  check_out,
  reference
)
SELECT 
  renter_id,
  property_id,
  'confirmed',
  '2025-12-09 14:20:00'::timestamp,
  '2025-12-12 11:00:00'::timestamp,
  'TEST-DEC9-' || EXTRACT(EPOCH FROM NOW())::text
FROM property_user
WHERE EXISTS (SELECT 1 FROM property_user);
*/

-- Verify the update
SELECT 
  b.id,
  b.status,
  b.check_in,
  b.check_out,
  EXTRACT(EPOCH FROM (b.check_in - NOW())) / 86400 as days_until_checkin,
  p.name as property_name,
  p.address as property_address,
  u.email as renter_email
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.renter_id = u.id
WHERE u.email = 'a@a.com'
  AND b.status = 'confirmed'
ORDER BY b.check_in ASC;

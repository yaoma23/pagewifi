-- Script to restore Sonderborg Perlegade 2 booking from 'completed' back to 'confirmed'
-- Also ensures check-in is in the future so it shows in upcoming bookings
-- Run this in Supabase SQL Editor

UPDATE bookings
SET 
  status = 'confirmed',
  check_in = NOW() - INTERVAL '10 seconds', -- 10 seconds ago (check-in has already passed - booking is now current)
  check_out = NOW() + INTERVAL '1 day' + INTERVAL '11 hours' -- 1 day and 11 hours from now (checkout 1 day after check-in)
WHERE id IN (
  SELECT b.id
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  JOIN users u ON b.renter_id = u.id
  WHERE u.email = 'a@a.com'
    AND (p.address ILIKE '%Perlegade%' OR p.name ILIKE '%Sonderborg%')
  ORDER BY b.check_in DESC
  LIMIT 1
);

-- Verify the update
SELECT 
  b.id,
  b.status,
  b.check_in,
  b.check_out,
  p.name as property_name,
  p.address as property_address,
  u.email as renter_email
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.renter_id = u.id
WHERE u.email = 'a@a.com'
  AND (p.address ILIKE '%Perlegade%' OR p.name ILIKE '%Sonderborg%')
ORDER BY b.check_in DESC;


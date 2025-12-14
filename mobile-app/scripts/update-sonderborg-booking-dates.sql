-- Script to update existing Sonderborg booking to have check-in tomorrow
-- This will move it from "current" to "upcoming"

UPDATE bookings
SET 
  check_in = DATE_TRUNC('day', NOW()) + INTERVAL '1 day' + INTERVAL '15 hours', -- Tomorrow at 3 PM
  check_out = DATE_TRUNC('day', NOW()) + INTERVAL '4 days' + INTERVAL '11 hours' -- 4 days from now at 11 AM
WHERE id IN (
  SELECT b.id
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  JOIN users u ON b.renter_id = u.id
  WHERE u.email = 'a@a.com'
    AND (p.address ILIKE '%Perlegade%' OR p.name ILIKE '%Sonderborg%')
    AND b.status = 'confirmed'
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
  p.address as property_address
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.renter_id = u.id
WHERE u.email = 'a@a.com'
  AND (p.address ILIKE '%Perlegade%' OR p.name ILIKE '%Sonderborg%')
ORDER BY b.check_in DESC
LIMIT 5;


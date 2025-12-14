-- Script to update Sonderborg Perlegade 2 booking check-in to NOW
-- This will make it appear as a current booking immediately
-- Run this in Supabase SQL Editor

-- STEP 1: First, let's see ALL bookings for a@a.com to identify which one is showing
-- Look for the one that's ~17 days away
SELECT 
  b.id,
  b.status,
  b.check_in,
  b.check_out,
  EXTRACT(EPOCH FROM (b.check_in - NOW())) / 86400 as days_until_checkin,
  p.name as property_name,
  p.address as property_address,
  u.email as renter_email,
  CASE 
    WHEN b.check_in > NOW() THEN 'Future'
    WHEN b.check_in <= NOW() AND b.check_out >= NOW() THEN 'Current'
    ELSE 'Past'
  END as booking_status
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.renter_id = u.id
WHERE u.email = 'a@a.com'
ORDER BY b.check_in ASC;

-- STEP 2: Update ALL bookings that match Sonderborg/Perlegade to be current
-- This ensures we catch the right one even if there are multiple
UPDATE bookings
SET 
  status = 'confirmed',
  check_in = NOW() - INTERVAL '1 minute', -- 1 minute ago (so it's definitely current)
  check_out = NOW() + INTERVAL '1 day' + INTERVAL '11 hours' -- checkout tomorrow
WHERE id IN (
  SELECT b.id
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  JOIN users u ON b.renter_id = u.id
  WHERE u.email = 'a@a.com'
    AND (
      p.address ILIKE '%Perlegade%' 
      OR p.address ILIKE '%Sonderborg%'
      OR p.name ILIKE '%Sonderborg%'
      OR p.address ILIKE '%454%pine%road%'
      OR p.address ILIKE '%pine%road%'
    )
)
RETURNING 
  id,
  status,
  check_in,
  check_out,
  (SELECT name FROM properties WHERE id = bookings.property_id) as property_name,
  (SELECT address FROM properties WHERE id = bookings.property_id) as property_address;

-- STEP 3: Verify the update - check what upcoming bookings remain
SELECT 
  b.id,
  b.status,
  b.check_in,
  EXTRACT(EPOCH FROM (b.check_in - NOW())) / 86400 as days_until_checkin,
  p.name as property_name,
  p.address as property_address
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.renter_id = u.id
WHERE u.email = 'a@a.com'
  AND b.check_in > NOW()
  AND b.status IN ('confirmed', 'scheduled')
ORDER BY b.check_in ASC;


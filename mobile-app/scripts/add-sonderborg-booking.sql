-- Script to add a booking for Sonderborg Perlegade 2
-- Run this in Supabase SQL Editor

-- Step 1: Find the property (adjust the WHERE clause if needed)
-- This assumes there's a property with address containing "Perlegade" or name containing "Sonderborg"
DO $$
DECLARE
  v_property_id UUID;
  v_renter_id UUID;
  v_check_in TIMESTAMP WITH TIME ZONE;
  v_check_out TIMESTAMP WITH TIME ZONE;
  v_booking_id UUID;
BEGIN
  -- Find property
  SELECT id INTO v_property_id
  FROM properties
  WHERE address ILIKE '%Perlegade%' OR name ILIKE '%Sonderborg%'
  LIMIT 1;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Property not found. Please create the property first.';
  END IF;

  RAISE NOTICE 'Found property ID: %', v_property_id;

  -- Find renter user (a@a.com)
  SELECT id INTO v_renter_id
  FROM users
  WHERE email = 'a@a.com' AND role = 'renter'
  LIMIT 1;

  IF v_renter_id IS NULL THEN
    RAISE EXCEPTION 'Renter user a@a.com not found.';
  END IF;

  RAISE NOTICE 'Found renter ID: %', v_renter_id;

  -- Set dates: check-in tomorrow at 3 PM, check-out 3 days after that at 11 AM
  -- This ensures it shows as "upcoming" not "current"
  v_check_in := DATE_TRUNC('day', NOW()) + INTERVAL '1 day' + INTERVAL '15 hours'; -- Tomorrow at 3 PM
  v_check_out := DATE_TRUNC('day', NOW()) + INTERVAL '4 days' + INTERVAL '11 hours'; -- 4 days from now at 11 AM

  -- Create booking
  INSERT INTO bookings (
    property_id,
    renter_id,
    check_in,
    check_out,
    status,
    reference
  ) VALUES (
    v_property_id,
    v_renter_id,
    v_check_in,
    v_check_out,
    'confirmed',
    'SONDERBORG-' || EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  RETURNING id INTO v_booking_id;

  RAISE NOTICE 'Booking created successfully!';
  RAISE NOTICE 'Booking ID: %', v_booking_id;
  RAISE NOTICE 'Check-in: %', v_check_in;
  RAISE NOTICE 'Check-out: %', v_check_out;
END $$;

-- Verify the booking was created
SELECT 
  b.id,
  b.status,
  b.check_in,
  b.check_out,
  b.reference,
  p.name as property_name,
  p.address as property_address,
  u.email as renter_email
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.renter_id = u.id
WHERE u.email = 'a@a.com'
  AND (p.address ILIKE '%Perlegade%' OR p.name ILIKE '%Sonderborg%')
ORDER BY b.check_in DESC
LIMIT 5;


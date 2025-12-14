-- Script to create/update a booking for testing
-- Check-in: 2 minutes from now
-- Check-out: 7 minutes from now (5 minutes after check-in)
-- Run this in Supabase SQL Editor

-- First, find an existing booking for a@a.com to update
-- Or we can create a new one if none exists

DO $$
DECLARE
  v_booking_id UUID;
  v_property_id UUID;
  v_renter_id UUID;
  v_check_in TIMESTAMP WITH TIME ZONE;
  v_check_out TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find renter user (a@a.com)
  SELECT id INTO v_renter_id
  FROM users
  WHERE email = 'a@a.com' AND role = 'renter'
  LIMIT 1;

  IF v_renter_id IS NULL THEN
    RAISE EXCEPTION 'Renter user a@a.com not found.';
  END IF;

  -- Find or get a property for this user
  SELECT p.id INTO v_property_id
  FROM properties p
  JOIN bookings b ON b.property_id = p.id
  WHERE b.renter_id = v_renter_id
  LIMIT 1;

  -- If no property found from bookings, get any property
  IF v_property_id IS NULL THEN
    SELECT id INTO v_property_id
    FROM properties
    LIMIT 1;
  END IF;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'No property found. Please create a property first.';
  END IF;

  -- Set dates: check-in in 2 minutes, check-out in 7 minutes
  v_check_in := NOW() + INTERVAL '2 minutes';
  v_check_out := NOW() + INTERVAL '7 minutes';

  -- Try to find an existing booking to update
  SELECT id INTO v_booking_id
  FROM bookings
  WHERE renter_id = v_renter_id
    AND status IN ('confirmed', 'active', 'checked_in', 'scheduled')
  ORDER BY check_in ASC
  LIMIT 1;

  IF v_booking_id IS NOT NULL THEN
    -- Update existing booking
    UPDATE bookings
    SET 
      status = 'confirmed',
      check_in = v_check_in,
      check_out = v_check_out,
      property_id = v_property_id
    WHERE id = v_booking_id;
    
    RAISE NOTICE 'Updated existing booking: %', v_booking_id;
  ELSE
    -- Create new booking
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
      'TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT
    )
    RETURNING id INTO v_booking_id;
    
    RAISE NOTICE 'Created new booking: %', v_booking_id;
  END IF;

  RAISE NOTICE 'Check-in: % (2 minutes from now)', v_check_in;
  RAISE NOTICE 'Check-out: % (7 minutes from now)', v_check_out;
END $$;

-- Verify the booking
SELECT 
  b.id,
  b.status,
  b.check_in,
  b.check_out,
  EXTRACT(EPOCH FROM (b.check_in - NOW())) / 60 as minutes_until_checkin,
  EXTRACT(EPOCH FROM (b.check_out - NOW())) / 60 as minutes_until_checkout,
  EXTRACT(EPOCH FROM (b.check_out - b.check_in)) / 60 as duration_minutes,
  p.name as property_name,
  p.address as property_address,
  u.email as renter_email
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.renter_id = u.id
WHERE u.email = 'a@a.com'
  AND b.status = 'confirmed'
ORDER BY b.check_in ASC
LIMIT 5;


-- =====================================================
-- Fix: Make animals.booking_id nullable
-- Run this as a new query in Supabase SQL Editor
-- =====================================================

ALTER TABLE animals ALTER COLUMN booking_id DROP NOT NULL;

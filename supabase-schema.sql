-- Court Booker Supabase Schema
-- Run this in your Supabase SQL editor to create the availability_snapshots table

-- Create availability_snapshots table
CREATE TABLE IF NOT EXISTS availability_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('github-cron', 'manual-refresh', 'api')),
  user_id INTEGER,
  total_available_slots INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  data JSONB NOT NULL, -- Full availability result from ReservationChecker
  dates JSONB, -- Array of date objects with availability breakdown
  error_message TEXT, -- If check failed, store error here
  metadata JSONB -- Additional metadata (browser info, execution time, etc.)
);

-- Create index on checked_at for fast latest queries
CREATE INDEX IF NOT EXISTS idx_availability_snapshots_checked_at 
  ON availability_snapshots(checked_at DESC);

-- Create index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_availability_snapshots_user_id 
  ON availability_snapshots(user_id);

-- Create index on source for filtering by source
CREATE INDEX IF NOT EXISTS idx_availability_snapshots_source 
  ON availability_snapshots(source);

-- Enable Row Level Security (RLS)
ALTER TABLE availability_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for serverless functions)
CREATE POLICY "Service role can do everything"
  ON availability_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anonymous reads (for public API access)
-- Adjust this based on your security needs
CREATE POLICY "Allow anonymous reads"
  ON availability_snapshots
  FOR SELECT
  USING (true);

-- Optional: Create a view for the latest snapshot per user
CREATE OR REPLACE VIEW latest_availability_per_user AS
SELECT DISTINCT ON (user_id)
  id,
  created_at,
  checked_at,
  source,
  user_id,
  total_available_slots,
  success,
  data,
  dates,
  error_message
FROM availability_snapshots
WHERE success = true
ORDER BY user_id, checked_at DESC;

-- Optional: Create a function to get latest snapshot
CREATE OR REPLACE FUNCTION get_latest_availability(user_id_param INTEGER DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  checked_at TIMESTAMPTZ,
  source TEXT,
  user_id INTEGER,
  total_available_slots INTEGER,
  success BOOLEAN,
  data JSONB,
  dates JSONB
) AS $$
BEGIN
  IF user_id_param IS NULL THEN
    RETURN QUERY
    SELECT 
      a.id,
      a.created_at,
      a.checked_at,
      a.source,
      a.user_id,
      a.total_available_slots,
      a.success,
      a.data,
      a.dates
    FROM availability_snapshots a
    WHERE a.success = true
    ORDER BY a.checked_at DESC
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT 
      a.id,
      a.created_at,
      a.checked_at,
      a.source,
      a.user_id,
      a.total_available_slots,
      a.success,
      a.data,
      a.dates
    FROM availability_snapshots a
    WHERE a.user_id = user_id_param
      AND a.success = true
    ORDER BY a.checked_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Migration script to add time tracking columns to existing students table
-- Run this if you already have a students table without time tracking columns

-- Add time tracking columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS time_in TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS time_out TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'NEVER_ENTERED';
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_time_spent INTERVAL DEFAULT '0 seconds';

-- Add constraint for current_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'students_current_status_check'
    ) THEN
        ALTER TABLE students ADD CONSTRAINT students_current_status_check 
        CHECK (current_status IN ('NEVER_ENTERED', 'IN', 'OUT'));
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_current_status ON students(current_status);
CREATE INDEX IF NOT EXISTS idx_students_time_in ON students(time_in);
CREATE INDEX IF NOT EXISTS idx_students_time_out ON students(time_out);

-- Update existing records to set proper status based on checked_in field
UPDATE students 
SET current_status = CASE 
    WHEN checked_in = true THEN 'IN'
    ELSE 'NEVER_ENTERED'
END
WHERE current_status IS NULL OR current_status = '';

-- For existing checked-in students, set their time_in to checked_in_at
UPDATE students 
SET time_in = checked_in_at
WHERE checked_in = true AND time_in IS NULL AND checked_in_at IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;

-- Show sample data to verify migration
SELECT id, name, checked_in, checked_in_at, time_in, time_out, current_status, total_time_spent
FROM students 
LIMIT 5;

-- Migration script to add table_number and seat_number columns to existing students table
-- Run this if you already have a students table without these columns

-- Add table_number column
ALTER TABLE students ADD COLUMN IF NOT EXISTS table_number TEXT;

-- Add seat_number column  
ALTER TABLE students ADD COLUMN IF NOT EXISTS seat_number TEXT;

-- Optional: Add indexes for better performance if you plan to search by table/seat
CREATE INDEX IF NOT EXISTS idx_students_table_number ON students(table_number);
CREATE INDEX IF NOT EXISTS idx_students_seat_number ON students(seat_number);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;

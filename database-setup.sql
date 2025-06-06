-- Create the students table
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  table_number TEXT,
  seat_number TEXT,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  -- New time tracking columns
  time_in TIMESTAMP WITH TIME ZONE,
  time_out TIMESTAMP WITH TIME ZONE,
  current_status TEXT DEFAULT 'NEVER_ENTERED' CHECK (current_status IN ('NEVER_ENTERED', 'IN', 'OUT')),
  total_time_spent INTERVAL DEFAULT '0 seconds',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster barcode lookups
CREATE INDEX idx_students_barcode ON students(barcode);

-- Create index for faster name and email searches
CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_students_email ON students(email);

-- Create indexes for time tracking
CREATE INDEX idx_students_current_status ON students(current_status);
CREATE INDEX idx_students_time_in ON students(time_in);
CREATE INDEX idx_students_time_out ON students(time_out);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access (for demo purposes)
CREATE POLICY "Allow anonymous access" ON students FOR ALL USING (true);

-- Sample data (optional)
INSERT INTO students (name, email, barcode, checked_in, created_at)
VALUES 
  ('John Smith', 'john.smith@example.com', '123456789012', false, NOW()),
  ('Emma Johnson', 'emma.johnson@example.com', '234567890123', false, NOW()),
  ('Michael Brown', 'michael.brown@example.com', '345678901234', false, NOW());

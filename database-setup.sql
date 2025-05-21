-- Create the students table
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster barcode lookups
CREATE INDEX idx_students_barcode ON students(barcode);

-- Create index for faster name and email searches
CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_students_email ON students(email);

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

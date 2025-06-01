-- Function to create the students table if it doesn't exist
CREATE OR REPLACE FUNCTION create_students_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'students'
  ) THEN
    -- Create the students table
    CREATE TABLE public.students (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      barcode TEXT NOT NULL UNIQUE,
      table_number TEXT,
      seat_number TEXT,
      checked_in BOOLEAN DEFAULT FALSE,
      checked_in_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX idx_students_barcode ON public.students(barcode);
    CREATE INDEX idx_students_name ON public.students(name);
    CREATE INDEX idx_students_email ON public.students(email);

    -- Enable Row Level Security
    ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

    -- Create policy for anonymous access (for demo purposes)
    CREATE POLICY "Allow anonymous access" ON public.students FOR ALL USING (true);
  END IF;
END;
$$;

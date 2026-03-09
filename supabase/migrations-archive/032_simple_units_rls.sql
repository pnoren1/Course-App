-- Simple migration to add RLS to existing units table
-- This is safe and won't modify existing data

-- Add missing columns to existing units table (safe)
DO $$ 
BEGIN
    -- Add order_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'order_number') THEN
        ALTER TABLE units ADD COLUMN order_number INTEGER DEFAULT 1;
        RAISE NOTICE 'Added order_number column to units table';
    ELSE
        RAISE NOTICE 'order_number column already exists in units table';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'created_at') THEN
        ALTER TABLE units ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to units table';
    ELSE
        RAISE NOTICE 'created_at column already exists in units table';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'updated_at') THEN
        ALTER TABLE units ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to units table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in units table';
    END IF;
END $$;

-- Enable RLS on units table (safe - won't affect if already enabled)
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for units (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'units' AND policyname = 'Units are viewable by authenticated users') THEN
        CREATE POLICY "Units are viewable by authenticated users" ON units
            FOR SELECT USING (auth.role() = 'authenticated');
        RAISE NOTICE 'Created RLS policy: Units are viewable by authenticated users';
    ELSE
        RAISE NOTICE 'RLS policy already exists: Units are viewable by authenticated users';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'units' AND policyname = 'Units are manageable by admins') THEN
        CREATE POLICY "Units are manageable by admins" ON units
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_profile 
                    WHERE user_id = auth.uid() 
                    AND role = 'admin'
                )
            );
        RAISE NOTICE 'Created RLS policy: Units are manageable by admins';
    ELSE
        RAISE NOTICE 'RLS policy already exists: Units are manageable by admins';
    END IF;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at column (safe)
DROP TRIGGER IF EXISTS update_units_updated_at ON units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Final notice
DO $$ 
BEGIN
    RAISE NOTICE 'Simple units RLS migration completed successfully!';
END $$;
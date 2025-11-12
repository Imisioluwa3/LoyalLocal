-- =====================================================
-- LoyalLocal Database Schema Enhancements - FIXED VERSION
-- Migration 001: Customer Management & Analytics
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- This version has better error handling for Supabase

-- =====================================================
-- 1. CUSTOMER PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    birthday DATE,
    anniversary DATE,
    notes TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_business_phone ON customer_profiles(business_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_birthday ON customer_profiles(business_id, birthday) WHERE birthday IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_profiles_anniversary ON customer_profiles(business_id, anniversary) WHERE anniversary IS NOT NULL;

-- RLS Policies
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their customer profiles" ON customer_profiles;
CREATE POLICY "Business owners can view their customer profiles"
    ON customer_profiles FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

DROP POLICY IF EXISTS "Business owners can insert their customer profiles" ON customer_profiles;
CREATE POLICY "Business owners can insert their customer profiles"
    ON customer_profiles FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

DROP POLICY IF EXISTS "Business owners can update their customer profiles" ON customer_profiles;
CREATE POLICY "Business owners can update their customer profiles"
    ON customer_profiles FOR UPDATE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

DROP POLICY IF EXISTS "Business owners can delete their customer profiles" ON customer_profiles;
CREATE POLICY "Business owners can delete their customer profiles"
    ON customer_profiles FOR DELETE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));


-- =====================================================
-- 2. CUSTOMER TAGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#3b82f6',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_customer_tags_business ON customer_tags(business_id);

-- RLS Policies
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their tags" ON customer_tags;
CREATE POLICY "Business owners can view their tags"
    ON customer_tags FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

DROP POLICY IF EXISTS "Business owners can insert their tags" ON customer_tags;
CREATE POLICY "Business owners can insert their tags"
    ON customer_tags FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

DROP POLICY IF EXISTS "Business owners can update their tags" ON customer_tags;
CREATE POLICY "Business owners can update their tags"
    ON customer_tags FOR UPDATE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

DROP POLICY IF EXISTS "Business owners can delete their tags" ON customer_tags;
CREATE POLICY "Business owners can delete their tags"
    ON customer_tags FOR DELETE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));


-- =====================================================
-- 3. CUSTOMER TAG ASSIGNMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_tag_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, phone_number, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_business_phone ON customer_tag_assignments(business_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_tag ON customer_tag_assignments(tag_id);

-- RLS Policies
ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their tag assignments" ON customer_tag_assignments;
CREATE POLICY "Business owners can view their tag assignments"
    ON customer_tag_assignments FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

DROP POLICY IF EXISTS "Business owners can insert their tag assignments" ON customer_tag_assignments;
CREATE POLICY "Business owners can insert their tag assignments"
    ON customer_tag_assignments FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

DROP POLICY IF EXISTS "Business owners can delete their tag assignments" ON customer_tag_assignments;
CREATE POLICY "Business owners can delete their tag assignments"
    ON customer_tag_assignments FOR DELETE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));


-- =====================================================
-- 4. BUSINESS GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS business_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL,
    target_value NUMERIC NOT NULL,
    current_value NUMERIC DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_goals_business ON business_goals(business_id);
CREATE INDEX IF NOT EXISTS idx_business_goals_period ON business_goals(business_id, period_start, period_end);

-- RLS Policies
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can manage their goals" ON business_goals;
CREATE POLICY "Business owners can manage their goals"
    ON business_goals FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));


-- =====================================================
-- 5. ENHANCE VISITS TABLE
-- =====================================================
-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'visits' AND column_name = 'visit_hour') THEN
        ALTER TABLE visits ADD COLUMN visit_hour INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'visits' AND column_name = 'day_of_week') THEN
        ALTER TABLE visits ADD COLUMN day_of_week INTEGER;
    END IF;
END $$;

-- Update existing rows
UPDATE visits SET
    visit_hour = EXTRACT(HOUR FROM created_at),
    day_of_week = EXTRACT(DOW FROM created_at)
WHERE visit_hour IS NULL OR day_of_week IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visits_business_date ON visits(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_visits_business_hour ON visits(business_id, visit_hour);
CREATE INDEX IF NOT EXISTS idx_visits_business_dow ON visits(business_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_visits_phone_created ON visits(phone_number, created_at);


-- =====================================================
-- 6. TRIGGERS
-- =====================================================
-- Trigger to auto-populate hour and day_of_week
CREATE OR REPLACE FUNCTION populate_visit_time_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.visit_hour := EXTRACT(HOUR FROM NEW.created_at);
    NEW.day_of_week := EXTRACT(DOW FROM NEW.created_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_visit_time_fields ON visits;
CREATE TRIGGER trigger_populate_visit_time_fields
    BEFORE INSERT ON visits
    FOR EACH ROW
    EXECUTE FUNCTION populate_visit_time_fields();

-- Trigger for updated_at on customer_profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_profiles_updated_at ON customer_profiles;
CREATE TRIGGER trigger_update_customer_profiles_updated_at
    BEFORE UPDATE ON customer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 7. DEFAULT TAGS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_tags(p_business_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO customer_tags (business_id, name, color, description)
    VALUES
        (p_business_id, 'VIP', '#8b5cf6', 'High-value frequent customers'),
        (p_business_id, 'Regular', '#3b82f6', 'Consistent returning customers'),
        (p_business_id, 'Inactive', '#ef4444', 'Customers who haven''t visited in 60+ days'),
        (p_business_id, 'New', '#10b981', 'First-time customers')
    ON CONFLICT (business_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- 8. GRANT PERMISSIONS ON TABLES
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON customer_tag_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_goals TO authenticated;


-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The views have been removed from this migration as they can cause
-- permission issues in Supabase. The analytics will work by querying
-- the base tables directly using the JavaScript functions.
--
-- Next steps:
-- 1. Verify tables were created:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public'
--    AND table_name IN ('customer_profiles', 'customer_tags', 'customer_tag_assignments', 'business_goals');
--
-- 2. Create default tags for existing businesses:
--    DO $$
--    DECLARE business_record RECORD;
--    BEGIN
--        FOR business_record IN SELECT id FROM businesses LOOP
--            PERFORM create_default_tags(business_record.id);
--        END LOOP;
--    END $$;

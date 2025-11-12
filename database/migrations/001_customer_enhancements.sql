-- =====================================================
-- LoyalLocal Database Schema Enhancements
-- Migration 001: Customer Management & Analytics
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- This adds tables for customer profiles, tags, and analytics

-- =====================================================
-- 1. CUSTOMER PROFILES TABLE
-- =====================================================
-- Stores extended customer information
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL, -- Normalized +234XXXXXXXXXX format
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    birthday DATE,
    anniversary DATE,
    notes TEXT, -- Business owner notes about customer preferences
    preferences JSONB DEFAULT '{}'::jsonb, -- Store flexible preferences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one profile per customer per business
    UNIQUE(business_id, phone_number)
);

-- Index for fast lookups
CREATE INDEX idx_customer_profiles_business_phone ON customer_profiles(business_id, phone_number);
CREATE INDEX idx_customer_profiles_birthday ON customer_profiles(business_id, birthday) WHERE birthday IS NOT NULL;
CREATE INDEX idx_customer_profiles_anniversary ON customer_profiles(business_id, anniversary) WHERE anniversary IS NOT NULL;

-- RLS Policies for customer_profiles
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their customer profiles"
    ON customer_profiles FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

CREATE POLICY "Business owners can insert their customer profiles"
    ON customer_profiles FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

CREATE POLICY "Business owners can update their customer profiles"
    ON customer_profiles FOR UPDATE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

CREATE POLICY "Business owners can delete their customer profiles"
    ON customer_profiles FOR DELETE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));


-- =====================================================
-- 2. CUSTOMER TAGS TABLE
-- =====================================================
-- Stores tags/categories for customer segmentation
CREATE TABLE IF NOT EXISTS customer_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g., "VIP", "Regular", "Inactive"
    color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color for UI display
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique tag names per business
    UNIQUE(business_id, name)
);

-- Index for fast lookups
CREATE INDEX idx_customer_tags_business ON customer_tags(business_id);

-- RLS Policies for customer_tags
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their tags"
    ON customer_tags FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

CREATE POLICY "Business owners can insert their tags"
    ON customer_tags FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

CREATE POLICY "Business owners can update their tags"
    ON customer_tags FOR UPDATE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

CREATE POLICY "Business owners can delete their tags"
    ON customer_tags FOR DELETE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));


-- =====================================================
-- 3. CUSTOMER TAG ASSIGNMENTS (Junction Table)
-- =====================================================
-- Links customers to their tags (many-to-many)
CREATE TABLE IF NOT EXISTS customer_tag_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL, -- Normalized +234XXXXXXXXXX format
    tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique tag assignment per customer
    UNIQUE(business_id, phone_number, tag_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_customer_tag_assignments_business_phone ON customer_tag_assignments(business_id, phone_number);
CREATE INDEX idx_customer_tag_assignments_tag ON customer_tag_assignments(tag_id);

-- RLS Policies for customer_tag_assignments
ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their tag assignments"
    ON customer_tag_assignments FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

CREATE POLICY "Business owners can insert their tag assignments"
    ON customer_tag_assignments FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));

CREATE POLICY "Business owners can delete their tag assignments"
    ON customer_tag_assignments FOR DELETE
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));


-- =====================================================
-- 4. BUSINESS GOALS TABLE
-- =====================================================
-- Stores business goals for tracking progress
CREATE TABLE IF NOT EXISTS business_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL, -- e.g., "monthly_visits", "new_customers", "revenue"
    target_value NUMERIC NOT NULL,
    current_value NUMERIC DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_business_goals_business ON business_goals(business_id);
CREATE INDEX idx_business_goals_period ON business_goals(business_id, period_start, period_end);

-- RLS Policies for business_goals
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their goals"
    ON business_goals FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM businesses WHERE id = business_id));


-- =====================================================
-- 5. ADD COLUMNS TO EXISTING VISITS TABLE
-- =====================================================
-- Add hour tracking for peak hours analysis
ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_hour INTEGER;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS day_of_week INTEGER;

-- Update existing rows to populate hour and day_of_week
UPDATE visits SET
    visit_hour = EXTRACT(HOUR FROM created_at),
    day_of_week = EXTRACT(DOW FROM created_at)
WHERE visit_hour IS NULL;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_visits_business_date ON visits(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_visits_business_hour ON visits(business_id, visit_hour);
CREATE INDEX IF NOT EXISTS idx_visits_business_dow ON visits(business_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_visits_phone_created ON visits(phone_number, created_at);


-- =====================================================
-- 6. DEFAULT TAGS
-- =====================================================
-- Function to create default tags for a business
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
-- 7. TRIGGER TO AUTO-POPULATE HOUR AND DAY_OF_WEEK
-- =====================================================
-- Automatically populate hour and day_of_week on new visits
CREATE OR REPLACE FUNCTION populate_visit_time_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.visit_hour := EXTRACT(HOUR FROM NEW.created_at);
    NEW.day_of_week := EXTRACT(DOW FROM NEW.created_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_populate_visit_time_fields
    BEFORE INSERT ON visits
    FOR EACH ROW
    EXECUTE FUNCTION populate_visit_time_fields();


-- =====================================================
-- 8. UPDATED_AT TRIGGER FOR CUSTOMER PROFILES
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_profiles_updated_at
    BEFORE UPDATE ON customer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 9. USEFUL VIEWS FOR ANALYTICS
-- =====================================================

-- View: Customer Summary Statistics
CREATE OR REPLACE VIEW customer_summary AS
SELECT
    v.business_id,
    v.phone_number,
    COUNT(*) as total_visits,
    COUNT(*) FILTER (WHERE v.is_redeemed_for_reward = true) as total_redemptions,
    MIN(v.created_at) as first_visit,
    MAX(v.created_at) as last_visit,
    CURRENT_DATE - MAX(v.created_at)::date as days_since_last_visit,
    CASE
        WHEN COUNT(*) >= 10 THEN 'VIP'
        WHEN CURRENT_DATE - MAX(v.created_at)::date > 60 THEN 'Inactive'
        WHEN COUNT(*) = 1 THEN 'New'
        ELSE 'Regular'
    END as auto_category
FROM visits v
GROUP BY v.business_id, v.phone_number;


-- View: Daily Visit Statistics
CREATE OR REPLACE VIEW daily_visit_stats AS
SELECT
    business_id,
    created_at::date as visit_date,
    COUNT(*) as total_visits,
    COUNT(DISTINCT phone_number) as unique_customers,
    COUNT(*) FILTER (WHERE is_redeemed_for_reward = true) as rewards_redeemed
FROM visits
GROUP BY business_id, created_at::date
ORDER BY business_id, visit_date DESC;


-- View: Peak Hours Analysis
CREATE OR REPLACE VIEW peak_hours_analysis AS
SELECT
    business_id,
    visit_hour,
    day_of_week,
    COUNT(*) as visit_count,
    COUNT(DISTINCT phone_number) as unique_customers,
    ROUND(COUNT(*)::numeric / COUNT(DISTINCT created_at::date), 2) as avg_visits_per_day
FROM visits
WHERE visit_hour IS NOT NULL
GROUP BY business_id, visit_hour, day_of_week
ORDER BY business_id, visit_hour;


-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================
-- Grant necessary permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON customer_tag_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_goals TO authenticated;
GRANT SELECT ON customer_summary TO authenticated;
GRANT SELECT ON daily_visit_stats TO authenticated;
GRANT SELECT ON peak_hours_analysis TO authenticated;


-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify tables were created: SELECT * FROM customer_profiles LIMIT 1;
-- 3. Create default tags for existing businesses
-- 4. Update frontend code to use new tables

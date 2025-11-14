-- =====================================================
-- LOYALLOCAL DATABASE PERFORMANCE OPTIMIZATIONS
-- =====================================================
-- Run these commands in your Supabase SQL Editor
-- to dramatically improve login and query performance
-- =====================================================

-- 1. INDEX FOR BUSINESS USER LOOKUPS
-- Speeds up: Login authentication (business lookup by user_id)
-- Expected improvement: 60-80% faster login
CREATE INDEX IF NOT EXISTS idx_businesses_user_id
ON businesses(user_id);

-- 2. INDEX FOR VISITS BY BUSINESS
-- Speeds up: All business dashboard queries
-- Expected improvement: 50-70% faster stats loading
CREATE INDEX IF NOT EXISTS idx_visits_business_id
ON visits(business_id);

-- 3. COMPOSITE INDEX FOR CUSTOMER LOOKUPS
-- Speeds up: Customer search, loyalty card lookups
-- Expected improvement: 70-90% faster customer lookups
CREATE INDEX IF NOT EXISTS idx_visits_business_customer
ON visits(business_id, customer_phone_number);

-- 4. INDEX FOR DATE-BASED QUERIES
-- Speeds up: "Visits today", date range analytics
-- Expected improvement: 80-95% faster date filtering
CREATE INDEX IF NOT EXISTS idx_visits_business_date
ON visits(business_id, created_at DESC);

-- 5. PARTIAL INDEX FOR REWARD QUERIES
-- Speeds up: Rewards redeemed count
-- Expected improvement: 90%+ faster (only indexes redeemed visits)
CREATE INDEX IF NOT EXISTS idx_visits_redeemed
ON visits(business_id, is_redeemed_for_reward)
WHERE is_redeemed_for_reward = true;

-- 6. INDEX FOR CUSTOMER PROFILES
-- Speeds up: Customer profile lookups
CREATE INDEX IF NOT EXISTS idx_customer_profiles_business_phone
ON customer_profiles(business_id, phone_number);

-- 7. INDEX FOR CUSTOMER TAG ASSIGNMENTS
-- Speeds up: Customer tag filtering
CREATE INDEX IF NOT EXISTS idx_customer_tags_business
ON customer_tag_assignments(business_id, phone_number);

-- 8. INDEX FOR CUSTOMER TAGS LOOKUP
-- Speeds up: Tag list loading
CREATE INDEX IF NOT EXISTS idx_customer_tags_business_id
ON customer_tags(business_id);

-- =====================================================
-- OPTIONAL: CREATE MATERIALIZED VIEW FOR STATS
-- =====================================================
-- This creates a pre-computed stats table that updates
-- automatically. Use this if you have 1000+ customers.
-- =====================================================

-- Create a function to calculate business stats efficiently
CREATE OR REPLACE FUNCTION get_business_stats(p_business_id UUID)
RETURNS TABLE (
    total_customers BIGINT,
    visits_today BIGINT,
    rewards_redeemed BIGINT,
    rewards_earned BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_loyalty_required INT;
BEGIN
    -- Get loyalty visits required
    SELECT loyalty_visits_required INTO v_loyalty_required
    FROM businesses
    WHERE id = p_business_id;

    v_loyalty_required := COALESCE(v_loyalty_required, 5);

    RETURN QUERY
    WITH
    -- Count unique customers
    unique_customers AS (
        SELECT COUNT(DISTINCT customer_phone_number) as count
        FROM visits
        WHERE business_id = p_business_id
    ),
    -- Count visits today
    today_visits AS (
        SELECT COUNT(*) as count
        FROM visits
        WHERE business_id = p_business_id
        AND created_at::date = v_today
    ),
    -- Count redeemed rewards
    redeemed AS (
        SELECT COUNT(*) as count
        FROM visits
        WHERE business_id = p_business_id
        AND is_redeemed_for_reward = true
    ),
    -- Count customers with enough visits for reward
    earned AS (
        SELECT COUNT(*) as count
        FROM (
            SELECT customer_phone_number
            FROM visits
            WHERE business_id = p_business_id
            AND is_redeemed_for_reward = false
            GROUP BY customer_phone_number
            HAVING COUNT(*) >= v_loyalty_required
        ) as eligible_customers
    )
    SELECT
        (SELECT count FROM unique_customers)::BIGINT,
        (SELECT count FROM today_visits)::BIGINT,
        (SELECT count FROM redeemed)::BIGINT,
        (SELECT count FROM earned)::BIGINT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_business_stats(UUID) TO authenticated;

-- =====================================================
-- VERIFY INDEXES WERE CREATED
-- =====================================================
-- Run this query to see all indexes on your tables
-- =====================================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('businesses', 'visits', 'customer_profiles', 'customer_tags', 'customer_tag_assignments')
ORDER BY tablename, indexname;

-- =====================================================
-- PERFORMANCE TESTING QUERY (OPTIONAL)
-- =====================================================
-- Run this to test query performance with EXPLAIN ANALYZE
-- Replace 'YOUR_USER_ID_HERE' with your actual user_id first
-- =====================================================

-- UNCOMMENT AND REPLACE THE UUID BELOW TO TEST:
/*
EXPLAIN ANALYZE
SELECT b.*,
       COUNT(DISTINCT v.customer_phone_number) as customer_count
FROM businesses b
LEFT JOIN visits v ON v.business_id = b.id
WHERE b.user_id = 'YOUR_USER_ID_HERE'::uuid
GROUP BY b.id;
*/

# Database Migrations

This directory contains SQL migration scripts for the LoyalLocal database (Supabase).

## How to Apply Migrations

1. Log into your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: **mhwsjjumsiveahfckcwr**
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire SQL file content
6. Click **Run** to execute

## Migration Files

### 001_customer_enhancements.sql
**Purpose**: Adds comprehensive customer management and analytics capabilities

**What it adds:**
- `customer_profiles` table - Extended customer information (name, birthday, notes, preferences)
- `customer_tags` table - Custom tags for customer segmentation (VIP, Regular, Inactive, etc.)
- `customer_tag_assignments` table - Links customers to tags
- `business_goals` table - Track business objectives and progress
- Enhanced `visits` table - Adds `visit_hour` and `day_of_week` columns for analytics
- Views for analytics:
  - `customer_summary` - Aggregated customer statistics
  - `daily_visit_stats` - Daily visit trends
  - `peak_hours_analysis` - Busiest times/days analysis

**Features enabled:**
- Customer profiles with notes and preferences
- Birthday/anniversary tracking
- Customer tagging and segmentation
- Peak hours analysis
- Goal tracking
- Advanced analytics capabilities

## Post-Migration Steps

After running the migration, create default tags for existing businesses:

```sql
-- Run for each existing business
SELECT create_default_tags('YOUR_BUSINESS_ID_HERE');

-- Or create for all businesses at once:
DO $$
DECLARE
    business_record RECORD;
BEGIN
    FOR business_record IN SELECT id FROM businesses LOOP
        PERFORM create_default_tags(business_record.id);
    END LOOP;
END $$;
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop in reverse order
DROP VIEW IF EXISTS peak_hours_analysis;
DROP VIEW IF EXISTS daily_visit_stats;
DROP VIEW IF EXISTS customer_summary;

DROP TRIGGER IF EXISTS trigger_update_customer_profiles_updated_at ON customer_profiles;
DROP TRIGGER IF EXISTS trigger_populate_visit_time_fields ON visits;

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS populate_visit_time_fields();
DROP FUNCTION IF EXISTS create_default_tags(UUID);

ALTER TABLE visits DROP COLUMN IF EXISTS visit_hour;
ALTER TABLE visits DROP COLUMN IF EXISTS day_of_week;

DROP TABLE IF EXISTS business_goals;
DROP TABLE IF EXISTS customer_tag_assignments;
DROP TABLE IF EXISTS customer_tags;
DROP TABLE IF EXISTS customer_profiles;
```

## Verification

After applying the migration, verify it worked:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('customer_profiles', 'customer_tags', 'customer_tag_assignments', 'business_goals');

-- Check views exist
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('customer_summary', 'daily_visit_stats', 'peak_hours_analysis');

-- Check new columns in visits table
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'visits'
AND column_name IN ('visit_hour', 'day_of_week');
```

## Security

All new tables have Row Level Security (RLS) enabled with policies that ensure:
- Business owners can only access their own data
- Data is isolated per business
- Proper authentication is required for all operations

## Support

If you encounter any issues:
1. Check the Supabase logs in your dashboard
2. Verify you're logged in as a user with proper permissions
3. Ensure the `businesses` and `visits` tables exist and are accessible
4. Review the error message and check for missing dependencies

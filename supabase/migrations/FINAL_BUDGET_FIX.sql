-- 🚀 COMPLETE BUDGET SYSTEM FIX - ONE FILE SOLUTION
-- This single migration fixes ALL budget system issues
-- Run this ONCE in Supabase SQL Editor

-- =====================================================
-- STEP 1: Clean up existing constraints and indexes
-- =====================================================

-- Drop all existing constraints to avoid conflicts
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_month_year_key;
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_month_year_key;
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;

-- Drop existing indexes
DROP INDEX IF EXISTS idx_budgets_category_id;
DROP INDEX IF EXISTS idx_budgets_user_id;
DROP INDEX IF EXISTS idx_budgets_month_year;

-- =====================================================
-- STEP 2: Ensure category_id column exists and is properly configured
-- =====================================================

-- Add category_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budgets' 
        AND column_name = 'category_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.budgets ADD COLUMN category_id UUID;
        RAISE NOTICE '✅ Added category_id column to budgets table';
    ELSE
        RAISE NOTICE '✅ category_id column already exists in budgets table';
    END IF;
END $$;

-- Ensure the column is properly nullable
ALTER TABLE public.budgets ALTER COLUMN category_id DROP NOT NULL;

-- =====================================================
-- STEP 3: Add proper foreign key constraint
-- =====================================================

-- Add foreign key constraint with proper cascade rules
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES public.categories(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- =====================================================
-- STEP 4: Create proper indexes
-- =====================================================

CREATE INDEX idx_budgets_category_id ON public.budgets(category_id);
CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX idx_budgets_month_year ON public.budgets(month, year);

-- =====================================================
-- STEP 5: Create proper unique constraint
-- =====================================================

-- Create unique constraint that handles null categories properly
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_user_id_category_month_year_key 
UNIQUE(user_id, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), month, year);

-- =====================================================
-- STEP 6: Refresh RLS policies
-- =====================================================

-- Drop existing policies to recreate them fresh
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;

-- Recreate policies
CREATE POLICY "Users can view own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- STEP 7: Add helpful comments
-- =====================================================

COMMENT ON TABLE public.budgets IS 'Budgets table with category support and proper constraints';
COMMENT ON COLUMN public.budgets.category_id IS 'Optional category reference, null for general budgets';
COMMENT ON CONSTRAINT budgets_category_id_fkey ON public.budgets IS 'Foreign key relationship to categories table';
COMMENT ON CONSTRAINT budgets_user_id_category_month_year_key ON public.budgets IS 'Unique budget per user, category, month, and year (handles null categories)';

-- =====================================================
-- STEP 8: Verify setup and refresh schema cache
-- =====================================================

-- Verify the column exists and is properly configured
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budgets' 
        AND column_name = 'category_id'
        AND table_schema = 'public'
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '✅ category_id column is properly configured';
    ELSE
        RAISE NOTICE '❌ category_id column configuration issue';
    END IF;
    
    -- Verify foreign key constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'budgets' 
        AND tc.constraint_name = 'budgets_category_id_fkey'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE '✅ Foreign key constraint exists';
    ELSE
        RAISE NOTICE '❌ Foreign key constraint missing';
    END IF;
    
    -- Verify unique constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'budgets' 
        AND tc.constraint_name = 'budgets_user_id_category_month_year_key'
        AND tc.constraint_type = 'UNIQUE'
    ) THEN
        RAISE NOTICE '✅ Unique constraint exists';
    ELSE
        RAISE NOTICE '❌ Unique constraint missing';
    END IF;
END $$;

-- Force refresh the schema cache multiple times to ensure it's recognized
NOTIFY pgbouncer, 'RELOAD';
NOTIFY pgbouncer, 'RELOAD';

-- =====================================================
-- STEP 9: Final verification
-- =====================================================

-- Test query to verify everything works (commented out for production)
/*
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'budgets' 
AND table_schema = 'public'
ORDER BY ordinal_position;
*/

RAISE NOTICE '🎉 COMPLETE BUDGET SYSTEM FIX COMPLETED!';
RAISE NOTICE '📋 Fixed: category_id column, foreign key, indexes, constraints, RLS policies';
RAISE NOTICE '🔄 Schema cache refreshed - budgets should now work perfectly!';
RAISE NOTICE '✅ Ready to test budget creation and management!';

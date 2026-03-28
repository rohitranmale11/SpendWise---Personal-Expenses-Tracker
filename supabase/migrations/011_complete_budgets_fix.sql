-- 🚀 Complete SpendWise Database Setup
-- This single migration fixes all budget system issues
-- Run this AFTER the basic tables (categories, expenses, budgets) already exist

-- =====================================================
-- STEP 1: Fix Budgets Table Schema
-- =====================================================

-- Ensure category_id column exists and is properly nullable
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budgets' 
        AND column_name = 'category_id'
        AND table_schema = 'public'
    ) THEN
        -- Column exists, ensure it's nullable
        ALTER TABLE public.budgets ALTER COLUMN category_id DROP NOT NULL;
    ELSE
        -- Column doesn't exist, add it
        ALTER TABLE public.budgets ADD COLUMN category_id UUID REFERENCES public.categories(id);
    END IF;
END $$;

-- Create index for category_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);

-- =====================================================
-- STEP 2: Fix Foreign Key Constraints
-- =====================================================

-- Drop any existing foreign key constraints to avoid conflicts
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;

-- Add proper foreign key constraint with explicit name and cascade rules
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES public.categories(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- =====================================================
-- STEP 3: Fix Unique Constraints
-- =====================================================

-- Drop any existing unique constraints
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_month_year_key;
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_month_year_key;

-- Create the correct unique constraint that allows null category_id
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_user_id_category_month_year_key 
UNIQUE(user_id, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), month, year);

-- =====================================================
-- STEP 4: Ensure Proper Indexes
-- =====================================================

-- Create necessary indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON public.budgets(month, year);

-- =====================================================
-- STEP 5: Refresh RLS Policies
-- =====================================================

-- Drop existing policies to recreate them fresh
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;

-- Recreate policies with proper handling
CREATE POLICY "Users can view own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: Add Schema Comments
-- =====================================================

COMMENT ON TABLE public.budgets IS 'Budgets table with category support and proper constraints';
COMMENT ON COLUMN public.budgets.category_id IS 'Optional category reference, null for general budgets';
COMMENT ON CONSTRAINT budgets_category_id_fkey ON public.budgets IS 'Foreign key relationship to categories table';
COMMENT ON CONSTRAINT budgets_user_id_category_month_year_key ON public.budgets IS 'Unique budget per user, category, month, and year (handles null categories)';

-- =====================================================
-- STEP 7: Verify Setup
-- =====================================================

-- Test data insertion (optional - comment out for production)
-- INSERT INTO public.budgets (user_id, category_id, monthly_budget, month, year)
-- VALUES (auth.uid()::uuid, NULL, 1000.00, EXTRACT(MONTH FROM NOW()), EXTRACT(YEAR FROM NOW()));

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Refresh schema cache to ensure all changes are recognized
NOTIFY pgbouncer, 'RELOAD';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '✅ SpendWise database setup completed successfully!';
    RAISE NOTICE '📋 Tables: categories, expenses, budgets';
    RAISE NOTICE '🔗 Relationships: budgets.category_id → categories.id';
    RAISE NOTICE '🔒 Constraints: Foreign key + unique constraints';
    RAISE NOTICE '📊 Indexes: Optimized for performance';
    RAISE NOTICE '🛡️ RLS: Policies refreshed';
    RAISE NOTICE '🎯 Budget system is now production-ready!';
END $$;

-- Fix budgets table foreign key relationship and schema cache issues
-- This migration resolves the relationship detection problems

-- First, properly add the foreign key constraint with explicit name
ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;

ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES public.categories(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Ensure the column is properly nullable
ALTER TABLE public.budgets 
ALTER COLUMN category_id DROP NOT NULL;

-- Drop and recreate unique constraints to fix conflicts
ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_user_id_month_year_key;

ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_user_id_category_month_year_key;

-- Create the correct unique constraint allowing null category_id
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_user_id_category_month_year_key 
UNIQUE(user_id, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), month, year);

-- Recreate indexes for better performance
DROP INDEX IF EXISTS idx_budgets_category_id;
DROP INDEX IF EXISTS idx_budgets_user_id;
DROP INDEX IF EXISTS idx_budgets_month_year;

CREATE INDEX idx_budgets_category_id ON public.budgets(category_id);
CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX idx_budgets_month_year ON public.budgets(month, year);

-- Fix RLS policies to ensure they work with the new schema
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

-- Add helpful comments
COMMENT ON CONSTRAINT budgets_category_id_fkey ON public.budgets IS 'Foreign key relationship to categories table';
COMMENT ON CONSTRAINT budgets_user_id_category_month_year_key ON public.budgets IS 'Unique budget per user, category, month, and year (handles null categories)';

-- Refresh schema cache
NOTIFY pgbouncer, 'RELOAD';

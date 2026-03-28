-- Fix budgets table constraints and ensure proper schema
-- This migration fixes the budget system issues

-- First, drop any existing constraints that might conflict
ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_user_id_month_year_key;

ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_user_id_category_month_year_key;

-- Ensure category_id column exists and is properly nullable
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id);

-- Create the correct unique constraint
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_user_id_category_month_year_key 
UNIQUE(user_id, category_id, month, year);

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON public.budgets(month, year);

-- Update RLS policies to ensure they work correctly
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

-- Verify the schema
COMMENT ON TABLE public.budgets IS 'Budgets table with category support and proper constraints';
COMMENT ON COLUMN public.budgets.category_id IS 'Optional category reference, null for general budgets';

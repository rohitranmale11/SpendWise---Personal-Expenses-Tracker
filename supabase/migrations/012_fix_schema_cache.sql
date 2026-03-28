-- 🔧 Fix Supabase Schema Cache for Budgets-Categories Relationship
-- This migration fixes the relationship detection issue

-- Step 1: Drop any existing foreign key constraints
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;

-- Step 2: Add the foreign key constraint with proper naming
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES public.categories(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Step 3: Ensure the column is properly nullable
ALTER TABLE public.budgets 
ALTER COLUMN category_id DROP NOT NULL;

-- Step 4: Refresh the schema cache
-- This forces Supabase to recognize the relationship
NOTIFY pgbouncer, 'RELOAD';

-- Step 5: Verify the relationship exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'budgets' 
        AND tc.constraint_name = 'budgets_category_id_fkey'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE '✅ Foreign key constraint budgets_category_id_fkey exists';
    ELSE
        RAISE NOTICE '❌ Foreign key constraint not found';
    END IF;
END $$;

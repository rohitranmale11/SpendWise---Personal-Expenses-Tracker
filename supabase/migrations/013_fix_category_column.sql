-- 🔧 Final Fix for Budgets Category Column Issue
-- This ensures category_id column exists and is recognized by Supabase

-- Step 1: Check if category_id column exists, add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budgets' 
        AND column_name = 'category_id'
        AND table_schema = 'public'
    ) THEN
        -- Column doesn't exist, add it
        ALTER TABLE public.budgets ADD COLUMN category_id UUID;
        RAISE NOTICE '✅ Added category_id column to budgets table';
    ELSE
        RAISE NOTICE '✅ category_id column already exists in budgets table';
    END IF;
END $$;

-- Step 2: Ensure the column is properly nullable
ALTER TABLE public.budgets ALTER COLUMN category_id DROP NOT NULL;

-- Step 3: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'budgets' 
        AND tc.constraint_name = 'budgets_category_id_fkey'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Constraint doesn't exist, add it
        ALTER TABLE public.budgets 
        ADD CONSTRAINT budgets_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES public.categories(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        RAISE NOTICE '✅ Added foreign key constraint';
    ELSE
        RAISE NOTICE '✅ Foreign key constraint already exists';
    END IF;
END $$;

-- Step 4: Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);

-- Step 5: Update unique constraint to handle null categories properly
DO $$
BEGIN
    -- Drop existing unique constraints
    ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_month_year_key;
    ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_month_year_key;
    
    -- Add new unique constraint that handles null categories
    ALTER TABLE public.budgets 
    ADD CONSTRAINT budgets_user_id_category_month_year_key 
    UNIQUE(user_id, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), month, year);
    
    RAISE NOTICE '✅ Updated unique constraint to handle null categories';
END $$;

-- Step 6: Verify the column exists and is properly configured
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
END $$;

-- Step 7: Force refresh the schema cache
-- This is critical to ensure Supabase recognizes the changes
NOTIFY pgbouncer, 'RELOAD';

-- Step 8: Test the column with a simple query (commented out for production)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'budgets' AND column_name = 'category_id';

RAISE NOTICE '🎉 Budgets table schema fix completed!';

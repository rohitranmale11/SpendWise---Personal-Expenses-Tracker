# 🚀 Supabase Database Setup Guide

## 📁 Migration Files Order

Run these migrations in **EXACT ORDER** to properly set up your SpendWise database:

### 1️⃣ Categories Table
**File**: `002_create_categories.sql`
```sql
-- Create categories table with RLS policies
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);
```

### 2️⃣ Expenses Table
**File**: `003_create_expenses.sql`
```sql
-- Create expenses table with category relationship
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  note TEXT,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policies
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);
```

### 3️⃣ Budgets Table (Initial)
**File**: `004_create_budgets.sql`
```sql
-- Create budgets table (basic version)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  monthly_budget NUMERIC(10,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Old unique constraint (will be updated later)
  UNIQUE(user_id, month, year)
);

-- Enable RLS and create policies
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);
```

### 4️⃣ Add Category Support to Budgets
**File**: `007_add_category_to_budgets.sql`
```sql
-- Add category_id to budgets table
ALTER TABLE public.budgets 
ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Create index for performance
CREATE INDEX idx_budgets_category_id ON public.budgets(category_id);

-- Update unique constraint to include category_id
ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_user_id_month_year_key;

ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_user_id_category_month_year_key 
UNIQUE(user_id, category_id, month, year);
```

### 5️⃣ Fix Foreign Key Relationship (CRITICAL)
**File**: `010_fix_foreign_key_relationship.sql`
```sql
-- Fix budgets table foreign key relationship and schema cache issues

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

-- Recreate RLS policies to ensure they work with the new schema
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
```

---

## 🔧 How to Run Migrations

### Method 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file in order
4. Click **Run** for each migration

### Method 2: Using SQL Editor (Alternative)
1. Open your preferred SQL editor (DBeaver, pgAdmin, etc.)
2. Connect to your Supabase database
3. Run migrations in the exact order shown above

### Method 3: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to your project
supabase login

# Link to your project
supabase link

# Run migrations
supabase db push
```

---

## ✅ Verification Steps

After running all migrations, verify the setup:

### 1. Check Tables Exist
```sql
-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('categories', 'expenses', 'budgets');
```

### 2. Check Relationships
```sql
-- Verify foreign key relationships
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'budgets';
```

### 3. Test Budget Creation
```sql
-- Test inserting a budget
INSERT INTO public.budgets (user_id, category_id, monthly_budget, month, year)
VALUES (
  'your-user-id'::uuid, 
  NULL, 
  5000.00, 
  3, 
  2024
);
```

### 4. Test Category Join
```sql
-- Test the join query
SELECT 
  b.id,
  b.monthly_budget,
  b.month,
  b.year,
  c.name as category_name,
  c.color as category_color
FROM public.budgets b
LEFT JOIN public.categories c ON b.category_id = c.id
WHERE b.user_id = 'your-user-id'::uuid;
```

---

## 🐛 Common Issues & Solutions

### Issue: "Could not find relationship"
**Solution**: Run migration `010_fix_foreign_key_relationship.sql`

### Issue: "Lock broken by another request"
**Solution**: The frontend now has loading guards to prevent concurrent requests

### Issue: Categories not loading
**Solution**: Check the join syntax in `getBudgets()` function - should use `categories!inner(name, color)`

### Issue: "Unknown error"
**Solution**: Enhanced error logging now shows specific error codes and messages

---

## 🎯 Expected Results

After proper setup:

✅ **Categories**: Load in dropdown without errors
✅ **Budgets**: Create with or without categories
✅ **Relationships**: Proper foreign key constraints
✅ **Joins**: Supabase recognizes budget-category relationship
✅ **Errors**: Specific, actionable error messages
✅ **Performance**: Optimized indexes and queries

---

## 📞 Support

If you encounter issues:

1. **Check Console**: Look for detailed error logs with emojis
2. **Verify Migrations**: Ensure all ran in correct order
3. **Refresh Schema**: Sometimes Supabase needs cache refresh
4. **Check RLS**: Ensure policies are correctly applied

The budget system will work reliably after following this setup guide!

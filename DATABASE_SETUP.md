# Database Setup Guide

This guide explains how to set up the Supabase PostgreSQL database for the SpendWise application.

## 📋 Overview

The database consists of 5 main tables with Row Level Security (RLS) enabled to ensure users can only access their own data.

## 🗄️ Database Schema

### 1. Profiles
- **Purpose**: Stores user profile information
- **Fields**: id, full_name, email, created_at
- **Relationship**: One-to-one with auth.users

### 2. Categories
- **Purpose**: Stores expense categories
- **Fields**: id, user_id, name, color, created_at
- **Features**: Default categories auto-seeded for new users

### 3. Expenses
- **Purpose**: Stores expense records
- **Fields**: id, user_id, amount, category_id, payment_method, note, date, created_at
- **Relationships**: Many-to-one with users and categories

### 4. Budgets
- **Purpose**: Stores monthly budget limits
- **Fields**: id, user_id, monthly_budget, month, year, created_at
- **Constraint**: Unique budget per user per month/year

### 5. Subscriptions
- **Purpose**: Stores recurring subscription information
- **Fields**: id, user_id, name, price, billing_cycle, next_billing_date, created_at
- **Cycles**: monthly, yearly, weekly

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring:
- Users can only access their own data (`user_id = auth.uid()`)
- Full CRUD operations for own data
- No cross-user data access

### Database Functions
- `add_expense()` - Add new expense record
- `get_expenses()` - Fetch expenses with filtering
- `update_expense()` - Update existing expense
- `delete_expense()` - Delete expense
- `get_expense_stats()` - Get expense statistics and breakdowns

## 🚀 Setup Instructions

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and database region
4. Set database password (save it securely)
5. Click "Create project"

### 2. Set Environment Variables
Copy the provided `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Update with your project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 3. Run Database Migrations

#### Option A: Using Supabase Dashboard
1. Go to your project → SQL Editor
2. Run each migration file in order:
   - `001_create_profiles.sql`
   - `002_create_categories.sql`
   - `003_create_expenses.sql`
   - `004_create_budgets.sql`
   - `005_create_subscriptions.sql`
   - `006_create_functions.sql`
   - `007_seed_default_categories.sql`

#### Option B: Using Supabase CLI
1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref your-project-ref
```

4. Push migrations:
```bash
supabase db push
```

### 4. Enable Authentication
1. Go to Authentication → Settings
2. Ensure "Enable email confirmations" is set according to your preference
3. Configure email settings if needed

### 5. Test the Setup
1. Start your application: `npm run dev`
2. Create a new user account
3. Verify default categories are created automatically
4. Test adding, viewing, updating, and deleting expenses

## 📊 Database Functions Usage

### Add Expense
```sql
SELECT add_expense(
  25.50,                    -- amount
  'category-uuid',         -- category_id
  'credit_card',           -- payment_method
  'Lunch at restaurant',   -- note
  '2024-03-15'             -- date
);
```

### Get Expenses
```sql
SELECT * FROM get_expenses(
  '2024-03-01',            -- start_date (optional)
  '2024-03-31',            -- end_date (optional)
  'category-uuid'          -- category_id (optional)
);
```

### Update Expense
```sql
SELECT update_expense(
  'expense-uuid',          -- expense_id
  30.00,                   -- new amount
  'new-category-uuid',     -- new category_id
  'cash',                  -- new payment_method
  'Updated note',           -- new note
  '2024-03-16'             -- new date
);
```

### Delete Expense
```sql
SELECT delete_expense('expense-uuid');
```

### Get Statistics
```sql
SELECT * FROM get_expense_stats(3, 2024);  -- March 2024
```

## 🔧 Default Categories

New users automatically get these categories:
- Food (🟠)
- Transport (🔵)
- Entertainment (🟣)
- Shopping (🩷)
- Healthcare (🟢)
- Education (🟡)
- Bills (🔴)
- Savings (🟦)
- Investments (🟪)
- Others (⚫)

## 🚨 Important Notes

1. **Never expose service role keys** in client-side code
2. **Always validate user input** before database operations
3. **Use RLS policies** instead of application-level security when possible
4. **Test migrations** in development before production
5. **Backup your database** regularly

## 🐛 Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Check if user is authenticated
   - Verify policy conditions match your data structure

2. **Migration Failures**
   - Ensure migrations run in correct order
   - Check for syntax errors in SQL

3. **Function Permission Errors**
   - Verify functions have `SECURITY DEFINER` clause
   - Check user has execute permissions

4. **Data Not Appearing**
   - Check if RLS policies are too restrictive
   - Verify user_id matches auth.uid()

### Debug Commands
```sql
-- Check current user
SELECT auth.uid();

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Test policy
SELECT * FROM expenses WHERE user_id = auth.uid();
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

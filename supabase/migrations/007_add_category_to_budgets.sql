-- Add category_id to budgets table for category-specific budget tracking
ALTER TABLE public.budgets 
ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Create index for better performance
CREATE INDEX idx_budgets_category_id ON public.budgets(category_id);

-- Update unique constraint to include category_id
ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_user_id_month_year_key;

ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_user_id_category_month_year_key 
UNIQUE(user_id, category_id, month, year);

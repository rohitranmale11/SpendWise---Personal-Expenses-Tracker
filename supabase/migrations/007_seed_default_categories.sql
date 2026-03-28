-- Function to seed default categories for new users
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS VOID AS $$
DECLARE
  default_categories TEXT[] := ARRAY[
    'Food', 'Transport', 'Entertainment', 'Shopping', 'Healthcare',
    'Education', 'Bills', 'Savings', 'Investments', 'Others'
  ];
  default_colors TEXT[] := ARRAY[
    '#fb923c', '#3b82f6', '#a855f7', '#ec4899', '#10b981',
    '#f59e0b', '#ef4444', '#14b8a6', '#6366f1', '#6b7280'
  ];
  i INTEGER;
BEGIN
  -- Check if user already has categories
  IF EXISTS (SELECT 1 FROM public.categories WHERE user_id = auth.uid() LIMIT 1) THEN
    RETURN;
  END IF;

  -- Insert default categories
  FOR i IN 1..array_length(default_categories, 1) LOOP
    INSERT INTO public.categories (user_id, name, color)
    VALUES (auth.uid(), default_categories[i], default_colors[i]);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to seed default categories for new users
CREATE OR REPLACE FUNCTION public.handle_user_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Seed default categories after user profile is created
  PERFORM public.seed_default_categories();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
CREATE OR REPLACE TRIGGER on_profile_created_seed_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_categories();

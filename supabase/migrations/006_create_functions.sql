-- Create functions for expense management

-- Function to add expense
CREATE OR REPLACE FUNCTION public.add_expense(
  p_amount NUMERIC,
  p_category_id UUID,
  p_payment_method TEXT,
  p_note TEXT DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_expense_id UUID;
BEGIN
  INSERT INTO public.expenses (
    user_id, amount, category_id, payment_method, note, date
  ) VALUES (
    auth.uid(), p_amount, p_category_id, p_payment_method, p_note, p_date
  ) RETURNING id INTO v_expense_id;
  
  RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fetch expenses
CREATE OR REPLACE FUNCTION public.get_expenses(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  category_id UUID,
  category_name TEXT,
  category_color TEXT,
  payment_method TEXT,
  note TEXT,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.amount,
    e.category_id,
    c.name as category_name,
    c.color as category_color,
    e.payment_method,
    e.note,
    e.date,
    e.created_at
  FROM public.expenses e
  LEFT JOIN public.categories c ON e.category_id = c.id
  WHERE 
    e.user_id = auth.uid()
    AND (p_start_date IS NULL OR e.date >= p_start_date)
    AND (p_end_date IS NULL OR e.date <= p_end_date)
    AND (p_category_id IS NULL OR e.category_id = p_category_id)
  ORDER BY e.date DESC, e.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update expense
CREATE OR REPLACE FUNCTION public.update_expense(
  p_expense_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.expenses SET
    amount = COALESCE(p_amount, amount),
    category_id = COALESCE(p_category_id, category_id),
    payment_method = COALESCE(p_payment_method, payment_method),
    note = COALESCE(p_note, note),
    date = COALESCE(p_date, date),
    updated_at = NOW()
  WHERE 
    id = p_expense_id 
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete expense
CREATE OR REPLACE FUNCTION public.delete_expense(p_expense_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.expenses 
  WHERE 
    id = p_expense_id 
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get expense statistics
CREATE OR REPLACE FUNCTION public.get_expense_stats(
  p_month INTEGER DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  total_expenses NUMERIC,
  expense_count BIGINT,
  avg_expense NUMERIC,
  category_breakdown JSONB
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Set date range
  IF p_month IS NOT NULL AND p_year IS NOT NULL THEN
    v_start_date := MAKE_DATE(p_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month') - INTERVAL '1 day';
  ELSE
    v_start_date := MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, 1);
    v_end_date := (v_start_date + INTERVAL '1 month') - INTERVAL '1 day';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(SUM(e.amount), 0) as total_expenses,
    COUNT(e.id) as expense_count,
    COALESCE(AVG(e.amount), 0) as avg_expense,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'category_name', c.name,
          'category_color', c.color,
          'total_amount', SUM(e.amount),
          'expense_count', COUNT(e.id),
          'percentage', ROUND((SUM(e.amount) / total_sum) * 100, 2)
        )
      )
      FROM public.expenses e2
      JOIN public.categories c ON e2.category_id = c.id
      WHERE e2.user_id = auth.uid()
        AND e2.date BETWEEN v_start_date AND v_end_date
      GROUP BY c.id, c.name, c.color
      ORDER BY SUM(e2.amount) DESC
    ) as category_breakdown
  FROM (
    SELECT SUM(amount) as total_sum
    FROM public.expenses
    WHERE user_id = auth.uid()
      AND date BETWEEN v_start_date AND v_end_date
  ) totals
  CROSS JOIN public.expenses e
  WHERE 
    e.user_id = auth.uid()
    AND e.date BETWEEN v_start_date AND v_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

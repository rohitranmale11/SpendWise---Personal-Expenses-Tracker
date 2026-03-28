-- Add currency field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN currency TEXT DEFAULT 'INR';

-- Update existing profiles to have default currency if null
UPDATE public.profiles 
SET currency = 'INR' 
WHERE currency IS NULL;

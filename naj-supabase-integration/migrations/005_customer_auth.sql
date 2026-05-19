-- Customer auth: auto-provision profile on signup + self-insert policy

CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, customers.first_name),
    last_name  = COALESCE(EXCLUDED.last_name, customers.last_name),
    phone      = COALESCE(EXCLUDED.phone, customers.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer();

-- Allow authenticated users to create their own row (fallback if trigger missed)
DROP POLICY IF EXISTS "customers_own_insert" ON customers;
CREATE POLICY "customers_own_insert" ON customers
  FOR INSERT WITH CHECK (id = auth.uid());

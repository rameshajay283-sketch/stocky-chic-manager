
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Uncategorized',
    size TEXT NOT NULL DEFAULT 'M',
    color TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 0,
    cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    supplier TEXT NOT NULL DEFAULT '',
    barcode TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create stock_movements table
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT NOT NULL DEFAULT '',
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Create activity_log table
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  -- First user gets admin role, rest get staff
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Authenticated users can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for stock_movements
CREATE POLICY "Authenticated users can view movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create movements" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update movements" ON public.stock_movements
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete movements" ON public.stock_movements
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for activity_log
CREATE POLICY "Authenticated users can view activity" ON public.activity_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create activity" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_name ON public.products(name);
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at);

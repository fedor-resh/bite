-- ============================================
-- Baseline migration: initial schema
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "caloriesGoal" integer NOT NULL DEFAULT 3000,
  "proteinGoal" integer NOT NULL DEFAULT 150,
  weight numeric,
  height numeric,
  age integer,
  gender text CHECK (gender IN ('male', 'female')),
  "activityLevel" text CHECK ("activityLevel" IN ('sedentary', 'light', 'moderate', 'high', 'veryHigh')),
  goal text CHECK (goal IN ('loss', 'maintain', 'gain')),
  CONSTRAINT users_calories_goal_positive CHECK ("caloriesGoal" > 0),
  CONSTRAINT users_protein_goal_positive CHECK ("proteinGoal" > 0),
  CONSTRAINT users_weight_positive CHECK (weight IS NULL OR weight > 0),
  CONSTRAINT users_height_positive CHECK (height IS NULL OR height > 0),
  CONSTRAINT users_age_positive CHECK (age IS NULL OR age > 0)
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, "caloriesGoal", "proteinGoal", gender, "activityLevel", goal)
  VALUES (NEW.id, 3000, 150, 'male', 'moderate', 'maintain')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  name text NOT NULL,
  brand text,
  unit text NOT NULL DEFAULT 'г',
  serving_value numeric NOT NULL DEFAULT 100,
  kcalories numeric,
  protein numeric,
  fat numeric,
  carbs numeric,
  CONSTRAINT products_name_unique UNIQUE (name)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Eaten products table (without status — added in next migration)
CREATE TABLE IF NOT EXISTS public.eaten_products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  protein bigint,
  kcalories bigint,
  unit text,
  value double precision,
  date date DEFAULT now(),
  "userId" uuid DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Продукт'::text,
  "imageUrl" text,
  CONSTRAINT eaten_products_pkey PRIMARY KEY (id),
  CONSTRAINT eaten_products_user_id_fkey FOREIGN KEY ("userId") REFERENCES auth.users(id)
);

ALTER TABLE public.eaten_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable users to view their own data only"
  ON public.eaten_products FOR SELECT
  TO authenticated
  USING (auth.uid() = "userId");

CREATE POLICY "Enable insert for users based on user_id"
  ON public.eaten_products FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "update"
  ON public.eaten_products FOR UPDATE
  USING (auth.uid() = "userId");

CREATE POLICY "Enable delete for users based on user_id"
  ON public.eaten_products FOR DELETE
  USING (auth.uid() = "userId");

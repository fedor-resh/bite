ALTER TABLE public.eaten_products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';

ALTER PUBLICATION supabase_realtime ADD TABLE eaten_products;

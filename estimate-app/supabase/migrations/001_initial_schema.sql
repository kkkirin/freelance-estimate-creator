-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

-- Create Users table extension
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_hourly_rate INTEGER NOT NULL,
  default_revision_limit INTEGER NOT NULL DEFAULT 2,
  default_extra_revision_rate INTEGER NOT NULL DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Estimates table
CREATE TABLE IF NOT EXISTS public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subtotal INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  revision_limit INTEGER NOT NULL DEFAULT 2,
  extra_revision_rate INTEGER NOT NULL DEFAULT 5000,
  revisions_used INTEGER NOT NULL DEFAULT 0,
  share_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create LineItems table
CREATE TABLE IF NOT EXISTS public.line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  hourly_rate INTEGER NOT NULL DEFAULT 0,
  memo TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create RevisionLog table
CREATE TABLE IF NOT EXISTS public.revision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  used_number INTEGER NOT NULL,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON public.estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_share_token ON public.estimates(share_token);
CREATE INDEX IF NOT EXISTS idx_line_items_estimate_id ON public.line_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_revision_logs_estimate_id ON public.revision_logs(estimate_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own templates" ON public.templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own estimates" ON public.estimates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view estimates with share_token" ON public.estimates
  FOR SELECT USING (true);

CREATE POLICY "Users can manage line items of their estimates" ON public.line_items
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM public.estimates WHERE id = estimate_id
  ));

CREATE POLICY "Anyone can view line items of shared estimates" ON public.line_items
  FOR SELECT USING (true);

CREATE POLICY "Users can manage revision logs of their estimates" ON public.revision_logs
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM public.estimates WHERE id = estimate_id
  ));

CREATE POLICY "Anyone can view revision logs of shared estimates" ON public.revision_logs
  FOR SELECT USING (true);

-- Create functions
CREATE OR REPLACE FUNCTION public.generate_share_token()
  RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate share token
CREATE OR REPLACE FUNCTION public.set_share_token()
  RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL OR NEW.share_token = '' THEN
    NEW.share_token := public.generate_share_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_share_token
  BEFORE INSERT ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_share_token();

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_line_items_updated_at
  BEFORE UPDATE ON public.line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create system templates table for global templates (no user_id constraint)
CREATE TABLE IF NOT EXISTS public.system_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_hourly_rate INTEGER NOT NULL,
  default_revision_limit INTEGER NOT NULL DEFAULT 2,
  default_extra_revision_rate INTEGER NOT NULL DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Insert default system templates
INSERT INTO public.system_templates (id, name, default_hourly_rate, default_revision_limit, default_extra_revision_rate) VALUES
  ('00000000-0000-0000-0000-000000000001', 'MV (Music Video)', 8000, 2, 5000),
  ('00000000-0000-0000-0000-000000000002', 'CM (TVCM / Web CM)', 10000, 3, 8000),
  ('00000000-0000-0000-0000-000000000003', '企業VP (会社紹介・採用)', 7000, 2, 6000)
ON CONFLICT (id) DO NOTHING;

-- Create view to combine user templates and system templates
CREATE OR REPLACE VIEW public.all_templates AS
SELECT 
  id,
  user_id,
  name,
  default_hourly_rate,
  default_revision_limit,
  default_extra_revision_rate,
  created_at,
  updated_at,
  'user' as template_type
FROM public.templates
WHERE auth.uid() = user_id
UNION ALL
SELECT 
  id,
  NULL as user_id,
  name,
  default_hourly_rate,
  default_revision_limit,
  default_extra_revision_rate,
  created_at,
  updated_at,
  'system' as template_type
FROM public.system_templates;
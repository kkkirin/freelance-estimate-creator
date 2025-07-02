-- system_templatesテーブルに誰でも読み取り可能なRLSポリシーを追加

-- 既存のRLSを無効化（もしあれば）
DROP POLICY IF EXISTS "Anyone can view system templates" ON public.system_templates;

-- RLSを有効化
ALTER TABLE public.system_templates ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能なポリシーを作成
CREATE POLICY "Anyone can view system templates" ON public.system_templates
  FOR SELECT USING (true);

-- 管理者のみ編集可能（現在は無効）
-- CREATE POLICY "Only admins can modify system templates" ON public.system_templates
--   FOR ALL USING (false);
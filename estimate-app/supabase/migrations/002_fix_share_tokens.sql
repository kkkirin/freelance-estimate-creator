-- URLセーフなshare_token生成関数に変更
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

-- 既存の見積もりのshare_tokenを更新
UPDATE public.estimates 
SET share_token = public.generate_share_token() 
WHERE share_token LIKE '%/%' OR share_token LIKE '%+%' OR share_token LIKE '%=%';
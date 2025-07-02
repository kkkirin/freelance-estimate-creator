-- Add schedule and notes fields to estimates table
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS estimated_start_date DATE;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS estimated_end_date DATE;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS estimated_duration_days INTEGER;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT DEFAULT '・修正回数が規定回数を超える場合、追加費用が発生する可能性があります
・制作期間は作業開始日からの目安となります
・最終的なスケジュールは打ち合わせにて調整いたします
・素材提供の遅れにより制作期間が延長する場合があります';
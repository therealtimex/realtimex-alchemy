-- Phase 11: System Setup & Initialization Support

-- 1. Add is_admin to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Update handle_new_user to handle first admin logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_count INT;
BEGIN
    SELECT count(id) INTO profile_count FROM public.profiles;

    INSERT INTO public.profiles (id, full_name, is_admin)
    VALUES (
        NEW.id, 
        NEW.raw_user_meta_data ->> 'full_name',
        CASE WHEN profile_count = 0 THEN TRUE ELSE FALSE END
    );
    
    INSERT INTO public.alchemy_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create init_state view
CREATE OR REPLACE VIEW public.init_state 
WITH (security_invoker=off)
AS
SELECT count(id) AS is_initialized
FROM public.profiles;

-- 4. Grant permissions
GRANT SELECT ON public.init_state TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

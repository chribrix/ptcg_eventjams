ALTER TABLE public.players
DROP CONSTRAINT IF EXISTS players_preferred_login_method_check;

UPDATE public.players
SET preferred_login_method = 'otp'
WHERE preferred_login_method = 'magiclink';

ALTER TABLE public.players
ADD CONSTRAINT players_preferred_login_method_check CHECK (
    preferred_login_method IN ('password', 'otp')
);

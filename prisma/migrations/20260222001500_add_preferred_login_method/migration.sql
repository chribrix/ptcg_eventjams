ALTER TABLE public.players
ADD COLUMN preferred_login_method TEXT NOT NULL DEFAULT 'password';

ALTER TABLE public.players ADD CONSTRAINT players_preferred_login_method_check CHECK (
    preferred_login_method IN ('password', 'magiclink')
);

UPDATE public.players
SET
    preferred_login_method = 'magiclink';
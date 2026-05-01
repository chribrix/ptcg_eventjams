CREATE TABLE public.venue_directory_entries (
    id TEXT PRIMARY KEY,
    organization_name TEXT NOT NULL,
    venue_name TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX venue_directory_entries_organization_name_venue_name_key
ON public.venue_directory_entries (organization_name, venue_name);

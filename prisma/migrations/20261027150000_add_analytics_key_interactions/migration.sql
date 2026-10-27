ALTER TABLE "public"."analytics_events"
DROP CONSTRAINT "analytics_events_type_check";

ALTER TABLE "public"."analytics_events"
ADD CONSTRAINT "analytics_events_type_check" CHECK (
    "event_type" IN (
        'page_view',
        'interaction_click',
        'home_calendar_click',
        'login_completed',
        'registration_completed',
        'waitlist_joined',
        'waitlist_confirmed',
        'event_bookmarked'
    )
);

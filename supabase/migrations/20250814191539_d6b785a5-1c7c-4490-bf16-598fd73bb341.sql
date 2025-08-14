-- Fix the ticket_sla_events table columns to use the correct enum types
ALTER TABLE public.ticket_sla_events 
ALTER COLUMN action TYPE sla_event_action USING action::text::sla_event_action;

ALTER TABLE public.ticket_sla_events 
ALTER COLUMN level TYPE sla_level USING level::text::sla_level;
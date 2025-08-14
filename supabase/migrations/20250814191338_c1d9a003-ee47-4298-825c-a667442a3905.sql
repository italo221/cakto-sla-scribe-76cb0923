-- Create missing enum types for SLA events
CREATE TYPE sla_event_action AS ENUM (
  'SET_FIXED',
  'SET_CUSTOM', 
  'OVERRIDE',
  'UPDATE_POLICY'
);

CREATE TYPE sla_level AS ENUM (
  'P0',
  'P1',
  'P2', 
  'P3'
);
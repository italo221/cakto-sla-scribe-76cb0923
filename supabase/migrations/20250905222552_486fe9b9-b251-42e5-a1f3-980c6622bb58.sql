-- Remove duplicate indexes to improve performance

-- Drop duplicate indexes on sla_action_logs table
DROP INDEX IF EXISTS public.idx_sla_logs_autor;
DROP INDEX IF EXISTS public.idx_sla_logs_sla_id;

-- Drop duplicate index on sla_comentarios_internos table  
DROP INDEX IF EXISTS public.idx_sla_comentarios_sla_id;

-- Keep the more descriptive index names:
-- - idx_sla_action_logs_autor_id (keep)
-- - idx_sla_action_logs_sla_id (keep) 
-- - idx_sla_comentarios_internos_sla_id (keep)
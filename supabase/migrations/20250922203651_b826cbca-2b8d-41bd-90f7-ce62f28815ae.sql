-- Criar o vínculo que está faltando para o TICKET-2025-0575
INSERT INTO public.subtickets (
  parent_ticket_id,
  child_ticket_id,
  sequence_number,
  created_by
) VALUES (
  (SELECT id FROM public.sla_demandas WHERE ticket_number = 'TICKET-2025-0571'),
  (SELECT id FROM public.sla_demandas WHERE ticket_number = 'TICKET-2025-0575'),
  2,
  '49e4dd42-1eb4-48fc-90b9-4815b206b864'  -- Eduardo (baseado no padrão dos outros registros)
)
ON CONFLICT DO NOTHING;
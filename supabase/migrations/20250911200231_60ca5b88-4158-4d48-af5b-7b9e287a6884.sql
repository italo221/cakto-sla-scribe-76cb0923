-- Atualizar notificações existentes que não têm o número do ticket na mensagem
UPDATE public.notifications 
SET message = CASE
  WHEN n.type = 'mention' AND n.message NOT LIKE '%TICKET-%' THEN 
    REPLACE(n.message, 'no ticket: ', 'no ticket ' || COALESCE(t.ticket_number, 'N/A') || ': ')
  WHEN n.type = 'comment' AND n.message NOT LIKE '%TICKET-%' THEN 
    REPLACE(n.message, 'no ticket: ', 'no ticket ' || COALESCE(t.ticket_number, 'N/A') || ': ')
  WHEN n.type = 'ticket_update' AND n.message NOT LIKE '%TICKET-%' THEN 
    REPLACE(n.message, 'o ticket: ', 'o ticket ' || COALESCE(t.ticket_number, 'N/A') || ': ')
  ELSE n.message
END
FROM public.notifications n
LEFT JOIN public.sla_demandas t ON n.ticket_id = t.id
WHERE notifications.id = n.id
  AND notifications.ticket_id IS NOT NULL
  AND notifications.message NOT LIKE '%TICKET-%';
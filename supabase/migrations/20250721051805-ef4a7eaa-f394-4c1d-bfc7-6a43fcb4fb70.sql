-- Criar um SLA de teste para o setor TI SUPORTE
INSERT INTO public.sla_demandas (
  titulo,
  descricao, 
  time_responsavel,
  solicitante,
  nivel_criticidade,
  setor_id,
  pontuacao_financeiro,
  pontuacao_cliente,
  pontuacao_reputacao,
  pontuacao_urgencia,
  pontuacao_operacional,
  pontuacao_total,
  status
) VALUES (
  'Problema no Sistema de E-mail Corporativo',
  'Usuários não conseguem acessar o sistema de e-mail interno. Múltiplos departamentos afetados.',
  'TI SUPORTE',
  'João Silva - Administrativo',
  'P1',
  '3a3b3e81-947f-4638-afa1-930c8d69e764', -- ID do setor TI SUPORTE
  8, -- Alto impacto financeiro
  9, -- Alto impacto no cliente
  7, -- Médio impacto na reputação
  10, -- Máxima urgência
  8, -- Alto impacto operacional  
  42, -- Pontuação total
  'aberto'
);

-- Criar outro SLA para o setor Marketing
INSERT INTO public.sla_demandas (
  titulo,
  descricao,
  time_responsavel, 
  solicitante,
  nivel_criticidade,
  setor_id,
  pontuacao_financeiro,
  pontuacao_cliente,
  pontuacao_reputacao,
  pontuacao_urgencia,
  pontuacao_operacional,
  pontuacao_total,
  status
) VALUES (
  'Campanha de Marketing não está no Ar',
  'Site da campanha promocional está fora do ar durante Black Friday.',
  'Marketing',
  'Maria Santos - Comercial',
  'P0',
  '709c1552-e2ab-4b5a-92ee-7fdaf8c1b581', -- ID do setor Marketing
  10, -- Máximo impacto financeiro
  10, -- Máximo impacto no cliente
  9, -- Alto impacto na reputação
  10, -- Máxima urgência
  9, -- Alto impacto operacional
  48, -- Pontuação total
  'aberto'
);
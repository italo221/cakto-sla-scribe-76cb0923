-- Atualizar o nome do setor de "TI SUPORTE" para "TI"
UPDATE setores 
SET nome = 'TI'
WHERE nome = 'TI SUPORTE';

-- Atualizar os tickets que têm "TI Suporte" no time_responsavel para "TI"
UPDATE sla_demandas 
SET time_responsavel = 'TI'
WHERE time_responsavel = 'TI Suporte';
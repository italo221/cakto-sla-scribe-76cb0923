-- Corrigir o warning de Function Search Path Mutable
-- Atualizar a função handle_new_user para incluir search_path

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome_completo, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome_completo', new.email),
    'colaborador_setor'::public.user_type
  );
  -- O campo role receberá o valor padrão 'viewer' automaticamente
  RETURN new;
END;
$function$;

-- Revisar e garantir que não há problemas com as políticas consolidadas
-- Verificar se todas as políticas estão funcionando corretamente

-- Confirmar que RLS está habilitado em todas as tabelas necessárias
-- (isso já foi feito na migração anterior)

-- Adicionar algumas verificações extras para garantir que a consolidação funcionou

-- Verificar se as políticas consolidadas estão ativas
SELECT schemaname, tablename, policyname, cmd, permissive 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;
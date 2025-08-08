-- 1) Função segura para busca de menções
create or replace function public.mention_search(q text default null)
returns table (
  user_id uuid,
  nome_completo text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- exige sessão autenticada
  if auth.uid() is null then
    return;
  end if;

  if q is null or btrim(q) = '' then
    return query
      select p.user_id, coalesce(p.nome_completo, p.email) as nome_completo, p.email
      from public.profiles p
      order by coalesce(p.nome_completo, p.email)
      limit 50;
  else
    -- normaliza curingas
    q := replace(replace(q, '%', '\\%'), '_', '\\_');

    return query
      select p.user_id, coalesce(p.nome_completo, p.email) as nome_completo, p.email
      from public.profiles p
      where p.nome_completo ilike '%' || q || '%'
         or p.email ilike '%' || q || '%'
      order by coalesce(p.nome_completo, p.email)
      limit 50;
  end if;
end;
$$;

-- 2) Permissões mínimas: permitir execução por usuários autenticados
revoke all on function public.mention_search(text) from public;
grant execute on function public.mention_search(text) to authenticated;
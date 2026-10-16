-- Executar no SQL Editor do projeto qlpnugxxhimnmazhopsj como postgres.
-- Não altera números, reservas, pagamentos ou funções existentes.
begin;
-- Falha sem alterações se a autorização existente não estiver instalada.
do $$ begin
 if to_regprocedure('public.eh_admin()') is null then
   raise exception 'A função public.eh_admin() precisa existir';
 end if;
end $$;
create table if not exists public.rifa_config_sorteio (
 id boolean primary key default true check (id = true),
 data_sorteio date not null check (data_sorteio between date '0001-01-01' and date '9999-12-31')
);
alter table public.rifa_config_sorteio enable row level security;
revoke all on table public.rifa_config_sorteio from public, anon, authenticated;
insert into public.rifa_config_sorteio(id, data_sorteio)
 values (true, date '2026-10-15') on conflict (id) do nothing;
create or replace function public.obter_data_sorteio()
returns date language sql stable security definer set search_path = ''
as $$ select data_sorteio from public.rifa_config_sorteio where id = true $$;
create or replace function public.salvar_data_sorteio_admin(p_data date)
returns date language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null or public.eh_admin() is not true then
   raise exception 'Acesso exclusivo do administrador' using errcode = '42501';
 end if;
 if p_data is null or p_data < date '0001-01-01' or p_data > date '9999-12-31' then
   raise exception 'Informe uma data válida' using errcode = '22007';
 end if;
 insert into public.rifa_config_sorteio(id, data_sorteio) values(true,p_data)
 on conflict(id) do update set data_sorteio = excluded.data_sorteio;
 return p_data;
end $$;
revoke all on function public.obter_data_sorteio() from public, anon, authenticated;
revoke all on function public.salvar_data_sorteio_admin(date) from public, anon, authenticated;
grant execute on function public.obter_data_sorteio() to anon, authenticated;
grant execute on function public.salvar_data_sorteio_admin(date) to authenticated;
notify pgrst, 'reload schema';
commit;

-- T11. Hook "Before User Created" de Supabase Auth (C3).
-- Supabase lo llama la primera vez que alguien entra con Google, antes de
-- crear su usuario. Si el email no está cargado en una persona, rechaza, y el
-- usuario no se crea. Se activa en el panel de Supabase, en los hooks de
-- Authentication.

-- La app reconoce el rechazo por este texto, que es el de C3, y muestra el
-- email que va entre corchetes para que la persona elija otra cuenta.
create function public.antes_de_crear_usuario(event jsonb) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_email text := nullif(lower(trim(event -> 'user' ->> 'email')), '');
begin
  if v_email is not null and exists (select 1 from public.persona where email = v_email) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', format(
        'Este email no tiene acceso a LemonHouse. Pedile acceso a quien administra la app [%s]',
        coalesce(v_email, '')
      )
    )
  );
end;
$$;

-- Solo lo ejecuta Supabase Auth. Si alguien con sesión pudiera llamarlo,
-- podría averiguar qué emails están invitados.
revoke execute on function public.antes_de_crear_usuario(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.antes_de_crear_usuario(jsonb) to supabase_auth_admin;

-- Supabase Auth necesita leer los emails de las personas, y nada más.
grant select (email) on public.persona to supabase_auth_admin;
create policy auth_lee_invitaciones on public.persona for select to supabase_auth_admin using (true);

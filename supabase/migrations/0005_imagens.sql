-- =====================================================================
--  Migração 0005 — pasta de imagens (capas, banners, miniaturas)
--
--  Usa o Storage do próprio Supabase: as imagens são leves e o plano
--  gratuito comporta milhares de capas. Os VÍDEOS vão para o Cloudflare
--  R2 (Etapa 7), que não cobra pela transferência.
--  Qualquer pessoa pode VER as imagens; só administradores enviam/apagam.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagens', 'imagens', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "imagens: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagens' and public.is_admin());

create policy "imagens: admin altera" on storage.objects
  for update to authenticated
  using (bucket_id = 'imagens' and public.is_admin());

create policy "imagens: admin apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagens' and public.is_admin());

-- Necessária para o envio com "substituir se existir" e para listar no painel
create policy "imagens: admin lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'imagens' and public.is_admin());

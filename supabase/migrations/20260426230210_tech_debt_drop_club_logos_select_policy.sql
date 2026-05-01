-- Security advisor 0025 (public_bucket_allows_listing): la policy
-- SELECT amplia sobre el bucket club-logos permite listar TODOS los
-- archivos del bucket. La app solo necesita:
--   - upload via admin client (service_role bypassa RLS)
--   - getPublicUrl (funciona con bucket public, no requiere SELECT)
--   - delete via admin client
-- NO se usa storage.objects.list desde el cliente.
--
-- Drop de la policy: la URL publica sigue funcionando.

drop policy if exists club_logos_public_read on storage.objects;

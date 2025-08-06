CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_enhanced();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_user_email_update();


create policy "Avatars are viewable by everyone"
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'avatars'::text));


create policy "Public videos are viewable by everyone"
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'videos'::text));


create policy "Thumbnails are viewable by everyone"
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'thumbnails'::text));


create policy "Users can delete their own videos"
on "storage"."objects"
as permissive
for delete
to public
using (((bucket_id = 'videos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


create policy "Users can update their own avatar"
on "storage"."objects"
as permissive
for update
to public
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


create policy "Users can upload avatars"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text)));


create policy "Users can upload thumbnails"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'thumbnails'::text) AND (auth.role() = 'authenticated'::text)));


create policy "Users can upload videos"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'videos'::text) AND (auth.role() = 'authenticated'::text)));




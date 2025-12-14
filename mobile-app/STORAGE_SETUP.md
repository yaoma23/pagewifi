# Supabase Storage Setup

This app uploads profile avatars for owners and renters.

Follow these steps to ensure uploads work in every environment.

## 1. Buckets

Create the bucket below in Supabase → Storage:

| Bucket | Notes |
| --- | --- |
| `avatars` | Stores profile photos for users. Make it **public**. |

### Recommended policies

You can keep the default "public read" policy and add an "authenticated users can insert/update/delete their own objects" policy if you prefer tighter controls. Example SQL:

```sql
-- allow anyone to read
create policy "Public read"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- allow authenticated users to upload/update/delete
create policy "Authenticated writes"
on storage.objects for all
using ( auth.role() = 'authenticated' )
with check ( auth.role() = 'authenticated' );
```

## 2. Environment restart

After adding the bucket, restart Expo with a clean cache so environment variables and storage references reload properly:

```bash
npx expo start --clear
```

That's it—profile avatar uploads from the mobile app will now succeed.


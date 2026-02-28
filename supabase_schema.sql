-- 1. Profiles table (linked to Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  email text,
  cash bigint default 0,
  avatar_url text,
  stream_key text unique default gen_random_uuid()::text,
  role text default 'user', -- 'user' or 'admin'
  updated_at timestamp with time zone default now()
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update their own profiles"
  on profiles for update
  using ( auth.uid() = id );

-- 2. Streams table (Live & VOD)
create table public.streams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  username text,
  title text not null,
  category text,
  status text default 'live', -- 'live' or 'vod'
  viewers int default 0,
  thumbnail_url text,
  created_at timestamp with time zone default now()
);

-- Enable RLS for streams
alter table public.streams enable row level security;

create policy "Streams are viewable by everyone"
  on streams for select
  using ( true );

create policy "Users can create their own streams"
  on streams for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own streams"
  on streams for update
  using ( auth.uid() = user_id );

-- 3. Messages table (Chat)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  stream_id uuid references public.streams on delete cascade not null,
  user_id uuid references auth.users not null,
  username text,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS for messages
alter table public.messages enable row level security;

create policy "Messages are viewable by everyone"
  on messages for select
  using ( true );

create policy "Users can insert their own messages"
  on messages for insert
  with check ( auth.uid() = user_id );

-- 4. Automatically create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.email, 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

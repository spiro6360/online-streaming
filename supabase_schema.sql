-- 1. Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  email text,
  cash bigint default 0,
  avatar_url text,
  stream_key text unique default gen_random_uuid()::text,
  role text default 'user',
  updated_at timestamp with time zone default now()
);

-- 2. Streams table
create table if not exists public.streams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  username text,
  title text not null,
  category text,
  status text default 'off', -- 기본값은 off
  viewers int default 0,
  thumbnail_url text,
  created_at timestamp with time zone default now()
);

-- RLS 및 정책 (기존과 동일하되 생략 방지를 위해 포함)
alter table public.profiles enable row level security;
alter table public.streams enable row level security;

-- 3. 방송 상태 자동 업데이트 함수 (미디어 서버용)
create or replace function public.update_stream_status_by_key(p_stream_key text, p_status text)
returns void
language plpgsql
security definer -- 관리자 권한으로 실행
as $$
declare
  v_user_id uuid;
  v_username text;
begin
  -- 1. 스트림 키로 사용자 찾기
  select id, username into v_user_id, v_username 
  from public.profiles 
  where stream_key = p_stream_key;

  if v_user_id is not null then
    -- 2. 해당 사용자의 스트림 정보 업데이트 (없으면 생성, 있으면 수정)
    insert into public.streams (user_id, username, title, status)
    values (v_user_id, v_username, v_username || '님의 방송', p_status)
    on conflict (user_id) do update 
    set status = p_status, 
        updated_at = now();
  end if;
end;
$$;

-- streams 테이블에 user_id unique 제약 조건 추가 (on conflict 처리를 위해)
do $$ 
begin
  if not exists (select 1 from pg_constraint where conname = 'streams_user_id_key') then
    alter table public.streams add constraint streams_user_id_key unique (user_id);
  end if;
end $$;

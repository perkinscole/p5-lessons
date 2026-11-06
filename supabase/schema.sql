-- Pixel Trail database. Paste this whole file into the Supabase SQL editor and run it once.
--
-- Privacy design:
--  * Students have no email. Teachers create them; they log in with class code + username + passcode.
--  * Each student browser holds an anonymous Supabase session linked to the student by student_login().
--  * Row-level security limits every read and write. Grades are visible only to that student and teacher.
--  * Classmates see progress through class_board(), which never includes code or grades.

create extension if not exists pgcrypto;

create table public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  username text not null,
  avatar jsonb,
  path text check (path in ('platformer', 'adventure', 'arcade')),
  game_name text check (char_length(game_name) <= 60),
  created_at timestamptz not null default now(),
  unique (class_id, username)
);

-- Kept apart from students, with RLS on and no policies, so no client can ever read it.
create table public.student_secrets (
  student_id uuid primary key references public.students(id) on delete cascade,
  passcode_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz
);

create table public.student_sessions (
  auth_uid uuid primary key references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.works (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id text not null,
  code text not null default '' check (char_length(code) < 200000),
  assets jsonb not null default '{}',
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'returned', 'approved')),
  stretch_done int not null default 0 check (stretch_done between 0 and 3),
  reflection text not null default '' check (char_length(reflection) < 4000),
  checks_passed int not null default 0,
  checks_total int not null default 0,
  auto_ok boolean not null default false,
  shared boolean not null default false,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create table public.grades (
  work_id uuid primary key references public.works(id) on delete cascade,
  scores jsonb not null default '{}',
  total int not null default 0,
  max_total int not null default 12,
  feedback text not null default '',
  graded_at timestamptz not null default now()
);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  badge_id text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (student_id, badge_id)
);

create table public.sprites (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete cascade,
  author_name text not null default '',
  name text not null check (char_length(name) between 1 and 40),
  data_url text not null check (char_length(data_url) < 300000),
  frames int not null default 1,
  w int not null default 16,
  h int not null default 16,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  check ((student_id is null) <> (teacher_id is null))
);

create index on public.students (class_id);
create index on public.works (student_id);
create index on public.sprites (class_id) where published;

-- Helpers ---------------------------------------------------------------------------------------

create function public.current_student_id() returns uuid
language sql stable security definer set search_path = public as
$$ select student_id from public.student_sessions where auth_uid = auth.uid() $$;

create function public.current_class_id() returns uuid
language sql stable security definer set search_path = public as
$$ select s.class_id from public.student_sessions ss join public.students s on s.id = ss.student_id where ss.auth_uid = auth.uid() $$;

create function public.owns_class(p_class uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.classes where id = p_class and teacher_id = auth.uid()) $$;

create function public.teaches_student(p_student uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.students s join public.classes c on c.id = s.class_id
                  where s.id = p_student and c.teacher_id = auth.uid()) $$;

create function public.is_real_account() returns boolean
language sql stable as
$$ select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false $$;

-- Row-level security ----------------------------------------------------------------------------

alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.student_secrets enable row level security;
alter table public.student_sessions enable row level security;
alter table public.works enable row level security;
alter table public.grades enable row level security;
alter table public.awards enable row level security;
alter table public.sprites enable row level security;

create policy teachers_self_read on public.teachers for select using (id = auth.uid());
create policy teachers_self_insert on public.teachers for insert with check (id = auth.uid() and public.is_real_account());
create policy teachers_self_update on public.teachers for update using (id = auth.uid());

create policy classes_teacher on public.classes for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_real_account());
create policy classes_student_read on public.classes for select using (id = public.current_class_id());

create policy students_teacher_read on public.students for select using (public.owns_class(class_id));
create policy students_teacher_delete on public.students for delete using (public.owns_class(class_id));
create policy students_teacher_update on public.students for update using (public.owns_class(class_id));
create policy students_self_read on public.students for select using (id = public.current_student_id());
create policy students_self_update on public.students for update using (id = public.current_student_id());
-- Students may only change these columns about themselves; teachers use add_students() to create rows.
revoke insert, update on public.students from anon, authenticated;
grant update (avatar, path, game_name) on public.students to authenticated;

create policy works_self_read on public.works for select using (student_id = public.current_student_id());
create policy works_self_insert on public.works for insert
  with check (student_id = public.current_student_id() and status in ('in_progress', 'submitted'));
create policy works_self_update on public.works for update
  using (student_id = public.current_student_id() and status <> 'approved')
  with check (student_id = public.current_student_id() and status in ('in_progress', 'submitted', 'returned'));
create policy works_teacher_read on public.works for select using (public.teaches_student(student_id));

create policy grades_read on public.grades for select using (
  exists (select 1 from public.works w where w.id = work_id
          and (w.student_id = public.current_student_id() or public.teaches_student(w.student_id)))
);

create policy awards_read on public.awards for select using (student_id = public.current_student_id() or public.teaches_student(student_id));
create policy awards_teacher_insert on public.awards for insert with check (public.teaches_student(student_id));
create policy awards_teacher_delete on public.awards for delete using (public.teaches_student(student_id));

create policy sprites_read on public.sprites for select using (
  student_id = public.current_student_id() or teacher_id = auth.uid()
  or (class_id is not null and public.owns_class(class_id))
  or (published and class_id = public.current_class_id())
);
create policy sprites_insert on public.sprites for insert with check (
  (student_id = public.current_student_id() and class_id = public.current_class_id())
  or (teacher_id = auth.uid() and (class_id is null or public.owns_class(class_id)))
);
create policy sprites_update on public.sprites for update using (student_id = public.current_student_id() or teacher_id = auth.uid());
create policy sprites_delete on public.sprites for delete using (
  student_id = public.current_student_id() or teacher_id = auth.uid() or (class_id is not null and public.owns_class(class_id))
);

-- Functions the app calls ---------------------------------------------------------------------

create function public.make_passcode() returns text language plpgsql as $$
declare
  a text[] := array['blue','red','gold','green','pink','swift','happy','brave','quiet','tiny','giant','lucky','silver','purple','sunny','rocket'];
  b text[] := array['fox','owl','bear','frog','wolf','hawk','otter','tiger','panda','crab','moose','whale','robin','koala','lynx','gecko'];
begin
  return a[1 + floor(random() * 16)::int] || '-' || b[1 + floor(random() * 16)::int] || '-' || (10 + floor(random() * 90)::int)::text;
end $$;

create function public.make_class_code() returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out_code text;
begin
  loop
    out_code := '';
    for i in 1..6 loop out_code := out_code || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
    exit when not exists (select 1 from public.classes where code = out_code);
  end loop;
  return out_code;
end $$;

create function public.create_class(p_name text) returns public.classes
language plpgsql security definer set search_path = public, extensions as $$
declare row public.classes;
begin
  if not exists (select 1 from public.teachers where id = auth.uid()) then raise exception 'Not a teacher'; end if;
  insert into public.classes (teacher_id, name, code) values (auth.uid(), p_name, public.make_class_code()) returning * into row;
  return row;
end $$;

create function public.add_students(p_class uuid, p_names text[]) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nm text; base text; uname text; n int; pass text; sid uuid;
  result jsonb := '[]'::jsonb;
begin
  if not public.owns_class(p_class) then raise exception 'Not your class'; end if;
  foreach nm in array p_names loop
    nm := trim(nm);
    continue when nm = '';
    base := lower(regexp_replace(nm, '[^a-zA-Z0-9]', '', 'g'));
    if base = '' then base := 'student'; end if;
    uname := base; n := 1;
    while exists (select 1 from public.students where class_id = p_class and username = uname) loop
      n := n + 1; uname := base || n::text;
    end loop;
    pass := public.make_passcode();
    insert into public.students (class_id, display_name, username) values (p_class, nm, uname) returning id into sid;
    insert into public.student_secrets (student_id, passcode_hash) values (sid, crypt(pass, gen_salt('bf')));
    result := result || jsonb_build_object('id', sid, 'display_name', nm, 'username', uname, 'passcode', pass);
  end loop;
  return result;
end $$;

create function public.reset_passcode(p_student uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare pass text;
begin
  if not public.teaches_student(p_student) then raise exception 'Not your student'; end if;
  pass := public.make_passcode();
  update public.student_secrets set passcode_hash = crypt(pass, gen_salt('bf')), failed_attempts = 0, locked_until = null where student_id = p_student;
  delete from public.student_sessions where student_id = p_student;
  return pass;
end $$;

-- Links this anonymous session to a student. Five wrong tries locks that login for five minutes.
create function public.student_login(p_code text, p_username text, p_passcode text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare sid uuid; sec public.student_secrets;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select s.id into sid from public.students s join public.classes c on c.id = s.class_id
    where c.code = upper(trim(p_code)) and s.username = lower(trim(p_username));
  if sid is null then raise exception 'Check your class code, username, and passcode.'; end if;
  select * into sec from public.student_secrets where student_id = sid;
  if sec.locked_until is not null and sec.locked_until > now() then
    raise exception 'Too many tries. Wait a few minutes, or ask your teacher.';
  end if;
  if sec.passcode_hash <> crypt(lower(trim(p_passcode)), sec.passcode_hash) then
    update public.student_secrets
      set failed_attempts = case when failed_attempts >= 4 then 0 else failed_attempts + 1 end,
          locked_until = case when failed_attempts >= 4 then now() + interval '5 minutes' else null end
      where student_id = sid;
    -- Commit the counter by returning rather than raising, which would roll it back.
    return null;
  end if;
  update public.student_secrets set failed_attempts = 0, locked_until = null where student_id = sid;
  insert into public.student_sessions (auth_uid, student_id) values (auth.uid(), sid)
    on conflict (auth_uid) do update set student_id = excluded.student_id;
  return sid;
end $$;

create function public.whoami() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t public.teachers; s public.students; c public.classes;
begin
  select * into t from public.teachers where id = auth.uid();
  if t.id is not null then return jsonb_build_object('role', 'teacher', 'teacher', to_jsonb(t)); end if;
  select * into s from public.students where id = public.current_student_id();
  if s.id is not null then
    select * into c from public.classes where id = s.class_id;
    return jsonb_build_object('role', 'student', 'student', to_jsonb(s), 'class', to_jsonb(c));
  end if;
  return null;
end $$;

-- What classmates may see: names, characters, roads, and lesson progress. No code or grades.
create function public.class_board(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  -- "is not distinct from" matters: with "=", a caller with no class compares to NULL and slips past this check.
  if not (public.owns_class(p_class) or (public.current_class_id() is not null and public.current_class_id() is not distinct from p_class)) then raise exception 'Not your class'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'display_name', s.display_name, 'avatar', s.avatar, 'path', s.path, 'game_name', s.game_name,
      'works', coalesce((select jsonb_agg(jsonb_build_object('lesson_id', w.lesson_id, 'status', w.status,
          'stretch_done', w.stretch_done, 'auto_ok', w.auto_ok, 'shared', w.shared))
          from public.works w where w.student_id = s.id), '[]'::jsonb),
      'awards', coalesce((select jsonb_agg(jsonb_build_object('badge_id', a.badge_id, 'note', a.note))
          from public.awards a where a.student_id = s.id), '[]'::jsonb),
      'sprites_shared', (select count(*) from public.sprites sp where sp.student_id = s.id and sp.published)
    ) order by s.display_name)
    from public.students s where s.class_id = p_class), '[]'::jsonb);
end $$;

-- Games a class chose to share, with just enough about each author to show in the Arcade.
create function public.class_arcade(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.owns_class(p_class) or (public.current_class_id() is not null and public.current_class_id() is not distinct from p_class)) then raise exception 'Not your class'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', w.id, 'student_id', w.student_id, 'lesson_id', w.lesson_id, 'code', w.code, 'assets', w.assets, 'updated_at', w.updated_at,
      'student', jsonb_build_object('display_name', s.display_name, 'avatar', s.avatar, 'game_name', s.game_name, 'path', s.path)
    ) order by w.updated_at desc)
    from public.works w join public.students s on s.id = w.student_id
    where s.class_id = p_class and w.shared), '[]'::jsonb);
end $$;

create function public.save_grade(p_work uuid, p_scores jsonb, p_total int, p_max int, p_feedback text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  select student_id into sid from public.works where id = p_work;
  if sid is null or not public.teaches_student(sid) then raise exception 'Not your student'; end if;
  if p_status not in ('approved', 'returned', 'submitted') then raise exception 'Bad status'; end if;
  insert into public.grades (work_id, scores, total, max_total, feedback, graded_at)
    values (p_work, p_scores, p_total, p_max, p_feedback, now())
    on conflict (work_id) do update set scores = excluded.scores, total = excluded.total,
      max_total = excluded.max_total, feedback = excluded.feedback, graded_at = now();
  update public.works set status = p_status where id = p_work;
end $$;

create function public.teacher_unshare(p_work uuid) returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  select student_id into sid from public.works where id = p_work;
  if sid is null or not public.teaches_student(sid) then raise exception 'Not your student'; end if;
  update public.works set shared = false where id = p_work;
end $$;

-- Lock down: only signed-in users can call these, and helpers aren't part of the API.
revoke all on function public.make_passcode() from public, anon, authenticated;
revoke all on function public.make_class_code() from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['create_class(text)', 'add_students(uuid, text[])', 'reset_passcode(uuid)', 'student_login(text, text, text)',
    'whoami()', 'class_board(uuid)', 'class_arcade(uuid)', 'save_grade(uuid, jsonb, int, int, text, text)', 'teacher_unshare(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

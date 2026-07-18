create type public.workspace_role as enum ('owner', 'readonly');
create type public.track_code as enum ('weiwu_b2b', 'coaching_c2c');
create type public.topic_status as enum ('inbox', 'validate', 'approved', 'paused', 'archived');
create type public.production_stage as enum (
  'no_script',
  'scripting',
  'ready_to_shoot',
  'shooting',
  'shot_waiting_edit',
  'ready_to_publish',
  'published',
  'reviewed'
);
create type public.priority_level as enum ('low', 'medium', 'high');
create type public.activity_action as enum ('created', 'updated', 'soft_deleted', 'restored', 'stage_changed');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'readonly',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  unique (workspace_id, id)
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code public.track_code not null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, code),
  unique (workspace_id, id)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  track_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  insight text,
  audience text,
  content_type text,
  keyword text,
  objective text,
  priority public.priority_level not null default 'medium',
  topic_status public.topic_status not null default 'inbox',
  production_stage public.production_stage not null default 'no_script',
  planned_for date,
  deleted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, track_id) references public.tracks(workspace_id, id) on delete restrict
);

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid not null,
  version integer not null check (version > 0),
  hook text not null,
  body text not null,
  shot_list jsonb not null default '[]'::jsonb,
  caption text,
  hashtags text[] not null default '{}'::text[],
  estimated_seconds integer check (estimated_seconds is null or estimated_seconds > 0),
  status text not null default 'draft' check (status in ('draft', 'ready')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, version),
  foreign key (workspace_id, content_id) references public.content_items(workspace_id, id) on delete cascade
);

create table public.shoot_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid not null,
  scheduled_for timestamptz,
  location text,
  people text[] not null default '{}'::text[],
  required_shots jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, content_id) references public.content_items(workspace_id, id) on delete cascade,
  check ((status = 'completed') = (completed_at is not null))
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid,
  storage_path text,
  external_url text,
  label text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, content_id) references public.content_items(workspace_id, id) on delete cascade,
  check (num_nonnulls(storage_path, external_url) = 1)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  entity_type text not null check (char_length(trim(entity_type)) between 1 and 80),
  entity_id uuid not null,
  action public.activity_action not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index content_items_workspace_track_active_idx
  on public.content_items (workspace_id, track_id, updated_at desc)
  where deleted_at is null;
create index scripts_content_version_idx on public.scripts (content_id, version desc);
create index shoot_tasks_workspace_schedule_idx on public.shoot_tasks (workspace_id, scheduled_for);
create index activity_logs_workspace_created_idx on public.activity_logs (workspace_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_workspaces_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();
create trigger set_tracks_updated_at before update on public.tracks
for each row execute function public.set_updated_at();
create trigger set_content_items_updated_at before update on public.content_items
for each row execute function public.set_updated_at();
create trigger set_scripts_updated_at before update on public.scripts
for each row execute function public.set_updated_at();
create trigger set_shoot_tasks_updated_at before update on public.shoot_tasks
for each row execute function public.set_updated_at();
create trigger set_assets_updated_at before update on public.assets
for each row execute function public.set_updated_at();

create function public.is_workspace_member(workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = $1
      and workspace_members.user_id = (select auth.uid())
  );
$$;

create function public.is_workspace_owner(workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = $1
      and workspace_members.user_id = (select auth.uid())
      and workspace_members.role = 'owner'
  );
$$;

create function public.bootstrap_workspace(workspace_name text default '我的内容工作区')
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  workspace public.workspaces;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to bootstrap a workspace';
  end if;

  insert into public.workspaces (owner_id, name)
  values (current_user_id, coalesce(nullif(trim(workspace_name), ''), '我的内容工作区'))
  on conflict (owner_id) do nothing
  returning * into workspace;

  if workspace.id is null then
    select * into workspace
    from public.workspaces
    where owner_id = current_user_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace.id, current_user_id, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';

  insert into public.tracks (workspace_id, code, name)
  values
    (workspace.id, 'weiwu_b2b', '唯吾 · B端获客'),
    (workspace.id, 'coaching_c2c', '陪跑 · C端获客')
  on conflict (workspace_id, code) do nothing;

  return workspace;
end;
$$;

revoke all on function public.bootstrap_workspace(text) from public;
grant execute on function public.bootstrap_workspace(text) to authenticated;
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
revoke all on function public.set_updated_at() from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant usage on schema public to authenticated;
grant usage on type public.workspace_role, public.track_code, public.topic_status,
  public.production_stage, public.priority_level, public.activity_action to authenticated;
grant select, insert, update, delete on table public.workspaces, public.workspace_members,
  public.tracks, public.content_items, public.scripts, public.shoot_tasks, public.assets,
  public.activity_logs to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tracks enable row level security;
alter table public.content_items enable row level security;
alter table public.scripts enable row level security;
alter table public.shoot_tasks enable row level security;
alter table public.assets enable row level security;
alter table public.activity_logs enable row level security;

create policy "workspace members can select workspaces" on public.workspaces
for select to authenticated using (public.is_workspace_member(id));
create policy "owners can create workspaces" on public.workspaces
for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owners can update workspaces" on public.workspaces
for update to authenticated using (public.is_workspace_owner(id)) with check (public.is_workspace_owner(id));
create policy "owners can delete workspaces" on public.workspaces
for delete to authenticated using (public.is_workspace_owner(id));

create policy "workspace members can select memberships" on public.workspace_members
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "owners can insert memberships" on public.workspace_members
for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy "owners can update memberships" on public.workspace_members
for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "owners can delete memberships" on public.workspace_members
for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy "workspace members can select tracks" on public.tracks
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "owners can insert tracks" on public.tracks
for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy "owners can update tracks" on public.tracks
for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "owners can delete tracks" on public.tracks
for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy "workspace members can select content" on public.content_items
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "owners can insert content" on public.content_items
for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy "owners can update content" on public.content_items
for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "owners can delete content" on public.content_items
for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy "workspace members can select scripts" on public.scripts
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "owners can insert scripts" on public.scripts
for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy "owners can update scripts" on public.scripts
for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "owners can delete scripts" on public.scripts
for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy "workspace members can select shoot tasks" on public.shoot_tasks
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "owners can insert shoot tasks" on public.shoot_tasks
for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy "owners can update shoot tasks" on public.shoot_tasks
for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "owners can delete shoot tasks" on public.shoot_tasks
for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy "workspace members can select assets" on public.assets
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "owners can insert assets" on public.assets
for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy "owners can update assets" on public.assets
for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "owners can delete assets" on public.assets
for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy "workspace members can select activity logs" on public.activity_logs
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "owners can insert activity logs" on public.activity_logs
for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy "owners can update activity logs" on public.activity_logs
for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "owners can delete activity logs" on public.activity_logs
for delete to authenticated using (public.is_workspace_owner(workspace_id));

insert into storage.buckets (id, name, public)
values ('content-assets', 'content-assets', false)
on conflict (id) do update set public = false;

create policy "workspace members can select private content assets" on storage.objects
for select to authenticated using (
  bucket_id = 'content-assets'
  and public.is_workspace_member(
    case
      when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
      else null
    end
  )
);
create policy "owners can insert private content assets" on storage.objects
for insert to authenticated with check (
  bucket_id = 'content-assets'
  and public.is_workspace_owner(
    case
      when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
      else null
    end
  )
);
create policy "owners can update private content assets" on storage.objects
for update to authenticated using (
  bucket_id = 'content-assets'
  and public.is_workspace_owner(
    case
      when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
      else null
    end
  )
) with check (
  bucket_id = 'content-assets'
  and public.is_workspace_owner(
    case
      when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
      else null
    end
  )
);
create policy "owners can delete private content assets" on storage.objects
for delete to authenticated using (
  bucket_id = 'content-assets'
  and public.is_workspace_owner(
    case
      when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 1)::uuid
      else null
    end
  )
);

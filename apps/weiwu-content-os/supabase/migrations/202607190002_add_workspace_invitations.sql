-- Private workspace access: owner-approved, email-addressed read-only members.
-- The table stores the invitation lifecycle without exposing auth.users to the client.
create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and char_length(email) between 3 and 320),
  role public.workspace_role not null default 'readonly' check (role = 'readonly'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  unique (workspace_id, email)
);

create index workspace_invitations_workspace_active_idx
  on public.workspace_invitations (workspace_id, created_at desc)
  where revoked_at is null;
create index workspace_invitations_invited_user_idx
  on public.workspace_invitations (invited_user_id)
  where revoked_at is null;

grant select on table public.workspace_invitations to authenticated;

alter table public.workspace_invitations enable row level security;

create policy "owners can select workspace invitations" on public.workspace_invitations
for select to authenticated using (public.is_workspace_owner(workspace_id));

-- A user may only ever receive an existing workspace.  The very first account
-- still creates the initial private workspace, while later accounts require an
-- owner-created invitation.
create or replace function public.bootstrap_workspace(workspace_name text default '我的内容工作区')
returns public.workspaces
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  workspace public.workspaces;
  invitation public.workspace_invitations;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to bootstrap a workspace';
  end if;

  -- Existing owners and invited members always return to their assigned workspace.
  select w.* into workspace
  from public.workspace_members member
  join public.workspaces w on w.id = member.workspace_id
  where member.user_id = current_user_id
  order by case when member.role = 'owner' then 0 else 1 end, member.created_at asc
  limit 1;

  if workspace.id is not null then
    update public.workspace_invitations
    set accepted_at = coalesce(accepted_at, now()), invited_user_id = current_user_id
    where workspace_id = workspace.id
      and revoked_at is null
      and accepted_at is null
      and (invited_user_id = current_user_id or email = current_email);
    return workspace;
  end if;

  select * into invitation
  from public.workspace_invitations
  where revoked_at is null
    and accepted_at is null
    and (invited_user_id = current_user_id or email = current_email)
  order by created_at desc
  limit 1;

  if invitation.id is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (invitation.workspace_id, current_user_id, 'readonly')
    on conflict (workspace_id, user_id) do update set role = 'readonly';

    update public.workspace_invitations
    set invited_user_id = current_user_id, accepted_at = now()
    where id = invitation.id;

    select * into workspace from public.workspaces where id = invitation.workspace_id;
    return workspace;
  end if;

  -- Only an untouched deployment may initialise its first owner workspace.
  if exists (select 1 from public.workspaces) then
    raise exception '当前邮箱尚未获得此工作区的访问邀请';
  end if;

  insert into public.workspaces (owner_id, name)
  values (current_user_id, coalesce(nullif(trim(workspace_name), ''), '我的内容工作区'))
  returning * into workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace.id, current_user_id, 'owner');

  insert into public.tracks (workspace_id, code, name)
  values
    (workspace.id, 'weiwu_b2b', '唯吾 · B端获客'),
    (workspace.id, 'coaching_c2c', '陪跑 · C端获客');

  return workspace;
end;
$$;

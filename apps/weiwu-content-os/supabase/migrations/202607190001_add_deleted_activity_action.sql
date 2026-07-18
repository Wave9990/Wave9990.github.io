-- External asset links are hard-deleted, so their activity log must not reuse
-- the soft-delete/archival action used by recoverable content records.
alter type public.activity_action add value if not exists 'deleted';

alter table if exists movement_audit_logs
add column if not exists performed_by_user_id uuid references users(id);

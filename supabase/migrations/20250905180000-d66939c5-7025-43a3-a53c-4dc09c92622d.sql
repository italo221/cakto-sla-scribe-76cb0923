-- Create archive tables to preserve data while cleaning up old records
create table if not exists tickets_archive (like tickets including all);
create table if not exists logs_archive (like logs including all);
create table if not exists notifications_archive (like notifications including all);

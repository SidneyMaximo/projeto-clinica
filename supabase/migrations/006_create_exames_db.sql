-- Create table for DB Diagnosticos exams
create table public.exames_db (
    id uuid default gen_random_uuid() primary key,
    codigo_exame_db varchar not null unique,
    mnemonico varchar not null,
    descricao varchar not null,
    material varchar,
    prazo_dias integer,
    metodo varchar,
    sinonimos text,
    ativo boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Setup RLS (Row Level Security)
alter table public.exames_db enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.exames_db
    for select using (true);

create policy "Enable insert for authenticated users only" on public.exames_db
    for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only" on public.exames_db
    for update using (auth.role() = 'authenticated');

-- Create an index on codigo_exame_db for faster lookups
create index idx_exames_db_codigo on public.exames_db(codigo_exame_db);
create index idx_exames_db_mnemonico on public.exames_db(mnemonico);

-- Create updated_at trigger (assuming handle_updated_at function exists in the DB)
-- If not, it can be removed or created.
-- create trigger set_updated_at
--     before update on public.exames_db
--     for each row
--     execute function public.handle_updated_at();

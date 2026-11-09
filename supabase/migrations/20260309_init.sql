create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dates date[] not null,
  start_time time default '09:00',
  end_time time default '21:00',
  created_at timestamptz default now()
);

create table responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  participant_name text not null,
  available_slots jsonb not null default '[]',
  created_at timestamptz default now(),
  unique(event_id, participant_name)
);

alter table events enable row level security;
alter table responses enable row level security;

create policy "Anyone can read events" on events for select using (true);
create policy "Anyone can create events" on events for insert with check (true);
create policy "Anyone can read responses" on responses for select using (true);
create policy "Anyone can create responses" on responses for insert with check (true);
create policy "Anyone can update responses" on responses for update using (true);

-- Add creator_token and description to events
alter table events add column if not exists creator_token text;
alter table events add column if not exists description text default '';

-- Allow anyone to update events (creator validates via token client-side)
create policy "Anyone can update events" on events for update using (true);

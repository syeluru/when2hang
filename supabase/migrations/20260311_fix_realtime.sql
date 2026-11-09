-- Ensure realtime is enabled for responses table
DO $$
BEGIN
  BEGIN
    alter publication supabase_realtime drop table responses;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

alter publication supabase_realtime add table responses;

-- RPC to get the latest migration timestamp from Supabase's internal tracking table
CREATE OR REPLACE FUNCTION get_latest_migration_timestamp()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, supabase_migrations
AS $$
DECLARE
    latest_timestamp text;
BEGIN
    SELECT version INTO latest_timestamp
    FROM supabase_migrations.schema_migrations
    ORDER BY version DESC
    LIMIT 1;
    
    RETURN latest_timestamp;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_latest_migration_timestamp() TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_migration_timestamp() TO anon;
GRANT EXECUTE ON FUNCTION get_latest_migration_timestamp() TO service_role;

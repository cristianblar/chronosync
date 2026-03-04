CREATE EXTENSION IF NOT EXISTS timescaledb;

-- NOTE: This script runs at initdb time (first boot of the DB volume), before Alembic migrations.
-- It MUST be safe when tables/views don't exist yet.

DO $$
BEGIN
  IF to_regclass('public.daily_trackings') IS NOT NULL THEN
    PERFORM create_hypertable(
      'daily_trackings',
      'tracked_at',
      if_not_exists => TRUE,
      chunk_time_interval => INTERVAL '7 days'
    );
    PERFORM add_compression_policy('daily_trackings', INTERVAL '90 days');
    PERFORM add_retention_policy('daily_trackings', INTERVAL '2 years');
  END IF;

  IF to_regclass('public.energy_logs') IS NOT NULL THEN
    PERFORM create_hypertable(
      'energy_logs',
      'logged_at',
      if_not_exists => TRUE,
      chunk_time_interval => INTERVAL '7 days'
    );
    PERFORM add_compression_policy('energy_logs', INTERVAL '90 days');
    PERFORM add_retention_policy('energy_logs', INTERVAL '2 years');
  END IF;

  IF to_regclass('public.daily_trackings') IS NOT NULL THEN
    EXECUTE $q$
      CREATE MATERIALIZED VIEW IF NOT EXISTS daily_sleep_stats
      WITH (timescaledb.continuous) AS
      SELECT
          user_id,
          time_bucket('1 day', tracked_at) AS day,
          AVG(sleep_quality) AS avg_quality,
          AVG(adherence_percentage) AS avg_adherence,
          AVG(social_jet_lag_minutes) AS avg_jet_lag
      FROM daily_trackings
      GROUP BY user_id, time_bucket('1 day', tracked_at)
    $q$;
  END IF;

  IF to_regclass('public.daily_sleep_stats') IS NOT NULL THEN
    PERFORM add_continuous_aggregate_policy(
      'daily_sleep_stats',
      start_offset => INTERVAL '1 month',
      end_offset => INTERVAL '1 hour',
      schedule_interval => INTERVAL '1 hour'
    );
  END IF;
END;
$$;

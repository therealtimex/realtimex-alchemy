-- Drop legacy tables and functions replaced by RealTimeX SDK vector storage

DROP TABLE IF EXISTS embedding_jobs;
DROP TABLE IF EXISTS signal_embeddings;
DROP FUNCTION IF EXISTS match_signals;

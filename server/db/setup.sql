DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_api_keys;
DROP TABLE IF EXISTS transcriptions;
DROP TABLE IF EXISTS transcription_backups;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  isconfirmed BOOLEAN DEFAULT false,
  hashed_password VARCHAR(255) NOT NULL,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'local',
  google_sub TEXT UNIQUE,
  user_role VARCHAR(50) NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
  pending_email VARCHAR(255),
  email_confirm_token_hash TEXT,
  email_confirm_expires_at TIMESTAMPTZ,
  password_reset_token_hash TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  key_hint_last4 VARCHAR(4) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_api_keys_provider_check
    CHECK (provider IN ('assemblyai')),
  CONSTRAINT user_api_keys_status_check
    CHECK (status IN ('active', 'invalid'))
);

CREATE UNIQUE INDEX user_api_keys_one_default_per_provider_idx
  ON user_api_keys (user_id, provider)
  WHERE is_default = true;

CREATE INDEX user_api_keys_user_provider_idx
  ON user_api_keys (user_id, provider);

CREATE TABLE transcriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  file_name VARCHAR(255) NOT NULL,
  audio_duration INTEGER NOT NULL,
  transcript_id VARCHAR(255) UNIQUE NOT NULL,
  transcription TEXT NOT NULL,
  options JSONB NOT NULL,
  file_recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transcription_backups (
  id SERIAL PRIMARY KEY,
  file_name TEXT,
  file_recorded_at TIMESTAMPTZ,
  transcript_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_role VARCHAR(50) NOT NULL,
  raw_api_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

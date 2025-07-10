DROP TABLE IF EXISTS transcriptions;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  isConfirmed BOOLEAN DEFAULT false,
  hashed_password VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transcriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  file_name VARCHAR(255) NOT NULL,
  transcript_id VARCHAR(255) UNIQUE NOT NULL,
  transcription TEXT NOT NULL,
  file_recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transcription_backups (
  id SERIAL PRIMARY KEY,
  transcript_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_role VARCHAR(50) NOT NULL,
  raw_api_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

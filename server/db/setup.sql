DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS transcriptions;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  isConfirmed BOOLEAN DEFAULT false,
  hashed_password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transcriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  file_name VARCHAR(255) NOT NULL,
  transcript_id VARCHAR(255) NOT NULL,
  transcription TEXT NOT NULL,
  file_recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


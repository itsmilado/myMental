DROP TABLE IF EXISTS transcriptions;


CREATE TABLE transcriptions (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  transcription TEXT NOT NULL,
  file_recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
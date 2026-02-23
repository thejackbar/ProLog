-- ProLog v3.0 Database Schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       TEXT NOT NULL,
    first_name      TEXT,
    last_name       TEXT,
    username        TEXT UNIQUE NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    clinical_role   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id              TEXT NOT NULL,
    case_date               DATE NOT NULL,
    hospital                TEXT,
    clinical_role           TEXT,
    category                TEXT NOT NULL,
    type                    TEXT,
    procedure               TEXT,
    detail                  TEXT,
    obs                     TEXT,
    outcome                 TEXT,
    pregnant                BOOLEAN DEFAULT FALSE,
    complications           JSONB DEFAULT '[]',
    prev_cs                 INTEGER,
    sterilisation           BOOLEAN DEFAULT FALSE,
    pregnancy_check_date    DATE,
    oocyte_data             JSONB,
    et_data                 JSONB,
    extra_data              JSONB,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qualifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    date_obtained   DATE NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospitals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cases_user_id       ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_date           ON cases(case_date DESC);
CREATE INDEX IF NOT EXISTS idx_cases_category       ON cases(category);
CREATE INDEX IF NOT EXISTS idx_cases_preg_check     ON cases(pregnancy_check_date) WHERE pregnancy_check_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quals_user           ON qualifications(user_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_user       ON hospitals(user_id);

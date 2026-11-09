PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS speakers (
    speaker_id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS words (
    word_id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    encoded_word TEXT,
    encoded_filename TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);

CREATE TABLE IF NOT EXISTS audio_records (
    audio_id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id TEXT NOT NULL,
    speaker_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    sample_rate INTEGER,
    duration_seconds REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (word_id) REFERENCES words(word_id) ON DELETE CASCADE,
    FOREIGN KEY (speaker_id) REFERENCES speakers(speaker_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_audio_word ON audio_records(word_id);
CREATE INDEX IF NOT EXISTS idx_audio_speaker ON audio_records(speaker_id);

CREATE TABLE IF NOT EXISTS audio_features (
    feature_id INTEGER PRIMARY KEY AUTOINCREMENT,
    audio_id INTEGER NOT NULL UNIQUE,
    rms_energy REAL,
    peak_amplitude REAL,
    zcr_mean REAL,
    f0_mean_hz REAL,
    f0_voiced_fraction REAL,
    mfcc_mean_json TEXT,
    mfcc_std_json TEXT,
    waveform_json TEXT,
    f0_curve_json TEXT,
    quality_warnings TEXT,
    extracted_at TEXT,
    FOREIGN KEY (audio_id) REFERENCES audio_records(audio_id) ON DELETE CASCADE
);

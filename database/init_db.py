"""Create and populate the VietVoice SQLite database from the repository corpus."""

from __future__ import annotations

import argparse
import csv
import sqlite3
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV = ROOT / "metadata_encoded.csv"
DEFAULT_AUDIO_DIR = ROOT / "metadata"
DEFAULT_DB = Path(__file__).resolve().parent / "vietvoice.db"
DEFAULT_SCHEMA = Path(__file__).resolve().parent / "schema.sql"
EXCLUDED_WORD_IDS = {"W01856", "W01857", "W01858"}


def physical_audio_path(audio_dir: Path, encoded_filename: str) -> Path:
    target = audio_dir / encoded_filename
    if target.exists():
        return target
    stem = Path(encoded_filename).stem.lower()
    if stem in {f"com{number}" for number in range(1, 10)}:
        safe_target = audio_dir / f"{Path(encoded_filename).stem}_audio.wav"
        if safe_target.exists():
            return safe_target
    return target


def read_metadata(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def read_wave_metadata(path: Path) -> dict[str, int | float]:
    with wave.open(str(path), "rb") as audio:
        frame_rate = audio.getframerate()
        frame_count = audio.getnframes()
        return {
            "sample_rate": frame_rate,
            "duration_seconds": frame_count / frame_rate if frame_rate else None,
        }


def create_database(
    csv_path: Path = DEFAULT_CSV,
    audio_dir: Path = DEFAULT_AUDIO_DIR,
    db_path: Path = DEFAULT_DB,
    schema_path: Path = DEFAULT_SCHEMA,
) -> tuple[int, int]:
    if not csv_path.is_file():
        raise FileNotFoundError(f"Metadata CSV not found: {csv_path}")
    if not audio_dir.is_dir():
        raise FileNotFoundError(f"Audio directory not found: {audio_dir}")

    rows = read_metadata(csv_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript(
            """
            DROP TABLE IF EXISTS audio_features;
            DROP TABLE IF EXISTS audio_records;
            DROP TABLE IF EXISTS words;
            DROP TABLE IF EXISTS speakers;
            """
        )
        connection.executescript(schema_path.read_text(encoding="utf-8"))
        connection.execute("DELETE FROM audio_features")
        connection.execute("DELETE FROM audio_records")
        connection.execute("DELETE FROM words")
        connection.execute("DELETE FROM speakers")
        connection.execute(
            """
            INSERT INTO speakers (speaker_id, name)
            VALUES (?, ?)
            """,
            ("S01", "Thành viên 1"),
        )

        audio_count = 0
        for row in rows:
            word_id = row["ID"].strip()
            if word_id in EXCLUDED_WORD_IDS:
                continue
            encoded_filename = row["Ten_File_Ma_Hoa"].strip()
            audio_path = physical_audio_path(audio_dir, encoded_filename)
            connection.execute(
                """
                INSERT INTO words (
                    word_id, word, encoded_word, encoded_filename
                ) VALUES (?, ?, ?, ?)
                """,
                (
                    word_id,
                    row["Từ vựng"].strip(),
                    row["Tu_Ma_Hoa"].strip(),
                    row["Ten_File_Ma_Hoa"].strip(),
                ),
            )

            if not audio_path.is_file():
                continue

            wave_data = read_wave_metadata(audio_path)
            connection.execute(
                """
                INSERT INTO audio_records (
                    word_id, speaker_id, file_path, file_name,
                    sample_rate, duration_seconds
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    word_id,
                    "S01",
                    str(audio_path.relative_to(ROOT)),
                    audio_path.name,
                    wave_data["sample_rate"],
                    wave_data["duration_seconds"],
                ),
            )
            audio_count += 1

        connection.commit()

    return len(rows), audio_count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO_DIR)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()

    word_count, audio_count = create_database(
        csv_path=args.csv,
        audio_dir=args.audio_dir,
        db_path=args.db,
    )
    print(f"SQLite database: {args.db}")
    print(f"Words imported: {word_count}")
    print(f"Audio records imported: {audio_count}")
    print(f"Words without audio: {word_count - audio_count}")


if __name__ == "__main__":
    main()

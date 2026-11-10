"""Extract audio features from the corpus and store them in SQLite."""

from __future__ import annotations

import argparse
import sqlite3
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = Path(__file__).resolve().parent / "vietvoice.db"
FRAME_LENGTH = 1024
HOP_LENGTH = 256


def load_audio(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as audio:
        if audio.getnchannels() != 1 or audio.getsampwidth() != 2:
            raise ValueError("only mono 16-bit WAV is supported")
        samples = np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2")
        return samples.astype(np.float64) / 32768.0, audio.getframerate()


def frame_signal(samples: np.ndarray) -> np.ndarray:
    if samples.size == 0:
        return np.zeros((1, FRAME_LENGTH), dtype=np.float64)
    if samples.size < FRAME_LENGTH:
        samples = np.pad(samples, (0, FRAME_LENGTH - samples.size))
    count = 1 + max(0, (samples.size - FRAME_LENGTH) // HOP_LENGTH)
    frames = np.stack(
        [
            np.pad(
                samples[start : start + FRAME_LENGTH],
                (0, max(0, FRAME_LENGTH - len(samples[start : start + FRAME_LENGTH]))),
            )
            for start in range(0, (count - 1) * HOP_LENGTH + 1, HOP_LENGTH)
        ]
    )
    return frames * np.hanning(FRAME_LENGTH)


def rms_energy(samples: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(samples)))) if samples.size else 0.0


def estimate_f0(frames: np.ndarray, sample_rate: int) -> tuple[np.ndarray, float]:
    min_lag = max(1, int(sample_rate / 500))
    max_lag = min(FRAME_LENGTH - 1, int(sample_rate / 50))
    f0_values = np.full(frames.shape[0], np.nan, dtype=np.float64)
    for index, frame in enumerate(frames):
        energy = np.sqrt(np.mean(frame * frame))
        if energy < 0.01:
            continue
        correlation = np.correlate(frame, frame, mode="full")[FRAME_LENGTH - 1 :]
        correlation[:min_lag] = 0
        lag = int(np.argmax(correlation[: max_lag + 1]))
        if lag > 0 and correlation[lag] >= correlation[0] * 0.2:
            f0_values[index] = sample_rate / lag
    voiced = np.isfinite(f0_values)
    return f0_values, float(np.mean(voiced)) if f0_values.size else 0.0


def extract(samples: np.ndarray, sample_rate: int) -> dict[str, object]:
    frames = frame_signal(samples)
    f0_curve, voiced_fraction = estimate_f0(frames, sample_rate)
    f0_valid = f0_curve[np.isfinite(f0_curve)]
    return {
        "rms_energy": round(rms_energy(samples), 8),
        "f0_mean_hz": round(float(np.mean(f0_valid)), 4) if f0_valid.size else None,
    }


def extract_database(
    db_path: Path = DEFAULT_DB,
) -> tuple[int, int]:
    processed = 0
    failed = 0
    extracted_at = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(db_path) as db:
        rows = db.execute("SELECT audio_id, file_path FROM audio_records ORDER BY audio_id").fetchall()
        db.execute("DELETE FROM audio_features")
        for audio_id, relative_path in rows:
            try:
                samples, sample_rate = load_audio(ROOT / relative_path)
                features = extract(samples, sample_rate)
                db.execute(
                    """
                    INSERT INTO audio_features (
                        audio_id, rms_energy, f0_mean_hz, extracted_at
                    ) VALUES (?, ?, ?, ?)
                    """,
                    (
                        audio_id,
                        features["rms_energy"],
                        features["f0_mean_hz"],
                        extracted_at,
                    ),
                )
                processed += 1
            except (OSError, ValueError):
                failed += 1
        db.commit()
    return processed, failed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    processed, failed = extract_database(args.db)
    print(f"Features extracted: {processed}")
    print(f"Files failed: {failed}")


if __name__ == "__main__":
    main()

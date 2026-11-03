"""Extract audio features from the corpus and store them in SQLite."""

from __future__ import annotations

import argparse
import json
import math
import sqlite3
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from scipy.fftpack import dct


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = Path(__file__).resolve().parent / "vietvoice.db"
DEFAULT_SAMPLE_POINTS = 200
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


def downsample(values: np.ndarray, points: int) -> list[float]:
    if values.size == 0:
        return []
    indexes = np.linspace(0, values.size - 1, min(points, values.size)).astype(int)
    return [round(float(values[index]), 6) for index in indexes]


def rms_energy(samples: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(samples)))) if samples.size else 0.0


def zero_crossing_rate(frames: np.ndarray) -> float:
    crossings = np.sum(np.diff(np.signbit(frames), axis=1), axis=1)
    return float(np.mean(crossings / frames.shape[1]))


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


def mel_filterbank(sample_rate: int, fft_bins: int, filters: int = 26) -> np.ndarray:
    def hz_to_mel(hz: float) -> float:
        return 2595 * math.log10(1 + hz / 700)

    def mel_to_hz(mel: float) -> float:
        return 700 * (10 ** (mel / 2595) - 1)

    mel_points = np.linspace(hz_to_mel(20), hz_to_mel(sample_rate / 2), filters + 2)
    bins = np.floor((fft_bins - 1) * mel_to_hz(mel_points) / (sample_rate / 2)).astype(int)
    bank = np.zeros((filters, fft_bins))
    for index in range(filters):
        left, center, right = bins[index : index + 3]
        if center > left:
            bank[index, left:center] = np.arange(left, center) / (center - left)
        if right > center:
            bank[index, center:right] = (right - np.arange(center, right)) / (right - center)
    return bank


def mfcc(frames: np.ndarray, sample_rate: int) -> tuple[list[float], list[float]]:
    spectrum = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    bank = mel_filterbank(sample_rate, spectrum.shape[1])
    log_mel = np.log(np.maximum(spectrum @ bank.T, 1e-10))
    coefficients = dct(log_mel, type=2, axis=1, norm="ortho")[:, :13]
    return downsample(coefficients.mean(axis=0), 13), downsample(coefficients.std(axis=0), 13)


def extract(samples: np.ndarray, sample_rate: int, sample_points: int) -> dict[str, object]:
    frames = frame_signal(samples)
    f0_curve, voiced_fraction = estimate_f0(frames, sample_rate)
    f0_valid = f0_curve[np.isfinite(f0_curve)]
    warnings = []
    if not f0_valid.size:
        warnings.append("f0_unvoiced_or_not_detected")
    if np.max(np.abs(samples), initial=0) >= 0.99:
        warnings.append("possible_clipping")
    return {
        "rms_energy": round(rms_energy(samples), 8),
        "peak_amplitude": round(float(np.max(np.abs(samples), initial=0)), 8),
        "zcr_mean": round(zero_crossing_rate(frames), 8),
        "f0_mean_hz": round(float(np.mean(f0_valid)), 4) if f0_valid.size else None,
        "f0_voiced_fraction": round(voiced_fraction, 8),
        "mfcc_mean_json": json.dumps(mfcc(frames, sample_rate)[0], separators=(",", ":")),
        "mfcc_std_json": json.dumps(mfcc(frames, sample_rate)[1], separators=(",", ":")),
        "waveform_json": json.dumps(downsample(samples, sample_points), separators=(",", ":")),
        "f0_curve_json": json.dumps(
            [round(float(value), 4) if np.isfinite(value) else None for value in downsample(f0_curve, sample_points)],
            separators=(",", ":"),
        ),
        "quality_warnings": ";".join(warnings) or None,
    }


def extract_database(
    db_path: Path = DEFAULT_DB,
    sample_points: int = DEFAULT_SAMPLE_POINTS,
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
                features = extract(samples, sample_rate, sample_points)
                db.execute(
                    """
                    INSERT INTO audio_features (
                        audio_id, rms_energy, peak_amplitude, zcr_mean,
                        f0_mean_hz, f0_voiced_fraction, mfcc_mean_json,
                        mfcc_std_json, waveform_json, f0_curve_json,
                        quality_warnings, extracted_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        audio_id,
                        features["rms_energy"],
                        features["peak_amplitude"],
                        features["zcr_mean"],
                        features["f0_mean_hz"],
                        features["f0_voiced_fraction"],
                        features["mfcc_mean_json"],
                        features["mfcc_std_json"],
                        features["waveform_json"],
                        features["f0_curve_json"],
                        features["quality_warnings"],
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
    parser.add_argument("--sample-points", type=int, default=DEFAULT_SAMPLE_POINTS)
    args = parser.parse_args()
    processed, failed = extract_database(args.db, args.sample_points)
    print(f"Features extracted: {processed}")
    print(f"Files failed: {failed}")


if __name__ == "__main__":
    main()

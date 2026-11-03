from __future__ import annotations

import base64
import io
import math
import re
import sqlite3
import wave
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parent.parent
DATABASE_PATH = ROOT / "database" / "vietvoice.db"

app = FastAPI(title="VietVoice TTS API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CheckRequest(BaseModel):
    text: str = Field(min_length=1)


class SynthesizeRequest(CheckRequest):
    word_pause_ms: int = Field(default=120, ge=0, le=2000)
    use_trimmed: bool = True
    use_rms_norm: bool = True
    crossfade_ms: float = Field(default=10.0, ge=0, le=100)
    speaker_id: str = "S01"


def connection() -> sqlite3.Connection:
    if not DATABASE_PATH.is_file():
        raise RuntimeError(f"SQLite database not found: {DATABASE_PATH}")
    db = sqlite3.connect(DATABASE_PATH)
    db.row_factory = sqlite3.Row
    return db


def tokenize(text: str) -> list[tuple[str, str]]:
    return [
        ("punct" if not token.isalnum() else "word", token)
        for token in re.findall(r"[^\W_]+|[^\w\s]", text, flags=re.UNICODE)
    ]


def word_rows(words: list[str], speaker_id: str = "S01") -> list[sqlite3.Row | None]:
    if not words:
        return []
    placeholders = ",".join("?" for _ in words)
    with connection() as db:
        rows = db.execute(
            f"""
            SELECT w.word_id, w.word, a.file_path, a.file_name,
                   a.sample_rate, a.channels, a.sample_width_bytes,
                   a.duration_seconds
            FROM words w
            LEFT JOIN audio_records a
              ON a.word_id = w.word_id AND a.speaker_id = ?
            WHERE w.word IN ({placeholders})
            """,
            [speaker_id, *words],
        ).fetchall()
    by_word = {row["word"]: row for row in rows}
    return [by_word.get(word) for word in words]


def check_tokens(text: str) -> list[dict[str, Any]]:
    pairs = tokenize(text)
    words = [token for kind, token in pairs if kind == "word"]
    rows = word_rows(words)
    row_index = iter(rows)
    result = []
    for kind, token in pairs:
        if kind == "punct":
            result.append({"token": token, "type": "punct", "available": True})
            continue
        row = next(row_index)
        result.append(
            {
                "token": token,
                "type": "word",
                "available": row is not None and row["file_path"] is not None,
                "word_id": row["word_id"] if row else None,
            }
        )
    return result


def pcm_samples(audio: wave.Wave_read) -> list[int]:
    if audio.getsampwidth() != 2 or audio.getnchannels() != 1:
        raise ValueError("Only mono 16-bit WAV files are supported")
    raw = audio.readframes(audio.getnframes())
    return [int.from_bytes(raw[i : i + 2], "little", signed=True) for i in range(0, len(raw), 2)]


def trim_samples(samples: list[int], threshold: int = 500) -> list[int]:
    non_silent = [index for index, value in enumerate(samples) if abs(value) >= threshold]
    if not non_silent:
        return samples
    return samples[non_silent[0] : non_silent[-1] + 1]


def normalize_samples(samples: list[int]) -> list[int]:
    peak = max((abs(value) for value in samples), default=0)
    if peak == 0:
        return samples
    scale = min(1.0, 28000 / peak)
    return [max(-32768, min(32767, round(value * scale))) for value in samples]


def read_audio(path: Path, use_trimmed: bool, use_rms_norm: bool) -> tuple[list[int], int]:
    with wave.open(str(path), "rb") as audio:
        sample_rate = audio.getframerate()
        samples = pcm_samples(audio)
    if use_trimmed:
        samples = trim_samples(samples)
    if use_rms_norm:
        samples = normalize_samples(samples)
    return samples, sample_rate


def encode_wav(samples: list[int], sample_rate: int) -> str:
    raw = b"".join(value.to_bytes(2, "little", signed=True) for value in samples)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        audio.writeframes(raw)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:audio/wav;base64,{encoded}"


def concatenate(
    audio_rows: list[sqlite3.Row],
    request: SynthesizeRequest,
) -> tuple[list[int], int, list[dict[str, Any]]]:
    output: list[int] = []
    timeline = []
    sample_rate: int | None = None
    pause_samples = 0
    current_time = 0.0

    for index, row in enumerate(audio_rows):
        samples, row_rate = read_audio(
            ROOT / row["file_path"],
            request.use_trimmed,
            request.use_rms_norm,
        )
        if sample_rate is None:
            sample_rate = row_rate
            pause_samples = round(request.word_pause_ms * sample_rate / 1000)
        if row_rate != sample_rate:
            raise ValueError("Audio files use different sample rates")

        if index and pause_samples:
            output.extend([0] * pause_samples)
            current_time += pause_samples / sample_rate
        start = current_time
        overlap = round(request.crossfade_ms * sample_rate / 1000)
        overlap = min(overlap, len(output), len(samples))
        if overlap and index:
            base_start = len(output) - overlap
            for offset in range(overlap):
                fade_in = (offset + 1) / overlap
                fade_out = 1.0 - fade_in
                output[base_start + offset] = round(
                    output[base_start + offset] * fade_out
                    + samples[offset] * fade_in
                )
            output.extend(samples[overlap:])
        else:
            output.extend(samples)
        duration = len(samples) / sample_rate
        timeline.append(
            {
                "word": row["word"],
                "word_id": row["word_id"],
                "start": round(start, 4),
                "duration": round(duration, 4),
            }
        )
        current_time += duration

    if sample_rate is None:
        raise ValueError("No audio records to concatenate")
    return output, sample_rate, timeline


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/stats")
def stats() -> dict[str, int]:
    with connection() as db:
        result = db.execute(
            """
            SELECT COUNT(*) AS total_words,
                   COUNT(a.audio_id) AS words_with_audio
            FROM words w
            LEFT JOIN audio_records a ON a.word_id = w.word_id
            """
        ).fetchone()
    return {
        "total_words": result["total_words"],
        "words_with_audio": result["words_with_audio"],
        "features_count": 0,
    }


@app.get("/api/samples")
def samples() -> list[dict[str, Any]]:
    return [
        {
            "category": "Câu mẫu",
            "items": [
                {"text": "a", "desc": "Một từ có audio trong corpus"},
                {"text": "ba", "desc": "Một từ có audio trong corpus"},
                {"text": "bán bánh", "desc": "Chuỗi từ ghép nối"},
            ],
        }
    ]


@app.post("/api/tts/check")
def check(request: CheckRequest) -> dict[str, Any]:
    return {"tokens": check_tokens(request.text)}


@app.post("/api/tts/synthesize")
def synthesize(request: SynthesizeRequest) -> dict[str, Any]:
    tokens = check_tokens(request.text)
    missing = [token["token"] for token in tokens if token["type"] == "word" and not token["available"]]
    if missing:
        return {
            "success": False,
            "error": "Một hoặc nhiều từ chưa có file audio",
            "missing_words": missing,
        }

    rows = [row for row in word_rows([token["token"] for token in tokens if token["type"] == "word"]) if row]
    try:
        samples_data, sample_rate, timeline = concatenate(rows, request)
    except (OSError, ValueError) as error:
        return {"success": False, "error": str(error)}
    duration = len(samples_data) / sample_rate
    return {
        "success": True,
        "data_uri": encode_wav(samples_data, sample_rate),
        "meta": {
            "sample_rate": sample_rate,
            "duration": round(duration, 4),
            "total_words": len(rows),
            "timeline": timeline,
        },
    }


@app.get("/api/words")
def words(
    q: str = "",
    filter_status: str = Query(default="audio", pattern="^(all|audio|missing)$"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    where = ["(w.word LIKE ? OR w.word_id LIKE ?)"]
    params: list[Any] = [f"%{q}%", f"%{q}%"]
    if filter_status == "audio":
        where.append("a.audio_id IS NOT NULL")
    elif filter_status == "missing":
        where.append("a.audio_id IS NULL")
    clause = " AND ".join(where)
    with connection() as db:
        total = db.execute(
            f"SELECT COUNT(*) FROM words w LEFT JOIN audio_records a ON a.word_id = w.word_id WHERE {clause}",
            params,
        ).fetchone()[0]
        rows = db.execute(
            f"""
            SELECT w.word_id, w.word, a.speaker_id, a.duration_seconds AS duration,
                   a.sample_rate, af.rms_energy, af.f0_mean_hz,
                   CASE WHEN a.audio_id IS NOT NULL THEN 1 ELSE 0 END AS has_audio
            FROM words w
            LEFT JOIN audio_records a ON a.word_id = w.word_id
            LEFT JOIN audio_features af ON af.audio_id = a.audio_id
            WHERE {clause}
            ORDER BY w.word_id
            LIMIT ? OFFSET ?
            """,
            [*params, limit, (page - 1) * limit],
        ).fetchall()
    total_pages = max(1, math.ceil(total / limit))
    return {
        "items": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@app.get("/api/features/{word_id}")
def features(word_id: str) -> dict[str, Any]:
    with connection() as db:
        row = db.execute(
            """
            SELECT w.word, w.word_id, a.duration_seconds AS duration,
                   a.sample_rate, af.*
            FROM words w
            LEFT JOIN audio_records a ON a.word_id = w.word_id
            LEFT JOIN audio_features af ON af.audio_id = a.audio_id
            WHERE w.word_id = ?
            """,
            (word_id.upper(),),
        ).fetchone()
    if row is None or row["audio_id"] is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy từ hoặc từ chưa có file thu âm.",
        )
    return {
        "word": row["word"],
        "word_id": row["word_id"],
        "duration": row["duration"],
        "sample_rate": row["sample_rate"],
        "rms_energy": row["rms_energy"],
        "peak_amplitude": row["peak_amplitude"],
        "zcr_mean": row["zcr_mean"],
        "f0_mean_hz": row["f0_mean_hz"],
        "f0_voiced_fraction": row["f0_voiced_fraction"] or 0,
        "mfcc_mean": [],
        "mfcc_std": [],
        "waveform": [],
        "f0_curve": [],
        "quality_warnings": row["quality_warnings"],
    }

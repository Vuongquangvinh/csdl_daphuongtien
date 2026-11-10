from __future__ import annotations

import base64
import io
import json
import math
import re
import sqlite3
import unicodedata
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


def normalize_word(word: str) -> str:
    return unicodedata.normalize("NFC", word).casefold()


def encode_word(word: str) -> str:
    """Encode a Vietnamese word using the corpus filename convention."""
    normalized = normalize_word(word)
    tone_marks = {
        "\u0301": "1",
        "\u0300": "2",
        "\u0309": "3",
        "\u0303": "4",
        "\u0323": "5",
    }
    structural_marks = {
        "\u0306": "breve",
        "\u0302": "circumflex",
        "\u031b": "horn",
        "\u0335": "stroke",
    }
    structural_replacements = {
        ("a", "breve"): "aa",
        ("a", "circumflex"): "a+",
        ("e", "circumflex"): "e+",
        ("o", "circumflex"): "o+",
        ("o", "horn"): "oo",
        ("u", "horn"): "uu",
        ("d", "stroke"): "d-",
    }
    direct_replacements = {"đ": "d-", "Đ": "d-"}
    tone = "0"
    letters: list[str] = []
    decomposed = unicodedata.normalize("NFD", normalized)
    index = 0
    while index < len(decomposed):
        character = decomposed[index]
        if unicodedata.category(character) == "Mn":
            index += 1
            continue
        base = character
        marks: list[str] = []
        index += 1
        while index < len(decomposed) and unicodedata.category(decomposed[index]) == "Mn":
            marks.append(decomposed[index])
            index += 1
        for mark in marks:
            if mark in tone_marks:
                tone = tone_marks[mark]
        structural = next(
            (structural_marks[mark] for mark in marks if mark in structural_marks),
            None,
        )
        letters.append(
            direct_replacements.get(
                base,
                structural_replacements.get((base, structural), base),
            )
        )
    return "".join(letters) + tone


def word_rows(words: list[str], speaker_id: str = "S01") -> list[sqlite3.Row | None]:
    if not words:
        return []
    encoded_words = [encode_word(word) for word in words]
    placeholders = ",".join("?" for _ in encoded_words)
    with connection() as db:
        rows = db.execute(
            f"""
            SELECT w.word_id, w.word, w.encoded_word, a.file_path, a.file_name,
                   w.encoded_filename,
                   a.sample_rate,
                   a.duration_seconds
            FROM words w
            LEFT JOIN audio_records a
              ON a.word_id = w.word_id AND a.speaker_id = ?
            WHERE w.encoded_word IN ({placeholders})
            """,
            [speaker_id, *encoded_words],
        ).fetchall()
    by_encoded_word = {row["encoded_word"]: row for row in rows}
    return [by_encoded_word.get(encoded_word) for encoded_word in encoded_words]


def resolve_word(token: str, speaker_id: str = "S01") -> tuple[list[sqlite3.Row], bool, list[str]]:
    direct_row = word_rows([token], speaker_id)[0]
    if direct_row is not None and direct_row["file_path"] is not None:
        return [direct_row], False, []

    characters = list(normalize_word(token))
    character_rows = word_rows(characters, speaker_id)
    missing = [
        character
        for character, row in zip(characters, character_rows)
        if row is None or row["file_path"] is None
    ]
    if missing:
        return [], True, missing
    return [row for row in character_rows if row is not None], True, []


def check_tokens(text: str, speaker_id: str = "S01") -> list[dict[str, Any]]:
    pairs = tokenize(text)
    result = []
    for kind, token in pairs:
        if kind == "punct":
            result.append({"token": token, "type": "punct", "available": True})
            continue
        rows, fallback, missing_characters = resolve_word(token, speaker_id)
        row = rows[0] if rows else None
        result.append(
            {
                "token": token,
                "type": "word",
                "available": bool(rows) and not missing_characters,
                "word_id": row["word_id"] if row else None,
                "encoded_word": row["encoded_word"] if row else encode_word(token),
                "encoded_filename": row["encoded_filename"] if row else None,
                "fallback_spelling": fallback,
                "spelling": [character for character in normalize_word(token)] if fallback else [],
                "missing_characters": missing_characters,
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


def normalize_samples(samples: list[int], target_rms: float = 9000.0) -> list[int]:
    if not samples:
        return samples
    rms = math.sqrt(sum(value * value for value in samples) / len(samples))
    if rms == 0:
        return samples
    peak = max((abs(value) for value in samples), default=0)
    if peak == 0:
        return samples
    scale = target_rms / rms
    scale = min(scale, 30000 / peak)
    return [max(-32768, min(32767, round(value * scale))) for value in samples]


def limit_peak(samples: list[int], maximum: int = 30000) -> list[int]:
    peak = max((abs(value) for value in samples), default=0)
    if peak <= maximum or peak == 0:
        return samples
    scale = maximum / peak
    return [round(value * scale) for value in samples]


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
                   COUNT(DISTINCT a.audio_id) AS words_with_audio,
                   COUNT(DISTINCT af.feature_id) AS features_count
            FROM words w
            LEFT JOIN audio_records a ON a.word_id = w.word_id
            LEFT JOIN audio_features af ON af.audio_id = a.audio_id
            """
        ).fetchone()
    return {
        "total_words": result["total_words"],
        "words_with_audio": result["words_with_audio"],
        "features_count": result["features_count"],
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
    tokens = check_tokens(request.text, request.speaker_id)
    missing = [
        token["token"]
        for token in tokens
        if token["type"] == "word" and not token["available"]
    ]
    if missing:
        return {
            "success": False,
            "error": "Một hoặc nhiều từ chưa có file audio",
            "missing_words": missing,
        }

    rows = []
    for token in tokens:
        if token["type"] != "word":
            continue
        token_rows, _, _ = resolve_word(token["token"], request.speaker_id)
        rows.extend(token_rows)
    try:
        samples_data, sample_rate, timeline = concatenate(rows, request)
    except (OSError, ValueError) as error:
        return {"success": False, "error": str(error)}
    samples_data = limit_peak(samples_data)
    duration = len(samples_data) / sample_rate
    return {
        "success": True,
        "data_uri": encode_wav(samples_data, sample_rate),
        "meta": {
            "sample_rate": sample_rate,
            "duration": round(duration, 4),
            "total_words": sum(token["type"] == "word" for token in tokens),
            "total_units": len(rows),
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
    with connection() as db:
        rows = db.execute(
            """
            SELECT w.word_id, w.word, w.encoded_filename, a.speaker_id,
                   a.duration_seconds AS duration,
                   a.sample_rate, af.rms_energy, af.f0_mean_hz,
                   CASE WHEN a.audio_id IS NOT NULL THEN 1 ELSE 0 END AS has_audio
            FROM words w
            LEFT JOIN audio_records a ON a.word_id = w.word_id
            LEFT JOIN audio_features af ON af.audio_id = a.audio_id
            ORDER BY w.word_id
            """
        ).fetchall()
    normalized_query = normalize_word(q.strip()) if q.strip() else ""
    filtered_rows = [
        row
        for row in rows
        if (
            not normalized_query
            or normalized_query in normalize_word(row["word"])
            or normalized_query in normalize_word(row["word_id"])
            or normalized_query in normalize_word(row["encoded_filename"])
        )
        and (
            filter_status == "all"
            or (filter_status == "audio" and row["has_audio"])
            or (filter_status == "missing" and not row["has_audio"])
        )
    ]
    total = len(filtered_rows)
    start = (page - 1) * limit
    page_rows = filtered_rows[start : start + limit]
    total_pages = max(1, math.ceil(total / limit))
    return {
        "items": [dict(row) for row in page_rows],
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
            SELECT w.word, w.word_id, w.encoded_filename,
                   a.duration_seconds AS duration,
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
        "encoded_filename": row["encoded_filename"],
        "duration": row["duration"],
        "sample_rate": row["sample_rate"],
        "rms_energy": row["rms_energy"],
        "f0_mean_hz": row["f0_mean_hz"],
    }

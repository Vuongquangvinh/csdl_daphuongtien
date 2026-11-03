"""Rename corpus audio files from Wxxxxx.wav to the CSV encoded filenames."""

from __future__ import annotations

import argparse
import csv
import os
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV = ROOT / "metadata_encoded.csv"
DEFAULT_AUDIO_DIR = ROOT / "metadata"


def safe_target_path(audio_dir: Path, encoded_filename: str) -> Path:
    target = audio_dir / encoded_filename
    stem = Path(encoded_filename).stem.lower()
    if stem in {f"com{number}" for number in range(1, 10)}:
        return audio_dir / f"{Path(encoded_filename).stem}_audio.wav"
    return target


def load_mapping(csv_path: Path, audio_dir: Path) -> list[tuple[Path, Path]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))

    mappings = []
    for row in rows:
        source = audio_dir / f"{row['ID'].strip()}.wav"
        target = safe_target_path(audio_dir, row["Ten_File_Ma_Hoa"].strip())
        if source.is_file():
            mappings.append((source, target))

    targets = [target for _, target in mappings]
    if len(targets) != len(set(targets)):
        raise ValueError("Duplicate encoded target filenames found for existing audio")

    missing = [target for _, target in mappings if target.exists() and target not in {source for source, _ in mappings}]
    if missing:
        raise FileExistsError(f"Target files already exist and are not part of the rename: {missing[:3]}")

    return mappings


def rename_audio_files(
    csv_path: Path = DEFAULT_CSV,
    audio_dir: Path = DEFAULT_AUDIO_DIR,
) -> int:
    mappings = load_mapping(csv_path, audio_dir)
    temporary_mappings = [
        (source, audio_dir / f".rename-{uuid.uuid4().hex}-{source.name}")
        for source, _ in mappings
    ]

    for source, temporary in temporary_mappings:
        os.replace(source, temporary)

    for (_, target), (_, temporary) in zip(mappings, temporary_mappings):
        os.replace(temporary, target)

    return len(mappings)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO_DIR)
    args = parser.parse_args()

    count = rename_audio_files(args.csv, args.audio_dir)
    print(f"Renamed audio files: {count}")


if __name__ == "__main__":
    main()

import os
os.environ['MPLCONFIGDIR'] = os.path.abspath('report_latex/figures')
import matplotlib.pyplot as plt
import numpy as np
import wave
import json
import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from database.extract_features import load_audio, frame_signal, estimate_f0, mfcc, rms_energy

def generate_dsp_plot():
    audio_path = ROOT / "metadata" / "a0.wav"
    samples, sr = load_audio(audio_path)
    duration = len(samples) / sr
    time_axis = np.linspace(0, duration, len(samples))
    frames = frame_signal(samples)
    f0_curve, _ = estimate_f0(frames, sr)
    f0_time = np.linspace(0, duration, len(f0_curve))
    mfcc_mean, mfcc_std = mfcc(frames, sr)

    fig, axs = plt.subplots(3, 1, figsize=(8, 6.5))
    plt.subplots_adjust(hspace=0.45)

    # (a) Waveform
    axs[0].plot(time_axis, samples, color='#005baa', lw=1)
    axs[0].set_title('(a) Tín hiệu dạng sóng (Waveform) - Từ "a" (tệp a0.wav)', fontsize=10, fontweight='bold', pad=4)
    axs[0].set_ylabel('Biên độ PCM', fontsize=9)
    axs[0].set_xlabel('Thời gian (giây)', fontsize=9)
    axs[0].grid(True, ls='--', alpha=0.5)

    # (b) F0 Pitch contour
    axs[1].plot(f0_time, f0_curve, 'ro-', ms=3, lw=1.2, label='Đường cong F0 (Pitch)')
    axs[1].set_title('(b) Đường cong cao độ F0 ước lượng bằng tự tương quan', fontsize=10, fontweight='bold', pad=4)
    axs[1].set_ylabel('Tần số F0 (Hz)', fontsize=9)
    axs[1].set_xlabel('Thời gian (giây)', fontsize=9)
    axs[1].set_ylim(80, 220)
    axs[1].grid(True, ls='--', alpha=0.5)
    axs[1].legend(loc='upper right', fontsize=8)

    # (c) MFCC 13 Coefficients
    axs[2].bar(range(1, 14), mfcc_mean, yerr=mfcc_std, capsize=3, color='#e67e22', edgecolor='#b95e0b', alpha=0.85)
    axs[2].set_title('(c) 13 Hệ số đặc trưng Mel-Frequency Cepstral Coefficients (MFCCs)', fontsize=10, fontweight='bold', pad=4)
    axs[2].set_ylabel('Giá trị năng lượng phổ', fontsize=9)
    axs[2].set_xlabel('Chỉ số hệ số MFCC (1 - 13)', fontsize=9)
    axs[2].set_xticks(range(1, 14))
    axs[2].grid(True, ls='--', alpha=0.5, axis='y')

    plt.tight_layout()
    out_file = ROOT / "report_latex" / "figures" / "fig_dsp_analysis.png"
    plt.savefig(out_file, dpi=300)
    plt.close()
    print(f"Generated {out_file} successfully!")

if __name__ == "__main__":
    generate_dsp_plot()


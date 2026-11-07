"""Mix the film's sound: narration + a soft synthesized tune (ducked under the
voice) + marker scribbles timed to the pen + whooshes on camera pans."""
import json, subprocess, sys, wave
import numpy as np

L = sys.argv[1]
SR = 48000
F = json.load(open(f"film-{L}.json"))
T = F["TOTAL"]
N = int(T * SR) + SR
rng = np.random.default_rng(11)


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def bandpass(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


# ---- voice ----
voice = np.zeros(N, np.float32)
for s in F["scenes"]:
    a = load(f"vo/{s['id']}.mp3")
    i = int(s["start"] * SR)
    voice[i:i + len(a)] += a[: N - i]
voice *= 0.95 / max(1e-6, np.abs(voice).max())

# ---- music ----
bpm = 96
beat = 60 / bpm
t = np.arange(N) / SR
music = np.zeros(N, np.float32)
A4 = 440.0


def hz(n):
    return A4 * 2 ** ((n - 69) / 12)


chords = [[60, 64, 67], [55, 59, 62, 67], [57, 60, 64], [53, 57, 60, 65]]  # C G Am F
bass = [36, 43, 45, 41]


def pluck(freq, dur, amp):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    env = np.exp(-tt * 4.2) * np.minimum(1, tt / 0.004)
    w = np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(4 * np.pi * freq * tt) + 0.12 * np.sin(6 * np.pi * freq * tt)
    return (w * env * amp).astype(np.float32)


def add(buf, i, x):
    if i >= len(buf):
        return
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += x


bars = int(T / (4 * beat)) + 2
end_t = T - 2.4
for b in range(bars):
    bt = b * 4 * beat
    if bt > end_t:
        break
    ch = chords[b % 4]
    # pad
    n = int(4 * beat * SR)
    tt = np.arange(n) / SR
    env = np.minimum(1, tt / 0.5) * np.minimum(1, (4 * beat - tt) / 0.5)
    pad = sum(np.sin(2 * np.pi * hz(m) * tt + k) for k, m in enumerate(ch)) * env * 0.045
    add(music, int(bt * SR), pad.astype(np.float32))
    # bass
    add(music, int(bt * SR), pluck(hz(bass[b % 4]), 2.0, 0.22))
    add(music, int((bt + 2 * beat) * SR), pluck(hz(bass[b % 4]), 1.6, 0.14))
    # arpeggio in eighths
    pat = [0, 1, 2, 1, 2, 3 % len(ch), 1, 2]
    for k, pi in enumerate(pat):
        m = ch[pi % len(ch)] + 12
        if b < 1 and k < 4:  # gentle start
            continue
        add(music, int((bt + k * beat / 2) * SR), pluck(hz(m), 0.9, 0.08 if k % 2 == 0 else 0.055))
    # shaker on off-beats
    for k in range(4):
        sh = rng.standard_normal(int(0.06 * SR)).astype(np.float32)
        sh *= np.exp(-np.arange(len(sh)) / SR * 60)
        add(music, int((bt + (k + 0.5) * beat) * SR), sh * 0.012)
# final chord
fc = int(end_t * SR)
for m in [48, 60, 64, 67, 72]:
    add(music, fc, pluck(hz(m), 2.6, 0.12))
music = bandpass(music, 40, 9000).astype(np.float32)

# duck under the voice
env = np.abs(voice)
k = int(0.25 * SR)
env = np.convolve(env, np.ones(k) / k, mode="same")
speaking = np.clip(env / 0.02, 0, 1)
k2 = int(0.4 * SR)
speaking = np.convolve(speaking, np.ones(k2) / k2, mode="same")
gain = 0.55 - 0.33 * speaking
fade = np.minimum(1, t / 0.6)
music *= gain * fade

# ---- scribbles ----
sfx = np.zeros(N, np.float32)
noise = rng.standard_normal(N).astype(np.float32)
hiss_w = bandpass(noise, 2500, 7000)
hiss_d = bandpass(noise, 1200, 4500)
hiss_w /= np.abs(hiss_w).max()
hiss_d /= np.abs(hiss_d).max()
for e in F["events"]:
    i0, i1 = int(e["t0"] * SR), int(e["t1"] * SR)
    if i1 <= i0 or i0 >= N:
        continue
    n = i1 - i0
    tt = np.arange(n) / SR
    rate = rng.uniform(7, 11) if e["k"] == "write" else rng.uniform(3, 5)
    am = np.abs(np.sin(2 * np.pi * rate * tt + rng.uniform(0, 3))) ** 1.5
    edge = np.minimum(1, np.minimum(tt / 0.03, (n / SR - tt) / 0.04))
    src = hiss_w if e["k"] == "write" else hiss_d
    sfx[i0:i1] += src[i0:i1] * am * edge * 0.05
    # tap as the pen lands
    tap = rng.standard_normal(int(0.025 * SR)).astype(np.float32) * np.exp(-np.arange(int(0.025 * SR)) / SR * 220)
    add(sfx, i0, tap * 0.04)
# whooshes on pans
for s in F["scenes"][1:]:
    a = s["start"] - 0.62
    n = int(0.75 * SR)
    i = int(a * SR)
    tt = np.arange(n) / SR
    env_ = np.sin(np.pi * tt / 0.75) ** 2
    add(sfx, i, (bandpass(rng.standard_normal(n).astype(np.float32), 300, 2500) * env_ * 0.09).astype(np.float32))

mix = voice + music + sfx
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix[: int(T * SR)]
out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(f"mix-{L}.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("ok", L, len(out) / SR)

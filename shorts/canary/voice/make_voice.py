"""Synthetic PLACEHOLDER voice for the 20 s test (espeak-ng), plus words.json word timings.
Each beat is synthesized as one phrase (natural prosody); word times inside a phrase are estimated by
synthesizing every word alone and scaling those durations to the phrase length. Replace voice.wav + words.json
with a real recording later; everything downstream is timed from words.json."""
import json, subprocess, wave, os, re, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
SR = 22050
VOICE, SPEED, PITCH = "en-us+m3", 205, 38
BEATS = [  # (start s, text)  -- starts follow SCRIPT.md; a phrase may run late, the next starts after it
    (0.15, "Miners trusted their lives to a bird the size of a fist."),
    (3.65, "Owen carries a canary into the mine."),
    (6.35, "The crew laughs. Brought your pet?"),
    (8.25, "The air smells fine."),
    (9.65, "Then the singing stops... and the bird drops."),
    (11.85, "You see, the gas has no smell."),
    (13.75, "A tiny, fast-breathing bird fills up first, like a teacup before the bucket."),
    (17.0, "The only one on the shift with its own oxygen tank? The canary."),
]
TOTAL = 20.0

def synth(text, speed=SPEED):
    raw = subprocess.run(["espeak-ng", "-v", VOICE, "-s", str(speed), "-p", str(PITCH), "-g", "1", "--stdout", text], capture_output=True, check=True).stdout
    path = os.path.join(HERE, "_tmp.wav"); open(path, "wb").write(raw)
    with wave.open(path) as w: a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    os.remove(path)
    nz = np.flatnonzero(np.abs(a) > 0.01)            # trim silence
    return a[nz[0]: nz[-1] + 1] if len(nz) else a

out = np.zeros(int(TOTAL * SR) + 4 * SR, np.float32)
words, cursor = [], 0.0
FAST = {"A tiny": 240, "The only": 248}
for start, text in BEATS:
    t0 = max(start, cursor + 0.12)
    sp = next((v for k, v in FAST.items() if text.startswith(k)), SPEED)
    a = synth(text, sp)
    toks = re.findall(r"[A-Za-z'\-]+[^\sA-Za-z'\-]*", text)
    lens = np.array([len(synth(re.sub(r"[^A-Za-z'\- ]", "", w), sp)) for w in toks], float)
    lens *= len(a) / lens.sum()
    t = t0
    for w, n in zip(toks, lens):
        d = n / SR
        words.append({"w": re.sub(r"[^A-Za-z'\-]", "", w), "start": round(t, 3), "end": round(t + d, 3)})
        t += d
    i = int(t0 * SR); out[i: i + len(a)] += a
    cursor = t0 + len(a) / SR
    print(f"{t0:6.2f}-{cursor:6.2f}  {text}")
if cursor > TOTAL - 0.12: sys.exit(f"voice too long: ends {cursor:.2f}s, raise SPEED")
out = out[: int(TOTAL * SR)]
out = np.clip(out / max(1e-6, np.abs(out).max()) * 0.89, -1, 1)
with wave.open(os.path.join(HERE, "voice.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
json.dump(words, open(os.path.join(HERE, "words.json"), "w"), indent=0)
print(len(words), "words, last ends", words[-1]["end"])

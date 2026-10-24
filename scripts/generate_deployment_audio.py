"""Generate the original, sample-free CC0 8-second deployment sting."""
from pathlib import Path
import wave
import math
import struct

output = Path(__file__).resolve().parents[1] / 'public/assets/audio/deployment-original.wav'
output.parent.mkdir(parents=True, exist_ok=True)
rate, duration = 22050, 8
notes = [146.832, 174.614, 220, 293.665, 261.626, 220, 174.614, 130.813]
with wave.open(str(output), 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(rate)
    frames = bytearray()
    for i in range(rate * duration):
        t = i / rate
        step, phase = int(t * 4), (t * 4) % 1
        frequency = notes[step % 8]
        envelope = min(1, phase * 30) * math.exp(-phase * 4) * min(1, (duration - t) / .8)
        tone = (math.sin(2 * math.pi * frequency * t) + .3 * math.sin(4 * math.pi * frequency * t)) * .19 * envelope
        beat = t % .5
        kick = .3 * math.sin(2 * math.pi * (48 * beat + 1.4 * (1 - math.exp(-35 * beat)))) * math.exp(-beat * 22)
        frames += struct.pack('<h', int(max(-1, min(1, tone + kick)) * 22000))
    wav.writeframes(frames)
print(output)

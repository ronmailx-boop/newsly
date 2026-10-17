#!/usr/bin/env bash
# בונה את פס הקול של סרטון הפרומו: קריינות ElevenLabs (voiceover.mp3 -
# קול "Omer - Confident, Upbeat Ad", מודל eleven_v4, טייק אחד רציף) +
# מוזיקת רקע סינתטית (music.py) עם ducking מתחת לקריין.
# הפלט: scripts/promo/audio/mix.wav (לא נשמר בריפו - רק הסרטון הסופי).
# אם מחליפים את voiceover.mp3 - לעדכן את TIME_MAP ב-render.mjs לפי
# תחילת כל משפט (ffmpeg -af silencedetect=noise=-40dB:d=0.2 על audio/vo.wav).
# דורש: python3 + numpy, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p audio
DURATION=29.9

# חיתוך שקט בקצוות, האצה קלה (3%) כדי להיכנס ל-30 שנ', ו-250ms שקט בהתחלה
ffmpeg -v error -y -i voiceover.mp3 \
  -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atempo=1.03,adelay=250|250" \
  -ar 48000 -ac 2 audio/vo.wav

python3 music.py

ffmpeg -v error -y -i audio/music.wav -i audio/vo.wav -filter_complex "\
[1]volume=1.3,apad=whole_dur=${DURATION}[vo];[vo]asplit[vo1][vo2];[0]volume=0.5[m];\
[m][vo1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[md];\
[md][vo2]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=11[out]" \
  -map "[out]" -ar 48000 -t ${DURATION} audio/mix.wav

echo "audio/mix.wav ready"

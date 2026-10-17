#!/usr/bin/env bash
# בונה את פס הקול של סרטון הפרומו: קריינות (Google TTS, קול גבר בעברית)
# + מוזיקת רקע סינתטית (music.py) עם ducking מתחת לקריין.
# הפלט: scripts/promo/audio/mix.wav (לא נשמר בריפו - רק הסרטון הסופי).
# דורש: python3 + numpy, ffmpeg, וגישה ל-texttospeech.googleapis.com.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p audio
VOICE=he-IL-Chirp3-HD-Charon

# שורה = קטע קריינות. הזמנים (ms) תואמים לסצנות ב-promo.html.
LINES=(
  "כל החדשות של ישראל, במקום אחד."
  "ניוזלי אוסף כותרות משבעה אתרי חדשות מובילים, ומתעדכן כל רבע שעה."
  "גוללים למעלה: כותרת אחת בכל מסך, מהחדשה ביותר."
  "רוצים מקור מסוים? בוחרים לשונית. או מפעילים גלילה אוטומטית, ופשוט קוראים."
  "כותרת קליקבייט? לחיצה אחת, ומגלים מה הכותרת מסתירה."
  "לא מעניין? מחליקים הצידה, והכותרת נעלמת."
  "ניוזלי. כל החדשות, בלי הרעש."
)
STARTS=(300 2500 7850 11800 18000 21800 25750)

for i in "${!LINES[@]}"; do
  python3 tts.py "$VOICE" "audio/raw$i.wav" "${LINES[$i]}"
  # חיתוך שקט בהתחלה/בסוף + האצה קלה כדי להיכנס ל-30 שניות
  ffmpeg -v error -y -i "audio/raw$i.wav" \
    -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atempo=1.06" \
    "audio/vo$i.wav"
done

python3 music.py

inputs=(-i audio/music.wav)
delays=""
labels=""
for i in "${!LINES[@]}"; do
  inputs+=(-i "audio/vo$i.wav")
  delays+="[$((i + 1))]adelay=${STARTS[$i]}|${STARTS[$i]}[a$i];"
  labels+="[a$i]"
done

ffmpeg -v error -y "${inputs[@]}" -filter_complex "\
${delays}${labels}amix=inputs=${#LINES[@]}:normalize=0,aformat=channel_layouts=stereo,volume=1.6,apad=whole_dur=29.5[vo];\
[vo]asplit[vo1][vo2];[0]volume=0.5[m];\
[m][vo1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[md];\
[md][vo2]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=11[out]" \
  -map "[out]" -ar 48000 -t 29.5 audio/mix.wav

echo "audio/mix.wav ready"

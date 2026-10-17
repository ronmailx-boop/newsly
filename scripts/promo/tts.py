import json, sys, base64, urllib.request, os
voice = sys.argv[1]; out = sys.argv[2]; text = sys.argv[3]
rate = float(os.environ.get('RATE', '1.08'))
body = {"input": {"text": text}, "voice": {"languageCode": "he-IL", "name": voice},
        "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 48000, "speakingRate": rate}}
req = urllib.request.Request("https://texttospeech.googleapis.com/v1/text:synthesize", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
r = json.load(urllib.request.urlopen(req))
open(out, 'wb').write(base64.b64decode(r['audioContent']))

# Atsarginis parsisiuntimas per curl_cffi (Chrome TLS imitacija), kai paprastas fetch gauna 403.
# naudojimas: python3 gauk.py <url>  -> stdout: pirma eilute HTTP statusas, toliau kunas (baitai)
import sys
from curl_cffi import requests
H = {'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', 'Accept-Language': 'lt-LT,lt;q=0.9,en;q=0.8', 'Referer': 'https://autoplius.lt/'}
try:
    r = requests.get(sys.argv[1], impersonate='chrome', headers=H, timeout=60)
    sys.stdout.buffer.write((str(r.status_code) + '\n').encode()); sys.stdout.buffer.write(r.content)
except Exception as e:
    sys.stdout.buffer.write(('599\n' + str(e)).encode())

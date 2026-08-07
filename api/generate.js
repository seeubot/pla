import urllib.request, ssl, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Test the OLD domain with ss.network code
url = "https://serverfile-sigma.vercel.app/api/generate?type=playlist&hours=720"
try:
    req = urllib.request.Request(url, headers={'x-api-key': 'mayatv'})
    with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
        data = json.loads(r.read().decode('utf-8'))
    print(f"✅ Generate works!")
    print(f"   URL: {data.get('url')}")

    # Check what playlist.js is deployed
    req2 = urllib.request.Request("https://serverfile-sigma.vercel.app/api/playlist.js")
    with urllib.request.urlopen(req2, context=ctx, timeout=10) as r:
        code = r.read().decode('utf-8')
    print(f"\nDeployed playlist.js: {len(code)} bytes")
    print(f"Has extractName: {'extractName' in code}")
    
except Exception as e:
    print(f"❌ Error: {e}")

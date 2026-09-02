import urllib.request
import urllib.error
import ssl
import json

ctx = ssl.create_default_context()
BACKEND = 'https://reviveai-e858.onrender.com'
PROD_ORIGIN = 'https://reviveai-five.vercel.app'

def req(url, method='GET', headers=None, data=None, timeout=30):
    h = {'User-Agent': 'ReviveOS-QA/1.0', 'Origin': PROD_ORIGIN}
    if headers: h.update(headers)
    body = data.encode() if isinstance(data, str) else data
    r2 = urllib.request.Request(url, method=method, headers=h, data=body)
    try:
        with urllib.request.urlopen(r2, timeout=timeout, context=ctx) as resp:
            raw = resp.read(3000).decode('utf-8', 'ignore')
            return {'status': resp.status, 'body': raw, 'headers': dict(resp.headers)}
    except urllib.error.HTTPError as e:
        raw = e.read(500).decode('utf-8', 'ignore')
        return {'status': e.code, 'body': raw, 'headers': dict(e.headers)}
    except Exception as ex:
        return {'status': 0, 'error': str(ex), 'body': ''}

# Test CORS
r = req(f'{BACKEND}/api/health')
acao = r['headers'].get('access-control-allow-origin', r['headers'].get('Access-Control-Allow-Origin', 'MISSING'))
print(f'CORS ACAO: {acao}')
print(f'Expected:  {PROD_ORIGIN}')
print(f'CORS OK:   {acao == PROD_ORIGIN}')

try:
    body = json.loads(r['body'])
    env_val = body.get('environment', 'unknown')
    print(f'App ENV:   {env_val}')
    ai_enabled = body.get('capabilities', {}).get('ai_enabled', 'unknown')
    rzp_enabled = body.get('capabilities', {}).get('razorpay_enabled', 'unknown')
    print(f'AI:        {ai_enabled}')
    print(f'Razorpay:  {rzp_enabled}')
except Exception as e:
    print(f'Parse error: {e}')

print()
print('=== AUTH MODE DETECTION ===')

# With invalid token
ri = req(f'{BACKEND}/api/dashboard/metrics', headers={'Authorization': 'Bearer invalid.jwt.token'})
print(f'Invalid token -> HTTP {ri["status"]} (expect 401)')

# Without token
rn = req(f'{BACKEND}/api/dashboard/metrics')
print(f'No token   -> HTTP {rn["status"]} (401=Clerk enforced, 200=dev bypass active)')
if rn['status'] == 200:
    print('  [INFO] Dev bypass mode ON - CLERK_SECRET_KEY not set on Render')
elif rn['status'] == 401:
    print('  [GOOD] Clerk authentication enforced on Render')

# Check 401 for leaks
try:
    ri_body = json.loads(ri['body'])
    has_stack = 'traceback' in ri['body'].lower()
    has_secret = 'secret' in ri['body'].lower() and 'your session' not in ri['body'].lower()
    print(f'401 leaks stack: {has_stack}')
    print(f'401 leaks secret: {has_secret}')
    print(f'401 message: {ri_body.get("detail", "")}')
except Exception as e:
    print(f'401 body: {ri["body"][:100]}')

print()
print('=== ENDPOINT INVENTORY ===')
# Test all key endpoints
endpoints = [
    ('GET', '/api/health', [200]),
    ('GET', '/api/dashboard/metrics', [200, 401]),
    ('GET', '/api/dashboard/funnel', [200, 401]),
    ('GET', '/api/simulation/demo/scenarios', [200, 401]),
    ('GET', '/api/recovery/opportunities', [200, 401]),
    ('GET', '/api/policies', [200, 401]),
    ('GET', '/api/incidents', [200, 401]),
    ('GET', '/api/chaos/drills', [200, 401]),
    ('GET', '/api/impact/summary', [200, 401]),
    ('GET', '/api/audit/events', [200, 401]),
    ('GET', '/api/agents', [200, 401]),
    ('GET', '/api/portfolio/current', [200, 401]),
]
for method, path, expected in endpoints:
    rr = req(f'{BACKEND}{path}', method=method)
    ok = rr['status'] in expected
    icon = 'OK' if ok else 'FAIL'
    print(f'  [{icon}] {method} {path} -> HTTP {rr["status"]}')

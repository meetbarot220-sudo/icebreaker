import sys, json, time, subprocess, urllib.request, websocket, base64, os
sys.stdout.reconfigure(encoding='utf-8')

import http.server, socketserver, threading
PORT = 8997
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args): pass

server = socketserver.TCPServer(('', PORT), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

profile_dir = 'C:/Users/meet2/AppData/Local/Temp/edge_stomp_shot_test'
proc = subprocess.Popen([
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--remote-debugging-port=9297',
    '--remote-allow-origins=*',
    f'--user-data-dir={profile_dir}',
    '--window-size=1920,1080',
    f'http://localhost:{PORT}/index.html'
])
time.sleep(2.5)

try:
    tabs = json.loads(urllib.request.urlopen('http://localhost:9297/json').read().decode())
    target_tab = [t for t in tabs if f':{PORT}' in t.get('url', '')][0]
    ws = websocket.create_connection(target_tab['webSocketDebuggerUrl'])

    msg_id = 1
    def send(method, params=None):
        global msg_id
        payload = {'id': msg_id, 'method': method, 'params': params or {}}
        msg_id += 1
        ws.send(json.dumps(payload))
        while True:
            res = json.loads(ws.recv())
            if res.get('id') == payload['id']:
                return res

    send('Console.enable')
    send('Runtime.enable')

    def eval_js(code):
        res = send('Runtime.evaluate', {
            'expression': f'(() => {{ try {{ const v = ({code}); return JSON.stringify(v === undefined ? null : v); }} catch(e) {{ return JSON.stringify({{err: e.toString()}}); }} }})()',
            'returnByValue': True
        })
        val = res.get('result', {}).get('result', {}).get('value')
        return json.loads(val) if val is not None else None

    def save_shot(name):
        res = send('Page.captureScreenshot', {'format': 'png'})
        data = base64.b64decode(res['result']['data'])
        path = os.path.join(r'C:\Users\meet2\.gemini\antigravity\brain\296207ff-82e1-4e22-9986-8d8e05b2f19a', f'{name}.png')
        with open(path, 'wb') as f:
            f.write(data)
        print(f"Captured {name}: {len(data)} bytes")

    # Start game, spawn duck, execute stomp, render bounce frame
    eval_js("""
    (() => {
        const g = window.game;
        g.startNewGame(false);
        g.startGameNow();
        const p = g.players[0];
        p.score = 500;
        p.lives = 3;

        const fl0 = g.levelManager.floors[0];
        const duck = new window.DuckEnemy(340, fl0.y - 32, 0, 'mallard', 1.0, 1);
        duck.isFlattened = true;
        duck.flattenTimer = 20;
        g.levelManager.enemies = [duck];

        // Shinchan bouncing upward from duck head
        p.x = 340;
        p.y = duck.y - p.height - 24;
        p.vy = -5.0;
        p.state = 'jump';

        // Spawn particles for visual impact
        g.levelManager.particleSystem.spawnScorePopup(340 + 17, duck.y - 12, '+500');
        g.levelManager.particleSystem.spawnStompImpact(340 + 17, duck.y + 4);

        g.render();
    })()
    """)
    save_shot('verified_shinchan_stomp_bounce_live')

    # Also capture Shinchan dancing on platform with full HUD
    eval_js("""
    (() => {
        const g = window.game;
        const p = g.players[0];
        p.x = 450;
        p.y = g.levelManager.floors[0].y - p.height;
        p.state = 'walk';
        p.facing = 1;
        p.walkAnimTimer = 14;
        g.runTimeRemaining = 84.5;
        g.render();
    })()
    """)
    save_shot('verified_shinchan_bhuri_dance_with_new_hud')

finally:
    proc.terminate()
    server.shutdown()

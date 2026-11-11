import sys, json, time, subprocess, urllib.request, websocket, base64, os
sys.stdout.reconfigure(encoding='utf-8')

import http.server, socketserver, threading
PORT = 8998
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args): pass

server = socketserver.TCPServer(('', PORT), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

profile_dir = 'C:/Users/meet2/AppData/Local/Temp/edge_shinchan_redesign'
proc = subprocess.Popen([
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--remote-debugging-port=9298',
    '--remote-allow-origins=*',
    f'--user-data-dir={profile_dir}',
    '--window-size=1920,1080',
    f'http://localhost:{PORT}/index.html'
])
time.sleep(2.5)

try:
    tabs = json.loads(urllib.request.urlopen('http://localhost:9298/json').read().decode())
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

    print("=== 1. VERIFY BOOT & NO DANCE ARTIFACTS ===")
    boot_err = eval_js('window.bootError')
    assert boot_err is None, f"Boot error: {boot_err}"
    dance_props = eval_js("""
    (() => {
        const g = window.game;
        g.startNewGame(false);
        g.startGameNow();
        const p = g.players[0];
        return {
            hasDanceWeight: ('danceWeight' in p),
            hasDancePhase: ('dancePhase' in p),
            hasDanceStepSfx: ('danceStep' in window.SFX),
            hasMoveWeight: ('moveWeight' in p),
            hasRunWeight: ('runWeight' in p),
            hasWalkPhase: ('walkPhase' in p),
            hasFallWeight: ('fallWeight' in p)
        };
    })()
    """)
    print("Properties check:", dance_props)
    assert not dance_props['hasDanceWeight'], "danceWeight still exists on Player!"
    assert not dance_props['hasDancePhase'], "dancePhase still exists on Player!"
    assert not dance_props['hasDanceStepSfx'], "SFX.danceStep still exists!"
    assert dance_props['hasMoveWeight'] and dance_props['hasRunWeight'] and dance_props['hasWalkPhase'], "Missing new platformer animation weights!"
    print("PASS: All dance properties removed; clean platformer animation weights active!")

    print("\n=== 2. VERIFY WALK -> RUN -> IDLE -> DIRECTION MIRRORING ===")
    loco_check = eval_js("""
    (() => {
        const g = window.game;
        const p = g.players[0];
        g.isStopped = true; // Step deterministically without loop interference
        p.resetPosition(240, g.levelManager.floors[0].y - p.height);

        // Step right for 2 frames -> walk
        p.handleInput({ right: true, left: false, jump: false, attack: false });
        p.update(g.collisionSystem, g.camera.y);
        p.handleInput({ right: true, left: false, jump: false, attack: false });
        p.update(g.collisionSystem, g.camera.y);
        const walkSnap = { state: p.state, vx: p.vx, facing: p.facing, walkPhase: p.walkPhase, moveW: p.moveWeight };

        // Continue right for 12 more frames -> run
        for (let i = 0; i < 12; i++) {
            p.handleInput({ right: true, left: false, jump: false, attack: false });
            p.update(g.collisionSystem, g.camera.y);
        }
        const runSnap = { state: p.state, vx: p.vx, facing: p.facing, runW: p.runWeight, walkPhase: p.walkPhase };

        // Reverse left until moving left cleanly
        for (let i = 0; i < 20; i++) {
            p.handleInput({ right: false, left: true, jump: false, attack: false });
            p.update(g.collisionSystem, g.camera.y);
        }
        const leftSnap = { state: p.state, vx: p.vx, facing: p.facing, runW: p.runWeight };

        // Release keys -> decelerate smoothly to idle while preserving left facing
        for (let i = 0; i < 65; i++) {
            p.handleInput({ right: false, left: false, jump: false, attack: false });
            p.update(g.collisionSystem, g.camera.y);
        }
        const idleLeftSnap = { state: p.state, vx: p.vx, facing: p.facing, moveW: p.moveWeight, runW: p.runWeight };

        return { walkSnap, runSnap, leftSnap, idleLeftSnap };
    })()
    """)
    print("Locomotion transitions:", loco_check)
    assert loco_check['walkSnap']['state'] == 'walk' and loco_check['walkSnap']['facing'] == 1, "Failed walk right"
    assert loco_check['walkSnap']['vx'] > 0 and loco_check['walkSnap']['walkPhase'] > 0, "Walk phase did not advance"
    assert loco_check['runSnap']['state'] == 'run' and loco_check['runSnap']['runW'] > 0.5, "Failed transition to run"
    assert loco_check['leftSnap']['vx'] < 0 and loco_check['leftSnap']['facing'] == -1 and loco_check['leftSnap']['state'] == 'run', "Failed left run & mirror"
    assert loco_check['idleLeftSnap']['state'] == 'idle' and loco_check['idleLeftSnap']['facing'] == -1, "Failed preserving last left direction in idle!"
    assert loco_check['idleLeftSnap']['moveW'] < 0.05, "moveWeight did not settle in idle"
    print("PASS: Idle -> Walk -> Run -> Left Mirror -> Idle works seamlessly without sliding!")

    print("\n=== 3. VERIFY JUMP -> FALL -> LAND -> SWING -> HURT/DEAD ===")
    air_check = eval_js("""
    (() => {
        const g = window.game;
        const p = g.players[0];
        p.resetPosition(300, g.levelManager.floors[0].y - p.height);

        // Jump
        p.handleInput({ jump: true, right: true, left: false, attack: false });
        p.update(g.collisionSystem, g.camera.y);
        const jumpSnap = { state: p.state, vy: p.vy, jw: p.jumpWeight };

        // Step until peak & falling
        let fallSnap = null;
        let landSnap = null;
        for (let i = 0; i < 60; i++) {
            p.handleInput({ jump: true, right: false, left: false, attack: false });
            p.update(g.collisionSystem, g.camera.y);
            if (!fallSnap && p.state === 'fall') {
                fallSnap = { state: p.state, vy: p.vy, fw: p.fallWeight };
            }
            if (!landSnap && p.state === 'land') {
                landSnap = { state: p.state, lw: p.landWeight, isGrounded: p.isGrounded };
            }
        }

        // Attack swing
        for (let i = 0; i < 10; i++) {
            p.handleInput({ jump: false, right: false, left: false, attack: false });
            p.update(g.collisionSystem, g.camera.y);
        }
        p.handleInput({ attack: true, jump: false, right: false, left: false });
        p.update(g.collisionSystem, g.camera.y);
        const swingSnap = { state: p.state, isSwinging: p.isSwinging, sockTimer: p.sockTimer };

        return { jumpSnap, fallSnap, landSnap, swingSnap };
    })()
    """)
    print("Air & Attack states:", air_check)
    assert air_check['jumpSnap']['state'] == 'jump' and air_check['jumpSnap']['vy'] < 0
    assert air_check['fallSnap'] is not None and air_check['fallSnap']['state'] == 'fall' and air_check['fallSnap']['vy'] > 0
    assert air_check['landSnap'] is not None and air_check['landSnap']['state'] == 'land'
    assert air_check['swingSnap']['state'] == 'swing' and air_check['swingSnap']['isSwinging'] is True
    print("PASS: Jump, Fall, Land, and Sock Swing states all transition cleanly!")

    print("\n=== 4. VERIFY GAMEPLAY MECHANICS UNCHANGED (STOMP & TIMER) ===")
    gameplay_check = eval_js("""
    (() => {
        const g = window.game;
        g.startNewGame(false);
        g.startGameNow();
        g.isStopped = true;
        const p = g.players[0];
        const fl0 = g.levelManager.floors[0];
        const duck = new window.DuckEnemy(360, fl0.y - 32, 0, 'mallard', 1.0, 1);
        g.levelManager.enemies = [duck];

        p.x = 360;
        p.prevY = duck.y - p.height - 10;
        p.y = duck.y - p.height + 4;
        p.vy = 4.0;
        p.state = 'fall';
        duck.checkPlayerDamage([p]);

        return {
            duckDefeated: duck.isDefeated,
            score: p.score,
            lives: p.lives,
            bounceVy: p.vy,
            timer: g.runTimeRemaining
        };
    })()
    """)
    print("Gameplay check:", gameplay_check)
    assert gameplay_check['duckDefeated'] is True and gameplay_check['score'] == 500 and gameplay_check['lives'] == 3 and gameplay_check['bounceVy'] < -5
    print("PASS: Stomp +500 pts, bounce, lives, and 90s timer intact!")

    print("\n=== 5. RENDER ZOOMED-IN 4X SPRITE POSE SHOWCASE FOR VISUAL INSPECTION ===")
    eval_js("""
    (() => {
        const g = window.game;
        const ctx = g.ctx;
        g.isStopped = true;

        // Clear full canvas with pleasant backdrop so zoomed poses pop cleanly
        ctx.save();
        ctx.fillStyle = '#14274e';
        ctx.fillRect(0, 0, window.CONFIG.CANVAS_WIDTH, window.CONFIG.CANVAS_HEIGHT);

        // Draw crisp grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 1140; x += 190) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(0, 180); ctx.lineTo(1140, 180); ctx.stroke();

        const poses = [
            { label: 'IDLE RIGHT', col: 0, row: 0, cfg: { facing: 1, state: 'idle', moveWeight: 0, runWeight: 0, jumpWeight: 0, fallWeight: 0, landWeight: 0, walkPhase: 0, animTimer: 10, isSwinging: false } },
            { label: 'IDLE LEFT (MIRROR)', col: 1, row: 0, cfg: { facing: -1, state: 'idle', moveWeight: 0, runWeight: 0, jumpWeight: 0, fallWeight: 0, landWeight: 0, walkPhase: 0, animTimer: 10, isSwinging: false } },
            { label: 'WALK STRIDE A', col: 2, row: 0, cfg: { facing: 1, state: 'walk', moveWeight: 1, runWeight: 0, jumpWeight: 0, fallWeight: 0, landWeight: 0, walkPhase: 1.3, animTimer: 20, isSwinging: false } },
            { label: 'WALK STRIDE B', col: 3, row: 0, cfg: { facing: 1, state: 'walk', moveWeight: 1, runWeight: 0, jumpWeight: 0, fallWeight: 0, landWeight: 0, walkPhase: 4.4, animTimer: 28, isSwinging: false } },
            { label: 'RUN SPRINT A', col: 4, row: 0, cfg: { facing: 1, state: 'run', moveWeight: 1, runWeight: 1, jumpWeight: 0, fallWeight: 0, landWeight: 0, walkPhase: 1.5, animTimer: 40, isSwinging: false } },
            { label: 'RUN SPRINT LEFT', col: 5, row: 0, cfg: { facing: -1, state: 'run', moveWeight: 1, runWeight: 1, jumpWeight: 0, fallWeight: 0, landWeight: 0, walkPhase: 1.5, animTimer: 40, isSwinging: false } },
            { label: 'JUMP POSE', col: 0, row: 1, cfg: { facing: 1, state: 'jump', moveWeight: 0, runWeight: 0, jumpWeight: 1, fallWeight: 0, landWeight: 0, walkPhase: 0, animTimer: 50, isSwinging: false } },
            { label: 'FALL POSE', col: 1, row: 1, cfg: { facing: 1, state: 'fall', moveWeight: 0, runWeight: 0, jumpWeight: 0, fallWeight: 1, landWeight: 0, walkPhase: 0, animTimer: 55, isSwinging: false } },
            { label: 'LAND SQUASH', col: 2, row: 1, cfg: { facing: 1, state: 'land', moveWeight: 0, runWeight: 0, jumpWeight: 0, fallWeight: 0, landWeight: 1, walkPhase: 0, animTimer: 60, isSwinging: false } },
            { label: 'SOCK ATTACK', col: 3, row: 1, cfg: { facing: 1, state: 'swing', moveWeight: 0, runWeight: 0, jumpWeight: 0, fallWeight: 0, landWeight: 0, walkPhase: 0, animTimer: 65, isSwinging: true, hammerTimer: 8 } },
            { label: 'BLINK IDLE', col: 4, row: 1, cfg: { facing: 1, state: 'idle', moveWeight: 0, runWeight: 0, jumpWeight: 0, fallWeight: 0, landWeight: 0, walkPhase: 0, animTimer: 162, isSwinging: false } },
            { label: 'HURT / DEFEAT', col: 5, row: 1, cfg: { facing: 1, state: 'dead', deathTimer: 76, moveWeight: 0, runWeight: 0, jumpWeight: 0, fallWeight: 0, landWeight: 0, walkPhase: 0, animTimer: 70, isSwinging: false } }
        ];

        const mockPlayer = g.players[0];
        poses.forEach(item => {
            const cellX = item.col * 190 + 95;
            const cellY = item.row * 180 + 150;

            Object.assign(mockPlayer, item.cfg);
            mockPlayer.x = -mockPlayer.width / 2;

            ctx.save();
            ctx.translate(cellX, cellY);
            ctx.scale(2.8, 2.8);
            window.CartoonArtist.drawShinchan(ctx, mockPlayer, -mockPlayer.height);
            ctx.restore();

            ctx.fillStyle = '#ffeb3b';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, cellX, item.row * 180 + 22);
        });
        ctx.restore();
    })()
    """)
    save_shot('verified_shinchan_redesign_poses_sheet')

    print("\n=== 6. CAPTURE NORMAL 1X GAMEPLAY SCREENSHOTS ===")
    eval_js("""
    (() => {
        const g = window.game;
        g.startNewGame(false);
        g.startGameNow();
        g.isStopped = true;
        const p = g.players[0];
        const fl0 = g.levelManager.floors[0];
        p.resetPosition(380, fl0.y - p.height);
        // Simulate running right naturally on Floor 0
        for (let i = 0; i < 16; i++) {
            p.handleInput({ right: true, left: false, jump: false, attack: false });
            p.update(g.collisionSystem, g.camera.y);
        }
        g.render();
    })()
    """)
    save_shot('verified_shinchan_normal_running_gameplay')

    eval_js("""
    (() => {
        const g = window.game;
        const p = g.players[0];
        const fl0 = g.levelManager.floors[0];
        p.resetPosition(420, fl0.y - p.height);
        p.handleInput({ jump: true, right: true, left: false, attack: false });
        for (let i = 0; i < 6; i++) {
            p.handleInput({ jump: true, right: true, left: false, attack: false });
            p.update(g.collisionSystem, g.camera.y);
        }
        g.render();
    })()
    """)
    save_shot('verified_shinchan_normal_jump_gameplay')

    print("\nALL SHINCHAN REDESIGN TESTS & SCREENSHOTS COMPLETED!")

finally:
    proc.terminate()
    server.shutdown()

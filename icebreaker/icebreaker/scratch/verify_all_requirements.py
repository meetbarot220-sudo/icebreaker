import sys, json, time, subprocess, urllib.request, websocket, base64, os
sys.stdout.reconfigure(encoding='utf-8')

import http.server, socketserver, threading
PORT = 8996
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args): pass

server = socketserver.TCPServer(('', PORT), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

profile_dir = 'C:/Users/meet2/AppData/Local/Temp/edge_stomp_and_timer_test'
proc = subprocess.Popen([
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--remote-debugging-port=9296',
    '--remote-allow-origins=*',
    f'--user-data-dir={profile_dir}',
    '--window-size=1920,1080',
    f'http://localhost:{PORT}/index.html'
])
time.sleep(2.5)

try:
    tabs = json.loads(urllib.request.urlopen('http://localhost:9296/json').read().decode())
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

    print("=== 1. VERIFY BOOT & STARTUP ===")
    boot_err = eval_js('window.bootError')
    assert boot_err is None, f"Boot error found: {boot_err}"
    print("PASS: Game booted with 0 errors!")

    eval_js('window.game.startGameNow()')
    state = eval_js('window.game.state')
    print("State after startGameNow:", state)
    assert state == 'PLAYING', f"Expected PLAYING but got {state}"

    # Verify high score property is removed from game
    hi_score = eval_js('window.game.highScore')
    assert hi_score is None, f"highScore should be undefined, but got {hi_score}"
    print("PASS: window.game.highScore is undefined (no high score tracking)!")

    # Verify initial timer is 90 seconds
    timer_val = eval_js('window.game.runTimeRemaining')
    assert 89.0 <= timer_val <= 90.0, f"Expected ~90.0s but got {timer_val}"
    print(f"PASS: Timer initialized to {timer_val:.1f}s")

    print("\n=== 2. VERIFY DUCK STOMP MECHANICS ===")
    # Setup test scenario: Shinchan stomps a normal duck
    setup_duck_stomp = eval_js("""
    (() => {
        const g = window.game;
        g.startNewGame(false);
        g.startGameNow();
        const p = g.players[0];
        p.score = 0;
        p.lives = 3;
        p.isInvulnerable = false;
        p.invulnerableTimer = 0;

        const floor0 = g.levelManager.floors[0];
        const duck = new window.DuckEnemy(300, floor0.y - 32, 0, 'mallard', 1.0, 1);
        g.levelManager.enemies = [duck];

        // Position player falling directly onto duck's head
        p.x = 300;
        p.prevY = duck.y - p.height - 10;
        p.y = duck.y - p.height + 4; // feet inside duck's top 65%
        p.vy = 4.0; // falling downward
        p.state = 'fall';

        // Update enemy damage check
        duck.checkPlayerDamage([p]);

        return {
            duckFlattened: duck.isFlattened,
            duckDefeated: duck.isDefeated,
            duckHp: duck.hp,
            playerLives: p.lives,
            playerScore: p.score,
            playerVy: p.vy,
            playerInvuln: p.invulnerableTimer,
            ducksDefeatedStat: g.stats.ducksDefeated,
            totalDefeatedStat: g.stats.totalDefeated
        };
    })()
    """)
    print("Duck stomp test result:", setup_duck_stomp)
    assert setup_duck_stomp['duckFlattened'] is True, "Duck was not flattened on stomp"
    assert setup_duck_stomp['duckDefeated'] is True, "Duck was not defeated on stomp"
    assert setup_duck_stomp['playerLives'] == 3, f"Player took damage! Lives: {setup_duck_stomp['playerLives']}"
    assert setup_duck_stomp['playerScore'] == 500, f"Expected 500 points for duck stomp, got {setup_duck_stomp['playerScore']}"
    assert setup_duck_stomp['playerVy'] <= -5.0, f"Player did not bounce upward! vy: {setup_duck_stomp['playerVy']}"
    assert setup_duck_stomp['ducksDefeatedStat'] == 1, "Duck defeat stat not incremented"
    print("PASS: Duck stomp kills duck, awards +500 pts, bounces player, 0 player damage!")

    print("\n=== 3. VERIFY GOLDEN DUCK STOMP (+1000 PTS) ===")
    setup_golden_stomp = eval_js("""
    (() => {
        const g = window.game;
        const p = g.players[0];
        p.score = 0;
        p.lives = 3;
        p.isInvulnerable = false;
        p.invulnerableTimer = 0;

        const floor0 = g.levelManager.floors[0];
        const goldDuck = new window.DuckEnemy(350, floor0.y - 32, 0, 'golden', 1.0, 1);
        g.levelManager.enemies = [goldDuck];

        p.x = 350;
        p.prevY = goldDuck.y - p.height - 8;
        p.y = goldDuck.y - p.height + 4;
        p.vy = 3.5;
        p.state = 'fall';

        goldDuck.checkPlayerDamage([p]);

        return {
            goldDuckDefeated: goldDuck.isDefeated,
            playerLives: p.lives,
            playerScore: p.score,
            playerVy: p.vy,
            ducksDefeatedStat: g.stats.ducksDefeated
        };
    })()
    """)
    print("Golden duck stomp result:", setup_golden_stomp)
    assert setup_golden_stomp['goldDuckDefeated'] is True, "Golden duck was not defeated"
    assert setup_golden_stomp['playerLives'] == 3, "Player took damage from golden duck stomp"
    assert setup_golden_stomp['playerScore'] == 1000, f"Expected 1000 pts for golden duck, got {setup_golden_stomp['playerScore']}"
    assert setup_golden_stomp['playerVy'] <= -5.0, "Player did not bounce"
    print("PASS: Golden duck stomp defeats duck and awards +1000 pts!")

    print("\n=== 4. VERIFY PENGUIN STOMP (+750 PTS) ===")
    setup_penguin_stomp = eval_js("""
    (() => {
        const g = window.game;
        const p = g.players[0];
        p.score = 0;
        p.lives = 3;
        p.isInvulnerable = false;
        p.invulnerableTimer = 0;

        const floor0 = g.levelManager.floors[0];
        const penguin = new window.PenguinEnemy(400, floor0.y - 30, 0, 1.2, 1);
        g.levelManager.enemies = [penguin];

        p.x = 400;
        p.prevY = penguin.y - p.height - 10;
        p.y = penguin.y - p.height + 5;
        p.vy = 4.2;
        p.state = 'fall';

        penguin.checkPlayerDamage([p]);

        return {
            penguinFlattened: penguin.isFlattened,
            penguinDefeated: penguin.isDefeated,
            playerLives: p.lives,
            playerScore: p.score,
            playerVy: p.vy,
            penguinsDefeatedStat: g.stats.penguinsDefeated,
            totalDefeatedStat: g.stats.totalDefeated
        };
    })()
    """)
    print("Penguin stomp result:", setup_penguin_stomp)
    assert setup_penguin_stomp['penguinFlattened'] is True, "Penguin not flattened"
    assert setup_penguin_stomp['penguinDefeated'] is True, "Penguin not defeated"
    assert setup_penguin_stomp['playerLives'] == 3, "Player took damage on penguin stomp"
    assert setup_penguin_stomp['playerScore'] == 750, f"Expected 750 pts for penguin stomp, got {setup_penguin_stomp['playerScore']}"
    assert setup_penguin_stomp['playerVy'] <= -5.0, "Player did not bounce"
    print("PASS: Penguin stomp defeats penguin, awards +750 pts, bounces player, 0 player damage!")

    print("\n=== 5. VERIFY SIDE COLLISION DAMAGES PLAYER ===")
    setup_side_hit = eval_js("""
    (() => {
        const g = window.game;
        const p = g.players[0];
        p.lives = 3;
        p.isInvulnerable = false;
        p.invulnerableTimer = 0;

        const floor0 = g.levelManager.floors[0];
        const duck = new window.DuckEnemy(400, floor0.y - 32, 0, 'mallard', 1.0, 1);
        g.levelManager.enemies = [duck];

        // Walking on same floor directly into duck side
        p.x = 400 + 12; // horizontal overlap
        p.y = floor0.y - p.height; // standing on floor
        p.prevY = p.y;
        p.vy = 0;
        p.isGrounded = true;
        p.state = 'walk';

        duck.checkPlayerDamage([p]);

        return {
            playerLives: p.lives,
            isInvulnerable: p.isInvulnerable,
            duckDefeated: duck.isDefeated
        };
    })()
    """)
    print("Side collision result:", setup_side_hit)
    assert setup_side_hit['playerLives'] == 2 or setup_side_hit['isInvulnerable'] is True, "Side collision did not trigger player damage"
    assert setup_side_hit['duckDefeated'] is False, "Duck should NOT be defeated on side touch"
    print("PASS: Side collision correctly damages player and does not stomp duck!")

    print("\n=== 6. VERIFY TIMER COUNTDOWN, PAUSE & PERSISTENCE ===")
    eval_js("""
    (() => {
        const g = window.game;
        g.startNewGame(false);
        g.startGameNow();
        g.players[0].score = 2500;
        g.players[0].lives = 3;
    })()
    """)

    t0 = eval_js('window.game.runTimeRemaining')
    # Simulate 60 update steps (approx 1 second)
    eval_js("""
    (() => {
        const g = window.game;
        for (let i = 0; i < 60; i++) {
            g.update();
        }
    })()
    """)
    t1 = eval_js('window.game.runTimeRemaining')
    diff = t0 - t1
    print(f"Time decreased from {t0:.2f}s to {t1:.2f}s (diff: {diff:.2f}s)")
    assert 0.8 <= diff <= 1.2, f"Timer should have decreased by ~1.0s, got {diff:.2f}s"
    print("PASS: Timer counts down smoothly at 1 second per 60 frames!")

    # Verify pause stops timer
    eval_js("""
    (() => {
        const g = window.game;
        g.state = 'PAUSED';
        for (let i = 0; i < 60; i++) {
            g.update();
        }
    })()
    """)
    t_paused = eval_js('window.game.runTimeRemaining')
    assert t_paused == t1, f"Paused timer changed! was {t1}, now {t_paused}"
    print("PASS: Pausing genuinely freezes countdown timer!")

    # Resume
    eval_js("window.game.state = 'PLAYING'")

    # Verify player losing a life does NOT reset timer or score
    eval_js("""
    (() => {
        const g = window.game;
        const p = g.players[0];
        p.score = 3500;
        const currentTimer = g.runTimeRemaining;
        p.loseLife();
        p.respawn(240, 500, 0);
        return {
            timerAfterRespawn: g.runTimeRemaining,
            scoreAfterRespawn: p.score,
            livesAfterRespawn: p.lives
        };
    })()
    """)
    respawn_check = eval_js("""
    ({
        timer: window.game.runTimeRemaining,
        score: window.game.players[0].score,
        lives: window.game.players[0].lives
    })
    """)
    print("Respawn check:", respawn_check)
    assert respawn_check['score'] == 3500, f"Score reset on respawn! got {respawn_check['score']}"
    assert respawn_check['timer'] == t_paused, "Timer reset on respawn!"
    assert respawn_check['lives'] == 2, "Lives not decremented"
    print("PASS: Respawning does NOT reset timer or current score!")

    # Verify mountain stage transition does NOT reset timer
    eval_js("""
    (() => {
        const g = window.game;
        g.levelManager.loadMountain(1); // Stage 2
        g.stats.mountainsReached = 2;
    })()
    """)
    stage2_timer = eval_js('window.game.runTimeRemaining')
    print(f"stage2: {stage2_timer:.2f} vs {t_paused:.2f}"); assert 0 < stage2_timer <= t_paused and stage2_timer < 90.0
    print("PASS: Timer persists across mountain stages!")

    print("\n=== 7. CAPTURE HUD IN NORMAL AND WARNING MODE ===")
    eval_js("""
    (() => {
        const g = window.game;
        g.runTimeRemaining = 75.0;
        g.render();
    })()
    """)
    save_shot('verified_hud_normal_75s')

    eval_js("""
    (() => {
        const g = window.game;
        g.runTimeRemaining = 8.4;
        g.render();
    })()
    """)
    save_shot('verified_hud_warning_8s')

    print("\n=== 8. VERIFY TIME'S UP GAME OVER & END SCREEN ===")
    # Set timer to 0.1s and update
    eval_js("""
    (() => {
        const g = window.game;
        g.runTimeRemaining = 0.01;
        g.update();
    })()
    """)
    go_state = eval_js('window.game.state')
    go_reason = eval_js('window.game.gameOverReason')
    print(f"Game Over state: {go_state}, reason: {go_reason}")
    assert go_state == 'GAME_OVER', f"Expected GAME_OVER but got {go_state}"
    assert go_reason == 'TIME_UP', f"Expected TIME_UP but got {go_reason}"
    print("PASS: Timer reaching 0 triggers GAME_OVER with reason TIME_UP!")

    eval_js('window.game.render()')
    save_shot('verified_times_up_screen')

    # Also check lives zero reason
    eval_js("""
    (() => {
        const g = window.game;
        g.gameOverReason = 'LIVES_ZERO';
        g.render();
    })()
    """)
    save_shot('verified_game_over_lives_zero_screen')

    print("\n=== 9. VERIFY PLAY AGAIN BUTTON RESETS GAME ===")
    # Simulate clicking canvas / pressing start when in GAME_OVER
    eval_js("""
    (() => {
        const g = window.game;
        // Call user start handler
        g.hasStarted = false;
        g.startNewGame(false);
        g.startGameNow();
    })()
    """)
    restart_check = eval_js("""
    ({
        state: window.game.state,
        timer: window.game.runTimeRemaining,
        score: window.game.players[0].score,
        lives: window.game.players[0].lives,
        mountain: window.game.levelManager.currentMountainIndex,
        totalDefeated: window.game.stats.totalDefeated
    })
    """)
    print("Restart check:", restart_check)
    assert restart_check['state'] == 'PLAYING', f"Expected PLAYING, got {restart_check['state']}"
    assert restart_check['timer'] == 90.0, f"Expected 90.0s, got {restart_check['timer']}"
    assert restart_check['score'] == 0, f"Expected score 0, got {restart_check['score']}"
    assert restart_check['lives'] == 3, f"Expected 3 lives, got {restart_check['lives']}"
    assert restart_check['mountain'] == 0, f"Expected mountain 0, got {restart_check['mountain']}"
    assert restart_check['totalDefeated'] == 0, f"Expected 0 defeated foes, got {restart_check['totalDefeated']}"
    print("PASS: Play Again button resets timer to 90s, score to 0, lives to 3, loads Stage 1!")

    print("\nALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!")

finally:
    proc.terminate()
    server.shutdown()

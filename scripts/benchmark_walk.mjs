import { spawn } from 'child_process';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function benchmark() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--use-gl=angle',
    '--use-angle=metal',
    '--enable-gpu-rasterization',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--remote-debugging-port=9226',
    '--window-size=1280,800',
    '--user-data-dir=/tmp/test-bench-ctx'
  ]);

  try {
    let browserWsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      try {
        const res = await fetch('http://127.0.0.1:9226/json/version');
        const data = await res.json();
        browserWsUrl = data.webSocketDebuggerUrl;
        if (browserWsUrl) break;
      } catch (e) {}
    }
    if (!browserWsUrl) throw new Error('Could not connect to Chrome CDP');

    const ws = new WebSocket(browserWsUrl);
    await new Promise(r => ws.onopen = r);

    ws.send(JSON.stringify({ id: 1, method: 'Target.createTarget', params: { url: 'about:blank' } }));
    const targetRes = await new Promise(r => ws.onmessage = e => r(JSON.parse(e.data)));
    const targetId = targetRes.result.targetId;

    const pageWs = new WebSocket(`ws://127.0.0.1:9226/devtools/page/${targetId}`);
    await new Promise(r => pageWs.onopen = r);

    let nextId = 10;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === id) {
          pageWs.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      pageWs.addEventListener('message', handler);
      pageWs.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating to http://localhost:8080/?view=walk&spawn=hall&fullscreen=1 ...');
    await send('Page.navigate', { url: 'http://localhost:8080/?view=walk&spawn=hall&fullscreen=1' });
    await sleep(3500);

    const evalResult = await send('Runtime.evaluate', {
      expression: `(async () => {
        const app = window.__APP__;
        if (!app) return { error: 'No __APP__' };
        const { renderer, composer, state } = app;

        // Toggle P stats overlay to see what it reports
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', code: 'KeyP' }));

        // Test Medium Tier (default)
        app.setQualityTier('medium', false);

        // Measure pass timings
        const passTimes = {};
        if (composer && composer.passes) {
          for (let p of composer.passes) {
            const name = p.constructor.name || 'Pass';
            passTimes[name] = { sum: 0, count: 0 };
            const oldR = p.render.bind(p);
            p.render = function(...args) {
              const t0 = performance.now();
              oldR(...args);
              passTimes[name].sum += (performance.now() - t0);
              passTimes[name].count++;
            };
          }
        }

        // Warmup (30 frames)
        await new Promise(r => {
          let f = 0;
          function loop() {
            if (++f >= 30) return r();
            requestAnimationFrame(loop);
          }
          requestAnimationFrame(loop);
        });

        // 1. Idle walk benchmark (60 frames)
        const t0Idle = performance.now();
        await new Promise(r => {
          let f = 0;
          function loop() {
            if (++f >= 60) return r();
            requestAnimationFrame(loop);
          }
          requestAnimationFrame(loop);
        });
        const idleTotal = performance.now() - t0Idle;
        const idleFps = (60 * 1000) / idleTotal;
        const idleAvgMs = idleTotal / 60;

        const passAverages = {};
        for (let k in passTimes) {
          passAverages[k] = passTimes[k].count ? (passTimes[k].sum / passTimes[k].count).toFixed(2) + ' ms' : 'N/A';
          passTimes[k].sum = 0;
          passTimes[k].count = 0;
        }

        // 2. Obstacles check cost & WASD walk benchmark (60 frames)
        const obsT0 = performance.now();
        for (let i = 0; i < 50; i++) app.getObstacles();
        const avgObstaclesMs = (performance.now() - obsT0) / 50;

        app.keysDown['KeyW'] = true;
        const t0Wasd = performance.now();
        await new Promise(r => {
          let f = 0;
          function loop() {
            if (++f >= 60) return r();
            requestAnimationFrame(loop);
          }
          requestAnimationFrame(loop);
        });
        const wasdTotal = performance.now() - t0Wasd;
        const wasdFps = (60 * 1000) / wasdTotal;
        const wasdAvgMs = wasdTotal / 60;
        delete app.keysDown['KeyW'];

        // 3. Mouse-turn benchmark (dispatching mousemove events with isLocked)
        const cv = document.querySelector('#view');
        Object.defineProperty(document, 'pointerLockElement', {
          configurable: true,
          get: () => cv
        });
        document.dispatchEvent(new Event('pointerlockchange'));

        let mmEvents = 0;
        let mouseT0 = performance.now();
        let mouseFrames = 0;
        const interval = setInterval(() => {
          mmEvents++;
          document.dispatchEvent(new MouseEvent('mousemove', { movementX: 8, movementY: 1 }));
        }, 8); // 125 Hz

        await new Promise(r => {
          function loop() {
            mouseFrames++;
            if (performance.now() - mouseT0 >= 500) {
              clearInterval(interval);
              return r();
            }
            requestAnimationFrame(loop);
          }
          requestAnimationFrame(loop);
        });
        const mouseTotal = performance.now() - mouseT0;
        const mouseFps = (mouseFrames * 1000) / mouseTotal;
        const mouseAvgMs = mouseTotal / mouseFrames;

        // Reset pointer lock
        Object.defineProperty(document, 'pointerLockElement', {
          configurable: true,
          get: () => null
        });
        document.dispatchEvent(new Event('pointerlockchange'));

        const fpsEl = document.querySelector('#statsFps');
        const msEl = document.querySelector('#statsMs');
        const rEl = document.querySelector('#statsRender');
        const mEl = document.querySelector('#statsMemory');
        const trEl = document.querySelector('#statsTierRes');

        return {
          detectedTier: app.getActiveQualityTier(),
          rendererInfo: {
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures
          },
          statsOverlayText: {
            fps: fpsEl ? fpsEl.textContent : '',
            ms: msEl ? msEl.textContent : '',
            render: rEl ? rEl.textContent : '',
            memory: mEl ? mEl.textContent : '',
            tierRes: trEl ? trEl.textContent : ''
          },
          postProcessingPasses: passAverages,
          benchmarks: {
            idle: { fps: idleFps.toFixed(1), frameMs: idleAvgMs.toFixed(2) },
            wasdMovement: { fps: wasdFps.toFixed(1), frameMs: wasdAvgMs.toFixed(2), cachedObstacleCostMs: avgObstaclesMs.toFixed(4) },
            mouseTurning: { fps: mouseFps.toFixed(1), frameMs: mouseAvgMs.toFixed(2), eventsDispatched: mmEvents }
          }
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('BENCHMARK RESULTS AFTER FIXES:');
    console.log(JSON.stringify(evalResult.result.value, null, 2));

    pageWs.close();
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

benchmark().catch(console.error);

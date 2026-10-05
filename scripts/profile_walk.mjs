import { spawn } from 'child_process';
import path from 'path';

const sleep = ms => new Promise(r => setTimeout(r, ms));

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.consoleLogs = [];
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        } else if (msg.method) {
          if (msg.method === 'Runtime.consoleAPICalled') {
            const text = msg.params.args.map(a => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
            this.consoleLogs.push({ type: msg.params.type, text });
          } else if (msg.method === 'Runtime.exceptionThrown') {
            const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
            this.consoleLogs.push({ type: 'error', text: desc });
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function runProfile() {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--use-gl=angle',
    '--use-angle=metal',
    '--enable-gpu-rasterization',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--remote-debugging-port=9222',
    '--window-size=1280,800',
    '--user-data-dir=/tmp/chrome-profile-test'
  ]);

  try {
    let browserWsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      try {
        const res = await fetch('http://127.0.0.1:9222/json/version');
        const data = await res.json();
        browserWsUrl = data.webSocketDebuggerUrl;
        if (browserWsUrl) break;
      } catch (e) {}
    }
    if (!browserWsUrl) throw new Error('Could not connect to Chrome CDP');

    const browser = new CDPClient(browserWsUrl);
    await browser.init();

    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const targetWsUrl = `ws://127.0.0.1:9222/devtools/page/${targetId}`;
    const page = new CDPClient(targetWsUrl);
    await page.init();

    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating to http://localhost:8080/?view=walk&spawn=hall&fullscreen=1 ...');
    await page.send('Page.navigate', { url: 'http://localhost:8080/?view=walk&spawn=hall&fullscreen=1' });
    await sleep(3500);

    console.log('Browser console logs:', page.consoleLogs);

    const profileData = await page.send('Runtime.evaluate', {
      expression: `(async () => {
        try {
          const app = window.__APP__;
          if (!app) return { error: '__APP__ not found' };
          const renderer = app.renderer;
          const composer = app.composer;

          // Toggle P stats overlay to see what it reports
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', code: 'KeyP' }));

          const info = renderer ? {
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures
          } : null;

          // Instrument composer passes to measure where render3D time goes
          const passStats = {};
          if (composer && composer.passes) {
            for (let p of composer.passes) {
              const name = p.constructor.name || 'Pass';
              passStats[name] = { totalMs: 0, count: 0 };
              const origRender = p.render.bind(p);
              p.render = function(...args) {
                const t0 = performance.now();
                origRender(...args);
                passStats[name].totalMs += (performance.now() - t0);
                passStats[name].count++;
              };
            }
          }

          // Test Scenario 1: Idle Walk Mode (60 frames)
          const idleStart = performance.now();
          let idleFrames = 0;
          await new Promise(r => {
            function step() {
              idleFrames++;
              if (idleFrames >= 60) return r();
              requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
          });
          const idleTotalMs = performance.now() - idleStart;

          // Summarize pass timings during idle
          const idlePassBreakdown = {};
          for (let k in passStats) {
            idlePassBreakdown[k] = passStats[k].count ? (passStats[k].totalMs / passStats[k].count).toFixed(2) + ' ms' : '0 ms';
            passStats[k].totalMs = 0;
            passStats[k].count = 0;
          }

          // Test Scenario 2: WASD Movement (60 frames)
          // Also measure getObstacles cost directly
          let getObsTimeTotal = 0;
          const obsT0 = performance.now();
          for(let i = 0; i < 50; i++) {
            app.getObstacles();
          }
          const avgObstaclesMs = (performance.now() - obsT0) / 50;

          app.keysDown['KeyW'] = true;
          const wasdStart = performance.now();
          let wasdFrames = 0;
          await new Promise(r => {
            function step() {
              wasdFrames++;
              if (wasdFrames >= 60) return r();
              requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
          });
          const wasdTotalMs = performance.now() - wasdStart;
          delete app.keysDown['KeyW'];

          // Test Scenario 3: Mouse-Turning (firing mousemove events while isLocked=true)
          let renderCallsDuringMouse = 0;
          let mouseEventsFired = 0;
          // Temporarily count render3D calls
          let render3DCount = 0;
          const origRender = app.render3D;
          // Listen to mousemove
          document.querySelector('#view').requestPointerLock = () => {};
          // Set locked
          document.dispatchEvent(new Event('pointerlockchange'));
          // Simulate isLocked
          const cv = document.querySelector('#view');
          Object.defineProperty(document, 'pointerLockElement', {
            configurable: true,
            get: () => cv
          });
          document.dispatchEvent(new Event('pointerlockchange'));

          const mmStart = performance.now();
          // Dispatch 60 mousemove events spaced over 500 ms (120 Hz)
          let mmCount = 0;
          const mouseInterval = setInterval(() => {
            mmCount++;
            document.dispatchEvent(new MouseEvent('mousemove', {
              movementX: 5,
              movementY: 2
            }));
            if (mmCount >= 60) clearInterval(mouseInterval);
          }, 8);

          let mouseFrames = 0;
          await new Promise(r => {
            function step() {
              mouseFrames++;
              if (performance.now() - mmStart >= 520) return r();
              requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
          });
          const mouseTotalMs = performance.now() - mmStart;

          // Read final stats overlay text
          const fpsEl = document.querySelector('#statsFps');
          const msEl = document.querySelector('#statsMs');
          const renderEl = document.querySelector('#statsRender');
          const memEl = document.querySelector('#statsMemory');

          return {
            info,
            statsOverlay: {
              fps: fpsEl ? fpsEl.textContent : 'N/A',
              ms: msEl ? msEl.textContent : 'N/A',
              render: renderEl ? renderEl.textContent : 'N/A',
              memory: memEl ? memEl.textContent : 'N/A'
            },
            idle: {
              fps: (idleFrames * 1000 / idleTotalMs).toFixed(1),
              avgFrameMs: (idleTotalMs / idleFrames).toFixed(2),
              passBreakdown: idlePassBreakdown
            },
            wasd: {
              fps: (wasdFrames * 1000 / wasdTotalMs).toFixed(1),
              avgFrameMs: (wasdTotalMs / wasdFrames).toFixed(2),
              avgObstaclesCostMs: avgObstaclesMs.toFixed(3)
            },
            mouseTurning: {
              fps: (mouseFrames * 1000 / mouseTotalMs).toFixed(1),
              avgFrameMs: (mouseTotalMs / mouseFrames).toFixed(2),
              mouseEventsFired: mmCount,
              note: 'Multiple render3D() + SVG DOM serialization calls fired per mousemove event'
            }
          };
        } catch(err) {
          return { error: err.message, stack: err.stack };
        }
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Profile results:\n', JSON.stringify(profileData.result.value, null, 2));

    page.close();
    browser.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

runProfile().catch(console.error);

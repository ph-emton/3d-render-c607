import { spawn } from 'child_process';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--use-gl=angle',
    '--use-angle=metal',
    '--enable-gpu-rasterization',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--remote-debugging-port=9227',
    '--window-size=1280,800',
    '--user-data-dir=/tmp/test-ultra-ctx'
  ]);

  try {
    let browserWsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      try {
        const res = await fetch('http://127.0.0.1:9227/json/version');
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

    const pageWs = new WebSocket(`ws://127.0.0.1:9227/devtools/page/${targetId}`);
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
      deviceScaleFactor: 2.0, // Simulate Retina display
      mobile: false
    });

    const tStart = performance.now();
    await send('Page.navigate', { url: 'http://localhost:8080/?preset=overview' });
    await sleep(2500);
    const loadTimeMs = performance.now() - tStart;

    const result = await send('Runtime.evaluate', {
      expression: `(async () => {
        const app = window.__APP__;
        const autoTier = app.getActiveQualityTier();

        // 1. Toggle P overlay
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', code: 'KeyP' }));

        // 2. Test Ultra Tier with 1.0x and 1.5x render scale
        app.setQualityTier('ultra', true);
        if(window.rs3D) window.rs3D();

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        const fpsEl = document.querySelector('#statsFps');
        const msEl = document.querySelector('#statsMs');
        const rEl = document.querySelector('#statsRender');
        const mEl = document.querySelector('#statsMemory');
        const trEl = document.querySelector('#statsTierRes');
        const rdEl = document.querySelector('#statsResDetails');

        // Measure Overview FPS over 60 frames
        const t0 = performance.now();
        await new Promise(r => {
          let f = 0;
          function loop() {
            app.render3D();
            if (++f >= 60) return r();
            requestAnimationFrame(loop);
          }
          requestAnimationFrame(loop);
        });
        const total = performance.now() - t0;
        const fps = (60 * 1000) / total;

        const ultra1x = {
          tier: app.getActiveQualityTier(),
          dpr: window.devicePixelRatio,
          canvasClientWidth: app.renderer.domElement.clientWidth,
          canvasClientHeight: app.renderer.domElement.clientHeight,
          bufferWidth: app.renderer.domElement.width,
          bufferHeight: app.renderer.domElement.height,
          drawCalls: document.querySelector('#statsRender')?.textContent,
          memory: document.querySelector('#statsMemory')?.textContent,
          tierRes: trEl?.textContent,
          resDetails: rdEl?.textContent,
          fps: fps.toFixed(1),
          frameMs: (total / 60).toFixed(2)
        };

        // Test with 2.0x render scale slider
        app.setRenderScale(2.0, true);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        const ultra2x = {
          tier: app.getActiveQualityTier(),
          bufferWidth: app.renderer.domElement.width,
          bufferHeight: app.renderer.domElement.height,
          tierRes: document.querySelector('#statsTierRes')?.textContent,
          resDetails: document.querySelector('#statsResDetails')?.textContent
        };

        return {
          autoTier,
          ultra1x,
          ultra2x
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('LOAD TIME:', loadTimeMs.toFixed(0), 'ms');
    console.log('RESULT:', JSON.stringify(result.result.value, null, 2));

    pageWs.close();
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch(console.error);

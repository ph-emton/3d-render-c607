import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
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

async function capture() {
  const targetDir = process.argv[2] || 'baseline';
  const outDir = path.resolve('docs/screenshots', targetDir);
  mkdirSync(outDir, { recursive: true });

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--use-gl=angle',
    '--enable-webgl',
    '--remote-debugging-port=9222',
    '--window-size=1280,800',
    '--user-data-dir=/tmp/chrome-capture-profile'
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

    // Create a target page
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

    const views = [
      { name: 'overview', url: 'http://localhost:8080/?preset=overview&fullscreen=1' },
      { name: 'hall_walk', url: 'http://localhost:8080/?view=walk&spawn=hall&fullscreen=1' },
      { name: 'your_room', url: 'http://localhost:8080/?preset=mine&fullscreen=1' },
      { name: 'kitchen', url: 'http://localhost:8080/?preset=kitchen&fullscreen=1' },
      { name: 'brothers_room', url: 'http://localhost:8080/?preset=bro&fullscreen=1' }
    ];

    console.log(`\n=== Capturing views to ${outDir} ===`);
    for (const v of views) {
      page.consoleLogs = [];
      await page.send('Page.navigate', { url: v.url });
      // Wait for models to load & scene to render
      await sleep(3000);

      // Take screenshot
      const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
      const imgBuffer = Buffer.from(data, 'base64');
      const outPath = path.join(outDir, `${v.name}.png`);
      writeFileSync(outPath, imgBuffer);
      console.log(`Saved: ${outPath} (${(imgBuffer.length / 1024).toFixed(1)} KB)`);

      if (page.consoleLogs.length) {
        console.log(`  Console messages for ${v.name}:`);
        for (const log of page.consoleLogs) {
          console.log(`    [${log.type}] ${log.text}`);
        }
      }
    }

    // Benchmark FPS and frame time in walk mode
    console.log('\n=== Benchmarking performance (Walk mode, 120 frames) ===');
    await page.send('Page.navigate', { url: 'http://localhost:8080/?view=walk&spawn=hall&fullscreen=1' });
    await sleep(2500);

    const benchResult = await page.send('Runtime.evaluate', {
      expression: `new Promise(resolve => {
        let frames = 0;
        let totalTime = 0;
        const start = performance.now();
        function loop() {
          frames++;
          if (frames >= 120) {
            const dur = performance.now() - start;
            resolve({
              fps: (frames * 1000) / dur,
              avgFrameMs: dur / frames,
              frames
            });
            return;
          }
          requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
      })`,
      awaitPromise: true,
      returnByValue: true
    });

    const bench = benchResult.result.value;
    console.log(`Performance Results:`);
    console.log(`  FPS: ${bench.fps.toFixed(1)}`);
    console.log(`  Avg Frame Time: ${bench.avgFrameMs.toFixed(2)} ms`);
    console.log(`  Benchmarked over ${bench.frames} frames`);

    // Clean up
    page.close();
    browser.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

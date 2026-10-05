import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function trace() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--use-gl=angle',
    '--use-angle=metal',
    '--enable-gpu-rasterization',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--remote-debugging-port=9225',
    '--window-size=1280,800',
    '--user-data-dir=/tmp/test-trace-ctx'
  ]);

  try {
    let browserWsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      try {
        const res = await fetch('http://127.0.0.1:9225/json/version');
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

    const pageWs = new WebSocket(`ws://127.0.0.1:9225/devtools/page/${targetId}`);
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

    console.log('Navigating to walk mode...');
    await send('Page.navigate', { url: 'http://localhost:8080/?view=walk&spawn=hall&fullscreen=1' });
    await sleep(3500);

    console.log('Starting CDP Trace for 2 seconds...');
    const traceEvents = [];
    pageWs.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Tracing.dataCollected') {
        traceEvents.push(...msg.params.value);
      }
    });

    await send('Tracing.start', {
      categories: '-*,devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing,v8.execute'
    });

    // Simulate mouse moves during trace
    await send('Runtime.evaluate', {
      expression: `(() => {
        const cv = document.querySelector('#view');
        Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => cv });
        document.dispatchEvent(new Event('pointerlockchange'));
        let count = 0;
        const iv = setInterval(() => {
          document.dispatchEvent(new MouseEvent('mousemove', { movementX: 6, movementY: 1 }));
          if (++count >= 100) clearInterval(iv);
        }, 10);
      })()`
    });

    await sleep(1500);

    const traceCompleted = new Promise(r => {
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.method === 'Tracing.tracingComplete') {
          pageWs.removeEventListener('message', handler);
          r();
        }
      };
      pageWs.addEventListener('message', handler);
    });

    await send('Tracing.end');
    await traceCompleted;

    console.log(`Trace collected ${traceEvents.length} events.`);

    // Analyze trace events
    const eventCounts = {};
    let totalDurations = {};
    for (const ev of traceEvents) {
      const name = ev.name;
      eventCounts[name] = (eventCounts[name] || 0) + 1;
      if (ev.dur) {
        totalDurations[name] = (totalDurations[name] || 0) + ev.dur / 1000; // ms
      }
    }

    const sortedByDuration = Object.entries(totalDurations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    console.log('Top trace activities by total duration (ms):');
    for (const [name, dur] of sortedByDuration) {
      console.log(`  ${name.padEnd(30)}: ${dur.toFixed(2)} ms (count: ${eventCounts[name]})`);
    }

    pageWs.close();
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

trace().catch(console.error);

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function captureAll() {
  const tmpDir = path.join(os.tmpdir(), 'edge-all-' + Date.now());
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9444',
    '--disable-gpu',
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  async function take(url, outfile, width=1280, height=800, clickExpr=null) {
    const listRes = await fetch('http://127.0.0.1:9444/json/list');
    const tabs = await listRes.json();
    const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      let id = 1;
      const send = (method, params) => ws.send(JSON.stringify({ id: id++, method, params }));
      
      ws.onopen = () => {
        send('Page.enable');
        send('Runtime.enable');
        send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        send('Page.navigate', { url });
      };

      ws.onmessage = (msg) => {
        const d = JSON.parse(msg.data);
        if (d.method === 'Page.loadEventFired') {
          setTimeout(() => {
            if (clickExpr) {
              send('Runtime.evaluate', { expression: clickExpr });
              setTimeout(() => {
                send('Page.captureScreenshot', { format: 'png' });
              }, 600);
            } else {
              send('Page.captureScreenshot', { format: 'png' });
            }
          }, 600);
        }
        if (d.id && d.result?.data) {
          fs.writeFileSync(outfile, Buffer.from(d.result.data, 'base64'));
          console.log('Saved', outfile);
          ws.close();
          resolve();
        }
      };
      ws.onerror = reject;
    });
    await new Promise(r => setTimeout(r, 500));
  }

  try {
    await take('http://localhost:5173/', 'snap_title_final.png');
    await take('http://localhost:5173/?screen=map', 'snap_map_final.png');
    await take('http://localhost:5173/?spritedebug=1', 'snap_debug_final.png', 1280, 960);
    await take('http://localhost:5173/', 'snap_settings_final.png', 1280, 800, "document.querySelectorAll('button')[2].click()");
    await take('http://localhost:5173/', 'snap_grimoire_final.png', 1280, 800, "document.querySelectorAll('button')[1].click()");
  } finally {
    proc.kill();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e){}
  }
}

captureAll().then(() => console.log('All screenshots captured successfully!')).catch(e => { console.error(e); process.exit(1); });

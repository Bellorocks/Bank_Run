const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testScreens() {
  const tmpDir = path.join(os.tmpdir(), 'edge-grimoire-' + Date.now());
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9334',
    '--disable-gpu',
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const res = await fetch('http://127.0.0.1:9334/json/list');
    const tabs = await res.json();
    const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      let id = 1;
      const send = (method, params) => ws.send(JSON.stringify({ id: id++, method, params }));
      
      ws.onopen = () => {
        send('Page.enable');
        send('Runtime.enable');
        send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
        send('Page.navigate', { url: 'http://localhost:5173/' });
      };

      ws.onmessage = async (msg) => {
        const d = JSON.parse(msg.data);
        if (d.method === 'Page.loadEventFired') {
          setTimeout(() => {
            send('Runtime.evaluate', {
              expression: "document.querySelectorAll('button')[1].click()"
            });
            setTimeout(() => {
              send('Page.captureScreenshot', { format: 'png' });
            }, 600);
          }, 800);
        }
        if (d.id && d.result?.data) {
          fs.writeFileSync('snap_grimoire_modal.png', Buffer.from(d.result.data, 'base64'));
          console.log('Saved snap_grimoire_modal.png!');
          resolve();
        }
      };
      ws.onerror = reject;
    });
  } finally {
    proc.kill();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e){}
  }
}

testScreens().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

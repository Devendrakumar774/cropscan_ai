const { spawn } = require('child_process');
const fs = require('fs');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\project2\\.chrome-temp',
  ]);

  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch { }
    await new Promise((r) => setTimeout(r, 300));
  }

  if (!ready) {
    chrome.kill();
    throw new Error('Chrome failed to start on port 9222');
  }

  console.log('Chrome ready! Opening tab with PUT...');
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000', { method: 'PUT' });
  const tab = await newTabRes.json();
  console.log('Opened tab ID:', tab.id);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data.result);
      callbacks.delete(data.id);
    }
  };

  await new Promise((res) => (ws.onopen = res));

  await send('Page.enable');
  await send('Runtime.enable');

  await new Promise((r) => setTimeout(r, 2000));

  const titleResult = await send('Runtime.evaluate', { expression: 'document.title' });
  console.log('Page Title:', titleResult?.result?.value);

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  if (screenshot?.data) {
    fs.writeFileSync('test-home.png', Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot saved to test-home.png');
  }

  ws.close();
  await fetch(`http://127.0.0.1:9222/json/close/${tab.id}`, { method: 'PUT' });
  chrome.kill();
  console.log('CDP Test Success!');
}

main().catch(console.error);

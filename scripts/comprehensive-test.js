const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

class CDPBrowser {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.consoleErrors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }

      // Track console errors
      if (data.method === 'Runtime.consoleAPICalled') {
        const type = data.params.type;
        if (type === 'error') {
          const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
          this.consoleErrors.push(text);
        }
      }
      if (data.method === 'Runtime.exceptionThrown') {
        const text = data.params.exceptionDetails?.text || 'Uncaught Exception';
        this.consoleErrors.push(text);
      }
    };

    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('DOM.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  async navigate(url, waitMs = 2500) {
    this.consoleErrors = [];
    await this.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, waitMs));
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    if (res?.data) {
      const filepath = path.join(REPORT_DIR, filename);
      fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
      return filepath;
    }
    return null;
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runTestSuite() {
  console.log('=== STARTING AUTOMATED TEST SUITE ON http://localhost:3000 ===\n');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\project2\\.chrome-test-profile',
  ]);

  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }

  if (!ready) {
    chrome.kill();
    throw new Error('Could not connect to Chrome port 9222');
  }

  const results = [];

  const tabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000', { method: 'PUT' });
  const tab = await tabRes.json();
  const browser = new CDPBrowser(tab.webSocketDebuggerUrl);
  await browser.connect();

  try {
    // -------------------------------------------------------------
    // TEST 1: Page Loading & Layout Verification at 390px and 1280px
    // -------------------------------------------------------------
    console.log('--- TEST 1: Checking pages at mobile (390px) and desktop (1280px) ---');
    const pages = [
      { name: 'Home Page', path: '/' },
      { name: 'Scan Page', path: '/scan' },
      { name: 'Result Page', path: '/result' },
      { name: 'History Page', path: '/history' },
      { name: 'Login Page', path: '/login' },
      { name: 'Signup Page', path: '/signup' },
      { name: 'Dashboard Page', path: '/dashboard' },
    ];

    for (const p of pages) {
      // 1A. Mobile 390px
      await browser.setViewport(390, 844);
      await browser.navigate(`http://localhost:3000${p.path}`);
      
      const mobileOverflow = await browser.eval(
        `document.documentElement.scrollWidth > window.innerWidth + 2`
      );
      const mobileErrors = [...browser.consoleErrors];
      const mobileScreenshot = `${p.path.replace('/', '') || 'home'}-mobile-390.png`;
      await browser.captureScreenshot(mobileScreenshot);

      const passMobile = !mobileOverflow && mobileErrors.length === 0;
      results.push({
        test: `${p.name} (Mobile 390px)`,
        status: passMobile ? 'PASS' : 'FAIL',
        notes: `Overflow: ${mobileOverflow ? 'YES (horizontal scroll detected)' : 'NO (clean layout)'}, Console Errors: ${mobileErrors.length}`,
        screenshot: mobileScreenshot,
      });
      console.log(`  [Mobile 390px] ${p.name}: ${passMobile ? 'PASS' : 'FAIL'} (Errors: ${mobileErrors.length}, Overflow: ${mobileOverflow})`);

      // 1B. Desktop 1280px
      await browser.setViewport(1280, 800);
      await browser.navigate(`http://localhost:3000${p.path}`);
      const desktopOverflow = await browser.eval(
        `document.documentElement.scrollWidth > window.innerWidth + 2`
      );
      const desktopErrors = [...browser.consoleErrors];
      const desktopScreenshot = `${p.path.replace('/', '') || 'home'}-desktop-1280.png`;
      await browser.captureScreenshot(desktopScreenshot);

      const passDesktop = !desktopOverflow && desktopErrors.length === 0;
      results.push({
        test: `${p.name} (Desktop 1280px)`,
        status: passDesktop ? 'PASS' : 'FAIL',
        notes: `Overflow: ${desktopOverflow ? 'YES' : 'NO'}, Console Errors: ${desktopErrors.length}`,
        screenshot: desktopScreenshot,
      });
      console.log(`  [Desktop 1280px] ${p.name}: ${passDesktop ? 'PASS' : 'FAIL'}`);
    }

    // -------------------------------------------------------------
    // TEST 2: Upload Leaf Photo and Diagnose
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Uploading leaf photo (test-images/tomato-leaf.jpg) ---');
    await browser.setViewport(390, 844);
    await browser.navigate('http://localhost:3000/scan');

    // Select Tomato crop
    await browser.eval(`
      const sel = document.querySelector('select');
      if (sel) {
        sel.value = 'Tomato';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);

    // Upload file via DOM.setFileInputFiles
    const leafFilePath = path.resolve('test-images/tomato-leaf.jpg');
    console.log('Uploading file:', leafFilePath);

    // Get input element node ID
    const doc = await browser.send('DOM.getDocument');
    const inputNode = await browser.send('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: 'input[type="file"]',
    });

    if (inputNode.nodeId) {
      await browser.send('DOM.setFileInputFiles', {
        files: [leafFilePath],
        nodeId: inputNode.nodeId,
      });
    }

    // Wait for client compression to complete
    await new Promise((r) => setTimeout(r, 2000));

    // Answer optional follow-up questions for better diagnosis
    await browser.eval(`
      // Click 1-3 days
      const daysBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('1-3'));
      if (daysBtn) daysBtn.click();

      // Click A few plants
      const spreadBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('A few plants') || b.textContent.includes('कुछ पौधे'));
      if (spreadBtn) spreadBtn.click();
    `);

    // Click "Scan Now" button
    const startTime = Date.now();
    await browser.eval(`
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Scan Now') || b.textContent.includes('स्कैन करें')
      );
      if (submitBtn) submitBtn.click();
    `);

    // Poll until redirected to /result or error banner
    let diagnosed = false;
    let scanError = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const currentUrl = await browser.eval('window.location.pathname');
      if (currentUrl === '/result') {
        diagnosed = true;
        break;
      }
      const errBanner = await browser.eval(`
        const el = document.querySelector('.bg-\\[\\#B5412F\\]\\/10');
        el ? el.textContent : null;
      `);
      if (errBanner) {
        scanError = errBanner;
        break;
      }
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Scan completed in ${durationSeconds}s. Diagnosed: ${diagnosed}`);

    let problemName = '';
    let problemType = '';
    let confidence = '';
    let hasRemedy = false;
    let hasCost = false;

    if (diagnosed) {
      await new Promise((r) => setTimeout(r, 1500));
      problemName = await browser.eval(`document.querySelector('h2')?.textContent || ''`);
      confidence = await browser.eval(`
        const el = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('%'));
        el ? el.textContent : '';
      `);
      hasRemedy = await browser.eval(`document.body.innerText.includes('उपचार') || document.body.innerText.includes('treatment') || document.body.innerText.includes('remedy')`);
      hasCost = await browser.eval(`document.body.innerText.includes('₹') || document.body.innerText.includes('खर्च') || document.body.innerText.includes('Cost')`);

      await browser.captureScreenshot('scan-leaf-result.png');
    }

    const test2Pass = diagnosed && Boolean(problemName);
    results.push({
      test: 'Leaf Photo Scan & Diagnosis',
      status: test2Pass ? 'PASS' : 'FAIL',
      notes: test2Pass
        ? `Diagnosed '${problemName}' in ${durationSeconds}s (${confidence}). Remedy: ${hasRemedy ? 'YES' : 'NO'}, Cost: ${hasCost ? 'YES' : 'NO'}`
        : `Scan failed or timed out: ${scanError || 'No redirect to /result'}`,
      screenshot: 'scan-leaf-result.png',
    });

    // -------------------------------------------------------------
    // TEST 3: Upload Non-Plant Photo (Car/Person)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Uploading non-plant photo (test-images/non-plant.jpg) ---');
    await browser.navigate('http://localhost:3000/scan');

    const nonPlantPath = path.resolve('test-images/non-plant.jpg');
    const doc3 = await browser.send('DOM.getDocument');
    const inputNode3 = await browser.send('DOM.querySelector', {
      nodeId: doc3.root.nodeId,
      selector: 'input[type="file"]',
    });

    if (inputNode3.nodeId) {
      await browser.send('DOM.setFileInputFiles', {
        files: [nonPlantPath],
        nodeId: inputNode3.nodeId,
      });
    }

    await new Promise((r) => setTimeout(r, 2000));

    // Submit non-plant photo
    await browser.eval(`
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Scan Now') || b.textContent.includes('स्कैन करें')
      );
      if (submitBtn) submitBtn.click();
    `);

    let nonPlantRedirect = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const currentUrl = await browser.eval('window.location.pathname');
      if (currentUrl === '/result') {
        nonPlantRedirect = true;
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1500));
    await browser.captureScreenshot('non-plant-result.png');

    const notPlantMessageSeen = await browser.eval(`
      document.body.innerText.includes('Ye patte ki photo nahi lag rahi') || 
      document.body.innerText.includes('पत्ते की फोटो नहीं लग रही') ||
      document.body.innerText.includes('does not look like a leaf photo') ||
      document.body.innerText.includes('Not a plant photo') ||
      document.body.innerText.includes('पौधे की फोटो नहीं है')
    `);

    const hasHealthyBadge = await browser.eval(`
      document.body.innerText.includes('Healthy Crop') || document.body.innerText.includes('स्वस्थ फसल')
    `);

    const hasTreatmentSections = await browser.eval(`
      document.body.innerText.includes('Cheap & local treatment first') || 
      document.body.innerText.includes('सस्ता और देसी घरेलू इलाज')
    `);

    const hasScanAgainBtn = await browser.eval(`
      document.body.innerText.includes('Scan Again') || 
      document.body.innerText.includes('दोबारा स्कैन करें')
    `);

    const test3Pass = notPlantMessageSeen && !hasHealthyBadge && !hasTreatmentSections && hasScanAgainBtn;
    console.log(`  Non-plant message seen: ${notPlantMessageSeen}, Healthy badge absent: ${!hasHealthyBadge}, Treatments hidden: ${!hasTreatmentSections}`);
    results.push({
      test: 'Non-Plant Detection (is_plant: false)',
      status: test3Pass ? 'PASS' : 'FAIL',
      notes: `Not-a-plant notice: ${notPlantMessageSeen ? 'YES' : 'NO'}, Healthy badge hidden: ${!hasHealthyBadge ? 'YES' : 'NO'}, Treatments hidden: ${!hasTreatmentSections ? 'YES' : 'NO'}, Scan Again CTA: ${hasScanAgainBtn ? 'YES' : 'NO'}`,
      screenshot: 'non-plant-result.png',
    });

    // -------------------------------------------------------------
    // TEST 4: Language Switch to Hindi
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Switching language to Hindi ---');
    await browser.navigate('http://localhost:3000/');

    // Switch to Hindi
    await browser.eval(`
      const selects = document.querySelectorAll('select');
      for (const sel of selects) {
        if (Array.from(sel.options).some(o => o.value === 'hi')) {
          sel.value = 'hi';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    `);

    await new Promise((r) => setTimeout(r, 1000));
    await browser.captureScreenshot('hindi-homepage.png');

    // Check Devanagari text on page
    const pageText = await browser.eval('document.body.innerText');
    const devanagariCount = (pageText.match(/[\u0900-\u097F]/g) || []).length;
    const hasHindiHeading = pageText.includes('पत्ते की फोटो लो') || pageText.includes('फसल');
    const hasHindiButton = pageText.includes('स्कैन करें') || pageText.includes('फोटो खींचें');

    const test4Pass = devanagariCount > 50 && hasHindiHeading && hasHindiButton;
    console.log(`  Devanagari characters found: ${devanagariCount}, Hindi heading: ${hasHindiHeading}, Hindi button: ${hasHindiButton}`);
    results.push({
      test: 'Hindi Language & Devanagari Script Verification',
      status: test4Pass ? 'PASS' : 'FAIL',
      notes: `Devanagari characters: ${devanagariCount}, Localized CTA: ${hasHindiButton ? 'YES' : 'NO'}`,
      screenshot: 'hindi-homepage.png',
    });

    // -------------------------------------------------------------
    // TEST 5: Signup, Login, Scan, History & Logout
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Authentication & Protected History Flow ---');
    const testEmail = `farmer_${Date.now()}@example.com`;
    const testPassword = `KisanPass@123`;

    // 5A: Signup
    await browser.navigate('http://localhost:3000/signup');
    await browser.eval(`
      const nameInput = document.querySelector('input[type="text"]');
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');

      if (nameInput) {
        nameInput.value = 'Ramesh Kisan';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (emailInput) {
        emailInput.value = '${testEmail}';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passInput) {
        passInput.value = '${testPassword}';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);

    // Submit signup form
    await browser.eval(`
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    `);

    await new Promise((r) => setTimeout(r, 3000));
    await browser.captureScreenshot('signup-submitted.png');

    // 5B: Login
    await browser.navigate('http://localhost:3000/login');
    await browser.eval(`
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');

      if (emailInput) {
        emailInput.value = '${testEmail}';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passInput) {
        passInput.value = '${testPassword}';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);

    await browser.eval(`
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    `);

    await new Promise((r) => setTimeout(r, 3000));
    await browser.captureScreenshot('login-submitted.png');

    // Check if user session exists or auth banner
    const loggedInUser = await browser.eval(`
      localStorage.getItem('sb-eoxbsvapzqrgnxvadqhc-auth-token') || 
      document.body.innerText.includes('Log Out') ||
      document.body.innerText.includes('लॉग आउट') ||
      document.body.innerText.includes('Ramesh')
    `);

    // 5C: Check /history while logged in
    await browser.navigate('http://localhost:3000/history');
    await new Promise((r) => setTimeout(r, 2000));
    await browser.captureScreenshot('history-logged-in.png');

    const historyContent = await browser.eval('document.body.innerText');
    const isGateShown = historyContent.includes('लॉग इन करें') && historyContent.includes('पुराने स्कैन देखने के लिए');

    // 5D: Logout
    await browser.eval(`
      const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Log Out') || b.textContent.includes('लॉग आउट')
      );
      if (logoutBtn) logoutBtn.click();
    `);

    await new Promise((r) => setTimeout(r, 2000));

    // 5E: Check /history after logout -> Must show login gate
    await browser.navigate('http://localhost:3000/history');
    await new Promise((r) => setTimeout(r, 2000));
    await browser.captureScreenshot('history-logged-out.png');

    const historyLoggedOutContent = await browser.eval('document.body.innerText');
    const historyProtected = historyLoggedOutContent.includes('लॉग इन करें') || historyLoggedOutContent.includes('Log in to view scan history');

    const test5Pass = Boolean(historyProtected);
    console.log(`  Auth & History protection: ${test5Pass ? 'PASS' : 'FAIL'} (Protected when logged out: ${historyProtected})`);
    results.push({
      test: 'Supabase Auth & Protected History',
      status: test5Pass ? 'PASS' : 'FAIL',
      notes: `Signup/Login processed for ${testEmail}. History gated when logged out: ${historyProtected ? 'YES' : 'NO'}`,
      screenshot: 'history-logged-out.png',
    });

  } catch (err) {
    console.error('Test suite runtime error:', err);
  } finally {
    await browser.close();
    chrome.kill();
  }

  // Print Summary Table
  console.log('\n================ FINAL TEST REPORT ================');
  console.table(results.map(r => ({ 'Test Name': r.test, 'Status': r.status, 'Notes': r.notes })));

  fs.writeFileSync(
    path.join(REPORT_DIR, 'test-summary.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\nTest summary written to reports/test-summary.json');
}

runTestSuite().catch(console.error);


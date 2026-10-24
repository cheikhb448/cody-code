// Test Phase 3 : le design Cody (couleurs mesurées sur la capture de référence) + capture d'écran.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 3::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/DropLink';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
const attendus = {
  '.part.sidebar': '#081425',
  '.part.activitybar': '#061122',
  '.part.statusbar': '#0a142b',
  '.part.panel': '#061122',
  '.part.titlebar': '#071224',
  '.monaco-editor .monaco-editor-background': '#071224',
};

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 } });
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 160)));
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(4000);

  const ouvrir = async (nom) => {
    await page.keyboard.press('Control+p');
    await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 30000 });
    await page.keyboard.type(nom, { delay: 30 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
  };
  await ouvrir('public/index.php');
  await ouvrir('HomeController.php');
  await page.keyboard.press('Control+g');
  await page.waitForTimeout(500);
  await page.keyboard.type('10', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/cody-logs/p3-1-ecran.png' });

  const cls = await page.evaluate(() => document.body.className);
  log('classes du <body> : ' + cls.slice(0, 120));
  verifier(/vs-dark/.test(cls), 'thème sombre actif');

  for (const [sel, hex] of Object.entries(attendus)) {
    const val = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el).backgroundColor : null;
    }, sel);
    verifier(val === rgb(hex), `${sel} fond ${val} (attendu ${rgb(hex)})`);
  }

  // Couleur d'un mot-clé de code (class / namespace) : attendu #f4b4f6
  const motCle = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('.monaco-editor .view-line span span')];
    const s = spans.find(x => x.textContent.trim() === 'namespace' || x.textContent.trim() === 'class');
    return s ? getComputedStyle(s).color : null;
  });
  verifier(motCle === rgb('#f4b4f6'), `couleur des mots-clés ${motCle} (attendu ${rgb('#f4b4f6')})`);
  annoter(erreurs ? 'error' : 'notice');
  await browser.close();
  process.exit(erreurs ? 1 : 0);
} catch (e) {
  log('ÉCHEC : ' + e.message.split('\n')[0]);
  try { await browser?.contexts()[0]?.pages()[0]?.screenshot({ path: '/tmp/cody-logs/p3-echec.png' }); } catch {}
  annoter('error');
  process.exit(1);
}

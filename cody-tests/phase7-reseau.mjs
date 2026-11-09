// Test Phase 7 : Cody Code ne doit contacter aucun serveur inattendu (pas de Microsoft, pas de télémétrie).
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 7::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/DropLink7';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

// Seuls ces serveurs sont acceptés : cet ordinateur et le catalogue d'extensions libre Open VSX
const autorise = h => h === '127.0.0.1' || h === 'localhost' || h.endsWith('.localhost')
  || h === 'open-vsx.org' || h.endsWith('.open-vsx.org') || h === 'openvsx.eclipsecontent.org';

let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1671, height: 941 }, locale: 'en-US' });
  const hotes = new Map();
  context.on('request', r => {
    try {
      const u = new URL(r.url());
      if (u.protocol === 'data:' || u.protocol === 'blob:') return;
      hotes.set(u.hostname, (hotes.get(u.hostname) ?? 0) + 1);
    } catch { /* ignoré */ }
  });
  const page = await context.newPage();
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 160)));
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(6000);

  const commande = async (nom) => {
    await page.keyboard.press('F1');
    await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
    await page.keyboard.type(nom, { delay: 30 });
    await page.waitForTimeout(800);
    const ligne = page.locator('.quick-input-list .monaco-list-row .label-name', { hasText: new RegExp(`^${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first();
    if (await ligne.count()) await ligne.click(); else await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  };

  // 1. Aperçu Markdown : affiché depuis ce serveur local
  try {
    await page.keyboard.press('Control+p');
    await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
    await page.keyboard.type('README.md', { delay: 30 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    await commande('Markdown: Open Preview');
    await page.waitForTimeout(4000);
    const w = await page.locator('.webview').count();
    const src = await page.evaluate(() => [...document.querySelectorAll('iframe')].map(f => f.src).filter(Boolean));
    verifier(w >= 1, `aperçu Markdown affiché (webview : ${w})`);
    const iframeLocale = src.some(s => /^http:\/\/[^/]+\.localhost(:\d+)?\//.test(s));
    verifier(iframeLocale, `l'aperçu vient de cet ordinateur (cadres : ${src.map(s => new URL(s).host).slice(0, 3).join(', ')})`);
  } catch (e) { verifier(false, 'aperçu Markdown (erreur : ' + String(e.message).split('\n')[0].slice(0, 120) + ')'); }
  await page.keyboard.press('Escape').catch(() => {});

  // 2. Catalogue d'extensions (Open VSX)
  try {
    await page.keyboard.press('Control+Shift+x');
    await page.waitForSelector('.extensions-viewlet', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.keyboard.type('yaml', { delay: 30 });
    await page.waitForTimeout(6000);
  } catch (e) { log('extensions : ' + String(e.message).split('\n')[0].slice(0, 100)); }

  await page.waitForTimeout(8000);
  const liste = [...hotes.entries()].map(([h, n]) => `${h} (${n})`).join(', ');
  log('serveurs contactés : ' + liste);
  const intrus = [...hotes.keys()].filter(h => !autorise(h));
  verifier(intrus.length === 0, intrus.length === 0 ? 'aucun serveur inattendu contacté' : 'serveurs inattendus : ' + intrus.join(', '));
  verifier(![...hotes.keys()].some(h => /microsoft|vscode-cdn|visualstudio|github|aka\.ms|applicationinsights|vsassets/i.test(h)), 'aucun contact avec Microsoft ni GitHub');
  await page.screenshot({ path: '/tmp/cody-logs/p7-reseau.png' });
  log(erreurs === 0 ? 'TOUT EST BON' : `${erreurs} échec(s)`);
  annoter(erreurs === 0 ? 'notice' : 'error');
} catch (e) {
  log('ERREUR FATALE: ' + e.message);
  annoter('error');
  erreurs++;
} finally {
  await browser?.close();
}
process.exit(erreurs === 0 ? 0 : 1);

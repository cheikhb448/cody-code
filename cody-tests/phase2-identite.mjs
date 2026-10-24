// Test Phase 2 : l'identité visible est « Cody Code », sans trace de Visual Studio Code / Code - OSS.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 2::${msg}`);
};
const interdits = [/Visual Studio/, /Code\s*[-–]+\s*OSS/i, /VS\s?Code/, /vscode-?oss/i];
const trouver = (texte) => {
  const res = [];
  for (const re of interdits) {
    const m = re.exec(texte);
    if (m) res.push(`« ${m[0]} » dans : …${texte.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, ' ')}…`);
  }
  return res;
};

const dossier = '/tmp/cody-ws2';
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(`${dossier}/bonjour.txt`, 'salut\n');
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(4000);

  const titre = await page.title();
  log('titre de la page : ' + JSON.stringify(titre));
  verifier(/Cody Code/.test(titre), 'le titre contient « Cody Code »');
  verifier(trouver(titre).length === 0, 'le titre ne contient aucune trace Microsoft');

  const favicon = await page.evaluate(() => [...document.querySelectorAll('link[rel*="icon"]')].map(l => l.href));
  log('icônes : ' + JSON.stringify(favicon));
  for (const href of favicon) {
    const r = await page.request.get(href);
    verifier(r.ok(), `icône servie (${href.slice(-40)}) HTTP ${r.status()}`);
  }

  const manifestLien = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.href);
  if (manifestLien) {
    const man = await (await page.request.get(manifestLien)).text();
    log('manifest : ' + man.slice(0, 160).replace(/\s+/g, ' '));
    verifier(/Cody Code/.test(man), 'le manifest web contient « Cody Code »');
    verifier(trouver(man).length === 0, 'le manifest ne contient aucune trace Microsoft');
  }

  // Texte visible de l'interface
  let texte = await page.evaluate(() => document.body.innerText);
  let trouves = trouver(texte);
  verifier(trouves.length === 0, 'aucun nom interdit dans le texte visible de l\'interface');
  trouves.forEach(t => log('  -> ' + t));

  // Fenêtre « À propos »
  await page.keyboard.press('F1');
  await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 15000 });
  await page.keyboard.type('Help: About', { delay: 40 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const apropos = await page.evaluate(() => (document.querySelector('.monaco-dialog-box, .dialog-shadow')?.innerText) || '');
  log('À propos : ' + JSON.stringify(apropos.replace(/\s+/g, ' ').slice(0, 220)));
  verifier(/Cody Code/.test(apropos), 'la fenêtre « À propos » affiche « Cody Code »');
  trouves = trouver(apropos);
  verifier(trouves.length === 0, 'la fenêtre « À propos » ne contient aucune trace Microsoft');
  trouves.forEach(t => log('  -> ' + t));
  await page.screenshot({ path: '/tmp/cody-logs/identite-apropos.png' });
  await page.keyboard.press('Escape');

  await browser.close();
  if (erreurs) throw new Error(`${erreurs} vérification(s) en échec`);
  annoter('notice');
} catch (e) {
  log('ÉCHEC : ' + e.message.split('\n')[0]);
  annoter('error');
  process.exit(1);
}

// Test Phase 8.1 : cloner un dépôt depuis l'éditeur (commande « Git: Clone »).
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 8 clone::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };
const sh = (cmd, cwd = '/tmp') => execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const ws = '/tmp/ws8', distant = '/tmp/depot8.git', source = '/tmp/source8', cibles = '/tmp/clones8';
for (const d of [ws, distant, source, cibles]) fs.rmSync(d, { recursive: true, force: true });
for (const d of [ws, source, cibles]) fs.mkdirSync(d, { recursive: true });
fs.mkdirSync('/tmp/cody-logs', { recursive: true });
sh(`git init -q -b main`, source);
sh('git config user.email t@cody.local && git config user.name Test', source);
fs.writeFileSync(`${source}/bonjour.txt`, 'cloné avec succès\n');
sh('git add -A && git commit -q -m depart', source);
sh(`git clone -q --bare ${source} ${distant}`);

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, locale: 'en-US' });
  await page.goto(`http://127.0.0.1:8080/?folder=${ws}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(6000);

  const attendre = async (cond, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await cond()) return true; await page.waitForTimeout(500); } return false; };
  const saisir = async (texte) => { await page.keyboard.type(texte, { delay: 30 }); await page.waitForTimeout(800); await page.keyboard.press('Enter'); };

  await page.keyboard.press('F1');
  await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
  await page.keyboard.type('Git: Clone', { delay: 30 });
  await page.waitForTimeout(1000);
  const ligne = page.locator('.quick-input-list .monaco-list-row .label-name', { hasText: /^Git: Clone$/ }).first();
  if (await ligne.count()) await ligne.click(); else await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/cody-logs/p8-clone-1.png' });

  // Adresse du dépôt
  await saisir(distant);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/cody-logs/p8-clone-2.png' });

  // Dossier de destination : sélecteur de dossier de l'éditeur (saisie du chemin)
  const champ = page.locator('.quick-input-widget input, .monaco-dialog-box input').first();
  const attenteDestination = await attendre(async () => /Select|Repository|Destination|Open/i.test(await page.evaluate(() => document.body.innerText)), 10000);
  log('sélecteur de destination vu : ' + attenteDestination);
  await page.keyboard.press('Control+a');
  await page.keyboard.type(cibles + '/', { delay: 30 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/cody-logs/p8-clone-3.png' });
  const bouton = page.locator('.quick-input-widget .monaco-button, .quick-input-widget a.monaco-button').filter({ hasText: /Select|Destination|Repository/i }).first();
  if (await bouton.count()) await bouton.click(); else await page.keyboard.press('Enter');

  const clone = `${cibles}/depot8/bonjour.txt`;
  const ok = await attendre(async () => fs.existsSync(clone), 60000);
  await page.screenshot({ path: '/tmp/cody-logs/p8-clone-4.png' });
  verifier(ok, 'dépôt cloné depuis l\'éditeur (fichier présent sur le disque)');
  if (ok) verifier(fs.readFileSync(clone, 'utf8').includes('cloné avec succès'), 'contenu du dépôt cloné correct');

  // Proposition d'ouvrir le dépôt cloné
  const propose = await attendre(async () => /cloned repository/i.test(await page.evaluate(() => document.body.innerText)), 15000);
  log('proposition d\'ouvrir le dépôt cloné vue : ' + propose + ' (information seulement : le clonage lui-même est vérifié ci-dessus)');

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

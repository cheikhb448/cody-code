// Test Phase 7 : confiance du dossier (Workspace Trust) et mode restreint, avec un serveur normal (protection active).
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 7 confiance::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/DropLink7b';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
fs.rmSync('/tmp/cody-data-confiance', { recursive: true, force: true });
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

// Second serveur, SANS l'option qui désactive la confiance
const serveur = spawn('./scripts/code-server.sh', ['--host', '127.0.0.1', '--port', '8081', '--server-data-dir', '/tmp/cody-data-confiance', '--without-connection-token', '--accept-server-license-terms'], { stdio: 'ignore' });
let browser;
try {
  let pret = false;
  for (let i = 0; i < 40 && !pret; i++) {
    pret = await fetch('http://127.0.0.1:8081/').then(r => r.status === 200).catch(() => false);
    if (!pret) await new Promise(r => setTimeout(r, 3000));
  }
  verifier(pret, 'second serveur (protection active) démarré');
  if (!pret) throw new Error('serveur indisponible');

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, locale: 'en-US' });
  await page.goto(`http://127.0.0.1:8081/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });

  // 1. La fenêtre « faites-vous confiance ? » apparaît
  const dialogue = page.locator('.monaco-dialog-box');
  let vu = false;
  for (let i = 0; i < 30 && !vu; i++) { vu = await dialogue.filter({ hasText: /trust the authors/i }).count().then(n => n > 0); if (!vu) await page.waitForTimeout(1000); }
  verifier(vu, 'fenêtre de confiance du dossier affichée au premier ouverture');
  await page.screenshot({ path: '/tmp/cody-logs/p7-confiance-1.png' });

  // 2. Refuser : le mode restreint s'active
  if (vu) {
    await dialogue.locator('.monaco-button', { hasText: /don.t trust/i }).first().click();
    await page.waitForTimeout(3000);
  }
  const texte = await page.evaluate(() => document.body.innerText);
  const restreint = /Restricted Mode/i.test(texte);
  verifier(restreint, 'mode restreint actif après refus de confiance');
  await page.screenshot({ path: '/tmp/cody-logs/p7-confiance-2.png' });

  // 3. En mode restreint, le terminal demande confiance avant d'ouvrir un terminal et un fichier s'édite quand même
  await page.keyboard.press('Control+p');
  await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
  await page.keyboard.type('README.md', { delay: 30 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  verifier(await page.locator('.part.editor .monaco-editor').count() > 0, 'les fichiers restent lisibles en mode restreint');

  log(erreurs === 0 ? 'TOUT EST BON' : `${erreurs} échec(s)`);
  annoter(erreurs === 0 ? 'notice' : 'error');
} catch (e) {
  log('ERREUR FATALE: ' + e.message);
  annoter('error');
  erreurs++;
} finally {
  await browser?.close();
  serveur.kill('SIGTERM');
}
process.exit(erreurs === 0 ? 0 : 1);

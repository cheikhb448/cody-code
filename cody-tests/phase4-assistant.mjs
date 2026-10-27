// Test Phase 4 : panneau Cody Assistant (à droite). Les vérifications s'ajoutent étape par étape.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 4::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/DropLink4';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, locale: 'fr-FR' });
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 160)));
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(5000);

  const textePanneau = () => page.evaluate(() => {
    const p = document.querySelector('.part.auxiliarybar');
    const visible = !!p && p.offsetWidth > 50 && getComputedStyle(p).display !== 'none';
    return { visible, texte: visible ? p.innerText.replace(/\s+/g, ' ').slice(0, 300) : '' };
  });

  // 4.2 : le panneau de droite est Cody Assistant (et plus le Chat de VS Code)
  let etat = await textePanneau();
  log('panneau de droite : ' + etat.texte);
  verifier(etat.visible, 'le panneau de droite est ouvert au démarrage');
  verifier(/Cody Assistant/.test(etat.texte), 'le panneau de droite affiche « Cody Assistant »');
  verifier(!/Conversation|Build with Agent|Créer avec des assistants/.test(etat.texte), 'le Chat de VS Code n\'est plus affiché');
  await page.screenshot({ path: '/tmp/cody-logs/p4-1-panneau.png' });

  // Fermer puis rouvrir (Ctrl+Alt+B)
  await page.keyboard.press('Control+Alt+b');
  await page.waitForTimeout(1500);
  etat = await textePanneau();
  verifier(!etat.visible, 'le panneau se ferme (Ctrl+Alt+B)');
  await page.keyboard.press('Control+Alt+b');
  await page.waitForTimeout(1500);
  etat = await textePanneau();
  verifier(etat.visible && /Cody Assistant/.test(etat.texte), 'le panneau se rouvre avec Cody Assistant');

  annoter(erreurs ? 'error' : 'notice');
  await browser.close();
  process.exit(erreurs ? 1 : 0);
} catch (e) {
  log('ÉCHEC : ' + e.message.split('\n')[0]);
  try { await browser?.contexts()[0]?.pages()[0]?.screenshot({ path: '/tmp/cody-logs/p4-echec.png' }); } catch { /* ignoré */ }
  annoter('error');
  process.exit(1);
}

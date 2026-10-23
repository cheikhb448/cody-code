// Test Phase 1 : ouvrir l'éditeur, ouvrir un fichier, écrire, sauvegarder.
// Les messages sont aussi envoyés en « annotations » GitHub pour être lisibles sans télécharger les journaux.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 1::${msg}`);
};

const dossier = '/tmp/cody-ws';
const fichier = `${dossier}/test.txt`;
const texte = 'Bonjour depuis Cody Code';
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(fichier, 'debut\n');

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') log('console.error: ' + m.text().slice(0, 200)); });
  page.on('requestfailed', r => log('requête échouée: ' + r.url().slice(0, 150)));
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  log('page chargée');
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  log('OK éditeur affiché');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/cody-logs/1-editeur.png' });

  await page.keyboard.press('Control+p');
  await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 30000 });
  await page.keyboard.type('test.txt');
  await page.waitForTimeout(2000);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.monaco-editor .view-lines', { timeout: 30000 });
  log('OK fichier ouvert');

  await page.click('.monaco-editor .view-lines');
  await page.keyboard.press('Control+End');
  await page.keyboard.type(texte);
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/cody-logs/2-apres-sauvegarde.png' });

  const contenu = fs.readFileSync(fichier, 'utf8');
  log('Contenu du fichier : ' + JSON.stringify(contenu));
  if (!contenu.includes(texte)) throw new Error("le texte n'a pas été sauvegardé");
  log('OK sauvegarde confirmée');
  annoter('notice');
  await browser.close();
} catch (e) {
  log('ÉCHEC : ' + e.message.split('\n')[0]);
  try { await browser?.contexts()[0]?.pages()[0]?.screenshot({ path: '/tmp/cody-logs/echec.png' }); } catch {}
  try { log('server.log (fin): ' + fs.readFileSync('/tmp/cody-logs/server.log', 'utf8').slice(-800)); } catch {}
  annoter('error');
  process.exit(1);
}

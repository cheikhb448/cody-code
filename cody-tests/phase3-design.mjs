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
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, locale: 'fr-FR' });
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 160)));
  let vusConsole = 0;
  const vus404 = new Set();
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('web-extension-resource') && vus404.size < 12 && !vus404.has(r.url())) { vus404.add(r.url()); log('HTTP ' + r.status() + ' ' + r.url().replace('http://127.0.0.1:8080', '')); } });
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

  // Panneau du bas : terminal
  await page.keyboard.press('Control+`');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: '/tmp/cody-logs/p3-2-terminal.png' });

  const cls = await page.evaluate(() => [document.documentElement, document.body, document.querySelector('.monaco-workbench')].map(e => e?.className ?? '').join(' | '));
  log('classes : ' + cls.slice(0, 200));
  verifier(/vs-dark|vscode-theme-defaults-themes-cody_dark/.test(cls), 'thème sombre actif');

  for (const [sel, hex] of Object.entries(attendus)) {
    const val = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el).backgroundColor : null;
    }, sel);
    verifier(val === rgb(hex), `${sel} fond ${val} (attendu ${rgb(hex)})`);
  }

  const texteInterface = await page.evaluate(() => document.body.innerText);
  log('extrait interface : ' + texteInterface.replace(/\s+/g, ' ').slice(0, 260));
  verifier(/Explorateur/i.test(texteInterface), 'interface en français (« Explorateur »)');
  const soleil = await page.locator('.codicon-cody-theme-toggle').count();
  verifier(soleil > 0, 'bouton soleil (thème clair/sombre) présent dans la barre de titre');

  // Couleur d'un mot-clé de code (class / namespace) : attendu #f4b4f6
  const motCle = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('.monaco-editor .view-line span span')];
    const s = spans.find(x => x.textContent.trim() === 'namespace' || x.textContent.trim() === 'class');
    return s ? getComputedStyle(s).color : null;
  });
  verifier(motCle === rgb('#f4b4f6'), `couleur des mots-clés ${motCle} (attendu ${rgb('#f4b4f6')})`);

  // Section BRANCHES (en bas de l'explorateur)
  verifier(/Branches/i.test(texteInterface), 'section « Branches » présente dans l\'explorateur');

  // Bouton soleil : passe en clair puis revient en sombre
  const classes = () => page.evaluate(() => document.querySelector('.monaco-workbench')?.className ?? '');
  const attendre = async (sombre) => {
    for (let i = 0; i < 20; i++) {
      if (/vs-dark/.test(await classes()) === sombre) { return true; }
      await page.waitForTimeout(500);
    }
    return false;
  };
  page.on('console', m => { if (m.type() === 'error' && vusConsole++ < 8) { log('console: ' + m.text().slice(0, 160)); } });
  await page.locator('.codicon-cody-theme-toggle').first().click();
  let ok = await attendre(false);
  log('après clic sur le soleil : ' + (await classes()).split(' ').filter(c => /^vs/.test(c)).join(' '));
  if (!ok) {
    // Même action par la palette de commandes, pour savoir si le problème vient du clic ou de l'action
    await page.keyboard.press('F1');
    await page.waitForTimeout(800);
    await page.keyboard.type('basculer entre le thème clair', { delay: 30 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    ok = await attendre(false);
    log('après la palette de commandes : ' + (await classes()).split(' ').filter(c => /^vs/.test(c)).join(' '));
  }
  if (!ok) {
    log('messages à l\'écran : ' + (await page.evaluate(() => (document.querySelector('.notifications-toasts')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 300))));
    // Le thème « Cody Light » existe-t-il ? Essai direct par le sélecteur de thèmes
    await page.keyboard.press('Escape');
    await page.keyboard.press('F1');
    await page.waitForTimeout(800);
    await page.keyboard.type('Thème de couleur', { delay: 30 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    log('liste des thèmes : ' + (await page.evaluate(() => (document.querySelector('.quick-input-list')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 300))));
    await page.keyboard.type('Cody Light', { delay: 30 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    ok = await attendre(false);
    log('après sélection directe : ' + (await classes()).split(' ').filter(c => /^vs/.test(c)).join(' '));
  }
  verifier(ok, 'le bouton soleil passe en thème clair');
  await page.screenshot({ path: '/tmp/cody-logs/p3-3-clair.png' });
  if (ok) {
    await page.locator('.codicon-cody-theme-toggle').first().click();
    verifier(await attendre(true), 'le bouton soleil revient en thème sombre');
  }

  annoter(erreurs ? 'error' : 'notice');
  await browser.close();
  process.exit(erreurs ? 1 : 0);
} catch (e) {
  log('ÉCHEC : ' + e.message.split('\n')[0]);
  try { await browser?.contexts()[0]?.pages()[0]?.screenshot({ path: '/tmp/cody-logs/p3-echec.png' }); } catch {}
  annoter('error');
  process.exit(1);
}

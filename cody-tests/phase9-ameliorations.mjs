// Test Phase 9 : améliorations demandées par les développeurs (léger, mémoire visible, recherche propre).
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 9::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/DropLink9';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
fs.mkdirSync(`${dossier}/node_modules/lib`, { recursive: true });
fs.writeFileSync(`${dossier}/node_modules/lib/inutile.txt`, 'MOTUNIQUE9 dans une bibliothèque\n');
fs.writeFileSync(`${dossier}/app/exemple.txt`, 'MOTUNIQUE9 dans mon code\n');
for (const nom of ['exemple.py', 'document.pdf', 'notes.txt', 'Dockerfile']) fs.writeFileSync(`${dossier}/${nom}`, 'x\n');
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, locale: 'en-US' });
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(8000);

  // 0. Icônes de fichiers : vrais logos (Python, PDF, texte, Docker) au lieu de simples pastilles
  try {
    const icones = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.part.sidebar .explorer-folders-view .monaco-list-row')].map(r => {
      const lab = r.querySelector('.monaco-icon-label');
      const nom = (r.querySelector('.label-name')?.textContent ?? '').trim();
      const av = lab ? getComputedStyle(lab, '::before') : null;
      const url = av ? (av.backgroundImage !== 'none' ? av.backgroundImage : (av.maskImage || '')) : '';
      return [nom, url];
    })));
    log('icônes : ' + JSON.stringify(Object.fromEntries(Object.entries(icones).map(([k, v]) => [k, v.slice(-45)]))));
    verifier(/python/i.test(icones['exemple.py'] ?? ''), 'icône Python : logo propre');
    verifier(/pdf/i.test(icones['document.pdf'] ?? ''), 'icône PDF présente');
    verifier(/docker/i.test(icones['Dockerfile'] ?? ''), 'icône Docker présente');
    verifier(/document|text|txt/i.test(icones['notes.txt'] ?? ''), 'icône fichier texte présente');
    await page.locator('.part.sidebar').screenshot({ path: '/tmp/cody-logs/p9-icones.png' }).catch(() => {});
  } catch (e) { verifier(false, 'icônes (' + String(e.message).split('\n')[0].slice(0, 100) + ')'); }

  // 1. Indicateur de mémoire dans la barre d'état
  const memoire = page.locator('.statusbar .statusbar-item', { hasText: /\d+\s*Mo/ }).first();
  verifier(await memoire.count() > 0, 'la mémoire utilisée est affichée dans la barre d\'état');
  if (await memoire.count() > 0) log('mémoire affichée : ' + (await memoire.innerText()).replace(/\s+/g, ' '));

  // 2. La recherche ignore node_modules
  try {
    await page.keyboard.press('F1');
    await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
    await page.keyboard.type('View: Show Search', { delay: 30 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.search-view', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.keyboard.type('MOTUNIQUE9', { delay: 30 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);
    const res = await page.locator('.search-view .monaco-list').first().innerText();
    log('résultats de recherche : ' + res.replace(/\s+/g, ' ').slice(0, 120));
    verifier(/exemple\.txt/.test(res), 'la recherche trouve le mot dans mon code');
    verifier(!/inutile\.txt/.test(res), 'la recherche ignore node_modules (plus rapide, moins de bruit)');
  } catch (e) { verifier(false, 'recherche (' + String(e.message).split('\n')[0].slice(0, 100) + ')'); }
  await page.screenshot({ path: '/tmp/cody-logs/p9-recherche.png' });

  // 3. Un clic ouvre la liste des extensions actives
  try {
    await memoire.locator('a').first().click();
    await page.waitForTimeout(3000);
    const texte = await page.evaluate(() => document.body.innerText);
    verifier(/Running Extensions|Runtime Extensions|Activation|activated/i.test(texte), 'un clic sur la mémoire ouvre la liste des extensions actives');
  } catch (e) { verifier(false, 'clic sur la mémoire (' + String(e.message).split('\n')[0].slice(0, 100) + ')'); }
  await page.screenshot({ path: '/tmp/cody-logs/p9-memoire.png' });

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

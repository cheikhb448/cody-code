// Test Phase 5.1 : fonctions de l'éditeur (section 1 de FEATURES.md).
// Chaque vérification est indépendante : un échec n'arrête pas les suivantes.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 5.1 éditeur::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/ws5';
fs.rmSync(dossier, { recursive: true, force: true });
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(`${dossier}/a.js`, 'function addition(a, b) {\n  const total = a + b;\n  return total;\n}\nconst valeur = addition(1, 2);\nconsole.log(valeur);\n');
fs.writeFileSync(`${dossier}/b.py`, 'def bonjour():\n    print("salut")\n');
fs.writeFileSync(`${dossier}/c.json`, '{"nom":"cody","liste":[1,2,3],"actif":true}\n');
fs.writeFileSync(`${dossier}/notes.txt`, 'mot mot mot\n');
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, locale: 'en-US' });
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 150)));
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(4000);

  const texte = async () => (await page.locator('.monaco-editor .view-lines').first().innerText().catch(() => '?')).replace(/ /g, ' ');
  const ouvrir = async (nom) => {
    await page.keyboard.press('Control+p');
    await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 20000 });
    await page.keyboard.type(nom, { delay: 30 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Enter');
    await page.locator('.tabs-container .tab.active', { hasText: nom }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
  };
  const commande = async (nom) => {
    await page.keyboard.press('F1');
    await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 20000 });
    await page.keyboard.type(nom, { delay: 30 });
    await page.waitForTimeout(1200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
  };
  const essai = async (nom, fn) => {
    try { await fn(); } catch (e) { verifier(false, `${nom} (erreur : ${String(e.message).split('\n')[0].slice(0, 120)})`); }
    await page.keyboard.press('Escape').catch(() => {});
  };
  const cliquerEditeur = async () => { await page.click('.monaco-editor .view-lines'); };

  // 1. Onglets multi-fichiers + 3. numéros de ligne / fil d'Ariane + 2. coloration
  await essai('onglets', async () => {
    await ouvrir('a.js');
    await ouvrir('b.py');
    await ouvrir('c.json');
    const onglets = await page.locator('.tabs-container .tab').count();
    verifier(onglets >= 3, `plusieurs fichiers ouverts en onglets (${onglets})`);
    await page.locator('.tabs-container .tab', { hasText: 'a.js' }).first().click();
    await page.waitForTimeout(800);
    verifier((await texte()).includes('addition'), 'un clic sur un onglet affiche son fichier');
  });
  await essai('coloration', async () => {
    await page.waitForTimeout(2500);
    const classes = await page.evaluate(() => {
      const s = new Set();
      document.querySelectorAll('.monaco-editor .view-line span span').forEach(e => e.classList.forEach(c => { if (/^mtk\d+$/.test(c)) s.add(c); }));
      return [...s];
    });
    verifier(classes.length >= 3, `coloration syntaxique (${classes.length} couleurs différentes dans a.js)`);
  });
  await essai('lignes', async () => {
    const n = await page.locator('.monaco-editor .line-numbers').count();
    verifier(n >= 5, `numéros de ligne affichés (${n})`);
    const f = await page.locator('.breadcrumbs-control').count();
    verifier(f >= 1, "fil d'Ariane (breadcrumbs) affiché");
  });

  // 4. Recherche / remplacement
  await essai('recherche', async () => {
    await ouvrir('notes.txt');
    await cliquerEditeur();
    await page.keyboard.press('Control+f');
    await page.waitForSelector('.find-widget.visible', { timeout: 10000 });
    await page.keyboard.type('mot', { delay: 30 });
    await page.waitForTimeout(600);
    const c1 = await page.locator('.find-widget .matchesCount').innerText();
    verifier(/of 3/.test(c1), `recherche dans le fichier : « ${c1} »`);
    await page.keyboard.press('Alt+r');
    await page.keyboard.press('Control+a');
    await page.keyboard.type('m.t', { delay: 30 });
    await page.waitForTimeout(600);
    const c2 = await page.locator('.find-widget .matchesCount').innerText();
    verifier(/of 3/.test(c2), `recherche avec expression régulière : « ${c2} »`);
    await page.keyboard.press('Alt+r');
    await page.keyboard.press('Escape');
  });
  await essai('remplacement', async () => {
    await cliquerEditeur();
    await page.keyboard.press('Control+h');
    await page.waitForSelector('.find-widget.visible .replace-part', { timeout: 10000 });
    await page.keyboard.press('Control+a');
    await page.keyboard.type('mot', { delay: 30 });
    await page.locator('.find-widget .replace-part textarea').first().click({ timeout: 8000 });
    await page.keyboard.type('mur', { delay: 30 });
    await page.keyboard.press('Control+Alt+Enter');
    await page.waitForTimeout(800);
    const t = await texte();
    verifier(t.includes('mur mur mur') && !t.includes('mot'), `remplacer tout : « ${t.trim()} »`);
    await page.keyboard.press('Escape');
  });

  // 5. Multi-curseurs
  await essai('multi-curseurs', async () => {
    await cliquerEditeur();
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Control+d');
    await page.keyboard.press('Control+d');
    await page.keyboard.press('Control+d');
    await page.keyboard.type('X', { delay: 30 });
    await page.waitForTimeout(500);
    const t = await texte();
    verifier(t.includes('X X X'), `3 curseurs en même temps : « ${t.trim()} »`);
  });

  // 8. Annuler / rétablir
  await essai('annuler', async () => {
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(400);
    const a = await texte();
    verifier(!a.includes('X'), `annuler (Ctrl+Z) : « ${a.trim()} »`);
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(400);
    const b = await texte();
    verifier(b.includes('X'), `rétablir (Ctrl+Y) : « ${b.trim()} »`);
  });

  // 6. Plier / déplier
  await essai('pliage', async () => {
    await ouvrir('a.js');
    await cliquerEditeur();
    await page.keyboard.press('Control+Home');
    const avant = await texte();
    await page.keyboard.press('Control+Shift+[');
    await page.waitForTimeout(800);
    const plie = await texte();
    verifier(avant.includes('return total') && !plie.includes('return total'), 'plier le code (Ctrl+Maj+[)');
    await page.keyboard.press('Control+Shift+]');
    await page.waitForTimeout(800);
    verifier((await texte()).includes('return total'), 'déplier le code (Ctrl+Maj+])');
  });

  // 7. Mini-carte (désactivée par défaut dans Cody, activable)
  await essai('minimap', async () => {
    const etat = () => page.evaluate(() => { const m = document.querySelector('.monaco-editor .minimap'); return !!m && getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().width > 10; });
    const avant = await etat();
    await commande('Toggle Minimap');
    await page.waitForTimeout(1000);
    const apres = await etat();
    verifier(avant !== apres, `mini-carte activable (avant=${avant}, après=${apres})`);
  });

  // 9. Éditeur divisé
  await essai('division', async () => {
    await cliquerEditeur();
    await page.keyboard.press('Control+\\');
    await page.waitForTimeout(1500);
    const n = await page.locator('.editor-group-container').count();
    verifier(n >= 2, `éditeur divisé en volets (${n} groupes)`);
    await commande('Close Editor Group');
  });

  // 10. Comparaison de fichiers
  await essai('diff', async () => {
    await ouvrir('a.js');
    await commande('Compare Active File With');
    await page.keyboard.type('b.py', { delay: 30 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    const n = await page.locator('.monaco-diff-editor').count();
    verifier(n >= 1, 'comparaison de deux fichiers (diff)');
  });

  // 11. Formatage automatique (JSON, extension intégrée)
  await essai('formatage', async () => {
    await ouvrir('c.json');
    await page.waitForTimeout(3000);
    await cliquerEditeur();
    await commande('Format Document');
    await page.waitForTimeout(2500);
    const lignesJson = (await texte()).split('\n').filter(l => l.trim()).length;
    verifier(lignesJson >= 5, `formater le document (${lignesJson} lignes après formatage)`);
  });

  // 12. Enregistrement automatique
  await essai('auto-save', async () => {
    await ouvrir('notes.txt');
    await cliquerEditeur();
    await commande('Toggle Auto Save');
    await cliquerEditeur();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('AUTO', { delay: 30 });
    log('texte de l\'éditeur : « ' + (await texte()).replace(/\n/g, '|').slice(0, 60) + ' »');
    for (let i = 0; i < 14 && !fs.readFileSync(`${dossier}/notes.txt`, 'utf8').includes('AUTO'); i++) await page.waitForTimeout(500);
    const disque = fs.readFileSync(`${dossier}/notes.txt`, 'utf8');
    verifier(disque.includes('AUTO'), `enregistrement automatique sur le disque : « ${disque.trim().slice(0, 40)} »`);
  });

  await page.screenshot({ path: '/tmp/cody-logs/p5-1-editeur.png' });
  log(erreurs === 0 ? 'TOUT EST BON' : `${erreurs} échec(s)`);
  annoter(erreurs === 0 ? 'notice' : 'error');
} catch (e) {
  log('ERREUR GÉNÉRALE: ' + e.message);
  annoter('error');
  erreurs++;
} finally {
  if (browser) await browser.close();
}
process.exit(erreurs === 0 ? 0 : 1);

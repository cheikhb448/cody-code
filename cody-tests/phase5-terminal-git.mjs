// Test Phase 5.3 : terminal intégré (section 4) et Git (section 5).
// Chaque vérification est indépendante : un échec n'arrête pas les suivantes.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 5.3 terminal et Git::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/ws53';
const distant = '/tmp/remote53.git';
const autre = '/tmp/autre53';
const sh = (cmd, cwd = dossier) => execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
for (const d of [dossier, distant, autre]) fs.rmSync(d, { recursive: true, force: true });
fs.mkdirSync(dossier, { recursive: true });
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

// Réglage de test : le terminal en mode « texte » pour pouvoir lire sa sortie
fs.mkdirSync('/tmp/cody-data/data/Machine', { recursive: true });
fs.writeFileSync('/tmp/cody-data/data/Machine/settings.json', JSON.stringify({ 'terminal.integrated.gpuAcceleration': 'off' }));

// Dépôt Git de départ
sh('git init -q -b main');
sh('git config user.email test@cody.local && git config user.name Test');
fs.writeFileSync(`${dossier}/f.txt`, 'base\nfin\n');
fs.writeFileSync(`${dossier}/h.txt`, 'un\ndeux\ntrois\n');
sh('git add -A && git commit -q -m depart');
sh('git branch conflitA && git checkout -q conflitA');
fs.writeFileSync(`${dossier}/f.txt`, 'AAA\nfin\n');
sh('git commit -q -am "version A"');
sh('git checkout -q main && git checkout -q -b ajout');
fs.writeFileSync(`${dossier}/ajout.txt`, 'fichier ajouté\n');
sh('git add -A && git commit -q -m "ajout"');
sh('git checkout -q main');
fs.writeFileSync(`${dossier}/f.txt`, 'MAIN\nfin\n');
sh('git commit -q -am "version main"');
sh(`git init -q --bare -b main ${distant}`, '/tmp');
sh(`git remote add origin ${distant} && git push -q -u origin main`);

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, locale: 'en-US' });
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 150)));
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(5000);

  const texte = async () => (await page.locator('.monaco-editor .view-lines').first().innerText().catch(() => '?')).replace(/ /g, ' ');
  const palette = async (prefixe, saisie) => {
    await page.keyboard.press(prefixe);
    await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 20000 });
    await page.keyboard.type(saisie, { delay: 30 });
    await page.waitForTimeout(1500);
  };
  const ouvrir = async (nom) => {
    await palette('Control+p', nom);
    await page.keyboard.press('Enter');
    await page.locator('.tabs-container .tab.active', { hasText: nom }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
  };
  const commande = async (nom, suite) => {
    await palette('F1', nom);
    const premier = await page.locator('.quick-input-widget .monaco-list-row').first().innerText().catch(() => '?');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    if (suite) {
      const etat = await page.evaluate(() => { const w = document.querySelector('.quick-input-widget'); return w && !w.classList.contains('hidden') ? ((w.querySelector('.quick-input-title')?.textContent || '') + ' / ' + (w.querySelector('input')?.placeholder || '') + ' / ' + [...w.querySelectorAll('.monaco-list-row')].slice(0, 4).map(r => r.textContent.slice(0, 25)).join(' ; ')) : 'fermé'; });
      log(`[${nom}] 1er résultat « ${premier.replace(/\n/g, ' ').slice(0, 40)} », puis boîte : ${etat.slice(0, 160)}`);
      await page.keyboard.type(suite, { delay: 30 }); await page.waitForTimeout(1500);
      await page.keyboard.press('Enter'); await page.waitForTimeout(3000);
    }
  };
  const essai = async (nom, fn) => {
    try { await fn(); } catch (e) { verifier(false, `${nom} (erreur : ${String(e.message).split('\n')[0].slice(0, 120)})`); }
    await page.keyboard.press('Escape').catch(() => {});
  };
  const cliquerEditeur = async () => { await page.click('.monaco-editor .view-lines'); };
  const attendre = async (cond, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (cond()) return true; await page.waitForTimeout(500); } return false; };

  // ===== Section 4 : terminal =====
  await essai('terminal', async () => {
    await page.keyboard.press('Control+`');
    await page.waitForSelector('.terminal-wrapper .xterm', { timeout: 40000 });
    await page.waitForTimeout(3000);
    await page.keyboard.type(`echo bonjour > ${dossier}/terminal.txt`, { delay: 20 });
    await page.keyboard.press('Enter');
    const ok = await attendre(() => fs.existsSync(`${dossier}/terminal.txt`));
    verifier(ok, 'terminal intégré : une commande tapée est bien exécutée (bash)');
  });
  await essai('liens', async () => {
    fs.writeFileSync(`${dossier}/lien.txt`, 'cible du lien\n');
    await page.keyboard.type(`echo "${dossier}/lien.txt"`, { delay: 20 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    const rangee = page.locator('.xterm-rows > div', { hasText: /lien\.txt/ }).last();
    await rangee.waitFor({ timeout: 10000 });
    const b = await rangee.boundingBox();
    await page.mouse.move(b.x + 20, b.y + b.height / 2);
    await page.mouse.move(b.x + 110, b.y + b.height / 2, { steps: 8 });
    await page.waitForTimeout(1500);
    log('survol du lien : ' + (await page.locator('.monaco-hover, .xterm-hover').allInnerTexts()).join(' | ').replace(/\n/g, ' ').slice(0, 120));
    await page.keyboard.down('Control');
    await page.mouse.click(b.x + 110, b.y + b.height / 2);
    await page.keyboard.up('Control');
    await page.waitForTimeout(2500);
    const ouvert = await page.locator('.tabs-container .tab', { hasText: 'lien.txt' }).count();
    verifier(ouvert >= 1, 'lien cliquable dans le terminal (Ctrl+clic ouvre le fichier)');
  });
  await essai('plusieurs-terminaux', async () => {
    await page.keyboard.press('Control+Shift+`');
    await page.waitForTimeout(3000);
    const n = await page.locator('.terminal-tabs-entry, .tabs-list .monaco-list-row').count();
    verifier(n >= 2, `plusieurs terminaux (${n})`);
    await commande('Terminal: Split Terminal');
    await page.waitForTimeout(2500);
    const x = await page.locator('.terminal-wrapper .xterm').count();
    verifier(x >= 3, `terminal divisé (${x} zones de terminal)`);
  });

  // ===== Section 5 : Git =====
  await page.keyboard.press('Control+Shift+g');
  await page.waitForSelector('.scm-view', { timeout: 20000 });
  await essai('indicateurs-marge', async () => {
    await ouvrir('h.txt');
    await cliquerEditeur();
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('MODIFIE', { delay: 30 });
    await page.waitForTimeout(2500);
    const n = await page.locator('.monaco-editor [class*="dirty-diff"]').count();
    verifier(n >= 1, `indicateurs de modification dans la marge (${n})`);
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(800);
  });
  await essai('changements', async () => {
    fs.writeFileSync(`${dossier}/g.txt`, 'nouveau fichier\n');
    await page.waitForTimeout(3500);
    const noms = await page.locator('.scm-view .monaco-list-row').allInnerTexts();
    const t = noms.join(' | ').replace(/\n/g, ' ');
    verifier(/h\.txt/.test(t) && /g\.txt/.test(t), `vue Git : changements listés (${t.slice(0, 80)})`);
  });
  await essai('diff', async () => {
    await page.locator('.scm-view .monaco-list-row', { hasText: 'h.txt' }).first().click();
    await page.waitForTimeout(2500);
    const n = await page.locator('.monaco-diff-editor').count();
    verifier(n >= 1, 'comparaison visuelle des changements (diff)');
  });
  await essai('commit', async () => {
    await commande('Git: Stage All Changes');
    const champ = page.locator('.scm-editor textarea, .scm-editor .native-edit-context, .scm-editor .monaco-editor').first();
    await champ.click();
    await page.keyboard.type('mon commit de test', { delay: 30 });
    await page.keyboard.press('Control+Enter');
    const ok = await attendre(() => { try { return sh('git log -1 --format=%s') === 'mon commit de test'; } catch { return false; } }, 20000);
    verifier(ok, 'ajout (stage) + commit depuis l\'interface');
  });
  await essai('push', async () => {
    await commande('Git: Push');
    const ok = await attendre(() => { try { return sh(`git --git-dir=${distant} log -1 --format=%s main`, '/tmp') === 'mon commit de test'; } catch { return false; } }, 25000);
    verifier(ok, 'push vers un dépôt distant');
  });
  await essai('pull', async () => {
    sh(`git clone -q ${distant} ${autre}`, '/tmp');
    sh('git config user.email t@c.l && git config user.name T', autre);
    fs.writeFileSync(`${autre}/venu-du-distant.txt`, 'x\n');
    sh('git add -A && git commit -q -m "depuis ailleurs" && git push -q', autre);
    await commande('Git: Pull');
    const ok = await attendre(() => fs.existsSync(`${dossier}/venu-du-distant.txt`), 25000);
    verifier(ok, 'pull depuis un dépôt distant');
  });
  await essai('branches', async () => {
    await commande('Git: Create Branch...', 'ui-branche');
    const b = await attendre(() => { try { return sh('git branch --show-current') === 'ui-branche'; } catch { return false; } }, 15000);
    verifier(b, 'créer une branche');
    await page.waitForTimeout(2000);
    const vue = await page.locator('.cody-branches, .pane-body', { hasText: 'ui-branche' }).count();
    verifier(vue >= 1, 'la section BRANCHES affiche la nouvelle branche');
    await commande('Git: Checkout to...', 'main');
    const c = await attendre(() => { try { return sh('git branch --show-current') === 'main'; } catch { return false; } }, 15000);
    verifier(c, 'changer de branche');
  });
  await essai('fusion', async () => {
    await commande('Git: Merge Branch...', 'ajout');
    const ok = await attendre(() => fs.existsSync(`${dossier}/ajout.txt`), 15000);
    verifier(ok, 'fusionner une branche');
  });
  await essai('conflit', async () => {
    await commande('Git: Merge Branch...', 'conflitA');
    await page.waitForTimeout(2000);
    const enConflit = (() => { try { return fs.readFileSync(`${dossier}/f.txt`, 'utf8').includes('<<<<<<<'); } catch { return false; } })();
    verifier(enConflit, 'un conflit de fusion est bien signalé dans le fichier');
    await ouvrir('f.txt');
    await page.waitForTimeout(2500);
    const lens = await page.locator('.codelens-decoration', { hasText: /Accept/ }).count();
    verifier(lens >= 1, `aide à la résolution des conflits (boutons « Accept… » : ${lens})`);
    await commande('Merge Conflict: Accept All Current');
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(1500);
    const propre = !fs.readFileSync(`${dossier}/f.txt`, 'utf8').includes('<<<<<<<');
    verifier(propre, 'résoudre le conflit (« Accept All Current »)');
  });

  await page.screenshot({ path: '/tmp/cody-logs/p5-3-git.png' });
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

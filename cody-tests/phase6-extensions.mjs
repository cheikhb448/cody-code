// Test Phase 6 : extensions depuis le magasin libre Open VSX (installer, désactiver, désinstaller, thèmes, langage).
// Chaque vérification est indépendante : un échec n'arrête pas les suivantes.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 6 extensions::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/ws6';
fs.rmSync(dossier, { recursive: true, force: true });
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(`${dossier}/a.js`, 'const x = 1;\n');
fs.writeFileSync(`${dossier}/mauvais.yaml`, 'cle: [1, 2\nautre: : :\n');
fs.mkdirSync('/tmp/cody-logs', { recursive: true });
const dossierExt = '/tmp/cody-data/extensions';
const presente = (prefixe) => fs.existsSync(dossierExt) && fs.readdirSync(dossierExt).some(d => d.toLowerCase().startsWith(prefixe.toLowerCase()) && !d.startsWith('.'));

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, locale: 'en-US' });
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 150)));
  const erreursConsole = [];
  page.on('console', m => { if (m.type() === 'error') erreursConsole.push(m.text().slice(0, 220)); });
  const hotes = new Set();
  page.on('request', r => { try { hotes.add(new URL(r.url()).host); } catch { /* ignore */ } });
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(5000);

  const attendre = async (cond, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await cond()) return true; await page.waitForTimeout(700); } return false; };
  const palette = async (prefixe, saisie) => {
    for (let t = 0; t < 2; t++) {
      await page.keyboard.press(prefixe);
      try { await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 8000 }); break; }
      catch { await page.keyboard.press('Escape'); await page.locator('.part.editor').first().click({ position: { x: 200, y: 150 } }).catch(() => {}); }
    }
    await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 20000 });
    await page.keyboard.type(saisie, { delay: 30 });
    await page.waitForTimeout(1500);
  };
  const commande = async (nom) => {
    await palette('F1', nom);
    const rows = page.locator('.quick-input-widget .monaco-list-row');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const t = (await rows.nth(i).locator('.label-name').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (t === nom) { await rows.nth(i).click(); await page.waitForTimeout(1500); return true; }
    }
    await page.keyboard.press('Enter'); await page.waitForTimeout(1500); return false;
  };
  const essai = async (nom, fn) => {
    try { await fn(); } catch (e) { verifier(false, `${nom} (erreur : ${String(e.message).split('\n')[0].slice(0, 140)})`); }
    await page.keyboard.press('Escape').catch(() => {});
  };
  // Seuls les boutons réellement visibles de la page de l'extension comptent
  const boutons = async () => page.evaluate(() => [...document.querySelectorAll('.extension-editor .action-label')]
    .filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden')
    .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim() + (e.classList.contains('disabled') ? '(inactif)' : ''))
    .filter(t => t && t !== '(inactif)'));
  const cliquer = async (regex) => {
    const index = await page.evaluate((src) => {
      const re = new RegExp(src);
      const tous = [...document.querySelectorAll('.extension-editor .action-label')];
      return tous.findIndex(e => e.getBoundingClientRect().width > 0 && !e.classList.contains('disabled') && re.test((e.textContent || '').replace(/\s+/g, ' ').trim()));
    }, regex.source);
    if (index < 0) throw new Error('bouton introuvable : ' + regex + ' parmi ' + (await boutons()).join(' | ').slice(0, 200));
    await page.locator('.extension-editor .action-label').nth(index).click({ timeout: 10000 });
  };
  // Cherche une extension par son identifiant et ouvre sa page de détails
  const ouvrirExtension = async (id) => {
    await page.keyboard.press('Control+Shift+x');
    await page.waitForSelector('.extensions-viewlet', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.locator('.extensions-viewlet .suggest-input-container').first().click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`@id:${id}`, { delay: 30 });
    const ligne = page.locator('.extensions-viewlet .monaco-list-row').first();
    await ligne.waitFor({ timeout: 40000 });
    await page.waitForTimeout(1500);
    await ligne.click();
    await page.waitForSelector('.extension-editor', { timeout: 20000 });
    await page.waitForTimeout(2000);
  };
  const installer = async (id, prefixeDisque) => {
    await ouvrirExtension(id);
    log(`[${id}] boutons visibles : ` + (await boutons()).join(' | ').slice(0, 250));
    await cliquer(/^Install$/);
    // Une fenêtre peut demander de faire confiance à l'éditeur de l'extension : on la lit puis on accepte
    await page.waitForTimeout(3000);
    if (await page.locator('.monaco-dialog-box').count()) {
      log(`[${id}] fenêtre : ` + (await page.locator('.monaco-dialog-box').first().innerText()).replace(/\s+/g, ' ').slice(0, 260));
      log(`[${id}] boutons de la fenêtre : ` + (await page.locator('.monaco-dialog-box .monaco-button').allInnerTexts()).join(' / '));
      await page.locator('.monaco-dialog-box .monaco-button', { hasText: /Trust|Install/i }).first().click().catch(() => {});
    }
    const avantErr = erreursConsole.length;
    for (let i = 0; i < 12 && !presente(prefixeDisque); i++) {
      await page.waitForTimeout(1500);
      const notifs = (await page.locator('.notifications-toasts .notification-list-item, .notification-toast, .monaco-dialog-box').allInnerTexts()).join(' | ').replace(/\s+/g, ' ').slice(0, 300);
      if (notifs) { log(`[${id}] notification : ` + notifs); break; }
    }
    if (erreursConsole.length > avantErr) log(`[${id}] erreurs console : ` + erreursConsole.slice(avantErr, avantErr + 4).join(' || '));
    const ok = await attendre(async () => presente(prefixeDisque), 60000);
    await page.waitForTimeout(2500);
    return ok;
  };

  // ===== 1. Galerie, installer, désactiver, désinstaller =====
  await essai('galerie', async () => {
    await page.keyboard.press('Control+Shift+x');
    await page.waitForSelector('.extensions-viewlet', { timeout: 15000 });
    await page.locator('.extensions-viewlet .suggest-input-container').first().click();
    await page.keyboard.type('icon theme', { delay: 30 });
    const ok = await attendre(async () => (await page.locator('.extensions-viewlet .monaco-list-row').count()) >= 3, 40000);
    const noms = (await page.locator('.extensions-viewlet .monaco-list-row').allInnerTexts()).slice(0, 4).map(t => t.split('\n')[0]).join(' | ');
    verifier(ok, `magasin Open VSX : recherche « icon theme » → ${noms}`);
  });
  await essai('installer', async () => {
    const ok = await installer('pkief.material-icon-theme', 'pkief.material-icon-theme');
    verifier(ok, 'installer une extension depuis Open VSX (Material Icon Theme)');
    if (!ok) {
      const { execSync } = await import('node:child_process');
      const sh = (c) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 }).trim(); } catch (e) { return 'erreur ' + String(e.message).slice(0, 80); } };
      log('dossier extensions : ' + sh(`ls ${dossierExt} 2>&1 | head -12`).replace(/\n/g, ' ; '));
      log('autres dossiers : ' + sh('ls /tmp/cody-data /tmp/cody-data/data 2>&1 | head -20').replace(/\n/g, ' ; '));
      log('journal serveur : ' + sh(`grep -i "xtension\\|rror\\|install\\|gallery" /tmp/cody-logs/server.log | tail -12`).replace(/\n/g, ' ¦ ').slice(0, 1200));
      log('journaux détaillés : ' + sh(`grep -rih "install\\|gallery\\|signature\\|verify" /tmp/cody-data/data/logs 2>/dev/null | tail -10`).replace(/\n/g, ' ¦ ').slice(0, 1200));
    }
    log('boutons après installation : ' + (await boutons()).join(' | ').slice(0, 150));
  });
  await essai('désactiver', async () => {
    await cliquer(/^Disable/);
    const ok = await attendre(async () => (await boutons()).some(b => /^Enable/.test(b)), 20000);
    verifier(ok, 'désactiver une extension');
    await cliquer(/^Enable/);
    const ok2 = await attendre(async () => (await boutons()).some(b => /^Disable/.test(b)), 20000);
    verifier(ok2, 'réactiver une extension');
  });
  await essai('theme-icones', async () => {
    await commande('Preferences: File Icon Theme');
    await page.keyboard.type('Material Icon', { delay: 30 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);
    const ok = await page.evaluate(() => {
      const css = [...document.querySelectorAll('style')].map(s => s.textContent || '').join(' ');
      return /material-icon-theme/i.test(css) || /pkief/i.test(css);
    });
    verifier(ok, 'thème d\'icônes fourni par une extension (Material Icon Theme appliqué)');
  });
  await essai('désinstaller', async () => {
    await ouvrirExtension('pkief.material-icon-theme');
    await cliquer(/^Uninstall/);
    const ok = await attendre(async () => !presente('pkief.material-icon-theme'), 30000);
    verifier(ok, 'désinstaller une extension');
  });

  // ===== 2. Thème de couleurs =====
  await essai('theme-couleurs', async () => {
    const ok = await installer('dracula-theme.theme-dracula', 'dracula-theme.theme-dracula');
    verifier(ok, 'installer un thème de couleurs (Dracula)');
    if (ok) {
      await commande('Preferences: Color Theme');
      await page.keyboard.type('Dracula', { delay: 30 });
      await page.waitForTimeout(1500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3500);
      const cls = await page.evaluate(() => document.body.className + ' ' + (document.querySelector('.monaco-workbench')?.className ?? ''));
      verifier(/dracula/i.test(cls), 'thème de couleurs fourni par une extension appliqué : ' + cls.slice(0, 120));
    }
  });

  // ===== 3. Extension de langage (serveur de langage dans une extension) =====
  await essai('langage', async () => {
    const ok = await installer('redhat.vscode-yaml', 'redhat.vscode-yaml');
    verifier(ok, 'installer une extension de langage (YAML)');
    if (ok) {
      await page.keyboard.press('Control+p');
      await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 15000 });
      await page.keyboard.type('mauvais.yaml', { delay: 30 });
      await page.waitForTimeout(1500);
      await page.keyboard.press('Enter');
      const erreur = await attendre(async () => (await page.locator('.part.editor .monaco-editor .squiggly-error').count()) > 0, 60000);
      verifier(erreur, 'l\'extension YAML s\'active et signale l\'erreur du fichier');
    }
  });

  // ===== 4. Aucune connexion au magasin Microsoft =====
  const hotesListe = [...hotes].filter(h => /microsoft|visualstudio|vsassets|gallerycdn/i.test(h));
  log('hôtes contactés par la page : ' + [...hotes].filter(h => !/^(127\.0\.0\.1|localhost)/.test(h)).join(', '));
  verifier(hotesListe.length === 0, 'aucune requête vers le magasin Microsoft' + (hotesListe.length ? ' : ' + hotesListe.join(', ') : ''));

  await page.screenshot({ path: '/tmp/cody-logs/p6-extensions.png' });
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

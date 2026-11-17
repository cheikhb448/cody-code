// Test Phase 11 : barre du haut nettoyée, menus et terminal accessibles, connexion GitHub, réglages complets, plus de noms Microsoft.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 11::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };
const essai = async (nom, f) => { try { await f(); } catch (e) { log(`ÉCHEC ${nom} (erreur : ${String(e.message).slice(0, 160)})`); erreurs++; } };

const dossier = '/tmp/DropLink11';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, locale: 'en-US' });
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(8000);

  // 1. Barre du haut : plus de sélecteur de dossier, plus de petite icône ; le nom Cody Code reste
  await essai('barre du haut', async () => {
    const t = await page.evaluate(() => ({
      projet: document.querySelectorAll('.part.titlebar .cody-project').length,
      icone: document.querySelectorAll('.part.titlebar .window-appicon').length,
      marque: document.querySelector('.part.titlebar .cody-brand-name')?.textContent ?? '',
      logo: document.querySelectorAll('.part.titlebar .cody-brand-logo').length,
    }));
    log('barre du haut : ' + JSON.stringify(t));
    verifier(t.projet === 0, 'plus de sélecteur de dossier en haut');
    verifier(t.icone === 0, 'plus de petite icône Cody en haut');
    verifier(t.marque === 'Cody Code' && t.logo === 1, 'le logo et le nom « Cody Code » restent');
  });

  // 2. Menu visible (bouton ☰ en haut de la barre d'activités) et boutons de disposition (panneau, barre latérale) en haut à droite
  const commande = async titre => {
    await page.keyboard.press('F1');
    await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
    await page.keyboard.type(titre, { delay: 30 });
    await page.waitForTimeout(900);
    await page.keyboard.press('Enter');
  };
  await essai('menu et boutons', async () => {
    const m = await page.evaluate(() => ({
      menu: [...document.querySelectorAll('.menubar-menu-button, [aria-label="Application Menu"]')].length,
      disposition: [...document.querySelectorAll('.part.titlebar .action-label, .part.titlebar a')].map(e => e.getAttribute('aria-label') || '').filter(a => /panel|side bar|layout|sidebar/i.test(a)).slice(0, 8),
    }));
    log('menu : ' + JSON.stringify(m));
    verifier(m.menu > 0, 'un bouton de menu (☰) est visible');
    verifier(m.disposition.length > 0, 'des boutons de disposition (panneau du bas, barre latérale) sont visibles en haut à droite');
  });

  // 3. Ouvrir le terminal depuis le menu : Terminal > New Terminal (sans rien exécuter avant)
  await essai('terminal depuis le menu', async () => {
    // on ferme d'abord le terminal ouvert au démarrage, pour prouver que le menu sait l'ouvrir
    await commande('Terminal: Kill the Active Terminal Instance');
    await page.waitForTimeout(1500);
    await page.locator('.menubar-menu-button, [aria-label="Application Menu"]').first().click();
    await page.waitForSelector('.monaco-menu', { timeout: 10000 });
    const entrees = await page.evaluate(() => [...document.querySelectorAll('.monaco-menu .action-label')].map(e => (e.textContent || '').trim()).filter(Boolean));
    log('menu principal : ' + entrees.join(' | '));
    verifier(entrees.some(e => /^Terminal$/.test(e)), 'le menu contient « Terminal »');
    verifier(['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Help'].every(n => entrees.some(e => e === n)), 'le menu contient Fichier, Édition, Sélection, Affichage, Aller, Exécuter, Aide');
    await page.locator('.monaco-menu .action-label', { hasText: /^Terminal$/ }).first().click();
    await page.waitForTimeout(600);
    await page.locator('.monaco-menu .action-label', { hasText: /^New Terminal$/ }).first().click();
    let ouvert = false;
    for (let i = 0; i < 20 && !ouvert; i++) { ouvert = await page.locator('.part.panel .xterm').count().then(n => n > 0); if (!ouvert) await page.waitForTimeout(1000); }
    verifier(ouvert, 'le terminal s\'ouvre depuis le menu Terminal > New Terminal');
    await page.screenshot({ path: '/tmp/cody-logs/p11-terminal-menu.png' });
  });

  // 4. Connexion GitHub : la commande existe et demande un jeton masqué (rien n'est envoyé)
  await essai('connexion GitHub', async () => {
    await commande('Se connecter à GitHub');
    // l'éditeur peut d'abord demander l'autorisation de l'extension : on l'accepte si c'est le cas
    const dialogue = page.locator('.monaco-dialog-box');
    let vu = false;
    for (let i = 0; i < 20 && !vu; i++) {
      const autorisation = dialogue.locator('.monaco-button', { hasText: /^Allow$/ });
      if (await autorisation.count() > 0) { log('l\'éditeur a demandé l\'autorisation de l\'extension GitHub (acceptée)'); await autorisation.first().click(); await page.waitForTimeout(800); }
      vu = await dialogue.filter({ hasText: /jeton/i }).count().then(n => n > 0);
      if (!vu) await page.waitForTimeout(1000);
    }
    verifier(vu, 'une fenêtre explique comment obtenir un jeton GitHub');
    await page.screenshot({ path: '/tmp/cody-logs/p11-github.png' });
    if (vu) {
      await dialogue.locator('.monaco-button', { hasText: /déjà un jeton/ }).first().click();
      await page.waitForSelector('.quick-input-widget input[type=password]', { timeout: 10000 }).then(
        () => verifier(true, 'la saisie du jeton est masquée (mot de passe)'),
        () => verifier(false, 'la saisie du jeton est masquée (mot de passe)'));
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(800);
  });

  // 5. Réglages : catégories principales présentes, plus de « Microsoft online service »
  await essai('réglages', async () => {
    await commande('Preferences: Open Settings (UI)');
    await page.waitForSelector('.settings-editor', { timeout: 20000 });
    await page.waitForTimeout(3000);
    const toc = await page.evaluate(() => [...document.querySelectorAll('.settings-toc-container .monaco-list-row')].map(r => (r.innerText || '').trim().split('\n')[0]).filter(Boolean));
    log('catégories des réglages : ' + toc.join(' | '));
    for (const cat of ['Commonly Used', 'Text Editor', 'Workbench', 'Window', 'Features', 'Application', 'Security', 'Extensions']) {
      verifier(toc.some(t => t.includes(cat)), `réglages : catégorie « ${cat} »`);
    }
    await page.screenshot({ path: '/tmp/cody-logs/p11-reglages.png' });
    await page.locator('.settings-editor .suggest-input-container .monaco-editor, .settings-editor input').first().click();
    await page.keyboard.type('update.mode', { delay: 30 });
    await page.waitForTimeout(2500);
    const texte = await page.evaluate(() => document.querySelector('.settings-editor')?.innerText ?? '');
    verifier(texte.length > 50 && !/Microsoft online service/i.test(texte), 'les descriptions de réglages ne parlent plus d\'un service en ligne Microsoft');
  });

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

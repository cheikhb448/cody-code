// Test Phase 5.4 : exécution/débogage/tâches (section 6), personnalisation (8) et productivité (11).
// Chaque vérification est indépendante : un échec n'arrête pas les suivantes.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 5.4 outils::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/ws54';
fs.rmSync(dossier, { recursive: true, force: true });
fs.mkdirSync(`${dossier}/.vscode`, { recursive: true });
fs.writeFileSync(`${dossier}/.vscode/tasks.json`, JSON.stringify({ version: '2.0.0', tasks: [{ label: 'ecrire', type: 'shell', command: `echo ok > ${dossier}/tache.txt` }] }));
fs.writeFileSync(`${dossier}/.vscode/launch.json`, JSON.stringify({ version: '0.2.0', configurations: [{ type: 'node', request: 'launch', name: 'Lancer test', program: '${workspaceFolder}/app.js' }] }));
fs.writeFileSync(`${dossier}/.vscode/extensions.json`, JSON.stringify({ recommendations: ['redhat.vscode-yaml'] }));
fs.writeFileSync(`${dossier}/app.js`, 'const x = 1;\nconst y = x + 1;\nconsole.log(y);\n');
fs.writeFileSync(`${dossier}/doc.md`, '# Titre\n\nTexte **gras**\n');
fs.writeFileSync(`${dossier}/h.html`, '');
fs.writeFileSync(`${dossier}/n.ipynb`, JSON.stringify({ cells: [{ cell_type: 'code', metadata: {}, source: ['print(1)'], outputs: [], execution_count: null }], metadata: {}, nbformat: 4, nbformat_minor: 5 }));
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, locale: 'en-US' });
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 150)));
  const erreursConsole = [];
  page.on('console', m => { if (m.type() === 'error') erreursConsole.push(m.text().slice(0, 160)); });
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(5000);

  const texte = async () => (await page.locator('.part.editor .monaco-editor .view-lines').first().innerText().catch(() => '?')).replace(/ /g, ' ');
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
  const choisirCommande = async (nom) => {
    const rows = page.locator('.quick-input-widget .monaco-list-row');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const t = (await rows.nth(i).locator('.label-name').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (t === nom) { await rows.nth(i).click(); return true; }
    }
    await page.keyboard.press('Enter');
    return false;
  };
  const commande = async (nom) => { await palette('F1', nom); await choisirCommande(nom); await page.waitForTimeout(1500); };
  const essai = async (nom, fn) => {
    // Une boîte de dialogue restée ouverte bloquerait tout : on la ferme avant chaque vérification
    for (const b of await page.locator('.monaco-dialog-box .monaco-button', { hasText: /^Cancel$/ }).all()) await b.click().catch(() => {});
    try { await fn(); } catch (e) { verifier(false, `${nom} (erreur : ${String(e.message).split('\n')[0].slice(0, 120)})`); }
    await page.keyboard.press('Escape').catch(() => {});
  };
  const cliquerEditeur = async () => { await page.click('.part.editor .monaco-editor .view-lines'); };
  const attendre = async (cond, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await cond()) return true; await page.waitForTimeout(500); } return false; };

  // ===== Section 6 : exécution et débogage =====
  await essai('tâches', async () => {
    await commande('Tasks: Run Task');
    await page.keyboard.type('ecrire', { delay: 30 });
    await page.waitForTimeout(1500);
    log('tâches proposées : ' + (await page.locator('.quick-input-widget .monaco-list-row').allInnerTexts()).join(' ; ').replace(/\n/g, ' ').slice(0, 150));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    const boite = await page.locator('.quick-input-widget:not(.hidden)').count();
    if (boite) { log('2e boîte : ' + (await page.locator('.quick-input-widget').innerText()).replace(/\n/g, ' ').slice(0, 150)); await page.keyboard.press('Enter'); }
    const ok = await attendre(() => fs.existsSync(`${dossier}/tache.txt`), 20000);
    verifier(ok, 'tâches (tasks.json) : la tâche « ecrire » s\'exécute');
  });
  await essai('launch', async () => {
    await page.keyboard.press('Control+Shift+d');
    await page.waitForSelector('.debug-viewlet', { timeout: 15000 });
    await attendre(async () => /Lancer test/.test(await page.locator('.debug-viewlet').first().evaluate(e => e.textContent + ' ' + [...e.querySelectorAll('option')].map(o => o.textContent).join(' '))), 15000);
    let t = await page.locator('.debug-viewlet').first().evaluate(e => e.textContent + ' ' + [...e.querySelectorAll('option')].map(o => o.textContent).join(' '));
    let ok = /Lancer test/.test(t);
    if (!ok) {
      log('vue Exécuter : ' + t.replace(/\s+/g, ' ').slice(0, 160));
      await commande('Debug: Select and Start Debugging');
      const liste = (await page.locator('.quick-input-widget .monaco-list-row').allInnerTexts()).join(' ; ').replace(/\n/g, ' ');
      log('configurations proposées : ' + liste.slice(0, 160));
      ok = /Lancer test/.test(liste);
      await page.keyboard.press('Escape');
    }
    verifier(ok, 'configurations de lancement (launch.json) reconnues');
  });
  await essai('points-arret', async () => {
    await ouvrir('app.js');
    await cliquerEditeur();
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('F9');
    await page.waitForTimeout(1000);
    const n = await page.locator('.part.editor .monaco-editor [class*="codicon-debug-breakpoint"]').count();
    verifier(n >= 1, `point d'arrêt simple posé (${n})`);
    await commande('Debug: Add Conditional Breakpoint');
    await page.waitForTimeout(1500);
    const z = await page.locator('.breakpoint-widget').count();
    verifier(z >= 1, 'point d\'arrêt conditionnel (zone de condition affichée)');
    await page.keyboard.press('Escape');
  });
  await essai('debogage', async () => {
    await page.keyboard.press('F5');
    const ok = await attendre(() => page.locator('.debug-toolbar').count().then(n => n > 0), 40000);
    verifier(ok, 'lancer et déboguer un programme (barre de débogage affichée)');
    if (ok) {
      const arret = await attendre(() => page.locator('.monaco-editor .debug-top-stack-frame-line, .monaco-editor [class*="debug-top-stack-frame"]').count().then(n => n > 0), 25000);
      verifier(arret, 'le programme s\'arrête sur le point d\'arrêt');
      await page.waitForTimeout(1500);
      const pile = await page.locator('.debug-viewlet').innerText();
      verifier(/CALL STACK|Call Stack/i.test(pile) && /VARIABLES|Variables/i.test(pile), 'pile d\'appels et variables visibles');
      verifier(/Local|Locals/.test(await page.locator('.debug-viewlet').innerText()), 'variables locales listées');
      await page.keyboard.press('Control+Shift+y');
      await page.waitForTimeout(1500);
      verifier(await page.locator('.repl, .debug-console').count() >= 1, 'console de débogage');
      await page.keyboard.press('Shift+F5');
      await page.waitForTimeout(1500);
    } else {
      const notifs = await page.locator('.notifications-toasts, .monaco-dialog-box').allInnerTexts();
      log('Diagnostic débogage : ' + notifs.join(' | ').replace(/\n/g, ' ').slice(0, 300));
    }
  });

  // ===== Section 8 : personnalisation =====
  await essai('paramètres', async () => {
    await commande('Preferences: Open Settings (UI)');
    await page.waitForSelector('.settings-editor', { timeout: 15000 });
    await page.keyboard.type('minimap', { delay: 30 });
    await page.waitForTimeout(2000);
    verifier(await page.locator('.settings-editor .monaco-list-row').count() >= 1, 'paramètres : interface graphique avec recherche');
    let onglets = '';
    for (const nomCmd of ['Preferences: Open User Settings (JSON)', 'Preferences: Open Settings (JSON)']) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      await palette('F1', nomCmd);
      log(`« ${nomCmd} » → ` + (await page.locator('.quick-input-widget .monaco-list-row').first().innerText().catch(() => 'aucun résultat')).replace(/\n/g, ' ').slice(0, 60));
      await choisirCommande(nomCmd);
      await page.waitForTimeout(3000);
      onglets = (await page.locator('.tabs-container .tab').allInnerTexts()).map(o => o.replace(/\n/g, ' ')).join(' | ');
      log('onglets : ' + onglets.slice(0, 200));
      const notifs = (await page.locator('.notifications-toasts .notification-list-item, .notification-toast').allInnerTexts()).join(' | ').replace(/\n/g, ' ').slice(0, 250);
      log('notifications : ' + (notifs || 'aucune') + ' ; groupes d\'éditeur : ' + await page.locator('.editor-group-container').count() + ' ; éditeur actif : ' + (await page.locator('.part.editor .editor-instance, .part.editor .monaco-editor').first().getAttribute('data-uri').catch(() => '?')));
      log('erreurs console récentes : ' + erreursConsole.slice(-4).join(' || '));
      if (/settings\.json/i.test(onglets)) break;
    }
    verifier(/settings\.json/i.test(onglets), 'paramètres : fichier settings.json');
  });
  await essai('raccourcis', async () => {
    await commande('Preferences: Open Keyboard Shortcuts');
    await page.waitForSelector('.keybindings-editor', { timeout: 15000 });
    verifier(true, 'raccourcis clavier personnalisables (éditeur de raccourcis)');
  });
  await essai('profils', async () => {
    await palette('F1', 'Profiles:');
    const n = await page.locator('.quick-input-widget .monaco-list-row').count();
    verifier(n >= 2, `profils d'utilisateur : ${n} commandes « Profiles »`);
  });
  await essai('contraste', async () => {
    await commande('Preferences: Color Theme');
    await page.keyboard.type('High Contrast', { delay: 30 });
    await page.waitForTimeout(1200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    const hc = await page.locator('.monaco-workbench.hc-black, .monaco-workbench.hc-light').count();
    verifier(hc >= 1, 'thème à contraste élevé');
  });

  // ===== Section 11 : productivité =====
  await essai('emmet', async () => {
    await ouvrir('h.html');
    await cliquerEditeur();
    await page.keyboard.type('ul>li*3', { delay: 30 });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1200);
    const n = ((await texte()).match(/<li>/g) || []).length;
    verifier(n === 3, `Emmet : « ul>li*3 » donne ${n} éléments <li>`);
  });
  await essai('notebook', async () => {
    await ouvrir('n.ipynb');
    await page.waitForTimeout(3000);
    verifier(await page.locator('.notebook-editor').count() >= 1, 'éditeur de notebooks (.ipynb)');
  });
  await essai('zen', async () => {
    const barre = () => page.locator('.part.statusbar').first().isVisible();
    const avant = await barre();
    await commande('View: Toggle Zen Mode');
    await page.waitForTimeout(2000);
    const pendant = await barre();
    verifier(avant && !pendant, `mode sans distraction (Zen) : barre d'état visible avant=${avant}, pendant=${pendant}`);
    await commande('View: Toggle Zen Mode');
  });
  await essai('recommandees', async () => {
    await page.keyboard.press('Control+Shift+x');
    await page.waitForSelector('.extensions-viewlet', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.keyboard.type('@recommended', { delay: 30 });
    const ok = await attendre(() => page.locator('.extensions-viewlet .monaco-list-row', { hasText: /YAML/i }).count().then(n => n > 0), 40000);
    verifier(ok, 'extensions recommandées par le projet (extensions.json) : YAML affiché');
  });

  await essai('markdown', async () => {
    await ouvrir('doc.md');
    await commande('Markdown: Open Preview');
    await page.waitForTimeout(3500);
    const t = await page.locator('.tabs-container .tab', { hasText: /Preview/ }).count();
    const w = await page.locator('.webview').count();
    verifier(t >= 1 && w >= 1, `aperçu Markdown (onglets Preview : ${t}, webview : ${w})`);
    await page.locator('.tabs-container .tab', { hasText: /Preview/ }).first().locator('.codicon-close, .action-label').first().click().catch(() => {});
  });
  await page.screenshot({ path: '/tmp/cody-logs/p5-4-outils.png' });
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

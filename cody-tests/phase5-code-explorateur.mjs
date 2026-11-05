// Test Phase 5.2 : intelligence du code (section 2) et explorateur / navigation (section 3).
// Chaque vérification est indépendante : un échec n'arrête pas les suivantes.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 5.2 code et explorateur::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/ws52';
fs.rmSync(dossier, { recursive: true, force: true });
fs.mkdirSync(`${dossier}/sous`, { recursive: true });
fs.writeFileSync(`${dossier}/t.ts`,
  'export function saluer(nom: string): string {\n  return "Salut " + nom;\n}\nconst message: number = saluer("a");\nlet inutile = 5;\nconsole.log(saluer("b"));\n');
fs.writeFileSync(`${dossier}/mauvais.json`, '{"a": }\n');
fs.writeFileSync(`${dossier}/recherche.txt`, 'phrase avec MOTUNIQUE dedans\n');
fs.writeFileSync(`${dossier}/ancien.txt`, 'a deplacer\n');
fs.writeFileSync(`${dossier}/a-renommer.txt`, 'x\n');
fs.writeFileSync(`${dossier}/a-supprimer.txt`, 'x\n');
fs.mkdirSync('/tmp/ws52b', { recursive: true });
fs.writeFileSync('/tmp/ws52b/autre.txt', 'autre dossier\n');
fs.writeFileSync('/tmp/multi52.code-workspace', JSON.stringify({ folders: [{ path: dossier }, { path: '/tmp/ws52b' }] }));
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
  const ouvrir = async (nom) => {
    await palette('Control+p', nom);
    await page.keyboard.press('Enter');
    await page.locator('.tabs-container .tab.active', { hasText: nom }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
  };
  const commande = async (nom) => { await palette('F1', nom); await page.keyboard.press('Enter'); await page.waitForTimeout(1200); };
  const essai = async (nom, fn) => {
    try { await fn(); } catch (e) { verifier(false, `${nom} (erreur : ${String(e.message).split('\n')[0].slice(0, 120)})`); }
    await page.keyboard.press('Escape').catch(() => {});
  };
  const cliquerEditeur = async () => { await page.click('.monaco-editor .view-lines'); };
  const attendre = async (cond, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (cond()) return true; await page.waitForTimeout(500); } return false; };
  const allerLigne = async (n) => { await page.keyboard.press('Control+g'); await page.keyboard.type(String(n), { delay: 30 }); await page.keyboard.press('Enter'); await page.waitForTimeout(300); };

  // ===== Section 2 : intelligence du code =====
  await ouvrir('t.ts');
  await essai('erreurs', async () => {
    await page.waitForSelector('.monaco-editor .squiggly-error', { timeout: 60000 });
    verifier(true, 'erreurs détectées en direct (soulignement rouge dans t.ts)');
  });
  await essai('erreurs-lsp', async () => {
    await ouvrir('mauvais.json');
    await page.waitForSelector('.monaco-editor .squiggly-error', { timeout: 60000 });
    verifier(true, 'langage pris en charge par un serveur de langage (erreur JSON détectée)');
  });
  await ouvrir('t.ts');
  await essai('correction-rapide', async () => {
    await cliquerEditeur();
    await allerLigne(5);
    await page.keyboard.press('Control+.');
    await page.waitForSelector('.context-view .action-widget, .codeActionWidget, .action-widget', { timeout: 15000 });
    const n = await page.locator('.action-widget .monaco-list-row').count();
    verifier(n >= 1, `corrections rapides proposées (${n})`);
    await page.keyboard.press('Escape');
  });
  await essai('autocompletion', async () => {
    await cliquerEditeur();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('sal', { delay: 30 });
    await page.keyboard.press('Control+Space');
    await page.waitForSelector('.suggest-widget.visible', { timeout: 20000 });
    const s = await page.locator('.suggest-widget .monaco-list-row').first().innerText();
    verifier(/saluer/.test(s), `autocomplétion : « ${s.replace(/\n/g, ' ').slice(0, 40)} »`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+z');
  });
  await essai('aide-parametres', async () => {
    await cliquerEditeur();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('saluer(', { delay: 30 });
    await page.waitForSelector('.parameter-hints-widget.visible', { timeout: 20000 });
    verifier(true, 'aide sur les paramètres de fonction');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+z');
  });
  await essai('definition', async () => {
    await cliquerEditeur();
    await allerLigne(6);
    await page.keyboard.press('End');
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('F12');
    await page.waitForTimeout(2500);
    const pos = await page.locator('.statusbar-item', { hasText: /Ln \d+/ }).first().innerText();
    verifier(/Ln 1,/.test(pos), `aller à la définition (F12) : ${pos}`);
  });
  await essai('references', async () => {
    await page.keyboard.press('Shift+F12');
    await page.waitForSelector('.peekview-widget .reference-zone-widget, .zone-widget .results-loaded, .peekview-widget', { timeout: 15000 });
    await page.waitForTimeout(1000);
    const n = await page.locator('.peekview-widget .monaco-list-row').count();
    verifier(n >= 2, `aller aux références (${n} lignes)`);
    await page.keyboard.press('Escape');
  });
  await essai('renommage', async () => {
    await cliquerEditeur();
    await allerLigne(1);
    await page.keyboard.press('Home');
    for (let i = 0; i < 18; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('F2');
    await page.locator('.rename-box').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(800);
    await page.keyboard.type('saluerTous', { delay: 30 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    const t = await texte();
    log('texte après renommage : ' + t.replace(/\n/g, '|').slice(0, 150));
    const n = (t.match(/saluerTous/g) || []).length;
    verifier(n >= 3, `renommage intelligent (${n} occurrences renommées)`);
  });
  await essai('snippets', async () => {
    await cliquerEditeur();
    await page.keyboard.press('Control+End');
    await commande('Insert Snippet');
    await page.keyboard.type('for', { delay: 30 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    const t = await texte();
    verifier(/for \(/.test(t), 'extraits de code (snippet « for » inséré)');
  });

  // ===== Section 3 : explorateur et navigation =====
  const ligneExplorateur = (nom) => page.locator('.explorer-folders-view .monaco-list-row', { hasText: nom }).first();
  await essai('creer', async () => {
    await page.locator('.explorer-viewlet .pane-header').first().hover();
    await page.locator('[aria-label="New File..."]').first().click({ force: true, timeout: 10000 });
    await page.waitForSelector('.explorer-folders-view .monaco-inputbox input', { timeout: 10000 });
    await page.keyboard.type('nouveau.txt', { delay: 30 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    verifier(fs.existsSync(`${dossier}/nouveau.txt`), 'explorateur : créer un fichier');
  });
  await essai('renommer', async () => {
    await ligneExplorateur('a-renommer.txt').click();
    await page.keyboard.press('F2');
    await page.waitForSelector('.explorer-folders-view .monaco-inputbox input', { timeout: 10000 });
    await page.keyboard.press('Control+a');
    await page.keyboard.type('renomme.txt', { delay: 30 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    verifier(fs.existsSync(`${dossier}/renomme.txt`) && !fs.existsSync(`${dossier}/a-renommer.txt`), 'explorateur : renommer un fichier');
  });
  await essai('deplacer', async () => {
    await ligneExplorateur('ancien.txt').click();
    await page.keyboard.press('Control+x');
    await ligneExplorateur('sous').click();
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(1500);
    const dialogue = await page.locator('.monaco-dialog-box').allInnerTexts();
    if (dialogue.length) { log('boîte pendant le collage : ' + dialogue.join(' | ').replace(/\n/g, ' ').slice(0, 150)); await page.locator('.monaco-dialog-box .monaco-button', { hasText: /^(Move|Paste|Yes|OK)/ }).first().click().catch(() => {}); }
    let ok = await attendre(() => fs.existsSync(`${dossier}/sous/ancien.txt`), 8000);
    log('après couper/coller : racine=' + fs.readdirSync(dossier).join(',') + ' sous=' + fs.readdirSync(`${dossier}/sous`).join(','));
    if (!ok) {
      await ligneExplorateur('ancien.txt').dragTo(ligneExplorateur('sous'));
      await page.waitForTimeout(1500);
      for (const b of await page.locator('.monaco-dialog-box .monaco-button', { hasText: /^(Move|Yes|OK)/ }).all()) await b.click().catch(() => {});
      ok = await attendre(() => fs.existsSync(`${dossier}/sous/ancien.txt`), 8000);
      log('après glisser-déposer : ' + (ok ? 'déplacé' : 'pas déplacé'));
    }
    verifier(ok && !fs.existsSync(`${dossier}/ancien.txt`), 'explorateur : déplacer un fichier');
  });
  await essai('supprimer', async () => {
    await ligneExplorateur('a-supprimer.txt').click();
    await page.keyboard.press('Delete');
    await page.waitForSelector('.monaco-dialog-box', { timeout: 10000 });
    log('boutons de la boîte : ' + (await page.locator('.monaco-dialog-box .monaco-button').allInnerTexts()).join(' / '));
    await page.locator('.monaco-dialog-box .monaco-button', { hasText: /^(Delete|Move to Trash|Supprimer)/ }).first().click();
    await attendre(() => !fs.existsSync(`${dossier}/a-supprimer.txt`), 10000);
    verifier(!fs.existsSync(`${dossier}/a-supprimer.txt`), 'explorateur : supprimer un fichier');
  });
  await essai('recherche-globale', async () => {
    await page.keyboard.press('Control+Shift+f');
    await page.waitForSelector('.search-view', { timeout: 10000 });
    await page.keyboard.type('MOTUNIQUE', { delay: 30 });
    await page.keyboard.press('Enter');
    await page.waitForSelector('.search-view .monaco-list-row', { timeout: 30000 });
    const t = await page.locator('.search-view .monaco-list-row').first().innerText();
    verifier(/recherche\.txt/.test(t), `recherche globale dans le projet : « ${t.replace(/\n/g, ' ').slice(0, 50)} »`);
  });
  await essai('palette', async () => {
    await palette('Control+Shift+p', '');
    const n = await page.locator('.quick-input-widget .monaco-list-row').count();
    verifier(n >= 5, `palette de commandes (Ctrl+Maj+P) : ${n} commandes affichées`);
  });
  await essai('structure', async () => {
    await ouvrir('t.ts');
    await commande('Outline: Focus on Outline View');
    await page.waitForTimeout(2500);
    const t = await page.locator('.outline-tree .monaco-list-row, .pane-body .monaco-list-row', { hasText: 'saluer' }).count();
    verifier(t >= 1, 'vue Structure (symboles du fichier)');
  });
  await essai('timeline', async () => {
    await cliquerEditeur();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('// un', { delay: 30 });
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(1200);
    await page.keyboard.type(' deux', { delay: 30 });
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(1500);
    await commande('Timeline: Focus on Timeline View');
    await page.waitForTimeout(3000);
    const n = await page.locator('.pane-body .monaco-list-row', { hasText: /File Saved|Saved/ }).count();
    verifier(n >= 1, `historique local des fichiers (${n} entrées)`);
  });

  // Espaces de travail multiples : nouvelle page avec un fichier .code-workspace
  await essai('multi-dossiers', async () => {
    const p2 = await browser.newPage({ viewport: { width: 1500, height: 900 }, locale: 'en-US' });
    await p2.goto('http://127.0.0.1:8080/?workspace=/tmp/multi52.code-workspace', { waitUntil: 'load' });
    await p2.waitForSelector('.monaco-workbench', { timeout: 120000 });
    await p2.waitForTimeout(5000);
    await p2.locator('.explorer-folders-view .monaco-list-row').first().click().catch(() => {});
    await p2.waitForTimeout(1500);
    const noms = await p2.locator('.explorer-folders-view .monaco-list-row').allInnerTexts();
    const ok = noms.some(n => /ws52b/.test(n)) && noms.some(n => /ws52\b/.test(n));
    verifier(ok, `espace de travail avec plusieurs dossiers : ${noms.slice(0, 4).map(n => n.replace(/\n/g, ' ')).join(' | ')}`);
    await p2.screenshot({ path: '/tmp/cody-logs/p5-2-multi.png' });
    await p2.close();
  });

  await page.screenshot({ path: '/tmp/cody-logs/p5-2-code.png' });
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

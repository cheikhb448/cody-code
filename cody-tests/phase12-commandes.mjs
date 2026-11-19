// Test Phase 12 : parité avec VS Code - les commandes essentielles existent (palette de commandes F1).
// « Indispensables » : un manque = échec. « Souhaitées » : un manque est seulement signalé dans le rapport.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3800).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 12 commandes::${msg}`);
};
let erreurs = 0;

// Chaque entrée peut proposer plusieurs titres possibles séparés par « | » (le titre a changé selon les versions).
// Groupe A : un fichier PHP est ouvert dans un dossier Git (commandes de l'éditeur et de Git) ; groupe B : un fichier Markdown est ouvert.
const GROUPES = [
  { nom: 'sans fichier', fichier: null, indispensables: [
    'File: New Untitled Text File', 'File: Open Folder', 'File: Save All', 'File: Save As', 'View: Close Editor', 'File: Open Recent',
    'Workspaces: Add Folder to Workspace', 'Workspaces: Save Workspace As',
    'View: Toggle Terminal', 'View: Toggle Problems', 'View: Toggle Output', 'View: Toggle Minimap',
    'View: Toggle Zen Mode', 'View: Toggle Full Screen', 'View: Toggle Primary Side Bar Visibility',
    'Go to File', 'Go to Symbol in Workspace', 'Go to Line/Column', 'Find in Files', 'Replace in Files',
    'Debug: Start Debugging', 'Debug: Add Configuration', 'Tasks: Run Task', 'Tasks: Configure Task',
    'Terminal: Create New Terminal', 'Terminal: Split Terminal', 'Terminal: Kill the Active Terminal Instance',
    'Git: Clone', 'Git: Initialize Repository',
    'Extensions: Install Extensions', 'Extensions: Show Installed Extensions', 'Extensions: Install from VSIX',
    'Preferences: Open Settings (UI)', 'Preferences: Open User Settings (JSON)', 'Preferences: Open Keyboard Shortcuts',
    'Preferences: Color Theme', 'Preferences: File Icon Theme', 'Snippets: Configure Snippets|Preferences: Configure User Snippets',
    'Developer: Reload Window', 'Simple Browser: Show', 'Toggle Screen Reader Accessibility Mode',
    'Cody Code : Se connecter à GitHub', 'Cody Code : activer le mode PC modeste',
  ], souhaitees: [
    'Preferences: Configure Display Language|Configure Display Language', 'Preferences: Open User Tasks', 'Preferences: Open Workspace Settings',
    'Preferences: Configure Language Specific Settings', 'Notebook: Create New Notebook|Create: New Jupyter Notebook',
    'Developer: Show Running Extensions', 'Developer: Inspect Editor Tokens and Scopes', 'Help: Show All Commands|Show All Commands',
    'Terminal: Select Default Profile', 'Terminal: Rename', 'View: Show Search', 'View: Show Source Control|View: Show SCM|Source Control: Focus on Source Control View', 'View: Show Run and Debug',
    'View: Show Explorer', 'View: Show Extensions', 'File: Toggle Auto Save|File: Auto Save', 'Open Timeline|Timeline: Focus on Timeline View', 'Outline: Focus on Outline View',
    'Debug: Add Function Breakpoint', 'Debug: Toggle Breakpoint', 'Debug: Attach to Node Process',
    'Profiles: Create Profile|Profiles: New Profile', 'Profiles: Switch Profile', 'Profiles: Export Profile', 'Profiles: Import Profile|Profiles: Import Profile...',
  ] },
  { nom: 'fichier PHP dans un dossier Git', fichier: 'app/Controllers/HomeController.php', indispensables: [
    'View: Toggle Word Wrap', 'Format Document', 'Toggle Line Comment', 'Add Cursor Above',
    'Git: Commit', 'Git: Push', 'Git: Pull', 'Git: Create Branch', 'Git: Stash', 'Git: Checkout to',
  ], souhaitees: [
    'Git: Publish to GitHub|Git: Publish Branch', 'Git: Fetch', 'Git: Merge Branch|Git: Merge...', 'Git: Delete Branch', 'Git: View History|Git: View File History', 'Git: Clean All|Git: Discard All Changes',
    'Go to Definition', 'Rename Symbol', /* ces deux-là n'apparaissent que pour un langage avec serveur (testés en TypeScript, phase 5) */
    'Compare Active File with', 'Emmet: Expand Abbreviation',
  ] },
  { nom: 'fichier Markdown', fichier: 'README.md', indispensables: ['Markdown: Open Preview', 'Markdown: Open Preview to the Side'], souhaitees: [] },
];
// Pour comprendre ce qui existe vraiment : on liste ce que la palette propose pour ces mots
const SONDES = ['Profile', 'Language', 'Settings Sync|Backup and Sync', 'Remote'];

const dossier = '/tmp/DropLink12';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
execSync('git init -q && git add -A && git -c user.name=Test -c user.email=test@example.com commit -q -m "premier commit"', { cwd: dossier });

const norm = t => t.toLowerCase().replace(/[….]+/g, '').replace(/\s+/g, ' ').trim();
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, locale: 'en-US' });
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(10000);

  const lire = async requete => {
    await page.keyboard.press('F1');
    await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
    await page.keyboard.type(requete, { delay: 15 });
    await page.waitForTimeout(700);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.quick-input-list .monaco-list-row')].map(r => (r.innerText || '').replace(/\n/g, ' ').trim()));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    return rows;
  };
  const existe = async entree => {
    for (const titre of entree.split('|')) {
      const cible = norm(titre);
      if ((await lire(titre)).some(r => norm(r).includes(cible))) return true;
    }
    return false;
  };

  const manquantsIndispensables = [], manquantsSouhaites = [];
  let totalInd = 0, totalSou = 0;
  for (const g of GROUPES) {
    if (g.fichier) {
      await page.keyboard.press('Control+p');
      await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
      await page.keyboard.type(g.fichier.split('/').pop(), { delay: 30 });
      await page.waitForTimeout(900);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3500);
      await page.locator('.part.editor .monaco-editor .view-lines').first().click({ position: { x: 40, y: 20 } }).catch(() => { });
      await page.waitForTimeout(1500);
    }
    for (const t of g.indispensables) { totalInd++; if (!(await existe(t))) manquantsIndispensables.push(t); }
    for (const t of g.souhaitees) { totalSou++; if (!(await existe(t))) manquantsSouhaites.push(t); }
  }

  log(`commandes indispensables : ${totalInd - manquantsIndispensables.length}/${totalInd} présentes`);
  if (manquantsIndispensables.length) { log('MANQUE (indispensables) : ' + manquantsIndispensables.join(' | ')); erreurs++; }
  log(`commandes souhaitées : ${totalSou - manquantsSouhaites.length}/${totalSou} présentes`);
  if (manquantsSouhaites.length) log('MANQUE (souhaitées, à examiner) : ' + manquantsSouhaites.join(' | '));
  for (const sonde of SONDES) {
    const rows = [];
    for (const m of sonde.split('|')) rows.push(...await lire(m));
    log(`palette « ${sonde} » : ` + (rows.length ? [...new Set(rows)].slice(0, 12).map(r => r.slice(0, 60)).join(' ; ') : 'rien'));
  }

  // Aucune commande Microsoft / service en ligne Microsoft ne doit être proposée
  await page.keyboard.press('F1');
  await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
  await page.keyboard.type('Microsoft', { delay: 30 });
  await page.waitForTimeout(900);
  const microsoft = await page.evaluate(() => [...document.querySelectorAll('.quick-input-list .monaco-list-row')].map(r => (r.innerText || '').replace(/\n/g, ' ').slice(0, 90)));
  await page.keyboard.press('Escape');
  const vraiesCommandes = microsoft.filter(r => !/no matching/i.test(r));
  log('commandes qui parlent de Microsoft : ' + (vraiesCommandes.length ? vraiesCommandes.join(' | ') : 'aucune'));
  if (vraiesCommandes.length) erreurs++;

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

// Test Phase 12 : parité avec VS Code - les commandes essentielles existent (palette de commandes F1).
// « Indispensables » : un manque = échec. « Souhaitées » : un manque est seulement signalé dans le rapport.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3800).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 12 commandes::${msg}`);
};
let erreurs = 0;

const INDISPENSABLES = [
  'File: New Untitled Text File', 'File: Open Folder', 'File: Save All', 'File: Save As', 'File: Close Editor', 'File: Open Recent',
  'File: Add Folder to Workspace', 'File: Save Workspace As',
  'View: Toggle Terminal', 'View: Toggle Problems', 'View: Toggle Output', 'View: Toggle Word Wrap', 'View: Toggle Minimap',
  'View: Toggle Zen Mode', 'View: Toggle Full Screen', 'View: Toggle Primary Side Bar Visibility',
  'Go to File', 'Go to Symbol in Workspace', 'Go to Line/Column', 'Go to Definition',
  'Format Document', 'Rename Symbol', 'Toggle Line Comment', 'Add Cursor Above', 'Find in Files', 'Replace in Files',
  'Debug: Start Debugging', 'Debug: Add Configuration', 'Tasks: Run Task', 'Tasks: Configure Task',
  'Terminal: Create New Terminal', 'Terminal: Split Terminal', 'Terminal: Kill the Active Terminal Instance',
  'Git: Clone', 'Git: Initialize Repository', 'Git: Commit', 'Git: Push', 'Git: Pull', 'Git: Checkout to', 'Git: Create Branch', 'Git: Stash',
  'Extensions: Install Extensions', 'Extensions: Show Installed Extensions', 'Extensions: Install from VSIX',
  'Preferences: Open Settings (UI)', 'Preferences: Open Settings (JSON)', 'Preferences: Open Keyboard Shortcuts',
  'Preferences: Color Theme', 'Preferences: File Icon Theme', 'Preferences: Configure User Snippets', 'Preferences: Configure Display Language',
  'Profiles: Create Profile', 'Profiles: Switch Profile', 'Profiles: Export Profile', 'Profiles: Import Profile',
  'Developer: Reload Window', 'Markdown: Open Preview', 'Simple Browser: Show',
  'Toggle Screen Reader Accessibility Mode',
  'Cody Code : Se connecter à GitHub', 'Cody Code : activer le mode PC modeste',
];
const SOUHAITEES = [
  'Git: Publish to GitHub', 'Git: Fetch', 'Git: Merge Branch', 'Git: Delete Branch', 'Git: View History', 'Git: Clean All',
  'Debug: Add Function Breakpoint', 'Debug: Toggle Breakpoint', 'Debug: Attach to Node Process',
  'Preferences: Open User Tasks', 'Preferences: Open Workspace Settings', 'Preferences: Configure Language Specific Settings',
  'Notebook: Create New Notebook', 'Create: New Jupyter Notebook', 'Emmet: Expand Abbreviation',
  'Developer: Show Running Extensions', 'Developer: Inspect Editor Tokens and Scopes', 'Help: Show All Commands',
  'Terminal: Select Default Profile', 'Terminal: Run Selected Text in Active Terminal', 'Terminal: Rename',
  'View: Show Search', 'View: Show Source Control', 'View: Show Run and Debug', 'View: Show Explorer', 'View: Show Extensions',
  'Search: Find in Files', 'Preferences: Open Remote Settings', 'File: Revert File', 'File: Auto Save',
  'Open Timeline', 'Outline: Focus on Outline View', 'Compare Active File with',
];

const dossier = '/tmp/DropLink12';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });

const norm = t => t.toLowerCase().replace(/[….]+/g, '').replace(/\s+/g, ' ').trim();
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, locale: 'en-US' });
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(10000);

  const existe = async titre => {
    await page.keyboard.press('F1');
    await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
    await page.keyboard.type(titre, { delay: 15 });
    await page.waitForTimeout(700);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.quick-input-list .monaco-list-row')].map(r => (r.innerText || '').replace(/\n/g, ' ')));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const cible = norm(titre);
    return rows.some(r => norm(r).includes(cible));
  };

  const manquantsIndispensables = [], manquantsSouhaites = [];
  for (const t of INDISPENSABLES) { if (!(await existe(t))) manquantsIndispensables.push(t); }
  for (const t of SOUHAITEES) { if (!(await existe(t))) manquantsSouhaites.push(t); }

  log(`commandes indispensables : ${INDISPENSABLES.length - manquantsIndispensables.length}/${INDISPENSABLES.length} présentes`);
  if (manquantsIndispensables.length) { log('MANQUE (indispensables) : ' + manquantsIndispensables.join(' | ')); erreurs++; }
  log(`commandes souhaitées : ${SOUHAITEES.length - manquantsSouhaites.length}/${SOUHAITEES.length} présentes`);
  if (manquantsSouhaites.length) log('MANQUE (souhaitées, à examiner) : ' + manquantsSouhaites.join(' | '));

  // Aucune commande Microsoft / service en ligne Microsoft ne doit être proposée
  await page.keyboard.press('F1');
  await page.waitForSelector('.quick-input-widget', { timeout: 10000 });
  await page.keyboard.type('Microsoft', { delay: 30 });
  await page.waitForTimeout(900);
  const microsoft = await page.evaluate(() => [...document.querySelectorAll('.quick-input-list .monaco-list-row')].map(r => (r.innerText || '').replace(/\n/g, ' ').slice(0, 90)));
  await page.keyboard.press('Escape');
  log('commandes qui parlent de Microsoft : ' + (microsoft.length ? microsoft.join(' | ') : 'aucune'));
  if (microsoft.length) erreurs++;

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

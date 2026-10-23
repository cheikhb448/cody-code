// Test Phase 1 : ouvrir l'éditeur, ouvrir un fichier, écrire, sauvegarder.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const dossier = '/tmp/cody-ws';
const fichier = `${dossier}/test.txt`;
const texte = 'Bonjour depuis Cody Code';
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(fichier, 'debut\n');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', e => console.log('ERREUR PAGE:', e.message));
await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
console.log('OK éditeur affiché');
await page.screenshot({ path: '/tmp/cody-logs/1-editeur.png' });

// Ouvrir test.txt via « Aller au fichier »
await page.keyboard.press('Control+p');
await page.waitForSelector('.quick-input-widget', { timeout: 30000 });
await page.keyboard.type('test.txt');
await page.waitForTimeout(1500);
await page.keyboard.press('Enter');
await page.waitForSelector('.monaco-editor .view-lines', { timeout: 30000 });
console.log('OK fichier ouvert');

// Écrire à la fin puis sauvegarder
await page.click('.monaco-editor .view-lines');
await page.keyboard.press('Control+End');
await page.keyboard.type(texte);
await page.keyboard.press('Control+s');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/cody-logs/2-apres-sauvegarde.png' });

const contenu = fs.readFileSync(fichier, 'utf8');
console.log('Contenu du fichier :', JSON.stringify(contenu));
await browser.close();
if (!contenu.includes(texte)) { console.error('ÉCHEC : le texte n\'a pas été sauvegardé'); process.exit(1); }
console.log('OK sauvegarde confirmée');

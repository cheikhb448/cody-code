// Test Phase 8 : la version installable (bureau) démarre et affiche Cody Code.
import { _electron as electron } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 8 bureau::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const racine = process.argv[2] || '/home/runner/work/VSCode-linux-x64';
const exe = `${racine}/cody-code`;
const dossier = '/tmp/DropLink8';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
fs.mkdirSync('/tmp/cody-logs', { recursive: true });
fs.rmSync('/tmp/cody-desk', { recursive: true, force: true });

verifier(fs.existsSync(exe), `programme présent (${exe})`);
const ext = `${racine}/resources/app/extensions`;
verifier(fs.existsSync(ext), 'extensions intégrées présentes');
verifier(!fs.existsSync(`${ext}/copilot`), 'pas de Copilot dans le paquet');
verifier(!fs.existsSync(`${ext}/vscode-api-tests`), 'pas d\'extensions de test dans le paquet');
const produit = JSON.parse(fs.readFileSync(`${racine}/resources/app/product.json`, 'utf8'));
verifier(produit.nameLong === 'Cody Code', `nom du produit : ${produit.nameLong}`);

let app;
try {
  app = await electron.launch({
    executablePath: exe,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--user-data-dir=/tmp/cody-desk/data', '--extensions-dir=/tmp/cody-desk/ext', dossier],
    timeout: 120000
  });
  const page = await app.firstWindow();
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 160)));
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: '/tmp/cody-logs/p8-bureau.png' });
  const texte = await page.evaluate(() => document.body.innerText);
  const classes = await page.evaluate(() => document.querySelector('.monaco-workbench')?.className ?? '');
  verifier(/Cody Assistant/.test(texte), 'panneau « Cody Assistant » affiché');
  verifier(/DropLink/i.test(texte), 'le dossier ouvert est affiché dans l\'explorateur');
  verifier(/vs-dark|dark/.test(await page.evaluate(() => document.body.className)) || /dark/i.test(classes), 'thème sombre Cody par défaut');
  verifier(!/Copilot|Sign In|Open in Agents|Continue with GitHub/i.test(texte), 'aucune trace de Copilot / connexion GitHub dans l\'interface');
  // La seule fenêtre permise au démarrage : la demande de confiance du dossier (le terminal exécute du code)
  const fenetres = await page.locator('.monaco-dialog-box').allInnerTexts();
  verifier(fenetres.every(t => !/Copilot|GitHub|Sign in/i.test(t)) && await page.locator('.onboarding-a').count() === 0, `aucune fenêtre de bienvenue Copilot (fenêtres : ${fenetres.map(t => t.slice(0, 40).replace(/\s+/g, ' ')).join(' | ') || 'aucune'})`);
  log('interface : ' + texte.replace(/\s+/g, ' ').slice(0, 220));
  const titre = await page.title();
  log('titre de la fenêtre : ' + titre);
  verifier(/Cody Code/.test(titre) || /DropLink/.test(titre), 'titre de la fenêtre');
  log(erreurs === 0 ? 'TOUT EST BON' : `${erreurs} échec(s)`);
  annoter(erreurs === 0 ? 'notice' : 'error');
} catch (e) {
  log('ERREUR FATALE: ' + String(e.message).slice(0, 400));
  annoter('error');
  erreurs++;
} finally {
  await app?.close().catch(() => {});
}
process.exit(erreurs === 0 ? 0 : 1);

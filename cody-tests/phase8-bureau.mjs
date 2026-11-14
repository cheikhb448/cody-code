// Test Phase 8 : la version installable (bureau) démarre et affiche Cody Code.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { _electron: electron } = await import(pathToFileURL(process.env.PW_PATH || '/tmp/pw/node_modules/playwright/index.mjs').href);

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 8 bureau::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const racine = process.argv[2] || '/home/runner/work/VSCode-linux-x64';
const exe = `${racine}/${process.argv[3] || 'cody-code'}`;
const TMP = process.env.CODY_TMP || '/tmp';
const LOGS = process.env.CODY_LOGS || '/tmp/cody-logs';
const dossier = `${TMP}/DropLink8`;
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
// Fichiers de types variés pour vérifier les icônes (Python, PDF, texte, image…)
for (const nom of ['exemple.py', 'document.pdf', 'notes.txt', 'photo.png', 'script.js', 'page.php', 'archive.zip', 'style.css', 'donnees.json', 'index.html', 'Main.java', 'main.c', 'lisez-moi.md', 'app.ts', 'Dockerfile', '.gitignore']) {
  fs.writeFileSync(`${dossier}/${nom}`, nom === 'exemple.py' ? 'def bonjour(nom):\n    return f"Salut {nom}"\n' : 'x\n');
}
fs.mkdirSync(LOGS, { recursive: true });
fs.rmSync(`${TMP}/cody-desk`, { recursive: true, force: true });

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
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--user-data-dir=${TMP}/cody-desk/data`, `--extensions-dir=${TMP}/cody-desk/ext`, dossier],
    timeout: 120000
  });
  const page = await app.firstWindow();
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 160)));
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  // Écran de test parfois petit (Windows) : on agrandit la fenêtre comme sur un vrai ordinateur
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSize(1400, 900); w.center(); }).catch(() => {});
  await page.waitForTimeout(8000);
  log('taille de la fenêtre : ' + await page.evaluate(() => `${window.innerWidth}x${window.innerHeight}`));
  log('panneau latéral droit : ' + await page.evaluate(() => { const e = document.querySelector('.part.auxiliarybar'); if (!e) { return 'absent'; } const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)} ${getComputedStyle(e).display}`; }));
  await page.screenshot({ path: `${LOGS}/p8-bureau${process.platform === 'win32' ? '-win' : ''}.png` });
  // Sur une machine lente, le panneau de l'assistant peut arriver un peu plus tard : on patiente jusqu'à 40 s
  for (let i = 0; i < 40 && !/Cody Assistant|Salut/.test(await page.evaluate(() => document.body.innerText)); i++) await page.waitForTimeout(1000);
  const texte = await page.evaluate(() => document.body.innerText);
  const classes = await page.evaluate(() => document.querySelector('.monaco-workbench')?.className ?? '');
  verifier(/Cody Assistant|Salut/.test(texte), 'panneau de l\'assistant Cody affiché');
  verifier(/DropLink/i.test(texte), 'le dossier ouvert est affiché dans l\'explorateur');
  verifier(/vs-dark|dark/.test(await page.evaluate(() => document.body.className)) || /dark/i.test(classes), 'thème sombre Cody par défaut');
  // Icônes de fichiers : pour chaque ligne de l'explorateur, quel glyphe / image est dessiné ?
  const icones = await page.evaluate(() => [...document.querySelectorAll('.part.sidebar .explorer-folders-view .monaco-list-row')].map(r => {
    const lab = r.querySelector('.monaco-icon-label');
    const nom = (r.querySelector('.label-name')?.textContent ?? '').trim();
    if (!lab) { return { nom, icone: 'aucun-label' }; }
    const av = getComputedStyle(lab, '::before');
    const police = av.fontFamily;
    const contenu = av.content;
    const image = (av.backgroundImage !== 'none' ? av.backgroundImage : (av.maskImage || '')).slice(-70);
    return { nom, contenu: contenu.slice(0, 6), police: police.slice(0, 40), largeur: av.width, image, classes: lab.className.replace('monaco-icon-label ', '').slice(0, 80) };
  }));
  for (const i of icones.slice(0, 40)) log('ICONE ' + JSON.stringify(i));
  const police = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].map(f => `${f.family}:${f.status}`).join(', '); });
  log('polices chargées : ' + police);
  await page.locator('.part.sidebar').screenshot({ path: `${LOGS}/p8-icones${process.platform === 'win32' ? '-win' : ''}.png` }).catch(() => {});
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

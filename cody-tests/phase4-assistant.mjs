// Test Phase 4 : panneau Cody Assistant (à droite). Les vérifications s'ajoutent étape par étape.
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const lignes = [];
const log = m => { console.log(m); lignes.push(m); };
const annoter = (niveau) => {
  const msg = lignes.join('\n').slice(-3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  console.log(`::${niveau} title=Test phase 4::${msg}`);
};
let erreurs = 0;
const verifier = (ok, msg) => { log((ok ? 'OK ' : 'ÉCHEC ') + msg); if (!ok) erreurs++; };

const dossier = '/tmp/DropLink4';
fs.rmSync(dossier, { recursive: true, force: true });
fs.cpSync('cody-tests/fixtures/DropLink', dossier, { recursive: true });
fs.mkdirSync('/tmp/cody-logs', { recursive: true });

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1671, height: 941 }, locale: 'fr-FR' });
  page.on('pageerror', e => log('ERREUR PAGE: ' + e.message.slice(0, 160)));
  await page.goto(`http://127.0.0.1:8080/?folder=${dossier}`, { waitUntil: 'load' });
  await page.waitForSelector('.monaco-workbench', { timeout: 120000 });
  await page.waitForTimeout(5000);

  const textePanneau = () => page.evaluate(() => {
    const p = document.querySelector('.part.auxiliarybar');
    const visible = !!p && p.offsetWidth > 50 && getComputedStyle(p).display !== 'none';
    return { visible, texte: visible ? p.innerText.replace(/\s+/g, ' ').slice(0, 300) : '' };
  });

  // 4.2 : le panneau de droite est Cody Assistant (et plus le Chat de VS Code)
  let etat = await textePanneau();
  log('panneau de droite : ' + etat.texte);
  verifier(etat.visible, 'le panneau de droite est ouvert au démarrage');
  verifier(/Cody Assistant/.test(etat.texte), 'le panneau de droite affiche « Cody Assistant »');
  verifier(!/Conversation|Build with Agent|Créer avec des assistants/.test(etat.texte), 'le Chat de VS Code n\'est plus affiché');
  await page.screenshot({ path: '/tmp/cody-logs/p4-1-panneau.png' });

  // 4.3 : en-tête (logo, nom, badge IA) et 4 onglets
  const entete = await page.evaluate(() => {
    const l = document.querySelector('.part.auxiliarybar > .title .action-label[aria-label^="Cody Assistant"]');
    return l ? { badge: getComputedStyle(l, '::after').content, logo: getComputedStyle(l, '::before').content } : null;
  });
  verifier(entete && /IA/.test(entete.badge), 'l\'en-tête affiche le badge « IA »');
  const onglets = await page.$$eval('.cody-assistant-tab', els => els.map(e => e.textContent));
  verifier(JSON.stringify(onglets) === JSON.stringify(['Assistant', 'Chat', 'Codebase', 'Context']), 'les 4 onglets : ' + onglets.join(' · '));
  const actif = await page.$eval('.cody-assistant-tab.active', e => e.textContent);
  verifier(actif === 'Assistant', 'l\'onglet Assistant est actif au départ');

  // 4.4 : accueil et 4 actions rapides
  const accueil = await page.$eval('.cody-assistant-content', e => e.innerText.replace(/\s+/g, ' '));
  verifier(/Salut/.test(accueil) && /Je suis Cody/.test(accueil), 'message d\'accueil « Salut ! Je suis Cody… »');
  for (const nom of ['Générer du code', 'Expliquer le code', 'Corriger les erreurs', 'Améliorer le code']) {
    verifier(accueil.includes(nom), 'carte « ' + nom + ' »');
  }
  await page.screenshot({ path: '/tmp/cody-logs/p4-2-accueil.png' });

  // 4.5 : zone de saisie
  const saisie = await page.evaluate(() => ({
    placeholder: document.querySelector('.cody-assistant-textarea')?.placeholder ?? '',
    outils: document.querySelectorAll('.cody-assistant-tool').length,
    envoi: !!document.querySelector('.cody-assistant-send'),
  }));
  verifier(/Pose ta question/.test(saisie.placeholder), 'champ de saisie : « ' + saisie.placeholder + ' »');
  verifier(saisie.outils === 3 && saisie.envoi, '3 boutons (fichier, image, idées) + bouton envoyer');

  // Une carte remplit la saisie
  await page.click('.cody-assistant-card[data-action="generer"]');
  const amorce = await page.$eval('.cody-assistant-textarea', e => e.value);
  verifier(/Génère du code/.test(amorce), 'cliquer sur une carte remplit la saisie');
  await page.fill('.cody-assistant-textarea', '');

  // Le trombone ajoute le fichier ouvert au contexte
  await page.keyboard.press('Control+p');
  await page.waitForSelector('.quick-input-widget:not(.hidden)', { timeout: 30000 });
  await page.keyboard.type('public/index.php', { delay: 30 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  await page.click('.cody-assistant-tool[data-outil="joindre"]');
  await page.waitForTimeout(500);
  const puces = await page.$eval('.cody-assistant-chips', e => e.innerText);
  verifier(/index\.php/.test(puces), 'le trombone ajoute le fichier ouvert (index.php)');

  // Navigation entre onglets
  await page.click('.cody-assistant-tab:nth-child(3)');
  let contenu = await page.$eval('.cody-assistant-content', e => e.innerText);
  verifier(/pas encore disponible/.test(contenu), 'onglet Codebase : message « pas encore disponible »');
  verifier(await page.$eval('.cody-assistant-input', e => e.classList.contains('hidden')), 'la saisie est cachée dans Codebase');
  await page.click('.cody-assistant-tab:nth-child(4)');
  contenu = await page.$eval('.cody-assistant-content', e => e.innerText);
  verifier(/index\.php/.test(contenu), 'onglet Context : liste le fichier ajouté');

  // Envoi : le message reste sur place, Cody dit qu'il n'est pas relié
  await page.click('.cody-assistant-tab:nth-child(1)');
  await page.fill('.cody-assistant-textarea', 'Bonjour Cody');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  contenu = await page.$eval('.cody-assistant-content', e => e.innerText);
  verifier(/Bonjour Cody/.test(contenu) && /pas encore relié/.test(contenu), 'l\'envoi affiche la question dans Chat et la réponse « pas encore relié »');
  await page.screenshot({ path: '/tmp/cody-logs/p4-3-chat.png' });

  // Fermer puis rouvrir (Ctrl+Alt+B)
  await page.keyboard.press('Control+Alt+b');
  await page.waitForTimeout(1500);
  etat = await textePanneau();
  verifier(!etat.visible, 'le panneau se ferme (Ctrl+Alt+B)');
  await page.keyboard.press('Control+Alt+b');
  await page.waitForTimeout(1500);
  etat = await textePanneau();
  verifier(etat.visible && /Cody Assistant/.test(etat.texte), 'le panneau se rouvre avec Cody Assistant');

  annoter(erreurs ? 'error' : 'notice');
  await browser.close();
  process.exit(erreurs ? 1 : 0);
} catch (e) {
  log('ÉCHEC : ' + e.message.split('\n')[0]);
  try { await browser?.contexts()[0]?.pages()[0]?.screenshot({ path: '/tmp/cody-logs/p4-echec.png' }); } catch { /* ignoré */ }
  annoter('error');
  process.exit(1);
}

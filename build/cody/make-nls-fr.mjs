/*---------------------------------------------------------------------------------------------
 *  Cody Code - génère le français à partir du paquet de langue français.
 *  Usage : node build/cody/make-nls-fr.mjs <dossier-du-paquet> [dossier-de-sortie (défaut : out)] [--remplacer]
 *   - sans --remplacer (version web) : écrit nls.messages.fr.js à côté des fichiers anglais ;
 *   - avec --remplacer (version installée, bureau) : le français devient la langue PAR DÉFAUT
 *     (nls.messages.json et nls.messages.js sont remplacés ; l'anglais est gardé dans nls.messages.en.json).
 *  Licence MIT (voir LICENSE.txt à la racine).
 *--------------------------------------------------------------------------------------------*/
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '..', '..');
const options = process.argv.slice(2);
const remplacer = options.includes('--remplacer');
const positionnels = options.filter(o => !o.startsWith('--'));
const sortie = positionnels[1] ? resolve(positionnels[1]) : join(racine, 'out');

function trouver(dossier, profondeur = 0) {
	if (profondeur > 6 || !existsSync(dossier)) { return undefined; }
	for (const nom of readdirSync(dossier)) {
		const chemin = join(dossier, nom);
		let st; try { st = statSync(chemin); } catch { continue; }
		if (st.isFile() && nom === 'main.i18n.json' && chemin.includes('translations')) { return chemin; }
		if (st.isDirectory() && nom !== 'node_modules') {
			const r = trouver(chemin, profondeur + 1);
			if (r) { return r; }
		}
	}
	return undefined;
}

const source = positionnels[0];
if (!source) { console.error('Dossier du paquet de langue manquant.'); process.exit(2); }
const fichierPaquet = trouver(resolve(source));
if (!fichierPaquet) { console.error('main.i18n.json introuvable dans ' + source); process.exit(1); }

// Les textes anglais d'origine : si le français a déjà été installé une fois, on repart de la copie anglaise
const fichierAnglais = join(sortie, 'nls.messages.en.json');
const fichierMessages = join(sortie, 'nls.messages.json');
if (remplacer && !existsSync(fichierAnglais)) { copyFileSync(fichierMessages, fichierAnglais); }

const cles = JSON.parse(readFileSync(join(sortie, 'nls.keys.json'), 'utf-8'));
const defauts = JSON.parse(readFileSync(remplacer ? fichierAnglais : fichierMessages, 'utf-8'));
const paquet = JSON.parse(readFileSync(fichierPaquet, 'utf-8'));

const resultat = [];
let i = 0, traduits = 0;
for (const [moduleId, nlsKeys] of cles) {
	const t = paquet.contents?.[moduleId];
	for (const k of nlsKeys) {
		const msg = t?.[k];
		if (msg) { traduits++; }
		resultat.push(msg || defauts[i]);
		i++;
	}
}

// Sécurité : on ne remplace jamais les fichiers si le compte ne tombe pas juste (l'application resterait cassée)
if (resultat.length !== defauts.length) {
	console.error(`Nombre de textes incohérent (${resultat.length} au lieu de ${defauts.length}) : rien n'est remplacé.`);
	process.exit(1);
}

if (remplacer) {
	writeFileSync(fichierMessages, JSON.stringify(resultat), 'utf-8');
	writeFileSync(join(sortie, 'nls.messages.js'),
		`/* Cody Code : textes en français par défaut */\nglobalThis._VSCODE_NLS_MESSAGES=${JSON.stringify(resultat)};`, 'utf-8');
	console.log(`Français par défaut : ${traduits}/${resultat.length} textes traduits (${fichierPaquet})`);
} else {
	writeFileSync(join(sortie, 'nls.messages.fr.js'),
		`globalThis._VSCODE_NLS_MESSAGES=${JSON.stringify(resultat)};globalThis._VSCODE_NLS_LANGUAGE="fr";`, 'utf-8');
	console.log(`Français : ${traduits}/${resultat.length} textes traduits (${fichierPaquet})`);
}

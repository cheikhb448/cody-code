/*---------------------------------------------------------------------------------------------
 *  Cody Code - génère out/nls.messages.fr.js à partir du paquet de langue français.
 *  Usage : node build/cody/make-nls-fr.mjs <dossier-du-paquet> [dossier-de-sortie (défaut : out)]
 *  Licence MIT (voir LICENSE.txt à la racine).
 *--------------------------------------------------------------------------------------------*/
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '..', '..');
const sortie = process.argv[3] ? resolve(process.argv[3]) : join(racine, 'out');

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

const source = process.argv[2];
if (!source) { console.error('Dossier du paquet de langue manquant.'); process.exit(2); }
const fichierPaquet = trouver(resolve(source));
if (!fichierPaquet) { console.error('main.i18n.json introuvable dans ' + source); process.exit(1); }

const cles = JSON.parse(readFileSync(join(sortie, 'nls.keys.json'), 'utf-8'));
const defauts = JSON.parse(readFileSync(join(sortie, 'nls.messages.json'), 'utf-8'));
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

writeFileSync(join(sortie, 'nls.messages.fr.js'),
	`globalThis._VSCODE_NLS_MESSAGES=${JSON.stringify(resultat)};globalThis._VSCODE_NLS_LANGUAGE="fr";`, 'utf-8');
console.log(`Français : ${traduits}/${resultat.length} textes traduits (${fichierPaquet})`);

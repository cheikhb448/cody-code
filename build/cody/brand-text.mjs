/*---------------------------------------------------------------------------------------------
 *  Cody Code - remplace les noms « VS Code » / « Visual Studio Code » / « Code - OSS » dans les textes
 *  affichés (interface, réglages, extensions intégrées), en français comme en anglais.
 *  Usage : node build/cody/brand-text.mjs <dossier-out> [<dossier-extensions>]
 *  Les adresses (https://code.visualstudio.com/...), les identifiants (vscode-..., vscode:) et les
 *  noms de commandes ne sont jamais modifiés : seuls les noms propres écrits en toutes lettres le sont.
 *  Licence MIT (voir LICENSE.txt à la racine).
 *--------------------------------------------------------------------------------------------*/
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function marque(texte) {
	if (typeof texte !== 'string') { return texte; }
	return texte
		.replace(/\ba Microsoft online service\b/g, 'an online service')
		.replace(/\bMicrosoft online service\b/g, 'online service')
		.replace(/\bVisual Studio Code\b/g, 'Cody Code')
		.replace(/\bCode - OSS\b/g, 'Cody Code')
		.replace(/\bVS Code\b/g, 'Cody Code')
		.replace(/(?<![\w./:-])VSCode(?![\w./:-])/g, 'Cody Code');
}

function marquerValeurs(valeur) {
	if (typeof valeur === 'string') { return marque(valeur); }
	if (Array.isArray(valeur)) { return valeur.map(marquerValeurs); }
	if (valeur && typeof valeur === 'object') {
		const r = {};
		for (const [k, v] of Object.entries(valeur)) { r[k] = marquerValeurs(v); }
		return r;
	}
	return valeur;
}

/** Traite un fichier de textes du cœur (nls.messages.json / .js / .fr.js). Retourne le nombre de textes changés. */
export function marquerFichierNls(chemin) {
	const brut = readFileSync(chemin, 'utf-8');
	let changes = 0;
	const compter = (avant, apres) => { avant.forEach((t, i) => { if (t !== apres[i]) { changes++; } }); };
	if (chemin.endsWith('.json')) {
		const avant = JSON.parse(brut);
		const apres = avant.map(marque);
		compter(avant, apres);
		if (changes) { writeFileSync(chemin, JSON.stringify(apres), 'utf-8'); }
	} else {
		const m = /^([\s\S]*?_VSCODE_NLS_MESSAGES=)(\[[\s\S]*?\])(;[\s\S]*)$/.exec(brut);
		if (!m) { return 0; }
		const avant = JSON.parse(m[2]);
		const apres = avant.map(marque);
		compter(avant, apres);
		if (changes) { writeFileSync(chemin, m[1] + JSON.stringify(apres) + m[3], 'utf-8'); }
	}
	return changes;
}

/** Traite les textes des extensions intégrées (package.nls*.json) */
export function marquerExtensions(dossier) {
	let fichiers = 0, changes = 0;
	if (!existsSync(dossier)) { return { fichiers, changes }; }
	for (const ext of readdirSync(dossier)) {
		const base = join(dossier, ext);
		let st; try { st = statSync(base); } catch { continue; }
		if (!st.isDirectory() || ext === 'node_modules') { continue; }
		for (const nom of readdirSync(base)) {
			if (!/^package\.nls(\.[\w-]+)?\.json$/.test(nom)) { continue; }
			const chemin = join(base, nom);
			try {
				const avant = JSON.parse(readFileSync(chemin, 'utf-8'));
				const apres = marquerValeurs(avant);
				const a = JSON.stringify(avant), b = JSON.stringify(apres);
				if (a !== b) { writeFileSync(chemin, JSON.stringify(apres, null, '\t') + '\n', 'utf-8'); changes++; }
				fichiers++;
			} catch (e) { console.warn('ignoré : ' + chemin + ' (' + e.message + ')'); }
		}
	}
	return { fichiers, changes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	const out = process.argv[2] ? resolve(process.argv[2]) : undefined;
	const ext = process.argv[3] ? resolve(process.argv[3]) : undefined;
	if (!out) { console.error('Usage : node brand-text.mjs <dossier-out> [<dossier-extensions>]'); process.exit(2); }
	let total = 0;
	for (const nom of ['nls.messages.json', 'nls.messages.js', 'nls.messages.fr.js']) {
		const f = join(out, nom);
		if (existsSync(f)) { const n = marquerFichierNls(f); console.log(`${nom} : ${n} texte(s) renommé(s)`); total += n; }
	}
	if (ext) { const r = marquerExtensions(ext); console.log(`extensions : ${r.changes} fichier(s) modifié(s) sur ${r.fichiers}`); total += r.changes; }
	console.log(`Noms VS Code / Microsoft remplacés : ${total}`);
}

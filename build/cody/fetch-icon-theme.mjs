// Cody Code : télécharge le thème d'icônes « Material Icon Theme » (licence MIT) depuis Open VSX
// et l'ajoute comme extension intégrée (logos de langages : Python, PDF, texte, Docker…).
// Si le téléchargement échoue, Cody Code garde son thème d'icônes par défaut (rien ne casse).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yauzl = require('yauzl');

const DOSSIER = path.resolve('extensions/material-icon-theme');
const API = 'https://open-vsx.org/api/PKief/material-icon-theme/latest';

async function lireJson(url) {
	const r = await fetch(url, { redirect: 'follow' });
	if (!r.ok) { throw new Error(`${url} -> HTTP ${r.status}`); }
	return r.json();
}

function extraire(buffer, destination) {
	return new Promise((resolve, reject) => {
		yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zip) => {
			if (err) { return reject(err); }
			let fichiers = 0;
			zip.readEntry();
			zip.on('entry', entry => {
				const nom = entry.fileName;
				if (!nom.startsWith('extension/') || nom.endsWith('/')) { return zip.readEntry(); }
				const relatif = nom.slice('extension/'.length);
				const cible = path.resolve(destination, relatif);
				// Sécurité : jamais d'écriture en dehors du dossier de destination
				if (!cible.startsWith(destination + path.sep)) { return zip.readEntry(); }
				zip.openReadStream(entry, (e, flux) => {
					if (e) { return reject(e); }
					fs.mkdirSync(path.dirname(cible), { recursive: true });
					flux.pipe(fs.createWriteStream(cible)).on('finish', () => { fichiers++; zip.readEntry(); }).on('error', reject);
				});
			});
			zip.on('end', () => resolve(fichiers));
			zip.on('error', reject);
		});
	});
}

try {
	const info = await lireJson(API);
	const url = info?.files?.download;
	if (!url || info.namespace !== 'PKief' || info.name !== 'material-icon-theme') { throw new Error('réponse Open VSX inattendue'); }
	console.log(`Material Icon Theme ${info.version} (licence : ${info.license}) - ${url}`);
	if (!/MIT/i.test(String(info.license))) { throw new Error(`licence inattendue : ${info.license}`); }
	const r = await fetch(url, { redirect: 'follow' });
	if (!r.ok) { throw new Error(`téléchargement -> HTTP ${r.status}`); }
	const buffer = Buffer.from(await r.arrayBuffer());
	console.log(`sha256 : ${crypto.createHash('sha256').update(buffer).digest('hex')} (${Math.round(buffer.length / 1024)} Ko)`);
	fs.rmSync(DOSSIER, { recursive: true, force: true });
	fs.mkdirSync(DOSSIER, { recursive: true });
	const n = await extraire(buffer, DOSSIER);
	const manifeste = JSON.parse(fs.readFileSync(path.join(DOSSIER, 'package.json'), 'utf8'));
	// Le paquet publié contient déjà ses bibliothèques (dans dist/) : on retire la liste « dependencies »
	// pour que la construction n'en cherche pas dans node_modules.
	for (const cle of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) { delete manifeste[cle]; }
	fs.writeFileSync(path.join(DOSSIER, 'package.json'), JSON.stringify(manifeste, null, '\t'));
	const theme = manifeste.contributes?.iconThemes?.[0];
	console.log(`${n} fichiers extraits ; thème d'icônes : ${theme?.id} (${theme?.path})`);
	if (!theme) { throw new Error('aucun thème d\'icônes dans l\'extension'); }
} catch (e) {
	console.error('Thème d\'icônes non ajouté : ' + e.message);
	fs.rmSync(DOSSIER, { recursive: true, force: true });
	process.exitCode = 0;
}

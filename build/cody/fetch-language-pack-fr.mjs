// Cody Code : télécharge le paquet de langue français libre (MS-CEINTL.vscode-language-pack-fr, licence MIT)
// depuis Open VSX et l'extrait dans un dossier de travail (il n'est PAS ajouté au produit :
// seul le fichier de textes français en est tiré, par build/cody/make-nls-fr.mjs).
// Usage : node build/cody/fetch-language-pack-fr.mjs <dossier-de-destination>
// Si le téléchargement échoue, code de sortie 1 : l'application reste en anglais (rien ne casse).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yauzl = require('yauzl');

const destination = path.resolve(process.argv[2] || '');
if (!process.argv[2]) { console.error('Dossier de destination manquant.'); process.exit(2); }
const API = 'https://open-vsx.org/api/MS-CEINTL/vscode-language-pack-fr/latest';

async function lireJson(url) {
	const r = await fetch(url, { redirect: 'follow' });
	if (!r.ok) { throw new Error(`${url} -> HTTP ${r.status}`); }
	return r.json();
}

function extraire(buffer, dossier) {
	return new Promise((resolve, reject) => {
		yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zip) => {
			if (err) { return reject(err); }
			let fichiers = 0;
			zip.readEntry();
			zip.on('entry', entry => {
				const nom = entry.fileName;
				if (!nom.startsWith('extension/') || nom.endsWith('/')) { return zip.readEntry(); }
				const cible = path.resolve(dossier, nom.slice('extension/'.length));
				// Sécurité : jamais d'écriture en dehors du dossier de destination
				if (!cible.startsWith(dossier + path.sep)) { return zip.readEntry(); }
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
	if (!url || info.namespace !== 'MS-CEINTL' || info.name !== 'vscode-language-pack-fr') { throw new Error('réponse Open VSX inattendue'); }
	console.log(`Paquet français ${info.version} (licence : ${info.license}) - ${url}`);
	if (!/MIT/i.test(String(info.license))) { throw new Error(`licence inattendue : ${info.license}`); }
	if (new URL(url).protocol !== 'https:') { throw new Error('adresse non sécurisée'); }
	const r = await fetch(url, { redirect: 'follow' });
	if (!r.ok) { throw new Error(`téléchargement -> HTTP ${r.status}`); }
	const buffer = Buffer.from(await r.arrayBuffer());
	console.log(`sha256 : ${crypto.createHash('sha256').update(buffer).digest('hex')} (${Math.round(buffer.length / 1024)} Ko)`);
	fs.rmSync(destination, { recursive: true, force: true });
	fs.mkdirSync(destination, { recursive: true });
	const n = await extraire(buffer, destination);
	console.log(`${n} fichiers extraits dans ${destination}`);
	if (n === 0) { throw new Error('paquet vide'); }
} catch (e) {
	console.error('Paquet français non téléchargé : ' + e.message);
	process.exit(1);
}

/*---------------------------------------------------------------------------------------------
 *  Cody Code - connexion de Cody Assistant à un service d'IA choisi par l'utilisateur
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *
 *  Règles de sécurité :
 *   - Rien n'est envoyé tant que l'utilisateur n'a pas configuré un service ET accepté, pour ce
 *     service précis, l'envoi de ses messages (fenêtre de confirmation).
 *   - Connexion non chiffrée (http) autorisée uniquement vers cet ordinateur (localhost).
 *   - La clé secrète est gardée dans le stockage sécurisé, jamais dans les réglages ni les journaux.
 *   - Aucune télémétrie, aucun envoi vers un autre serveur que celui choisi.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { InstantiationType, registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { IRequestService, asJson, isSuccess } from '../../../../../platform/request/common/request.js';
import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import Severity from '../../../../../base/common/severity.js';

export const CLE_SECRETE = 'cody.assistant.apiKey';
const CLE_ACCORDS = 'cody.assistant.consentedHosts';
const TAILLE_MAX_FICHIER = 100_000; // caractères envoyés au maximum par fichier ajouté

export interface IMessageEchange {
	readonly role: 'user' | 'assistant';
	readonly texte: string;
}

export interface IFichierContexte {
	readonly nom: string;
	readonly uri: URI;
}

export type ResultatCody =
	| { readonly ok: true; readonly texte: string }
	| { readonly ok: false; readonly raison: 'non-configure' | 'refuse' | 'interdit' | 'erreur'; readonly detail: string };

export const ICodyAssistantService = createDecorator<ICodyAssistantService>('codyAssistantService');

export interface ICodyAssistantService {
	readonly _serviceBrand: undefined;
	estConfigure(): boolean;
	demander(historique: readonly IMessageEchange[], fichiers: readonly IFichierContexte[]): Promise<ResultatCody>;
	retirerLesAccords(): void;
}

/** Adresse locale (cet ordinateur) : seul cas où le http non chiffré est toléré. */
export function estAdresseLocale(hote: string): boolean {
	return hote === 'localhost' || hote === '127.0.0.1' || hote === '[::1]' || hote.endsWith('.localhost');
}

/** Renvoie l'URL si elle est acceptable (https, ou http vers cet ordinateur), sinon undefined. */
export function lireAdresseService(texte: string): URL | undefined {
	try {
		const url = new URL(texte.trim());
		if (url.protocol === 'https:' || (url.protocol === 'http:' && estAdresseLocale(url.hostname))) {
			return url;
		}
	} catch {
		// adresse invalide
	}
	return undefined;
}

class CodyAssistantService implements ICodyAssistantService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IDialogService private readonly dialogService: IDialogService,
		@IStorageService private readonly storageService: IStorageService,
		@ISecretStorageService private readonly secretService: ISecretStorageService,
		@IRequestService private readonly requestService: IRequestService,
		@IFileService private readonly fileService: IFileService
	) { }

	estConfigure(): boolean {
		const adresse = this.configurationService.getValue<string>('cody.assistant.endpoint') ?? '';
		const modele = this.configurationService.getValue<string>('cody.assistant.model') ?? '';
		return !!adresse.trim() && !!modele.trim();
	}

	retirerLesAccords(): void {
		this.storageService.remove(CLE_ACCORDS, StorageScope.PROFILE);
	}

	private accords(): string[] {
		try {
			const valeur = JSON.parse(this.storageService.get(CLE_ACCORDS, StorageScope.PROFILE, '[]'));
			return Array.isArray(valeur) ? valeur.filter((v): v is string => typeof v === 'string') : [];
		} catch {
			return [];
		}
	}

	async demander(historique: readonly IMessageEchange[], fichiers: readonly IFichierContexte[]): Promise<ResultatCody> {
		if (!this.estConfigure()) {
			return { ok: false, raison: 'non-configure', detail: '' };
		}

		const url = lireAdresseService(this.configurationService.getValue<string>('cody.assistant.endpoint') ?? '');
		if (!url) {
			return { ok: false, raison: 'interdit', detail: localize('cody.ai.badUrl', "L'adresse du service doit commencer par https:// (ou http:// uniquement vers cet ordinateur, par exemple http://localhost:11434).") };
		}
		const modele = (this.configurationService.getValue<string>('cody.assistant.model') ?? '').trim();

		// 1) Accord de l'utilisateur, pour ce service précis, AVANT tout envoi
		if (!this.accords().includes(url.host)) {
			const noms = fichiers.map(f => f.nom);
			const reponse = await this.dialogService.confirm({
				type: Severity.Warning,
				title: localize('cody.ai.consent.title', "Cody Assistant"),
				message: localize('cody.ai.consent.message', "Autoriser Cody à envoyer tes messages à {0} ?", url.host),
				detail: localize('cody.ai.consent.detail', "Cody enverra le texte de tes questions{0} à ce service pour obtenir une réponse. Rien n'est envoyé ailleurs, et rien n'est envoyé sans cet accord. Tu pourras retirer cet accord quand tu veux (commande « Cody Assistant : retirer mes accords »).",
					noms.length ? localize('cody.ai.consent.files', " et le contenu des fichiers que tu ajoutes ({0})", noms.join(', ')) : ''),
				primaryButton: localize('cody.ai.consent.allow', "Autoriser"),
				cancelButton: localize('cody.ai.consent.deny', "Refuser")
			});
			if (!reponse.confirmed) {
				return { ok: false, raison: 'refuse', detail: '' };
			}
			this.storageService.store(CLE_ACCORDS, JSON.stringify([...this.accords(), url.host]), StorageScope.PROFILE, StorageTarget.USER);
		}

		// 2) Construction de la demande (les fichiers ajoutés par l'utilisateur sont lus seulement maintenant)
		const messages: { role: string; content: string }[] = [{
			role: 'system',
			content: 'Tu es Cody, l\'assistant de développement intégré à l\'éditeur Cody Code. Réponds en français, de façon claire et courte, avec des exemples de code quand c\'est utile.'
		}];
		const recents = historique.slice(-20);
		for (let i = 0; i < recents.length; i++) {
			let contenu = recents[i].texte;
			if (i === recents.length - 1 && recents[i].role === 'user') {
				for (const fichier of fichiers) {
					try {
						const brut = (await this.fileService.readFile(fichier.uri)).value.toString();
						const texte = brut.length > TAILLE_MAX_FICHIER ? brut.slice(0, TAILLE_MAX_FICHIER) + '\n[…fichier tronqué…]' : brut;
						contenu += `\n\nFichier « ${fichier.nom} » :\n\`\`\`\n${texte}\n\`\`\``;
					} catch {
						contenu += `\n\n(Le fichier « ${fichier.nom} » n'a pas pu être lu.)`;
					}
				}
			}
			messages.push({ role: recents[i].role, content: contenu });
		}

		// 3) Envoi
		const entetes: Record<string, string> = { 'Content-Type': 'application/json' };
		const cle = await this.secretService.get(CLE_SECRETE);
		if (cle) {
			entetes['Authorization'] = `Bearer ${cle}`;
		}

		try {
			const contexte = await this.requestService.request({
				type: 'POST',
				url: url.toString(),
				headers: entetes,
				data: JSON.stringify({ model: modele, messages, stream: false }),
				timeout: 120_000,
				logUrl: false,
				callSite: 'NO_FETCH_TELEMETRY'
			}, CancellationToken.None);

			const json = await asJson<{ choices?: { message?: { content?: unknown } }[]; error?: { message?: unknown } }>(contexte);
			if (!isSuccess(contexte)) {
				const message = typeof json?.error?.message === 'string' ? json.error.message.slice(0, 300) : '';
				return { ok: false, raison: 'erreur', detail: localize('cody.ai.httpError', "Le service a répondu par une erreur (code {0}). {1}", String(contexte.res.statusCode ?? '?'), message) };
			}
			const texte = json?.choices?.[0]?.message?.content;
			if (typeof texte !== 'string' || !texte.trim()) {
				return { ok: false, raison: 'erreur', detail: localize('cody.ai.emptyAnswer', "Le service n'a pas renvoyé de réponse lisible. Vérifie que l'adresse est bien celle d'un service compatible « OpenAI » (…/v1/chat/completions).") };
			}
			return { ok: true, texte };
		} catch {
			return { ok: false, raison: 'erreur', detail: localize('cody.ai.unreachable', "Impossible de joindre le service. Vérifie l'adresse, ta connexion, et que le service autorise les connexions depuis Cody Code.") };
		}
	}
}

registerSingleton(ICodyAssistantService, CodyAssistantService, InstantiationType.Delayed);

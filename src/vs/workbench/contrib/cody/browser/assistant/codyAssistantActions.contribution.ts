/*---------------------------------------------------------------------------------------------
 *  Cody Code - commandes de Cody Assistant : choisir le service d'IA, retirer les accords
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ConfigurationTarget, IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { CLE_SECRETE, ICodyAssistantService, lireAdresseService } from './codyAssistantService.js';

registerAction2(class CodyConfigurerAction extends Action2 {
	constructor() {
		super({
			id: 'cody.assistant.configure',
			title: localize2('cody.assistant.configure', "Cody Assistant : configurer le service d'IA"),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const quickInput = accessor.get(IQuickInputService);
		const config = accessor.get(IConfigurationService);
		const secrets = accessor.get(ISecretStorageService);
		const notifications = accessor.get(INotificationService);
		const titre = localize('cody.configure.title', "Cody Assistant");

		const adresse = await quickInput.input({
			title: titre,
			prompt: localize('cody.configure.endpoint', "Adresse du service d'IA (compatible OpenAI). Exemple : http://localhost:11434/v1/chat/completions"),
			placeHolder: 'https://…/v1/chat/completions',
			value: config.getValue<string>('cody.assistant.endpoint') || '',
			ignoreFocusLost: true,
			validateInput: async v => lireAdresseService(v) ? undefined : localize('cody.configure.endpointInvalid', "Écris une adresse en https:// (ou en http:// vers cet ordinateur seulement).")
		});
		if (adresse === undefined) {
			return;
		}

		const modele = await quickInput.input({
			title: titre,
			prompt: localize('cody.configure.model', "Nom du modèle à utiliser (exemple : llama3.2)"),
			value: config.getValue<string>('cody.assistant.model') || '',
			ignoreFocusLost: true,
			validateInput: async v => v.trim() ? undefined : localize('cody.configure.modelRequired', "Le nom du modèle est obligatoire.")
		});
		if (modele === undefined) {
			return;
		}

		const cle = await quickInput.input({
			title: titre,
			prompt: localize('cody.configure.key', "Clé secrète du service (laisse vide si le service n'en demande pas). Elle est gardée dans le stockage sécurisé."),
			password: true,
			ignoreFocusLost: true
		});
		if (cle === undefined) {
			return;
		}

		await config.updateValue('cody.assistant.endpoint', adresse.trim(), ConfigurationTarget.USER);
		await config.updateValue('cody.assistant.model', modele.trim(), ConfigurationTarget.USER);
		if (cle.trim()) {
			await secrets.set(CLE_SECRETE, cle.trim());
		} else {
			await secrets.delete(CLE_SECRETE);
		}
		notifications.info(localize('cody.configure.done', "Cody Assistant est configuré. Un accord te sera demandé avant le premier envoi."));
	}
});

registerAction2(class CodyRetirerAccordsAction extends Action2 {
	constructor() {
		super({
			id: 'cody.assistant.forgetConsent',
			title: localize2('cody.assistant.forgetConsent', "Cody Assistant : retirer mes accords d'envoi"),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		accessor.get(ICodyAssistantService).retirerLesAccords();
		accessor.get(INotificationService).info(localize('cody.forget.done', "Les accords sont retirés : Cody redemandera ton autorisation avant d'envoyer quoi que ce soit."));
	}
});

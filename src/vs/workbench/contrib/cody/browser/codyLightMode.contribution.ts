/*---------------------------------------------------------------------------------------------
 *  Cody Code - mode « PC modeste » : un clic pour alléger l'éditeur (moins de mémoire, moins d'animations).
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService, ConfigurationTarget } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';

/** Réglages posés par le mode « PC modeste » (tous sont des réglages d'origine de l'éditeur). */
const REGLAGES_MODESTES: Record<string, unknown> = {
	'workbench.reduceMotion': 'on',
	'editor.minimap.enabled': false,
	'editor.occurrencesHighlight': 'off',
	'editor.codeLens': false,
	'editor.colorDecorators': false,
	'editor.bracketPairColorization.enabled': false,
	'editor.guides.bracketPairs': false,
	'editor.semanticHighlighting.enabled': false,
	'editor.inlayHints.enabled': 'off',
	'breadcrumbs.enabled': false,
	'workbench.editor.limit.enabled': true,
	'workbench.editor.limit.value': 6,
	'terminal.integrated.scrollback': 500,
	'git.autorefresh': false,
	'extensions.autoCheckUpdates': false,
	'typescript.tsserver.maxTsServerMemory': 1024,
	'typescript.disableAutomaticTypeAcquisition': true
};

registerAction2(class CodyEnableLightModeAction extends Action2 {
	constructor() {
		super({
			id: 'cody.lightMode.enable',
			title: localize2('cody.lightMode.enable', "Cody Code : activer le mode PC modeste (éditeur plus léger)"),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const configurationService = accessor.get(IConfigurationService);
		const notificationService = accessor.get(INotificationService);
		for (const [cle, valeur] of Object.entries(REGLAGES_MODESTES)) {
			await configurationService.updateValue(cle, valeur, ConfigurationTarget.USER);
		}
		notificationService.info(localize('cody.lightMode.enabled', "Mode PC modeste activé : l'éditeur utilisera moins de mémoire et moins d'animations. Pour revenir en arrière : commande « Cody Code : désactiver le mode PC modeste »."));
	}
});

registerAction2(class CodyDisableLightModeAction extends Action2 {
	constructor() {
		super({
			id: 'cody.lightMode.disable',
			title: localize2('cody.lightMode.disable', "Cody Code : désactiver le mode PC modeste"),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const configurationService = accessor.get(IConfigurationService);
		const notificationService = accessor.get(INotificationService);
		for (const cle of Object.keys(REGLAGES_MODESTES)) {
			await configurationService.updateValue(cle, undefined, ConfigurationTarget.USER);
		}
		notificationService.info(localize('cody.lightMode.disabled', "Mode PC modeste désactivé : les réglages d'origine sont revenus."));
	}
});

/** Au premier démarrage, propose le mode PC modeste si l'ordinateur annonce 4 Go de mémoire ou moins. */
class CodyLightModeSuggestion extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.codyLightModeSuggestion';

	constructor(
		@IStorageService storageService: IStorageService,
		@INotificationService notificationService: INotificationService,
		@ICommandService commandService: ICommandService
	) {
		super();

		if (storageService.getBoolean('cody.lightModeSuggested', StorageScope.PROFILE, false)) {
			return;
		}
		const memoireGo = (globalThis.navigator as unknown as { deviceMemory?: number } | undefined)?.deviceMemory;
		if (typeof memoireGo !== 'number' || memoireGo > 4) {
			return;
		}
		storageService.store('cody.lightModeSuggested', true, StorageScope.PROFILE, StorageTarget.USER);

		notificationService.prompt(
			Severity.Info,
			localize('cody.lightMode.suggest', "Ton ordinateur a peu de mémoire. Veux-tu activer le mode PC modeste pour que Cody Code reste fluide ?"),
			[
				{ label: localize('cody.lightMode.yes', "Activer"), run: () => commandService.executeCommand('cody.lightMode.enable') },
				{ label: localize('cody.lightMode.no', "Non merci"), run: () => { } }
			]
		);
	}
}

registerWorkbenchContribution2(CodyLightModeSuggestion.ID, CodyLightModeSuggestion, WorkbenchPhase.Eventually);

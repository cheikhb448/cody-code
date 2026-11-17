/*---------------------------------------------------------------------------------------------
 *  Cody Code - disposition au premier démarrage (panneau du bas ouvert, barre d'état épurée)
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *--------------------------------------------------------------------------------------------*/

import './media/cody-layout.css';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IWorkbenchLayoutService, Parts } from '../../../services/layout/browser/layoutService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';

/** Éléments de la barre d'état absents de la maquette : masqués au premier démarrage (réaffichables par un clic droit sur la barre). */
const ELEMENTS_MASQUES = [
	'status.editor.indentation',
	'status.workbench.keyboardLayout',
	'status.notifications'
];

/** Éléments indispensables à un développeur (position du curseur, erreurs) : toujours affichés. */
const ELEMENTS_AFFICHES = [
	'status.editor.selection',
	'status.problems'
];

class CodyFirstRunContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.codyFirstRun';

	constructor(
		@IStorageService storageService: IStorageService,
		@IStatusbarService statusbarService: IStatusbarService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService
	) {
		super();

		// Une seule fois : ensuite, les choix de la personne sont respectés
		if (storageService.getBoolean('cody.firstRunLayoutDone.v2', StorageScope.PROFILE, false)) {
			return;
		}
		storageService.store('cody.firstRunLayoutDone.v2', true, StorageScope.PROFILE, StorageTarget.USER);

		for (const id of ELEMENTS_MASQUES) {
			statusbarService.updateEntryVisibility(id, false);
		}
		for (const id of ELEMENTS_AFFICHES) {
			statusbarService.updateEntryVisibility(id, true);
		}

		// Comme sur la maquette : le panneau du bas (Terminal en premier) est ouvert
		if (!layoutService.isVisible(Parts.PANEL_PART)) {
			layoutService.setPartHidden(false, Parts.PANEL_PART);
		}
		// Hauteur de la maquette (environ 190 px) : on laisse d'abord la mise en page se terminer
		setTimeout(() => {
			const taille = layoutService.getSize(Parts.PANEL_PART);
			if (taille.height > 220) {
				layoutService.setSize(Parts.PANEL_PART, { width: taille.width, height: 190 });
			}
		}, 1500);
	}
}

registerWorkbenchContribution2(CodyFirstRunContribution.ID, CodyFirstRunContribution, WorkbenchPhase.AfterRestored);

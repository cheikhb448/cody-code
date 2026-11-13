/*---------------------------------------------------------------------------------------------
 *  Cody Code - identité dans la barre d'état (nom, version, état « Prêt »)
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *--------------------------------------------------------------------------------------------*/

import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IStatusbarService, StatusbarAlignment } from '../../../services/statusbar/browser/statusbar.js';
import { IProductService } from '../../../../platform/product/common/productService.js';

class CodyStatusbarContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.codyStatusbar';

	constructor(
		@IStatusbarService statusbarService: IStatusbarService,
		@IProductService productService: IProductService
	) {
		super();

		const version = (productService as unknown as { codyVersion?: string }).codyVersion ?? productService.version;

		// À gauche : nom du produit puis version
		this._register(statusbarService.addEntry({
			name: 'Cody Code',
			text: productService.nameShort,
			ariaLabel: productService.nameLong
		}, 'cody.statusbar.brand', StatusbarAlignment.LEFT, 10000));

		this._register(statusbarService.addEntry({
			name: 'Cody Code version',
			text: `v${version}`,
			ariaLabel: `Version ${version}`
		}, 'cody.statusbar.version', StatusbarAlignment.LEFT, 9999));

		// À droite : état de l'application
		this._register(statusbarService.addEntry({
			name: 'Cody Code état',
			text: '$(circle-filled) Prêt',
			ariaLabel: 'Prêt',
			color: '#17f5cc'
		}, 'cody.statusbar.ready', StatusbarAlignment.RIGHT, -10000));

		// À droite : mémoire utilisée par l'éditeur (utile sur un PC modeste). Un clic ouvre la liste des
		// extensions actives, pour repérer celles qui consomment trop.
		const lireMemoireMo = (): number | undefined => {
			const memoire = (mainWindow.performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
			return memoire?.usedJSHeapSize ? Math.round(memoire.usedJSHeapSize / (1024 * 1024)) : undefined;
		};
		if (lireMemoireMo() !== undefined) {
			const entree = this._register(new MutableDisposable());
			const afficher = () => {
				const mo = lireMemoireMo();
				if (mo === undefined) {
					return;
				}
				const texte = `$(pulse) ${mo} Mo`;
				if (this.dernierTexte === texte) {
					return;
				}
				this.dernierTexte = texte;
				entree.value = statusbarService.addEntry({
					name: 'Cody Code mémoire',
					text: texte,
					ariaLabel: `Mémoire utilisée par l'éditeur : ${mo} Mo`,
					tooltip: 'Mémoire utilisée par l\'éditeur. Clique pour voir les extensions actives et trouver celles qui consomment trop.',
					command: 'workbench.action.showRuntimeExtensions'
				}, 'cody.statusbar.memory', StatusbarAlignment.RIGHT, -9000);
			};
			afficher();
			const minuteur = mainWindow.setInterval(afficher, 15000);
			this._register({ dispose: () => mainWindow.clearInterval(minuteur) });
		}
	}

	private dernierTexte: string | undefined;
}

registerWorkbenchContribution2(CodyStatusbarContribution.ID, CodyStatusbarContribution, WorkbenchPhase.AfterRestored);

/*---------------------------------------------------------------------------------------------
 *  Cody Code - identité dans la barre d'état (nom, version, état « Prêt »)
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
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
	}
}

registerWorkbenchContribution2(CodyStatusbarContribution.ID, CodyStatusbarContribution, WorkbenchPhase.AfterRestored);

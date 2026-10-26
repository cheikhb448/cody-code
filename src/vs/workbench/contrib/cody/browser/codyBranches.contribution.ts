/*---------------------------------------------------------------------------------------------
 *  Cody Code - section « BRANCHES » de l'explorateur (branche Git active)
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *--------------------------------------------------------------------------------------------*/

import './media/cody-branches.css';
import * as dom from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../nls.js';
import { autorun } from '../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { IViewDescriptorService, IViewsRegistry, Extensions as ViewExtensions } from '../../../common/views.js';
import { VIEW_CONTAINER } from '../../files/browser/explorerViewlet.js';
import { ISCMService } from '../../scm/common/scm.js';

const BRANCHES_VIEW_ID = 'cody.branches';

/**
 * Affiche la branche Git active du premier dépôt ouvert (lecture seule).
 * Un clic ouvre le sélecteur de branches de Git pour en changer.
 */
class CodyBranchesView extends ViewPane {

	private branchLabel!: HTMLElement;

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@ISCMService private readonly scmService: ISCMService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const ligne = dom.append(container, dom.$('.cody-branches-row'));
		ligne.tabIndex = 0;
		ligne.setAttribute('role', 'button');
		dom.append(ligne, dom.$('span.cody-branches-icon' + ThemeIcon.asCSSSelector(Codicon.gitBranch)));
		this.branchLabel = dom.append(ligne, dom.$('span.cody-branches-name'));
		dom.append(ligne, dom.$('span.cody-branches-chevron' + ThemeIcon.asCSSSelector(Codicon.chevronDown)));

		const ouvrir = () => this.commandService.executeCommand('git.checkout').catch(() => { /* Git absent : rien à faire */ });
		this._register(dom.addDisposableListener(ligne, dom.EventType.CLICK, ouvrir));
		this._register(dom.addDisposableListener(ligne, dom.EventType.KEY_DOWN, (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); }
		}));

		const aucune = localize('cody.branches.none', "Aucune branche (pas de dépôt Git)");
		const suivreDepot = () => {
			const depot = Array.from(this.scmService.repositories)[0];
			if (!depot) {
				this.branchLabel.textContent = aucune;
				return;
			}
			// Se met à jour toute seule quand la branche change
			this._register(autorun(reader => {
				const nom = depot.provider.historyProvider.read(reader)?.historyItemRef.read(reader)?.name;
				this.branchLabel.textContent = nom ?? aucune;
			}));
		};
		suivreDepot();
		this._register(this.scmService.onDidAddRepository(() => suivreDepot()));
	}
}

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: BRANCHES_VIEW_ID,
	name: localize2('cody.branches.title', "Branches"),
	ctorDescriptor: new SyncDescriptor(CodyBranchesView),
	canToggleVisibility: true,
	canMoveView: true,
	hideByDefault: false,
	collapsed: false,
	order: 1,
	weight: 15,
	containerIcon: Codicon.gitBranch
}], VIEW_CONTAINER);

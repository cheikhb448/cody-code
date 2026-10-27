/*---------------------------------------------------------------------------------------------
 *  Cody Code - panneau « Cody Assistant » (barre latérale droite)
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *--------------------------------------------------------------------------------------------*/

import '../media/cody-assistant.css';
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../../nls.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../../browser/parts/views/viewPaneContainer.js';
import { IViewContainersRegistry, IViewsRegistry, ViewContainer, ViewContainerLocation, Extensions as ViewExtensions } from '../../../../common/views.js';
import { CodyAssistantView } from './codyAssistantView.js';

export const CODY_ASSISTANT_CONTAINER_ID = 'workbench.view.cody.assistant';
export const CODY_ASSISTANT_VIEW_ID = 'cody.assistant.view';

const codyAssistantIcon = registerIcon('cody-assistant-view-icon', Codicon.sparkle, localize('cody.assistant.icon', "Icône du panneau Cody Assistant."));

const container: ViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: CODY_ASSISTANT_CONTAINER_ID,
	title: localize2('cody.assistant.title', "Cody Assistant"),
	icon: codyAssistantIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CODY_ASSISTANT_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: CODY_ASSISTANT_CONTAINER_ID,
	hideIfEmpty: true,
	order: 1
}, ViewContainerLocation.AuxiliaryBar, { isDefault: true, doNotRegisterOpenCommand: true });

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CODY_ASSISTANT_VIEW_ID,
	name: localize2('cody.assistant.title', "Cody Assistant"),
	containerIcon: codyAssistantIcon,
	containerTitle: localize('cody.assistant.title', "Cody Assistant"),
	singleViewPaneContainerTitle: localize('cody.assistant.title', "Cody Assistant"),
	canToggleVisibility: false,
	canMoveView: false,
	ctorDescriptor: new SyncDescriptor(CodyAssistantView),
	openCommandActionDescriptor: {
		id: CODY_ASSISTANT_CONTAINER_ID,
		title: container.title,
		mnemonicTitle: localize({ key: 'cody.assistant.mi', comment: ['&& denotes a mnemonic'] }, "&&Cody Assistant"),
		order: 1
	}
}], container);

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
	id: 'cody',
	order: 5,
	title: localize('cody.config.title', "Cody Code"),
	type: 'object',
	properties: {
		'cody.assistant.userName': {
			type: 'string',
			default: '',
			description: localize('cody.config.userName', "Ton prénom, affiché dans le message d'accueil de Cody Assistant.")
		}
	}
});

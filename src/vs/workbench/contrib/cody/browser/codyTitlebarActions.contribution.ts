/*---------------------------------------------------------------------------------------------
 *  Cody Code - boutons de la barre de titre : thème clair/sombre (soleil) et notifications (cloche)
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *--------------------------------------------------------------------------------------------*/

import './media/cody-titlebar-actions.css';
import { localize, localize2 } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { ConfigurationTarget } from '../../../../platform/configuration/common/configuration.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IWorkbenchThemeService, ThemeSettingDefaults } from '../../../services/themes/common/workbenchThemeService.js';

const codyThemeToggleIcon = registerIcon('cody-theme-toggle', Codicon.colorMode, localize('codyThemeToggleIcon', "Bouton thème clair / sombre"));

registerAction2(class CodyToggleThemeAction extends Action2 {
	constructor() {
		super({
			id: 'cody.toggleTheme',
			title: localize2('cody.toggleTheme', "Cody Code : basculer entre le thème clair et le thème sombre"),
			icon: codyThemeToggleIcon,
			f1: true,
			menu: [{ id: MenuId.TitleBar, group: 'navigation', order: 1 }]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const themeService = accessor.get(IWorkbenchThemeService);
		const type = themeService.getColorTheme().type;
		const isLight = type === ColorScheme.LIGHT || type === ColorScheme.HIGH_CONTRAST_LIGHT;
		// setColorTheme attend l'identifiant interne du thème, pas son nom : on le retrouve par son nom
		const nomCherche = isLight ? ThemeSettingDefaults.COLOR_THEME_DARK : ThemeSettingDefaults.COLOR_THEME_LIGHT;
		const themes = await themeService.getColorThemes();
		const theme = themes.find(t => t.settingsId === nomCherche);
		if (theme) {
			await themeService.setColorTheme(theme.id, ConfigurationTarget.USER);
		}
	}
});

registerAction2(class CodyNotificationsAction extends Action2 {
	constructor() {
		super({
			id: 'cody.showNotifications',
			title: localize2('cody.showNotifications', "Cody Code : afficher les notifications"),
			icon: Codicon.bell,
			f1: false,
			menu: [{ id: MenuId.TitleBar, group: 'navigation', order: 2 }]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(ICommandService).executeCommand('notifications.toggleList');
	}
});

registerAction2(class CodyAccountAction extends Action2 {
	constructor() {
		super({
			id: 'cody.showAccount',
			title: localize2('cody.showAccount', "Cody Code : compte GitHub"),
			icon: Codicon.account,
			f1: false,
			menu: [{ id: MenuId.TitleBar, group: 'navigation', order: 3 }]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		// Compte GitHub (extension intégrée cody-github-auth) ; à défaut, la liste des comptes de l'éditeur
		const commandService = accessor.get(ICommandService);
		try {
			await commandService.executeCommand('cody.github.account');
		} catch {
			await commandService.executeCommand('workbench.action.manageAccounts');
		}
	}
});

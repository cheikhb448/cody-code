/*---------------------------------------------------------------------------------------------
 *  Cody Code - contenu du panneau « Cody Assistant »
 *  Basé sur Code - OSS (Microsoft Corporation, licence MIT).
 *
 *  Rien n'est envoyé sur Internet par ce panneau : les messages restent dans la mémoire de la
 *  fenêtre tant qu'aucun service d'IA n'a été configuré et accepté par l'utilisateur.
 *--------------------------------------------------------------------------------------------*/

import * as dom from '../../../../../base/browser/dom.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { IViewletViewOptions } from '../../../../browser/parts/views/viewsViewlet.js';
import { EditorResourceAccessor } from '../../../../common/editor.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ICodyAssistantService } from './codyAssistantService.js';

type OngletId = 'assistant' | 'chat' | 'codebase' | 'context';

interface IElementContexte {
	readonly nom: string;
	readonly genre: 'fichier' | 'image';
	readonly uri?: URI;
}

interface IMessage {
	readonly auteur: 'moi' | 'cody';
	readonly texte: string;
	readonly bouton?: 'configurer';
}

interface IActionRapide {
	readonly id: string;
	readonly icone: ThemeIcon;
	readonly titre: string;
	readonly description: string;
	readonly amorce: string;
}

export class CodyAssistantView extends ViewPane {

	private ongletActif: OngletId = 'assistant';
	private readonly contexte: IElementContexte[] = [];
	private readonly messages: IMessage[] = [];
	private reponseEnCours = false;

	private boutonsOnglets = new Map<OngletId, HTMLElement>();
	private zoneContenu!: HTMLElement;
	private zoneSaisie!: HTMLElement;
	private champSaisie!: HTMLTextAreaElement;
	private puces!: HTMLElement;

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService private readonly configService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@IEditorService private readonly editorService: IEditorService,
		@ICodyAssistantService private readonly assistantService: ICodyAssistantService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(options, keybindingService, contextMenuService, configService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		container.classList.add('cody-assistant-root');

		this.creerOnglets(container);
		this.zoneContenu = dom.append(container, dom.$('.cody-assistant-content'));
		this.creerSaisie(container);

		// Le prénom peut être changé dans les réglages : on met l'accueil à jour
		this._register(this.configService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('cody.assistant.userName')) {
				this.afficher();
			}
		}));

		this.afficher();
	}

	// ---------------------------------------------------------------- onglets

	private creerOnglets(container: HTMLElement): void {
		const barre = dom.append(container, dom.$('.cody-assistant-tabs'));
		barre.setAttribute('role', 'tablist');
		const definitions: [OngletId, string][] = [
			['assistant', localize('cody.tab.assistant', "Assistant")],
			['chat', localize('cody.tab.chat', "Chat")],
			['codebase', localize('cody.tab.codebase', "Codebase")],
			['context', localize('cody.tab.context', "Context")]
		];
		for (const [id, libelle] of definitions) {
			const bouton = dom.append(barre, dom.$('button.cody-assistant-tab'));
			bouton.setAttribute('role', 'tab');
			bouton.textContent = libelle;
			this.boutonsOnglets.set(id, bouton);
			this._register(dom.addDisposableListener(bouton, dom.EventType.CLICK, () => this.choisirOnglet(id)));
		}
	}

	private choisirOnglet(id: OngletId): void {
		this.ongletActif = id;
		this.afficher();
	}

	// --------------------------------------------------------------- affichage

	private afficher(): void {
		for (const [id, bouton] of this.boutonsOnglets) {
			const actif = id === this.ongletActif;
			bouton.classList.toggle('active', actif);
			bouton.setAttribute('aria-selected', String(actif));
		}

		dom.clearNode(this.zoneContenu);
		switch (this.ongletActif) {
			case 'assistant': this.afficherAccueil(); break;
			case 'chat': this.afficherChat(); break;
			case 'codebase': this.afficherCodebase(); break;
			case 'context': this.afficherContexte(); break;
		}
		// La zone de saisie sert pour l'assistant et le chat
		this.zoneSaisie.classList.toggle('hidden', this.ongletActif === 'codebase' || this.ongletActif === 'context');
		this.afficherPuces();
	}

	private afficherAccueil(): void {
		const nom = (this.configService.getValue<string>('cody.assistant.userName') ?? '').trim();
		const titre = dom.append(this.zoneContenu, dom.$('h2.cody-assistant-hello'));
		titre.textContent = nom ? localize('cody.hello.named', "Salut {0} ! 👋", nom) : localize('cody.hello', "Salut ! 👋");

		const intro = dom.append(this.zoneContenu, dom.$('p.cody-assistant-intro'));
		intro.append(localize('cody.intro.1', "Je suis "));
		dom.append(intro, dom.$('strong')).textContent = 'Cody';
		intro.append(localize('cody.intro.2', ", ton assistant de développement."));
		dom.append(intro, dom.$('br'));
		intro.append(localize('cody.intro.3', "Je peux t'aider à écrire du code, expliquer des concepts, trouver des erreurs, et bien plus encore."));

		const grille = dom.append(this.zoneContenu, dom.$('.cody-assistant-cards'));
		for (const action of this.actionsRapides()) {
			const carte = dom.append(grille, dom.$('button.cody-assistant-card'));
			carte.dataset['action'] = action.id;
			const puce = dom.append(carte, dom.$('span.cody-assistant-card-icon.' + action.id));
			dom.append(puce, dom.$('span' + ThemeIcon.asCSSSelector(action.icone)));
			const texte = dom.append(carte, dom.$('span.cody-assistant-card-text'));
			dom.append(texte, dom.$('span.cody-assistant-card-title')).textContent = action.titre;
			dom.append(texte, dom.$('span.cody-assistant-card-desc')).textContent = action.description;
			dom.append(carte, dom.$('span.cody-assistant-card-arrow' + ThemeIcon.asCSSSelector(Codicon.arrowRight)));
			this._register(dom.addDisposableListener(carte, dom.EventType.CLICK, () => this.utiliserAmorce(action.amorce)));
		}
	}

	private actionsRapides(): IActionRapide[] {
		return [
			{ id: 'generer', icone: Codicon.zap, titre: localize('cody.qa.gen.t', "Générer du code"), description: localize('cody.qa.gen.d', "Créer des fonctions, classes..."), amorce: localize('cody.qa.gen.p', "Génère du code pour : ") },
			{ id: 'expliquer', icone: Codicon.book, titre: localize('cody.qa.exp.t', "Expliquer le code"), description: localize('cody.qa.exp.d', "Comprendre facilement"), amorce: localize('cody.qa.exp.p', "Explique-moi ce code : ") },
			{ id: 'corriger', icone: Codicon.warning, titre: localize('cody.qa.fix.t', "Corriger les erreurs"), description: localize('cody.qa.fix.d', "Analyser et proposer une solution"), amorce: localize('cody.qa.fix.p', "Trouve et corrige les erreurs de ce code : ") },
			{ id: 'ameliorer', icone: Codicon.sparkle, titre: localize('cody.qa.imp.t', "Améliorer le code"), description: localize('cody.qa.imp.d', "Refactoriser et optimiser"), amorce: localize('cody.qa.imp.p', "Améliore et optimise ce code : ") }
		];
	}

	private utiliserAmorce(amorce: string): void {
		this.champSaisie.value = amorce;
		this.champSaisie.focus();
		this.champSaisie.setSelectionRange(amorce.length, amorce.length);
	}

	private afficherChat(): void {
		if (this.messages.length === 0) {
			const vide = dom.append(this.zoneContenu, dom.$('p.cody-assistant-empty'));
			vide.textContent = localize('cody.chat.empty', "Aucune conversation pour l'instant. Pose une question à Cody ci-dessous.");
			return;
		}
		for (const message of this.messages) {
			const bulle = dom.append(this.zoneContenu, dom.$('.cody-assistant-msg.' + message.auteur));
			dom.append(bulle, dom.$('span')).textContent = message.texte; // textContent : jamais de HTML venant de l'extérieur
			if (message.bouton === 'configurer') {
				const bouton = dom.append(bulle, dom.$('button.cody-assistant-action'));
				bouton.textContent = localize('cody.configure.button', "Configurer le service d'IA");
				this._register(dom.addDisposableListener(bouton, dom.EventType.CLICK, () => this.commandService.executeCommand('cody.assistant.configure')));
			}
		}
		this.zoneContenu.scrollTop = this.zoneContenu.scrollHeight;
	}

	private afficherCodebase(): void {
		const titre = dom.append(this.zoneContenu, dom.$('h3.cody-assistant-section-title'));
		titre.textContent = localize('cody.codebase.title', "Codebase");
		const texte = dom.append(this.zoneContenu, dom.$('p.cody-assistant-empty'));
		texte.textContent = localize('cody.codebase.text', "Ici, Cody pourra explorer l'ensemble de ton projet pour mieux te répondre. Cette fonction n'est pas encore disponible, et rien de ton projet n'est analysé ou envoyé.");
	}

	private afficherContexte(): void {
		const titre = dom.append(this.zoneContenu, dom.$('h3.cody-assistant-section-title'));
		titre.textContent = localize('cody.context.title', "Context");
		if (this.contexte.length === 0) {
			const vide = dom.append(this.zoneContenu, dom.$('p.cody-assistant-empty'));
			vide.textContent = localize('cody.context.empty', "Aucun élément ajouté. Utilise le trombone ou le bouton image dans la zone de saisie.");
			return;
		}
		const liste = dom.append(this.zoneContenu, dom.$('ul.cody-assistant-context-list'));
		for (const element of this.contexte) {
			const ligne = dom.append(liste, dom.$('li'));
			dom.append(ligne, dom.$('span' + ThemeIcon.asCSSSelector(element.genre === 'image' ? Codicon.fileMedia : Codicon.file)));
			dom.append(ligne, dom.$('span.cody-assistant-context-name')).textContent = element.genre === 'image'
				? localize('cody.context.imageNote', "{0} (image : pas encore envoyée à l'IA)", element.nom)
				: element.nom;
		}
	}

	// ------------------------------------------------------------------ saisie

	private creerSaisie(container: HTMLElement): void {
		this.zoneSaisie = dom.append(container, dom.$('.cody-assistant-input'));
		this.puces = dom.append(this.zoneSaisie, dom.$('.cody-assistant-chips'));

		this.champSaisie = dom.append(this.zoneSaisie, dom.$('textarea.cody-assistant-textarea')) as HTMLTextAreaElement;
		this.champSaisie.rows = 2;
		this.champSaisie.placeholder = localize('cody.input.placeholder', "Pose ta question ou demande une aide sur ton code...");
		this.champSaisie.setAttribute('aria-label', this.champSaisie.placeholder);

		const barre = dom.append(this.zoneSaisie, dom.$('.cody-assistant-input-bar'));
		const outils = dom.append(barre, dom.$('.cody-assistant-tools'));

		const trombone = this.creerOutil(outils, Codicon.attach, localize('cody.tool.attach', "Ajouter le fichier ouvert au contexte"), 'joindre');
		const image = this.creerOutil(outils, Codicon.fileMedia, localize('cody.tool.image', "Ajouter une image (reste sur ton ordinateur)"), 'image');
		this.creerOutil(outils, Codicon.sparkle, localize('cody.tool.suggest', "Idées de questions"), 'idees');

		const envoyer = dom.append(barre, dom.$('button.cody-assistant-send'));
		envoyer.title = localize('cody.tool.send', "Envoyer");
		envoyer.setAttribute('aria-label', envoyer.title);
		dom.append(envoyer, dom.$('span' + ThemeIcon.asCSSSelector(Codicon.send)));

		// Fichier ouvert → contexte
		this._register(dom.addDisposableListener(trombone, dom.EventType.CLICK, () => {
			const uri = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor);
			if (uri) {
				this.ajouterContexte({ nom: basename(uri), genre: 'fichier', uri });
			}
		}));

		// Image choisie sur l'ordinateur : seul le nom est gardé, le contenu n'est ni lu ni envoyé
		const choix = dom.append(this.zoneSaisie, dom.$('input.cody-assistant-file')) as HTMLInputElement;
		choix.type = 'file';
		choix.accept = 'image/*';
		choix.hidden = true;
		this._register(dom.addDisposableListener(image, dom.EventType.CLICK, () => choix.click()));
		this._register(dom.addDisposableListener(choix, 'change', () => {
			const fichier = choix.files?.[0];
			if (fichier) {
				this.ajouterContexte({ nom: fichier.name, genre: 'image' });
			}
			choix.value = '';
		}));

		this._register(dom.addDisposableListener(envoyer, dom.EventType.CLICK, () => { void this.envoyer(); }));
		this._register(dom.addDisposableListener(this.champSaisie, dom.EventType.KEY_DOWN, (e: KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				void this.envoyer();
			}
		}));
	}

	private creerOutil(parent: HTMLElement, icone: ThemeIcon, titre: string, id: string): HTMLElement {
		const bouton = dom.append(parent, dom.$('button.cody-assistant-tool'));
		bouton.dataset['outil'] = id;
		bouton.title = titre;
		bouton.setAttribute('aria-label', titre);
		dom.append(bouton, dom.$('span' + ThemeIcon.asCSSSelector(icone)));
		return bouton;
	}

	private ajouterContexte(element: IElementContexte): void {
		if (!this.contexte.some(c => c.nom === element.nom && c.genre === element.genre)) {
			this.contexte.push(element);
		}
		this.afficher();
	}

	private afficherPuces(): void {
		dom.clearNode(this.puces);
		for (const element of this.contexte) {
			const puce = dom.append(this.puces, dom.$('span.cody-assistant-chip'));
			dom.append(puce, dom.$('span' + ThemeIcon.asCSSSelector(element.genre === 'image' ? Codicon.fileMedia : Codicon.file)));
			dom.append(puce, dom.$('span')).textContent = element.nom;
		}
	}

	private async envoyer(): Promise<void> {
		const texte = this.champSaisie.value.trim();
		if (!texte || this.reponseEnCours) {
			return;
		}
		this.messages.push({ auteur: 'moi', texte });
		this.champSaisie.value = '';
		this.choisirOnglet('chat');

		// Rien ne part sans configuration ET sans l'accord de l'utilisateur (voir codyAssistantService.ts)
		this.reponseEnCours = true;
		const attente: IMessage = { auteur: 'cody', texte: localize('cody.reply.thinking', "Cody réfléchit…") };
		this.messages.push(attente);
		this.afficher();

		const historique = this.messages
			.filter(m => m !== attente && !m.bouton)
			.map(m => ({ role: (m.auteur === 'moi' ? 'user' : 'assistant') as 'user' | 'assistant', texte: m.texte }));
		const fichiers = this.contexte.filter(c => c.genre === 'fichier' && c.uri).map(c => ({ nom: c.nom, uri: c.uri! }));
		const resultat = await this.assistantService.demander(historique, fichiers);

		this.messages.splice(this.messages.indexOf(attente), 1);
		if (resultat.ok) {
			this.messages.push({ auteur: 'cody', texte: resultat.texte });
		} else if (resultat.raison === 'non-configure') {
			this.messages.push({ auteur: 'cody', texte: localize('cody.reply.notConfigured', "Je ne suis pas encore relié à un service d'IA. Ton message est resté sur cet ordinateur : rien n'a été envoyé. Choisis d'abord un service (par exemple Ollama sur ton ordinateur, ou un service en ligne avec ta propre clé)."), bouton: 'configurer' });
		} else if (resultat.raison === 'refuse') {
			this.messages.push({ auteur: 'cody', texte: localize('cody.reply.refused', "D'accord, rien n'a été envoyé. Je ne répondrai que si tu autorises l'envoi à ce service.") });
		} else {
			this.messages.push({ auteur: 'cody', texte: resultat.detail, bouton: resultat.raison === 'interdit' ? 'configurer' : undefined });
		}
		this.reponseEnCours = false;
		this.afficher();
	}
}

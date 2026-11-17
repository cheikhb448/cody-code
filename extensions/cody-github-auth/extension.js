/*---------------------------------------------------------------------------------------------
 *  Cody Code - connexion à GitHub avec un jeton personnel (PAT).
 *  Remplace l'extension d'origine, qui passait par des services de Microsoft.
 *   - le jeton est gardé dans le stockage sécurisé de Cody Code (jamais dans un fichier ni un réglage) ;
 *   - il n'est envoyé qu'à https://api.github.com (adresse fixe, aucune redirection suivie) ;
 *   - il n'est jamais écrit dans les journaux ni dans les messages d'erreur.
 *  Licence MIT (voir LICENSE.txt à la racine).
 *--------------------------------------------------------------------------------------------*/
'use strict';

const vscode = require('vscode');
const crypto = require('crypto');

const PROVIDER_ID = 'github';
const SECRET_KEY = 'cody.github.session';
const API_USER = 'https://api.github.com/user';
const NEW_TOKEN_URL = 'https://github.com/settings/tokens/new?description=Cody%20Code&scopes=repo,read:user,user:email,workflow,gist';
const DEFAULT_SCOPES = ['repo', 'read:user', 'user:email'];
// jeton classique (ghp_…), fin (github_pat_…), ou ancien format de 40 caractères hexadécimaux
const TOKEN_SHAPE = /^(gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{20,255}|[0-9a-f]{40})$/;

/** Demande à GitHub à qui appartient le jeton. Lève une erreur claire (sans jamais citer le jeton). */
async function fetchAccount(token, fetchImpl = globalThis.fetch) {
	let response;
	try {
		response = await fetchImpl(API_USER, {
			method: 'GET',
			redirect: 'error',
			signal: AbortSignal.timeout(15000),
			headers: {
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
				'User-Agent': 'Cody-Code'
			}
		});
	} catch {
		throw new Error('Impossible de joindre GitHub. Vérifie ta connexion internet et réessaie.');
	}
	if (response.status === 401 || response.status === 403) {
		throw new Error('GitHub a refusé ce jeton (faux, expiré ou sans les bons droits).');
	}
	if (!response.ok) {
		throw new Error(`GitHub a répondu avec une erreur (${response.status}). Réessaie plus tard.`);
	}
	const user = await response.json();
	if (!user || typeof user.login !== 'string' || user.id === undefined) {
		throw new Error('Réponse inattendue de GitHub.');
	}
	return { id: String(user.id), label: user.login };
}

class CodyGitHubAuthProvider {
	/** @param {import('vscode').SecretStorage} secrets */
	constructor(secrets, fetchImpl) {
		this._secrets = secrets;
		this._fetch = fetchImpl;
		this._emitter = new vscode.EventEmitter();
		this.onDidChangeSessions = this._emitter.event;
	}

	async _read() {
		const raw = await this._secrets.get(SECRET_KEY);
		if (!raw) { return undefined; }
		try {
			const s = JSON.parse(raw);
			if (s && typeof s.accessToken === 'string' && typeof s.id === 'string' && s.account && typeof s.account.label === 'string') { return s; }
		} catch { /* donnée abîmée : on ignore */ }
		return undefined;
	}

	_toSession(stored, scopes) {
		return {
			id: stored.id,
			accessToken: stored.accessToken,
			account: { id: stored.account.id, label: stored.account.label },
			scopes: scopes && scopes.length ? [...scopes] : DEFAULT_SCOPES
		};
	}

	async getSessions(scopes) {
		const stored = await this._read();
		return stored ? [this._toSession(stored, scopes)] : [];
	}

	async createSession(scopes) {
		const token = await askForToken();
		if (!token) { throw new Error('Connexion annulée'); }
		const account = await vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Notification, title: 'Vérification du jeton auprès de GitHub…' },
			() => fetchAccount(token, this._fetch));
		const previous = await this._read();
		const stored = { id: crypto.randomUUID(), accessToken: token, account };
		await this._secrets.store(SECRET_KEY, JSON.stringify(stored));
		const session = this._toSession(stored, scopes);
		this._emitter.fire({
			added: [session],
			removed: previous ? [this._toSession(previous, scopes)] : [],
			changed: []
		});
		return session;
	}

	async removeSession(sessionId) {
		const stored = await this._read();
		if (!stored || stored.id !== sessionId) { return; }
		await this._secrets.delete(SECRET_KEY);
		this._emitter.fire({ added: [], removed: [this._toSession(stored)], changed: [] });
	}
}

/** Explique comment obtenir un jeton, puis le demande (saisie masquée). Retourne undefined si annulé. */
async function askForToken() {
	const OPEN = 'Créer un jeton sur GitHub';
	const HAVE = 'J\'ai déjà un jeton';
	const choice = await vscode.window.showInformationMessage(
		'Connexion à GitHub',
		{
			modal: true,
			detail: 'Cody Code se connecte avec un « jeton personnel » GitHub (une sorte de mot de passe réservé aux applications).\n\n' +
				'1. Clique sur « Créer un jeton sur GitHub » (connecte-toi à GitHub si besoin).\n' +
				'2. Descends en bas de la page et clique sur « Generate token ».\n' +
				'3. Copie le jeton et colle-le à l\'étape suivante.\n\n' +
				'Ne partage jamais ce jeton (ni dans un chat, ni dans un fichier).'
		},
		OPEN, HAVE);
	if (!choice) { return undefined; }
	if (choice === OPEN) {
		await vscode.env.openExternal(vscode.Uri.parse(NEW_TOKEN_URL));
	}
	const value = await vscode.window.showInputBox({
		title: 'Connexion à GitHub',
		prompt: 'Colle ton jeton personnel GitHub ici (il restera caché)',
		placeHolder: 'ghp_… ou github_pat_…',
		password: true,
		ignoreFocusOut: true,
		validateInput: v => {
			const t = (v || '').trim();
			if (!t) { return undefined; }
			return TOKEN_SHAPE.test(t) ? undefined : 'Ce texte ne ressemble pas à un jeton GitHub (il commence par ghp_ ou github_pat_).';
		}
	});
	const token = (value || '').trim();
	return TOKEN_SHAPE.test(token) ? token : undefined;
}

function activate(context, fetchImpl) {
	const provider = new CodyGitHubAuthProvider(context.secrets, fetchImpl);
	context.subscriptions.push(
		vscode.authentication.registerAuthenticationProvider(PROVIDER_ID, 'GitHub', provider, { supportsMultipleAccounts: false }),

		vscode.commands.registerCommand('cody.github.signIn', async () => {
			try {
				const session = await vscode.authentication.getSession(PROVIDER_ID, DEFAULT_SCOPES, { createIfNone: true });
				if (session) { vscode.window.showInformationMessage(`Connecté à GitHub en tant que ${session.account.label}.`); }
			} catch (e) {
				if (e && e.message !== 'Connexion annulée' && !/cancel|annul/i.test(String(e.message))) {
					vscode.window.showErrorMessage(String(e.message || e));
				}
			}
		}),

		vscode.commands.registerCommand('cody.github.signOut', async () => {
			const sessions = await provider.getSessions();
			if (!sessions.length) { vscode.window.showInformationMessage('Tu n\'es pas connecté à GitHub.'); return; }
			await provider.removeSession(sessions[0].id);
			vscode.window.showInformationMessage('Déconnecté de GitHub. Le jeton a été effacé de cet ordinateur.');
		}),

		vscode.commands.registerCommand('cody.github.account', async () => {
			const sessions = await provider.getSessions();
			if (!sessions.length) { await vscode.commands.executeCommand('cody.github.signIn'); return; }
			const name = sessions[0].account.label;
			const pick = await vscode.window.showQuickPick([
				{ label: `$(account) Connecté à GitHub : ${name}`, kind: vscode.QuickPickItemKind.Separator },
				{ label: '$(link-external) Ouvrir mon profil GitHub', id: 'profile' },
				{ label: '$(key) Remplacer le jeton', id: 'replace' },
				{ label: '$(sign-out) Se déconnecter', id: 'out' }
			], { title: 'Compte GitHub', placeHolder: name });
			if (!pick) { return; }
			if (pick.id === 'profile') { vscode.env.openExternal(vscode.Uri.parse('https://github.com/' + encodeURIComponent(name))); }
			if (pick.id === 'out') { await vscode.commands.executeCommand('cody.github.signOut'); }
			if (pick.id === 'replace') { await provider.removeSession(sessions[0].id); await vscode.commands.executeCommand('cody.github.signIn'); }
		})
	);
}

function deactivate() { }

module.exports = { activate, deactivate, fetchAccount, TOKEN_SHAPE, CodyGitHubAuthProvider };

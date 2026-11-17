// Test unitaire phase 11 : logique de la connexion GitHub par jeton (sans l'éditeur).
// Faux module "vscode" pour tester la logique de l'extension sans l'éditeur
const Module = require('module');
const events = [];
const store = new Map();
const fakeVscode = {
  EventEmitter: class { constructor(){ this.l=[]; this.event=(f)=>{this.l.push(f);return {dispose(){}}}; } fire(e){ events.push(e); this.l.forEach(f=>f(e)); } },
  ProgressLocation: { Notification: 15 },
  QuickPickItemKind: { Separator: -1 },
  Uri: { parse: s => ({ s }) },
  env: { openExternal: async u => { events.push({ opened: u.s }); } },
  window: {
    _inputs: [], _choices: [],
    showInformationMessage: async (...a) => { events.push({ info: a[0] }); return fakeVscode.window._choices.shift(); },
    showErrorMessage: async m => { events.push({ err: m }); },
    showInputBox: async () => fakeVscode.window._inputs.shift(),
    withProgress: async (_o, f) => f(),
    showQuickPick: async () => undefined,
  },
  commands: { registerCommand: (id, f) => { events.push({ cmd: id }); return { dispose(){} }; }, executeCommand: async () => {} },
  authentication: { registerAuthenticationProvider: (id, label, p, o) => { events.push({ provider: id, label, multi: o.supportsMultipleAccounts }); fakeVscode._provider = p; return { dispose(){} }; }, getSession: async () => undefined },
};
const orig = Module._load;
Module._load = function (req, ...r) { return req === 'vscode' ? fakeVscode : orig.call(this, req, ...r); };
const ext = require(require('path').join(__dirname, '..', 'extensions', 'cody-github-auth', 'extension.js'));
const assert = require('assert');

(async () => {
  // 1) forme des jetons
  assert(ext.TOKEN_SHAPE.test('ghp_' + 'a'.repeat(36)));
  assert(ext.TOKEN_SHAPE.test('github_pat_' + 'A1_'.repeat(20)));
  assert(!ext.TOKEN_SHAPE.test('mot de passe'));
  assert(!ext.TOKEN_SHAPE.test('ghp_court'));
  assert(!ext.TOKEN_SHAPE.test('ghp_' + 'a'.repeat(36) + ' ; rm -rf'));

  // 2) fetchAccount : succès, refus, panne, réponse bizarre ; le jeton n'apparait jamais dans l'erreur
  const TOKEN = 'ghp_' + 'Z'.repeat(36);
  let seen;
  const ok = async (url, opts) => { seen = { url, opts }; return { ok: true, status: 200, json: async () => ({ login: 'cheikhb448', id: 42 }) }; };
  assert.deepStrictEqual(await ext.fetchAccount(TOKEN, ok), { id: '42', label: 'cheikhb448' });
  assert.strictEqual(seen.url, 'https://api.github.com/user');
  assert.strictEqual(seen.opts.redirect, 'error');
  assert.strictEqual(seen.opts.headers.Authorization, 'Bearer ' + TOKEN);
  for (const [name, f, re] of [
    ['401', async () => ({ ok: false, status: 401 }), /refusé/],
    ['500', async () => ({ ok: false, status: 500 }), /erreur \(500\)/],
    ['réseau', async () => { throw new Error('boom ' + TOKEN); }, /Impossible de joindre/],
    ['bizarre', async () => ({ ok: true, status: 200, json: async () => ({}) }), /inattendue/],
  ]) {
    try { await ext.fetchAccount(TOKEN, f); assert.fail('aurait dû échouer: ' + name); }
    catch (e) { assert(re.test(e.message), name + ' -> ' + e.message); assert(!e.message.includes(TOKEN), 'fuite du jeton'); }
  }

  // 3) activation + fournisseur complet
  const secrets = { get: async k => store.get(k), store: async (k, v) => { store.set(k, v); }, delete: async k => { store.delete(k); } };
  const context = { subscriptions: [], secrets };
  ext.activate(context, ok);
  assert(events.some(e => e.provider === 'github' && e.multi === false), 'fournisseur github non enregistré');
  for (const c of ['cody.github.signIn', 'cody.github.signOut', 'cody.github.account']) assert(events.some(e => e.cmd === c), c);
  const p = fakeVscode._provider;
  assert.deepStrictEqual(await p.getSessions(['repo']), []);

  // annulation à chaque étape
  fakeVscode.window._choices = [undefined];
  await assert.rejects(() => p.createSession(['repo']), /annulée/);
  fakeVscode.window._choices = ["J'ai déjà un jeton"]; fakeVscode.window._inputs = [undefined];
  await assert.rejects(() => p.createSession(['repo']), /annulée/);
  fakeVscode.window._choices = ["J'ai déjà un jeton"]; fakeVscode.window._inputs = ['pas un jeton'];
  await assert.rejects(() => p.createSession(['repo']), /annulée/);
  assert.strictEqual(store.size, 0, 'rien ne doit être enregistré');

  // connexion réussie
  fakeVscode.window._choices = ['Créer un jeton sur GitHub']; fakeVscode.window._inputs = ['  ' + TOKEN + '  '];
  const s = await p.createSession(['repo', 'read:user']);
  assert.strictEqual(s.accessToken, TOKEN); assert.strictEqual(s.account.label, 'cheikhb448'); assert.deepStrictEqual(s.scopes, ['repo', 'read:user']);
  assert(events.some(e => e.opened && e.opened.startsWith('https://github.com/settings/tokens/new')));
  assert.strictEqual((await p.getSessions(['repo'])).length, 1);
  assert(!events.some(e => e.err || (e.info && String(e.info).includes(TOKEN))));

  // déconnexion
  await p.removeSession('mauvais-id'); assert.strictEqual((await p.getSessions()).length, 1);
  await p.removeSession(s.id); assert.strictEqual((await p.getSessions()).length, 0); assert.strictEqual(store.size, 0);

  // donnée abîmée dans le stockage = pas de session, pas de plantage
  store.set('cody.github.session', '{pas du json'); assert.deepStrictEqual(await p.getSessions(), []);
  console.log('TOUS LES TESTS OK');
})().catch(e => { console.error('ECHEC', e); process.exit(1); });

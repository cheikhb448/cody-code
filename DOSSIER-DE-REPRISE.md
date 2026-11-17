# DOSSIER DE REPRISE — Cody Code

> **À lire en premier par tout nouveau Claude qui reprend le projet** (nouvelle discussion, même compte de Cheikh).
> Ce dossier contient tout : qui est Cheikh, ce qu'on construit, où est quoi, comment travailler, ce qui est fait, ce qui reste.
> Écrit le 2026-11-14. Ensuite lire `Reprise.md` (journal court) et `FEATURES.md` (liste des fonctions testées).
> **Aucun secret dans ce fichier** (pas de token, pas de mot de passe). Il ne doit jamais en contenir.

---

## ⚠️ Mise à jour du 17 nov. 2026 (lire avant le reste)

- **GitHub Actions est bloqué** (compte : paiement échoué / limite de dépense). Rien ne se construit tant que Cheikh n'a pas choisi : dépôt public (gratuit), limite de dépense, ou attendre. Voir `Reprise.md`.
- Code envoyé (commit `6d907c2b`, branche `cody-main`) mais **pas encore testé en entier ni empaqueté** : barre du haut nettoyée (plus de dossier ni petite icône), menu ☰ et boutons de disposition affichés, connexion GitHub par jeton (`extensions/cody-github-auth`, remplace `github-authentication` et `microsoft-authentication`, exclues du paquet), noms VS Code/Microsoft remplacés dans les textes à la construction (`build/cody/brand-text.mjs`), mode « PC modeste » (commande + suggestion si ≤ 4 Go), barre d'état avec problèmes et position du curseur.
- Nouveaux tests : `phase11-parite.mjs`, `phase11-github-unitaire.cjs` (logique jeton, OK en local), `phase12-commandes.mjs` (liste les commandes VS Code qui manquent). Le test 12 de la 1re passe a signalé des « manques » qui sont surtout des commandes cachées sans fichier ouvert / sans dépôt Git : test corrigé, à relire.
- Cheikh a demandé : ne manquer aucune fonction de VS Code, réparer les erreurs, connexion GitHub, puis il donnera **ses propres fonctions pour dépasser VS Code** (à demander quand tout est fini).
- Remote SSH/conteneurs/WSL et Settings Sync sont des services Microsoft : impossibles tels quels (alternative : export de profil vers un gist GitHub avec la connexion GitHub).

## 0. Démarrage rapide (5 lignes)

1. Cheikh écrit en français, veut des réponses **très courtes, simples, non techniques**.
2. Dépôt : `cheikhb448/cody-code` (privé), branche de travail **`cody-main`**. Code local : `/home/claude/cody-code` (à recloner via l'outil `add_repo` si la session est neuve).
3. Rien ne se compile sur place : **tout se construit et se teste sur GitHub Actions** (30–50 min par run).
4. Dernier état vert : run web `43616456597` (commit `119d0388`) ; dernière version installable : Release **`test-14`**.
5. **Français par défaut sur l'application installée : FAIT (Windows testé, Release test-15).** Prochaine tâche : alléger l'appli pour petit PC (mémoire mesurée sur Linux : 1287 Mo au repos, voir §13-K « PC modeste »). Instabilité Windows : rien trouvé par les tests, à re-demander à Cheikh avec des cas précis (message d'erreur, moment du blocage).

---

## 1. Cheikh et façon de travailler

**Qui :** Cheikh, propriétaire et décideur. Francophone. Plan **gratuit** de Claude : le quota fond vite quand la discussion est longue → c'est la raison de ce dossier. PC : **Acer TravelMate (2010-2013), i3, 4 Go de RAM, disque dur HDD 500 Go**, Windows 10. Téléphone Android. Pas de budget matériel ni hébergement.

**Règles qu'il a fixées (obligatoires) :**
- Rapports **courts, simples, sans jargon**. Il déteste les longs messages d'IA « presque inutiles » ; trop de technique peut lui faire abandonner le projet. Le détail technique reste dans les fichiers.
- **Étape par étape** : faire → vérifier → étape suivante. Pas de rapport à chaque étape ; un rapport court à la fin d'une phase.
- Une fois tout fini : **tester dans l'environnement** et **chercher erreurs et failles de sécurité**.
- **La qualité avant la vitesse.**
- Tenir **`Reprise.md`** à jour après chaque étape ; quand il écrit **« Continue »**, lire `Reprise.md` (et ce dossier) puis reprendre exactement là.
- Tenir **`FEATURES.md`** à jour : ne cocher ✅ que ce qui a été **réellement testé**.
- Quand le système dit qu'il n'a pas eu de nouvelles : envoyer un message très court (`SendUserMessage`) puis continuer.

**Sécurité des secrets :** si Cheikh colle un token GitHub dans le chat → **ne jamais l'écrire, le stocker ni l'utiliser** ; lui rappeler de le supprimer (il en a déjà exposé). L'accès au dépôt se fait par l'outil `add_repo` (droit de push).

---

## 2. Vision et décisions de Cheikh

- **Cody Code** = fork de **VS Code (Code - OSS 1.144.0, commit `5b7277ed`, licence MIT)** avec **toutes** les fonctions de VS Code.
- **Nom définitif : « Cody Code »** (nom, logo, icônes propres, rien de Microsoft visible).
- **Design identique à sa capture** `cody-design/reference-capture.png` : thème bleu-nuit sombre, barre de titre (logo, nom, projet ▾, recherche centrale, soleil, cloche, compte), barre d'activités, explorateur avec section **BRANCHES**, éditeur, **panneau « Cody Assistant » à droite** (onglets Assistant / Chat / Codebase / Context, « Salut Cheikh ! », 4 cartes d'actions rapides), terminal en bas, barre d'état. Interface en **français**.
- **Extensions** : **Open VSX** (pas le magasin Microsoft) ; « si possible » d'autres services similaires.
- **Rien ne doit dépendre de services Microsoft** (télémétrie, connexion, Copilot, CDN).
- **IA** : l'assistant ne doit **jamais envoyer de données sans accord** de l'utilisateur.
- Décisions du 13–14 nov. : pas de carré autour de la saisie de l'assistant ; installateur nommé « Cody Code Setup » ; vraies icônes de langages ; couleurs de code plus sombres et variées comme VS Code ; **aucune licence MIT/Microsoft affichée à l'installation** (voir §8 pour la limite légale).
- Il avait aussi demandé « comment gagner de l'argent avec cet éditeur » : une réponse a été donnée dans la discussion précédente (non conservée ici). À redemander si besoin.

---

## 3. État par phase

| Phase | Contenu | État |
|---|---|---|
| 0 | Récupérer VS Code OSS, créer le dépôt, fichiers de suivi | ✅ |
| 1 | Compiler, lancer, écrire/sauver un fichier | ✅ (CI) |
| 2 | Identité Cody Code (nom, logo, « À propos ») | ✅ |
| 3 | Design identique à la capture (thème, barre de titre, BRANCHES, français, soleil clair/sombre) | ✅ avec écarts (§13-C) |
| 4 | Cody Assistant (panneau, onglets, accueil, saisie, connexion IA avec accord) | ✅ avec limites (§13-D) |
| 5 | Parité VS Code : tests de chaque ligne de `FEATURES.md` | ✅ (cases ⬜ restantes §13-E) |
| 6 | Extensions via Open VSX | ✅ (6.2 « autres magasins » : pas fait) |
| 7 | Sécurité : zéro contact Microsoft, mode restreint, télémétrie, audit | ✅ |
| 8 | Paquets : Windows (zip + installateur), Linux (tar.gz + deb), clone Git | ✅ Windows et Linux ; **macOS ⬜** |
| 9 | Améliorations d'après les plaintes des développeurs (mémoire visible, recherche légère, réglages légers) | ✅ (une ligne à confirmer) |
| 10 | 5 remarques de Cheikh (carré, installateur, icônes, couleurs, licence) | ✅ |
| 11 | **Français par défaut sur la version installée** | ✅ Windows (test-15) ; Linux testé OK, à republier |
| 12 | Publication GitHub (README, licence, nettoyage, public) | ⬜ |

(Attention : le numéro des phases dans le plan initial de `Reprise.md` était différent — la phase 9 « publication » est devenue la 12 ici ; les « améliorations » et les « 5 remarques » sont venues s'insérer.)

---

## 4. Où est quoi

- **Dépôt GitHub :** `cheikhb448/cody-code` (privé).
  - **`cody-main`** = tout le travail. **`main`** = seulement le `README.md` et `Tests.py` de Cheikh → **ne jamais l'écraser**.
  - `ci-captures` = captures d'écran de la version web/Linux publiées par les tests ; `ci-captures-win` = captures Windows.
  - remote `upstream` = `microsoft/vscode` (pour comparer).
- **Local :** `/home/claude/cody-code` (branche `cody-main`). Copies de suivi aussi dans `/home/claude/` (Reprise.md, FEATURES.md, WORKFLOW.md) — la référence est celle du dépôt.
- **Historique** aplati en 1 commit de départ ; 98 fichiers Git LFS de tests Copilot retirés.
- **Fichiers de suivi à la racine :** `WORKFLOW.md` (schéma de travail), `Reprise.md` (journal), `FEATURES.md` (fonctions testées), ce dossier. Documents légaux : `LICENSE.txt`, `NOTICE.md`, `ThirdPartyNotices.txt`, `README.md`, `SECURITY.md` et `CONTRIBUTING.md` (**ces deux derniers sont encore ceux de Microsoft, à réécrire**).
- **Design :** `cody-design/palette.md` (couleurs mesurées), `cody-design/reference-capture.png`. Logo : `resources/cody-brand/`.

---

## 5. Comment travailler avec les limites de l'environnement

- L'environnement **ne peut pas télécharger Electron ni Node** (accès refusé) et n'a **pas de vérificateur TypeScript local** → **tout est construit/testé sur GitHub Actions**.
- Workflows (`.github/workflows/`) :
  - **`cody-build.yml`** — « Construction et test de démarrage » (version web) : installe, compile (`transpile-client`, version légère), vérifie TypeScript (0 erreur attendu), lance le serveur web local (`127.0.0.1:8080`) et exécute **tous les tests** `cody-tests/*.mjs` avec Playwright. ≈ 30–50 min. Se déclenche à chaque push de code.
  - **`cody-package.yml`** — « Versions installables » : jobs `linux` (xvfb, `gulp vscode-linux-x64`, test bureau, `.deb` facultatif, tar.gz, captures), `windows` (`gulp vscode-win32-x64`, signtool dans le PATH, test bureau, installateur Inno Setup `CodyCodeSetup.exe`, zip, captures), `publier` (crée une pré-version GitHub `test-<n°>`). Se déclenche sur changement de : le workflow, `cody-tests/phase8-bureau.mjs`, `build/gulpfile.vscode.ts`, `src/vs/workbench/electron-browser/**`, `build/linux/**`, `build/cody/**`, `product.json`, `extensions/theme-defaults/**` (ou à la main). ≈ 30–45 min.
  - Les push qui ne touchent que des `.md` **ne déclenchent rien** (pratique pour les fichiers de suivi).
  - Les workflows de Microsoft sont désactivés dans `.github/workflows-microsoft-desactives/`.
- **Lire les résultats :**
  - `gh api "repos/cheikhb448/cody-code/actions/runs?per_page=8"` (liste) ; `gh api repos/cheikhb448/cody-code/actions/runs/<id>/jobs` (jobs).
  - Les tests écrivent leurs messages en annotations (`::notice/::error title=Test phase N::`) → `gh api repos/cheikhb448/cody-code/check-runs/<job_id>/annotations`.
  - Les journaux complets et les artefacts **ne sont pas téléchargeables** d'ici ; les commandes `gh` GraphQL (ex. `gh release list`) sont bloquées → utiliser `gh api repos/cheikhb448/cody-code/releases`.
  - Captures : `git fetch -q origin ci-captures && git archive FETCH_HEAD | tar -x -C /home/claude/captures` (branche `ci-captures-win` pour Windows), puis regarder avec `Read`.
- Erreur passagère 503 « Session policy unavailable » de `gh` → réessayer.
- **Un seul `git push`/clone à la fois.**
- Tests : Playwright installé dans `/tmp/pw`. Web : locale en-US, frappe avec `delay: 30` (sinon texte perdu), fonctions `essai()/verifier()` indépendantes. Bureau : `_electron`.
- Compiler : machine GitHub ≈ 7 Go de RAM → le workflow libère du disque, ajoute 8 Go de swap, utilise `transpile-client`. `npm run gulp copy-codicons` doit passer **avant** `transpile-client` (sinon plus d'icônes).

---

## 6. Ce qui a été changé dans le code (par fichier)

**Configuration produit — `product.json`**
- Identité : `nameShort/nameLong` « Cody Code », `applicationName` `cody-code`, `dataFolderName` `.cody-code`, ids Windows/Mac/Linux propres, URLs vers le GitHub de Cheikh.
- Retirés : voiceWsUrl, webviewContentExternalBaseUrlTemplate, URLs Copilot, `trustedExtensionAuthAccess`, `builtInExtensionsEnabledWithAutoUpdates`.
- `configurationDefaults` (réglages par défaut) : menu caché, barre de commande, pas d'écran de démarrage, minimap off, `chat.disableAIFeatures` true, **télémétrie off**, feedback off, expériences off, `update.mode` none, thème **« Cody Dark »**, icônes **material-icon-theme** (messages de bienvenue coupés), police 13 / interligne 19, `cody.assistant.userName` = « Cheikh » (**à vider avant publication**), blame Git barre d'état off, exclusions de surveillance/recherche (node_modules, dist, .next, .venv…), `search.followSymlinks` false, sticky scroll off, suggestions de terminal off, mémoire TypeScript limitée à 1536 Mo, recommandations d'extensions ignorées.
- Ces réglages arrivaient seulement sur le web ; **sur le bureau** ils sont enregistrés par `src/vs/workbench/electron-browser/desktop.main.ts` (avant `new WorkspaceService`), champ `configurationDefaults` ajouté à `src/vs/base/common/product.ts`.

**Serveur web — `src/vs/server/node/webClientServer.ts`** : plus de voiceWsUrl ; CSP sans `[::1]` ; `frame-src 'self' http://*.localhost:* data:` ; webviews servies **localement** (`http://{uuid}.localhost:port/...`) quand le serveur est en local sans jeton ; sert `workbench.html` + `nls.messages.fr.js` (français web).
**`environmentService.ts` (web)** : plus de CDN Microsoft pour les webviews.
**Accueil** : `startupPage.ts` — l'écran d'accueil/onboarding est coupé.

**Interface Cody — `src/vs/workbench/contrib/cody/browser/`**
- `assistant/` : `codyAssistantView.ts` (panneau), `codyAssistantService.ts` (connexion IA), `codyAssistant.contribution.ts`, `codyAssistantActions.contribution.ts` ; style `media/cody-assistant.css` (saisie sans carré ; bordure de focus discrète).
- `codyBranches.contribution.ts` (section BRANCHES), `codyStatusbar.contribution.ts` (nom, v1.0.0, ● Prêt, **mémoire `$(pulse) N Mo`** rafraîchie toutes les 15 s, clic = extensions actives), `codyTitlebarActions.contribution.ts` (soleil, cloche, compte), `codyFirstRun.contribution.ts`.
- Styles : `cody-layout.css`, `cody-branches.css`, `cody-titlebar-actions.css`. Barre de titre : `titlebarPart.ts` (`createCodyBrand`), recherche centrale : `commandCenterControl.ts`. Thème par défaut sombre même sur le web : `themeConfiguration.ts`, `workbenchThemeService.ts`.
- Thèmes : `extensions/theme-defaults/themes/cody-dark.json` (palette de code variée, 15 couleurs) et `cody-light.json`.

**Assistant IA (comportement)** : connexion à tout service « compatible OpenAI » (Ollama local, ou service en ligne avec sa clé) via la commande « Cody Assistant : configurer le service d'IA ». **Aucun service par défaut.** Accord demandé **par service** avant tout envoi ; commande pour retirer les accords ; réglages `cody.assistant.endpoint/model` en portée APPLICATION (un projet piégé ne peut pas les changer) ; pas de redirection ; `http` seulement vers localhost ; clé dans le stockage sécurisé.

**Icônes de fichiers** : `build/cody/fetch-icon-theme.mjs` télécharge au build **Material Icon Theme (PKief, MIT)** depuis Open VSX, vérifie l'éditeur/nom/licence, journalise le sha256, extrait dans `extensions/material-icon-theme` (protection contre les chemins piégés), retire les « dependencies » du package.json ; si échec → dossier supprimé, le build continue. Notice ajoutée à `ThirdPartyNotices.txt`.

**Construction/paquets** : `build/gulpfile.vscode.ts` (tâche shim Copilot ignorée si `extensions/copilot` absent), `build/linux/dependencies-generator.ts` (binaire tunnel facultatif), `build/win32/code.iss` (aucune page de licence, éditeur « Cody Code », `OutputBaseFilename=CodyCodeSetup`, `#ifdef CopilotShim`).
**Français web** : `build/cody/make-nls-fr.mjs <dossier-paquet-de-langue> [sortie]` fabrique `nls.messages.fr.js` à partir du paquet libre `MS-CEINTL.vscode-language-pack-fr` (Open VSX) ; le workflow web fait `bundle --nls` (cible server-web) puis copie dans `out/`.
**Licence** : `LICENSE.txt` (notice Cody Code/Cheikh d'abord, MIT Microsoft conservée), `NOTICE.md`.

---

## 7. Tests automatiques (`cody-tests/`)

| Fichier | Ce qu'il vérifie |
|---|---|
| phase1-ecrire-sauver | ouvrir, écrire, sauvegarder un fichier (vérif sur disque) |
| phase2-identite | titre « … - Cody Code », aucune trace Microsoft |
| phase3-design | couleurs, français, soleil clair/sombre, BRANCHES, variété des couleurs du code ; **capture d'écran** (1671×941, projet fictif `fixtures/DropLink`) |
| phase4-assistant | panneau droit, onglets, accueil, cartes, accord avant envoi, refus = 0 envoi, projet piégé sans effet |
| phase5-editeur / code-explorateur / terminal-git / outils | éditeur, intelligence du code, explorateur, terminal, Git, débogage Node, tâches, Emmet, notebooks, Markdown, Zen, contraste élevé… |
| phase6-extensions | recherche/installation/désactivation/désinstallation depuis Open VSX (installe **VSCode Icons**, car Material Icon Theme est intégré) |
| phase7-reseau | seuls 127.0.0.1 et open-vsx.org sont contactés (aucun Microsoft) |
| phase7-confiance | mode restreint à l'ouverture d'un dossier inconnu, terminal demande confiance |
| phase8-clone | clonage d'un dépôt Git depuis l'éditeur |
| phase8-bureau | **version bureau** (Electron) : démarrage, réglages, icônes (Python, PDF, txt…), polices, capture `p8-icones[-win].png` |
| phase9-ameliorations | icônes, mémoire dans la barre d'état, recherche qui ignore les dossiers lourds |

Dernier résultat : **run web `43616456597` = succès** (TypeScript 0 erreur, toutes les phases OK). Le run précédent `43613758298` avait échoué (test de la phase 6 d'avant la correction), corrigé depuis. Paquets : run « Versions installables » `43613758276` = succès → Release **test-14**.

---

## 8. Sécurité, vie privée, légal

- **Aucun contact Microsoft** (vérifié en test réseau : seulement `127.0.0.1` et `open-vsx.org`). Télémétrie coupée, pas de mise à jour automatique, pas de Copilot, `github-authentication` n'utilise pas l'identifiant OAuth de Microsoft (voir §13-F).
- **Mode restreint / confiance** : dossier inconnu = mode restreint ; le terminal demande la confiance avant de lancer du code.
- **Audit des dépendances** : failles corrigées ; **7 restantes sans correctif**, dans des paquets non utilisés.
- Aucun secret dans les fichiers ; pas d'`innerHTML` dans le code Cody ; chemins serveur fixes.
- **Licence MIT :** elle **oblige** à garder la mention de copyright de Microsoft dans les copies. Donc : retirée de **l'écran d'installation**, mais **conservée** dans `LICENSE.txt` et `ThirdPartyNotices.txt` (obligation légale, à expliquer simplement à Cheikh s'il redemande). Le nom/logo « Visual Studio Code » ne sont pas utilisés ; README précise « non affilié à Microsoft ».
- **Windows non signé** : SmartScreen affichera un avertissement à l'installation (normal pour un projet sans certificat payant).
- Rappel permanent : Cheikh doit **supprimer les anciens tokens GitHub** qu'il a collés dans le chat.

---

## 9. Versions installables déjà publiées

Releases (pré-versions) sur `cheikhb448/cody-code` : `test-11`, `test-12`, **`test-14` (la plus récente, 14 nov. 2026)** contenant `cody-code-win32-x64.zip`, `CodyCodeSetup.exe`, `cody-code-linux-x64.tar.gz`. Pas de macOS. La version installée Windows s'affiche encore **en partie en anglais** (« EXPLORER », « Restricted Mode… »).

---

## 10. Pièges déjà rencontrés (ne pas refaire)

- `setColorTheme` veut l'**id interne** du thème, pas son nom.
- Retirer des extensions avant `gulp` casse le build ; `prepareCopilotRipgrepShimTask` exigeait Copilot ; `.deb` plantait sans binaire tunnel ; Windows : `signtool` doit être dans le PATH ; dans `desktop.main.ts` utiliser `product` (pas `productService`).
- vsce `npm list --production` : il faut retirer les `dependencies` du package.json de l'extension d'icônes.
- Le service worker répond au faux domaine `*.vscode-resource.vscode-cdn.net` : le test réseau ne compte que les réponses hors service worker.
- Tests de bureau : fenêtre trop petite (1024×728) cache l'assistant → agrandie ; fenêtre de confiance du dossier à accepter.
- Le test phase 3 s'appuie sur une section hors explorateur (titres en majuscules).
- Le bureau n'applique pas `configurationDefaults` du produit tout seul → d'où `desktop.main.ts`.

---

## 11. Détail de ce qui est FAIT (résumé par grandes lignes)

Éditeur complet (onglets, coloration, recherche/remplacement, multi-curseurs, plier, minimap, diff, formatage, auto-save, IntelliSense, renommage, erreurs en direct, snippets, LSP) ; explorateur et recherche ; terminal (bash testé) ; Git (changements, commit, branches, conflits, clone) ; débogage Node ; tâches ; extensions Open VSX ; paramètres, raccourcis, thèmes ; Emmet, notebooks, aperçu Markdown, Zen, contraste élevé ; mode restreint ; Cody Assistant ; barre de titre/état Cody ; icônes Material ; couleurs de code variées ; mémoire visible ; Windows et Linux installables. Voir `FEATURES.md` pour la liste exacte cochée.

---

## 12. Limites connues de ce qui est « fait »

- Cody Assistant : pas de réponses en direct (flux) ; **onglet Codebase « pas encore disponible »** ; **images jointes non envoyées** à l'IA ; aucun service d'IA par défaut (Cheikh doit en brancher un).
- Français : ≈ 76 % des textes traduits (paquet libre v1.131 sur base 1.144) ; sur le **bureau**, pas encore actif par défaut.
- Un test d'ouverture du dépôt cloné est « informatif » seulement.
- `FEATURES.md` ligne « Terminal sans suggestions intempestives, mémoire de TypeScript limitée » : réglages posés, **pas encore confirmés par un test**.

---

## 13. CE QUI RESTE À FAIRE (par priorité)

### A. ✅ Français par défaut sur la version installée (FAIT le 14 nov. soir)
- Réalisé : `build/cody/fetch-language-pack-fr.mjs` (télécharge le paquet libre sur Open VSX) + `make-nls-fr.mjs --remplacer` (met le français dans `resources/app/out/nls.messages.json`, anglais gardé dans `nls.messages.en.json`), étape « Mettre l'interface en français par défaut » dans `cody-package.yml`. Les textes des extensions intégrées (menus Git, etc.) restent en partie en anglais.
- Ancien plan, gardé pour mémoire :
- Constat : l'app Windows/Linux affiche encore « EXPLORER », « Restricted Mode… ».
- Ce que j'ai repéré : au démarrage bureau, `src/bootstrap-esm.ts` lit la variable `VSCODE_NLS_CONFIG` (préparée par le processus principal) et charge `languagePack.messagesFile` ou `defaultMessagesFile`.
- **Piste (non réalisée)** : à la construction du paquet bureau, fabriquer le fichier de traductions françaises avec `build/cody/make-nls-fr.mjs` (même méthode que le web) ou embarquer le paquet `MS-CEINTL.vscode-language-pack-fr` (Open VSX) comme extension intégrée, et forcer la langue `fr` par défaut dans la résolution NLS du processus principal (`src/vs/base/node/nls.ts` / réglage de langue par défaut) ; ajouter l'étape dans `cody-package.yml`.
- Vérification : étendre `cody-tests/phase8-bureau.mjs` pour exiger du texte français (ex. « Explorateur », « Mode restreint ») ; relire la capture Windows/Linux.

### B. Lire / vérifier
- Le run web `43616456597` est vert : cocher dans `FEATURES.md` ce qui est confirmé (phase 6 avec VSCode Icons, phase 9 icônes). Mettre à jour `Reprise.md` (déjà désynchronisé : voir §14).

### C. Écarts de design avec la capture (non réglés, jamais tranchés avec Cheikh)
1. **Titre de l'assistant tronqué** (« … » au lieu de « Cody Assistant », onglet Context coupé) quand le panneau est étroit.
2. **Bouton « + »** après les onglets de fichiers : absent.
3. **Barre d'activités** : 48 px de large contre ≈ 65 px sur la capture.
4. **Raccourci** affiché Ctrl+P au lieu de Ctrl+K (assumé : Ctrl+K est le préfixe de dizaines de raccourcis VS Code) → à lui demander.
5. Onglets un peu plus petits que sur la capture ; panneau du bas fermé au démarrage (ouvert sur la capture) ; « Hello » (extension de test) et « Layout: us » dans la barre d'état ; branche Git à compléter dans la barre d'état ; onglets de fichiers « stylisés » ⬜ dans FEATURES.

### D. Cody Assistant — fonctionnalités prévues non faites
Réponses en direct (flux) ; onglet **Codebase** (analyse du projet entier) ; **envoi d'images** ; pièces jointes complètes ; choix simple d'un service d'IA pour un débutant (aujourd'hui il faut configurer à la main) ; prénom « Salut Cheikh » : actuellement un réglage `cody.assistant.userName`.

### E. Cases ⬜ de `FEATURES.md` (prévues, pas faites)
Profils d'utilisateur · Synchronisation des paramètres (sans service Microsoft) · Développement à distance (SSH, conteneurs, WSL) · Compatibilité lecteurs d'écran · onglets stylisés · confirmation terminal/TypeScript · **macOS** · expressions surveillées du débogueur · plein écran du mode Zen · couper/coller dans l'explorateur (ne déplace pas encore).

### F. Connexion GitHub
- `github-authentication` utilise l'identifiant OAuth de Microsoft → **ne pas l'utiliser**. Cody est vu comme « client non pris en charge » → flux par **jeton personnel (PAT)**. À tester de bout en bout, puis écrire une explication simple pour Cheikh (comment créer un jeton ; **ne jamais le coller dans le chat**).
- Vérifier aussi si l'extension `microsoft-authentication` est encore embarquée → la retirer si inutile.
- Git (push/pull) : le clone est testé ; push/pull avec jeton à valider.

### G. macOS
Construire après que le dépôt soit public (runners macOS gratuits) ; non signé → avertissement Gatekeeper à expliquer.

### H. Publication GitHub (phase 12) — **demander l'accord de Cheikh avant de rendre le dépôt public**
- README complet et clair (captures, installation, limites) ; `CONTRIBUTING.md` et `SECURITY.md` **à réécrire** (encore ceux de Microsoft) ; guide pour contribuer (comment lancer, tests, workflow).
- Vider `cody.assistant.userName` (« Cheikh ») dans `product.json`.
- Retirer `extensions/copilot` du dépôt (≈ 62 Mo, déjà exclu des paquets) et le dossier `copilot_shim`/`AGENTS.md` venant de Microsoft si inutiles.
- Vérifier `ThirdPartyNotices.txt`/`cgmanifest.json`, ajouter un `CHANGELOG`.
- Repasser la chasse aux secrets avant le passage en public.
- **Vérifier la marque « Cody »** (un produit « Cody » existe chez Sourcegraph) : décision/risque à exposer simplement à Cheikh. Nom définitif demandé par lui = « Cody Code ».

### I. Mises à jour
`update.mode` est « none » : aucune mise à jour automatique. Prévoir un moyen simple (télécharger la nouvelle version, ou mise à jour depuis GitHub Releases) avant de diffuser largement.

### J. Phase 6.2 (prévue, non faite)
Étudier d'autres services d'extensions compatibles en plus d'Open VSX.

### K. Idées proposées (non lancées)
Profil « **PC modeste** » en un clic (désactive minimap, animations, limite la mémoire) ; **alerte** quand une extension est lourde ; conserver les réglages après mise à jour ; nettoyer les restes (« Hello », « Layout: us »).

### L. Divers prévus au plan initial
Rapport de fin de phase 0 (0.6) jamais envoyé formellement ; 7 failles d'audit « sans correctif » à surveiller lors des futures mises à jour ; mise à jour périodique de la base VS Code (1.144.0 → plus récente) si Cheikh le souhaite.

---

## 14. Note sur `Reprise.md`

Son tableau « État actuel » en haut est **resté figé à la phase 4** et son plan §5 montre encore des cases ⬜ pour les phases 3 à 9. **Ce dossier fait foi.** À la reprise, mettre `Reprise.md` à jour (un tableau court renvoyant ici).

---

## 15. Procédure à suivre dans une nouvelle discussion

1. Lire ce dossier + `Reprise.md` + `FEATURES.md` + `WORKFLOW.md`.
2. S'assurer d'avoir le dépôt : outil `list_repos`/`add_repo` (`cheikhb448/cody-code`, accès push), puis cloner la branche `cody-main` dans `/home/claude/cody-code`.
3. Dire à Cheikh en **une phrase** ce qu'on reprend (tâche A), puis travailler **par petites étapes vérifiées**, mettre à jour `Reprise.md` après chaque étape.
4. Rapports : 3–5 lignes, mots simples.

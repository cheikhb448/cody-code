# Reprise.md — Suivi du travail de Claude (Cody Code)

> Fiche écrite et mise à jour par **Claude**, en continu.
> **Règle n°1 :** quand Cheikh écrit **« Continue »**, je lis ce fichier en premier, puis je reprends exactement où on s'est arrêté.
> Je mets ce fichier à jour **après chaque étape terminée** (et avant d'en commencer une nouvelle), car le plan gratuit peut couper mon travail à tout moment.

---

## 1. État actuel (à lire en premier)

| Élément | Valeur |
|---|---|
| Dernière mise à jour | 2026-10-30 |
| Phase en cours | **Phase 4 terminée côté code** (tests verts : run 40586277812, commit ee7be618) → il reste le rapport court à Cheikh, puis **Phase 5 — Parité des fonctionnalités** (tester chaque ligne de FEATURES.md) |
| Fait en phase 4 | panneau Cody Assistant à droite (480 px max, remplace le Chat de VS Code, masqué via `config.cody.enableVSCodeChat`), en-tête logo + IA, 4 onglets, accueil, 4 cartes, saisie, connexion IA compatible OpenAI avec accord obligatoire par service, commandes « configurer le service d'IA » / « retirer mes accords », réglages `cody.assistant.endpoint/model` (portée APPLICATION : un projet ne peut pas les changer), pas de redirection, http seulement vers localhost, clé dans le stockage sécurisé, CSP web ouverte à localhost |
| Écarts à dire à Cheikh | prénom dans « Salut ! » = réglage `cody.assistant.userName` (vide par défaut) ; aucun service d'IA choisi par défaut (il doit en brancher un) ; Codebase pas encore disponible ; images pas encore envoyées ; pas de réponse en direct (flux) ; Phase 8 : CSP du bureau à ouvrir à localhost |
| Fait en phase 3 | palette + thèmes Cody (clair/sombre), barre de titre (logo, projet, recherche, soleil, cloche, compte), barre d'état, Terminal en 1er, icônes de fichiers colorées, explorateur 26px, section BRANCHES (Structure/Chronologie masquées), titres en majuscules, interface en français, tests automatiques (couleurs, français, soleil clair/sombre, Branches), vérification TypeScript en CI (0 erreur) |
| Écarts à dire à Cheikh | Ctrl+P au lieu de Ctrl+K ; panneau droit encore « Conversation » de VS Code (phase 4) ; panneau du bas fermé au démarrage (capture : ouvert) ; onglets un peu plus petits que la capture ; français ≈76 % (paquet libre v1.131) ; « Hello » et « Layout: us » dans la barre d'état = extension de test / clavier web, à nettoyer plus tard |
| Méthode CI (français) | `bundle --nls` dans `out-nls`, copie dans `out/` de `vs/code/browser/workbench/`, `media/`, `nls.*` ; `product.json` reçoit `commit` en CI seulement ; `webClientServer.ts` sert `workbench.html` + `nls.messages.fr.js`. Leçon : `setColorTheme` veut l'id interne du thème, pas son nom. |
| Sécurité phase 3 | aucun secret dans nos fichiers ; pas d'innerHTML dans le code Cody ; chemins serveur fixes (pas d'entrée utilisateur) ; rappel : Cheikh doit supprimer ses anciens tokens GitHub |
| Bloqué ? | Non |

**Comment je regarde le résultat visuel :** le test `cody-tests/phase3-design.mjs` prend une capture (1671×941, projet « DropLink » reconstitué dans `cody-tests/fixtures/DropLink`) ; le workflow la publie sur la branche **`ci-captures`** ; je fais `git fetch origin ci-captures && git archive FETCH_HEAD | tar -x -C /home/claude/captures` puis je lis `p3-1-ecran.png` et je compare à `cody-design/reference-capture.png`.

**Changements de code faits en phase 3 :**
- Thème par défaut sombre même sur le web (`themeConfiguration.ts`), couleurs de chargement Cody (`workbenchThemeService.ts`).
- `product.json` : `configurationDefaults` (menu caché, commandCenter, minimap off, `chat.disableAIFeatures` true tant que Cody Assistant n'existe pas, startupEditor none…) + `codyVersion` 1.0.0. Transmis au navigateur par `src/vs/server/node/webClientServer.ts`. ⚠ La version bureau (Electron, phase 8) aura besoin d'un autre mécanisme pour ces réglages.
- Barre de titre : logo + « Cody Code » + sélecteur de projet (`titlebarPart.ts` → `createCodyBrand`, style `media/cody-titlebar.css`). Barre de recherche centrale refaite (`commandCenterControl.ts`).
- Barre d'état : `src/vs/workbench/contrib/cody/browser/codyStatusbar.contribution.ts` (nom, v1.0.0, ● Prêt).
- ⚠ Écart assumé : le raccourci affiché dans la recherche est celui de VS Code (Ctrl+P), pas « Ctrl+K » comme sur la capture, car Ctrl+K est le préfixe de dizaines de raccourcis VS Code. À signaler à Cheikh dans le rapport de fin de phase.
- Leçons CI : `npm run gulp copy-codicons` doit passer AVANT `transpile-client` (sinon pas d'icônes) ; test sans fenêtre de confiance via `--disable-workspace-trust` (le produit garde la protection).

**Où est quoi :**
- Dépôt GitHub de Cheikh : `cheikhb448/cody-code` (privé). Branche de travail : **`cody-main`** (la branche `main` contient seulement `README.md` et `Tests.py` de Cheikh : ne pas l'écraser).
- Code local : `/home/claude/cody-code` (branche `cody-main`, remote `origin` = GitHub de Cheikh, `upstream` = microsoft/vscode).
- Base : VS Code 1.144.0 (commit `5b7277ed`). Historique aplati en 1 commit de départ ; 98 fichiers Git LFS de tests Copilot retirés (`extensions/copilot/test/simulation/cache`).
- Programme de construction : `.github/workflows/cody-build.yml`. Ceux de Microsoft : `.github/workflows-microsoft-desactives/`.
- Test réel : `cody-tests/phase1-ecrire-sauver.mjs` (Playwright : ouvre l'éditeur, ouvre un fichier, écrit, sauvegarde, vérifie le fichier).
- **Lire les résultats d'un run :** `gh api repos/cheikhb448/cody-code/actions/runs` ; les journaux complets ne sont PAS téléchargeables d'ici (403). Astuce : le test écrit ses messages en « annotations » → `gh api repos/cheikhb448/cody-code/check-runs/<job_id>/annotations`.

**Comment on compile (leçons apprises) :**
- Dépôt privé = machine GitHub petite (≈7 Go RAM, disque limité) → le workflow libère le disque, ajoute 8 Go de swap, et utilise `npm run transpile-client` (léger) au lieu de `compile-client` (trop lourd).
- Un run complet dure ≈ 13 min. Le serveur web se lance avec `./scripts/code-server.sh` (VSCODE_SKIP_PRELAUNCH=1).
- Les extensions intégrées ne sont PAS compilées dans ce run (messages « Cannot find module extensions/…/out ») : à traiter en phase 5/6 (`npm run gulp compile-extensions`).
- Dans les tests, taper avec `delay: 30` ms sinon le texte est perdu.

**Prochaine action exacte :** Phase 5 en cours. Run 41020025778 lu : éditeur 100 % OK, code/explorateur OK sauf « déplacer un fichier » (diagnostic + glisser-déposer ajoutés), terminal+Git et outils : échecs surtout dus à mes tests (palette choisissait « Create Branch From… » au lieu de « Create Branch… » ; clic dans la zone de message Git au lieu de l'éditeur ; boîte « type node non pris en charge » = extension js-debug absente). Corrigé : sélection exacte des commandes, `.part.editor`, CI télécharge `npm run download-builtin-extensions` (js-debug) et retire les extensions de test (« Hello ») → nouveau run lancé. Ensuite : lire les annotations « Test phase 5.x », corriger, cocher FEATURES.md (seulement testé). À vérifier : lien cliquable du terminal, indicateurs de marge Git. « Layout: us » = vrai sélecteur de clavier (utile, à garder). Reste 5.5 : rapport court à Cheikh. Notes phase 7 : product.json contient `voiceWsUrl` (microsoft.com) et `GitHub.copilot-chat` dans builtInExtensionsEnabledWithAutoUpdates.

**Règles GitHub apprises :**
- Le token collé dans le chat NE sert PAS (refusé) et ne doit jamais être écrit dans un fichier. Dépôt accessible via l'outil `add_repo` (push), déjà fait ; au besoin le refaire.
- Un seul `git clone`/`push` à la fois.

## 2. Rappel du projet
- **Cody Code** = éditeur basé sur le code libre de VS Code (Code - OSS, licence MIT), avec **toutes** les fonctionnalités de VS Code.
- **Design** : exactement comme la capture `Espace_de_développement_Cody_Code_en_français.png` (thème sombre, panneau « Cody Assistant » à droite).
- **Nom** : Cody Code (nom, logo et icônes propres, rien de Microsoft).
- **Extensions** : magasin libre **Open VSX** + autres services similaires si possible (pas le magasin Microsoft).
- **Propriétaire** : Cheikh.

## 3. Façon de travailler (obligatoire)
- Découper chaque phase en **petites étapes**.
- Enchaîner **automatiquement** : faire → vérifier → si OK, étape suivante.
- **Pas de rapport** à Cheikh tant que **toutes les étapes de la phase** ne sont pas finies.
- Rapports **courts, simples, sans jargon**.
- Après toutes les étapes : **test complet + recherche d'erreurs et de failles de sécurité**.
- Mettre à jour **ce fichier** après chaque étape, et `FEATURES.md` quand une fonctionnalité est vérifiée.

## 4. Contraintes à ne pas oublier
- PC de Cheikh : **Acer TravelMate (2010-2013), i3, 4 Go de RAM, disque dur HDD 500 Go**. Très modeste.
- **Aucune compilation sur son PC** : tout se fait dans le cloud.
- Cheikh est sur le **plan gratuit** : le travail peut être coupé à tout moment par la limite d'usage → toujours laisser ce fichier à jour.
- Pas de budget pour du matériel ou de l'hébergement payant.

---

## 5. Plan détaillé par phase

Légende : ✅ fait et vérifié · 🚧 en cours · ⬜ à faire · ⛔ bloqué

### Phase 0 — Préparation
- ✅ 0.1 Récupérer le code de VS Code OSS (GitHub `microsoft/vscode`)
- ✅ 0.2 Vérifier que le code est complet et que le fichier de licence MIT est présent
- ✅ 0.3 Créer le dépôt de travail « Cody Code » et copier le code dedans
- ✅ 0.4 Ajouter `WORKFLOW.md`, `FEATURES.md`, `Reprise.md` à la racine
- ✅ 0.5 Vérifier les outils nécessaires dans l'environnement (Node.js, Git, etc.)
- ⬜ 0.6 Vérification finale de la phase 0 + rapport court à Cheikh

### Phase 1 — Base qui tourne
- ✅ 1.1 Installer les dépendances
- ✅ 1.2 Compiler l'éditeur tel quel
- ✅ 1.3 Le lancer (version web ou bureau selon ce que permet l'environnement)
- ✅ 1.4 Tester : ouvrir, écrire, sauvegarder un fichier
- ✅ 1.5 Vérification finale de la phase 1 + rapport court

### Phase 2 — Identité Cody Code
- ✅ 2.1 Lister tous les endroits où apparaît « Visual Studio Code » / « Code - OSS »
- ✅ 2.2 Remplacer le nom par « Cody Code »
- ✅ 2.3 Créer le logo et les icônes de Cody Code
- ✅ 2.4 Remplacer les textes et fenêtres « À propos »
- ✅ 2.5 Vérifier qu'il ne reste aucune trace visible de Microsoft / VS Code
- ✅ 2.6 Vérification finale + rapport court

### Phase 3 — Design (identique à la capture)
- ⬜ 3.1 Relever les couleurs, polices et espacements de la capture
- ⬜ 3.2 Thème sombre Cody (couleurs de l'éditeur et du code)
- ⬜ 3.3 Barre de titre (nom du projet, recherche, notifications, compte)
- ⬜ 3.4 Barre d'activités à gauche et explorateur en arbre avec icônes colorées
- ⬜ 3.5 Onglets, fil d'Ariane, zone de code
- ⬜ 3.6 Panneau du bas (Terminal, Problèmes, Sortie, Débogage, Console)
- ⬜ 3.7 Barre d'état
- ⬜ 3.8 Basculement thème clair / sombre
- ⬜ 3.9 Comparaison côte à côte avec la capture + corrections
- ⬜ 3.10 Vérification finale + rapport court

### Phase 4 — Cody Assistant (panneau IA)
- ⬜ 4.1 Panneau à droite (ouvrir / fermer)
- ⬜ 4.2 Onglets Assistant · Chat · Codebase · Context
- ⬜ 4.3 Écran d'accueil et 4 actions rapides
- ⬜ 4.4 Zone de saisie (pièces jointes, images)
- ⬜ 4.5 Branchement d'un service d'IA (aucune donnée envoyée sans accord)
- ⬜ 4.6 Vérification finale + rapport court

### Phase 5 — Parité des fonctionnalités avec VS Code
- ⬜ 5.1 Tester chaque section de `FEATURES.md`, une par une
- ⬜ 5.2 Corriger ce qui ne marche pas
- ⬜ 5.3 Cocher dans `FEATURES.md` uniquement ce qui est testé
- ⬜ 5.4 Vérification finale + rapport court

### Phase 6 — Extensions
- ⬜ 6.1 Brancher Open VSX
- ⬜ 6.2 Étudier d'autres services de magasins d'extensions compatibles
- ⬜ 6.3 Tester installation / activation / désinstallation d'extensions courantes
- ⬜ 6.4 Vérification finale + rapport court

### Phase 7 — Sécurité
- ⬜ 7.1 Chercher secrets et clés dans le code
- ⬜ 7.2 Contrôler les dépendances (failles connues)
- ⬜ 7.3 Retirer ou désactiver la télémétrie et les connexions Microsoft
- ⬜ 7.4 Contrôler les permissions et le mode « dossier non fiable »
- ⬜ 7.5 Corriger puis re-tester
- ⬜ 7.6 Rapport court

### Phase 8 — Paquets d'installation
- ⬜ 8.1 Version Windows
- ⬜ 8.2 Version Linux
- ⬜ 8.3 Version macOS
- ⬜ 8.4 Test d'installation propre
- ⬜ 8.5 Vérification finale + rapport court

### Phase 9 — Publication GitHub
- ⬜ 9.1 README clair
- ⬜ 9.2 Licence et crédits (MIT, mention de Microsoft)
- ⬜ 9.3 `FEATURES.md` à jour
- ⬜ 9.4 Guide pour les développeurs qui veulent contribuer
- ⬜ 9.5 Vérification finale + rapport court

---

## 6. Journal (le plus récent en haut)

| Date | Ce qui a été fait | Résultat |
|---|---|---|
| 2026-10-27 | Phase 4 terminée côté code : Cody Assistant (panneau, onglets, accueil, saisie, connexion IA avec accord) ; tests verts (run 40586277812) | ✅ OK |
| 2026-10-26 | Phase 3 terminée côté code : français, BRANCHES, soleil clair/sombre, tests verts (run 40411800007) | ✅ OK |
| 2026-10-24 | Phase 2 terminée : identité Cody Code, tests phase 1+2 verts (run 40094108059). Corrigés en route : manifest « Code- OSS », test phase 1 gêné par la page Welcome | ✅ OK |
| 2026-10-23 (nuit) | Contrôle final : 1 échec dû à une course critique dans le TEST (texte tapé avant l'affichage du fichier), corrigé ; relancé = succès (run 40036901572) avec droits GitHub réduits | ✅ OK |
| 2026-10-23 (nuit) | Phase 1 terminée : installation, compilation légère, serveur web et test d'écriture/sauvegarde OK sur GitHub Actions (run 40034501361). Contrôle sécurité : aucun secret dans nos fichiers, serveur de test en local seulement, droits GitHub réduits | ✅ OK |
| 2026-10-23 | Dépôt GitHub `cheikhb448/cody-code` relié ; code poussé sur `cody-main` ; LFS Copilot retiré ; workflow `cody-build.yml` ajouté et lancé | 🚧 résultat à lire |
| 2026-10-21 (soir) | Phase 1.1 : bibliothèques système installées (libxkbfile, libsecret, libkrb5…). `npm ci` échoue 4 fois : téléchargement refusé (403) sur electronjs.org / nodejs.org | ⛔ Bloqué, voir section 1 |
| 2026-10-21 (soir) | Phase 0 : clone de VS Code 1.144.0 (20 996 fichiers), licence MIT présente, branche `cody-main`, fichiers de suivi ajoutés et commités, Node 24.22.0 installé | OK |
| 2026-10-21 | Création de `WORKFLOW.md`, `FEATURES.md` et `Reprise.md` | OK |

## 7. Problèmes rencontrés
- Le Node de l'environnement (22) est trop ancien : le projet exige 24.22.0. Réglé en installant Node 24 dans `/home/claude/tools`.
- Bibliothèques système à installer avant `npm ci` : `libxkbfile-dev`, `libsecret-1-dev`, `libkrb5-dev` (seule `libx11-dev` est présente). À vérifier que `apt` fonctionne ici.
- Le dossier contient un `copilot_shim` et un `AGENTS.md` venant de Microsoft : à examiner en phase 2 / 7 (traces Microsoft et Copilot à retirer).

## 8. Décisions prises par Cheikh
- Nom : **Cody Code**.
- Design : **identique à la capture**.
- Extensions : **Open VSX** + services similaires.
- Travail **automatique et continu**, rapport seulement à la fin de chaque phase.

# Cody Code — Fonctionnalités

Cody Code est un éditeur de code basé sur le code open source de VS Code (« Code - OSS », licence MIT), avec une identité visuelle et un assistant IA qui lui sont propres.

**Légende :** ✅ fait et testé · 🚧 en cours · ⬜ à faire

> Ce fichier est mis à jour au fil du projet. Une case n'est cochée ✅ qu'après un test réel.

---

## 1. Éditeur
- ✅ Ouvrir un fichier (Ctrl+P), écrire et sauvegarder (Ctrl+S) — testé automatiquement, version web (phase 1)
- ✅ Édition de texte multi-fichiers avec onglets — testé automatiquement, version web (phase 5)
- ✅ Coloration syntaxique — testé automatiquement, version web (phase 5)
- ✅ Numéros de ligne, fil d'Ariane (breadcrumbs) — testé automatiquement, version web (phase 5)
- ✅ Recherche et remplacement (fichier et dossier, avec expressions régulières) — testé automatiquement, version web (phase 5)
- ✅ Multi-curseurs et sélection multiple — testé automatiquement, version web (phase 5)
- ✅ Plier / déplier le code — testé automatiquement, version web (phase 5)
- ✅ Mini-carte (minimap) — testé automatiquement, version web (phase 5)
- ✅ Annuler / rétablir — testé automatiquement, version web (phase 5)
- ✅ Éditeur divisé (plusieurs volets côte à côte) — testé automatiquement, version web (phase 5)
- ✅ Comparaison de fichiers (diff) — testé automatiquement, version web (phase 5)
- ✅ Formatage automatique — testé automatiquement, version web (phase 5)
- ✅ Enregistrement automatique — testé automatiquement, version web (phase 5)

## 2. Intelligence du code
- ✅ Autocomplétion (IntelliSense) — testé automatiquement, version web (phase 5)
- ✅ Aide sur les paramètres de fonction — testé automatiquement, version web (phase 5)
- ✅ Aller à la définition / aux références — testé automatiquement, version web (phase 5)
- ✅ Renommage intelligent de symboles — testé automatiquement, version web (phase 5)
- ✅ Détection d'erreurs et avertissements en direct — testé automatiquement, version web (phase 5)
- ✅ Corrections rapides — testé automatiquement, version web (phase 5)
- ✅ Extraits de code (snippets) — testé automatiquement, version web (phase 5)
- ✅ Prise en charge des langages via le protocole LSP — testé automatiquement, version web (phase 5)

## 3. Explorateur et navigation
- ✅ Explorateur de fichiers (créer, renommer, déplacer, supprimer) — testé (déplacement par glisser-déposer ; couper/coller dans l'explorateur ne déplace pas encore) (phase 5)
- ✅ Ouverture de dossiers et d'espaces de travail multiples — testé automatiquement, version web (phase 5)
- ✅ Recherche globale dans le projet — testé automatiquement, version web (phase 5)
- ✅ Accès rapide aux fichiers et à la palette de commandes (Ctrl+P / Ctrl+Shift+P) — testé automatiquement, version web (phase 5)
- ✅ Vue Structure (symboles du fichier) — testé automatiquement, version web (phase 5)
- ✅ Historique local des fichiers (timeline) — testé automatiquement, version web (phase 5)

## 4. Terminal intégré
- ✅ Terminal dans l'éditeur (bash testé ; PowerShell/cmd/zsh dépendent de l'ordinateur) — testé automatiquement, version web (phase 5)
- ✅ Plusieurs terminaux, terminal divisé — testé automatiquement, version web (phase 5)
- ✅ Liens cliquables dans la sortie (chemin de fichier détecté et ouvert) — testé automatiquement, version web (phase 5)

## 5. Contrôle de version (Git)
- ✅ Vue Git : changements, ajout, commit — testé automatiquement, version web (phase 5)
- ✅ Branches (créer, changer, fusionner) — testé automatiquement, version web (phase 5)
- ✅ Comparaison visuelle des changements — testé automatiquement, version web (phase 5)
- ✅ Résolution de conflits de fusion — testé automatiquement, version web (phase 5)
- ✅ Push / pull (testés avec un dépôt distant) — clone testé (phase 8)
- ✅ Indicateurs de modification dans la marge — testé automatiquement, version web (phase 5)

## 6. Exécution et débogage
- ✅ Lancer et déboguer un programme — testé avec Node.js (phase 5)
- ✅ Points d'arrêt (simples, conditionnels) — testé automatiquement, version web (phase 5)
- ✅ Pile d'appels et variables — 🚧 expressions surveillées pas encore testées — testé automatiquement, version web (phase 5)
- ✅ Console de débogage — testé automatiquement, version web (phase 5)
- ✅ Configurations de lancement (`launch.json`) — testé automatiquement, version web (phase 5)
- ✅ Tâches (`tasks.json`) — testé automatiquement, version web (phase 5)

## 7. Extensions
- ✅ Vue Extensions (installer, désactiver, réactiver, désinstaller ; une fenêtre demande de faire confiance à l'éditeur avant la 1re installation) — testé automatiquement, version web (phase 6)
- ✅ Magasin d'extensions libre (Open VSX) : recherche et installation testées, aucune requête vers le magasin Microsoft — testé automatiquement, version web (phase 6)
- ✅ Extensions recommandées par projet (liste affichée depuis Open VSX) — testé automatiquement, version web (phase 5)
- ✅ Thèmes d'icônes et de couleurs via extensions

## 8. Personnalisation
- ✅ Paramètres (interface graphique + `settings.json`, qui s'ouvre dans une fenêtre flottante) — testé automatiquement, version web (phase 5)
- ✅ Raccourcis clavier personnalisables — testé automatiquement, version web (phase 5)
- ✅ Thèmes de couleurs (thème sombre Cody par défaut, clair disponible) — couleurs vérifiées automatiquement (phase 3)
- ⬜ Profils d'utilisateur
- ⬜ Synchronisation des paramètres (service Microsoft impossible ; alternative prévue : export du profil vers un gist GitHub)
- ✅ Langue de l'interface : français affiché automatiquement (testé sur la version web ET sur la version installée Windows ; une partie des textes reste en anglais, voir notes) (phases 3 et 11)

## 9. Interface Cody (design propre)
- ✅ Identité : nom « Cody Code », logo et icônes propres (titre, icône web, manifest, fenêtre « À propos ») — testé automatiquement, version web (phase 2)
- 🚧 Barre de titre avec nom du projet, recherche globale, notifications, compte — fait, vérifié sur capture (test automatique à compléter)
- 🚧 Barre d'activités à gauche (Explorateur, Recherche, Git, Exécuter, Extensions) — fait, vérifié sur capture
- 🚧 Explorateur en arbre avec icônes colorées par type de fichier + section Branches — fait (section Branches testée)
- ⬜ Onglets de fichiers stylisés
- 🚧 Panneau du bas (Terminal, Problèmes, Sortie, Débogage, Console) — fait, vérifié sur capture
- 🚧 Barre d'état (nom, version, langage, encodage, fins de ligne, état « Prêt ») — fait, vérifié sur capture ; branche Git à compléter
- ✅ Basculement thème clair / sombre en un clic (bouton soleil) — testé automatiquement (phase 3)

## 10. Cody Assistant (IA)
- ✅ Panneau latéral à droite, ouvrable et fermable (Ctrl+Alt+B) — testé automatiquement (phase 4)
- ✅ Onglets : Assistant · Chat · Codebase · Context — testé (Codebase : « pas encore disponible »)
- ✅ Actions rapides : générer du code, expliquer le code, corriger les erreurs, améliorer le code — testé (remplissent la saisie)
- 🚧 Saisie de question avec pièces jointes et images — fichier ouvert → contexte testé ; les images ne sont pas encore envoyées à l'IA
- ✅ Aucune donnée envoyée sans accord de l'utilisateur — testé : accord demandé par service avant tout envoi, refus = 0 envoi, accord retirable, projet piégé sans effet, pas de redirection, http seulement vers localhost

## 11. Productivité
- ✅ Emmet (écriture rapide HTML/CSS) — testé automatiquement, version web (phase 5)
- ✅ Éditeur de notebooks (ouverture d'un .ipynb) — testé automatiquement, version web (phase 5)
- ✅ Aperçu Markdown — testé automatiquement, version web (phase 5)
- ✅ Mode sans distraction (Zen) — 🚧 plein écran non testé — testé automatiquement, version web (phase 5)
- ✅ Espaces de travail de confiance (Workspace Trust)
- ⬜ Développement à distance (SSH, conteneurs, WSL)

## 12. Accessibilité et sécurité
- ⬜ Compatibilité lecteurs d'écran
- ✅ Contraste élevé — testé automatiquement, version web (phase 5)
- ✅ Mode restreint pour dossiers non fiables — testé automatiquement (phase 7)
- ✅ Télémétrie désactivée par défaut — aucun contact Microsoft vérifié (phase 7)
- ✅ Audit de sécurité des dépendances — failles corrigées ; 7 restantes sans correctif, dans des paquets non utilisés (phase 7)

## 13. Plateformes
- ✅ Windows — zip + installateur construits et démarrage testé (phase 8)
- ⬜ macOS
- ✅ Linux — archive construite et démarrage testé (phase 8)
- ✅ Version navigateur (web) — c'est la version testée automatiquement à chaque étape

---

## Licence et crédits
Cody Code est basé sur [Code - OSS](https://github.com/microsoft/vscode), publié sous licence MIT par Microsoft. Le nom, le logo et les icônes de « Visual Studio Code » ne sont pas inclus : Cody Code a sa propre identité.

## Notes
- Cody Assistant : brancher n'importe quel service « compatible OpenAI » (Ollama sur son ordinateur, ou un service en ligne avec sa propre clé) via la commande « Cody Assistant : configurer le service d'IA ». Aucun service n'est choisi par défaut. Pas encore de réponses « en direct » (flux) ni d'analyse du projet entier (Codebase).
- Le raccourci affiché dans la barre de recherche est Ctrl + P (celui de VS Code), pas Ctrl + K.
- Français : le paquet de langue libre (Open VSX) couvre environ 76 % des textes ; le reste reste en anglais.

## Améliorations d'après les plaintes des développeurs (phase 9)
- ✅ Mémoire de l'éditeur affichée dans la barre d'état (clic = extensions actives) — testé
- ✅ Recherche qui ignore node_modules, dist, .next, .venv… — testé ; la surveillance des fichiers ignore les mêmes dossiers
- ✅ Aucune IA imposée (pas de Copilot, jamais d'envoi sans accord)
- ✅ Télémétrie coupée, pas de mise à jour automatique qui change l'interface
- ⬜ Terminal sans suggestions intempestives, mémoire de TypeScript limitée (PC modestes) — réglages par défaut posés, à confirmer
- 🚧 Mode « PC modeste » (commande + suggestion automatique ≤ 4 Go) — code envoyé, pas encore testé
- ✅ Connexion à un compte GitHub par jeton personnel (sans service Microsoft) — fenêtre d'aide, saisie masquée, logique testée (phase 11) ; connexion avec un vrai compte pas encore essayée
- ✅ Menu ☰, boutons de disposition, terminal ouvrable depuis le menu Terminal, plus de sélecteur de dossier ni de mini-logo en haut — testé (phase 11) ; menus complets, 55/55 commandes essentielles de VS Code présentes (phase 12)
- ✅ Plus aucun nom « VS Code » / « Microsoft » dans les textes de l'éditeur — testé (phase 12) ; restent : liens d'aide et mentions légales (obligatoires)
- ✅ Icônes colorées avec les vrais logos (Python, PDF, Docker, dossiers…) — Material Icon Theme intégré, testé sur Windows et Linux
- ✅ Couleurs du code variées (15 couleurs, mots-clés violets/bleus, chaînes orange…) — testé
- ✅ Installateur « CodyCodeSetup.exe », sans page de licence ; mentions légales gardées dans le dossier du logiciel

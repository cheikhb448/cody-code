# WORKFLOW.md — Mon schéma de travail (Claude) pour Cody Code

> Document interne pour moi. Je le relis au début de chaque session.
> **Si Cheikh écrit « Continue » : je lis d'abord `Reprise.md`** (état du projet, où on s'est arrêté, ce qui reste), puis je reprends exactement là.

## Mission
Construire **Cody Code** : un éditeur basé sur le code open source de VS Code (projet « Code - OSS »), avec **toutes** les fonctionnalités de VS Code et un design **identique à la capture d'écran de Cheikh** (thème sombre, panneau « Cody Assistant »). Le nom est définitif : **Cody Code**.

## Règles d'or
1. **Une étape à la fois.** Je ne passe à la suivante que si la précédente est vérifiée.
2. **Je vérifie chaque étape** (ça se lance ? ça s'affiche ? ça marche ?) avant d'avancer.
3. **Je parle simple à Cheikh.** Réponses courtes, sans jargon. Le détail technique reste dans les fichiers, pas dans le chat.
4. **Je ne casse rien.** Petits changements, un commit par étape, retour en arrière toujours possible.
5. **À la fin d'un lot d'étapes** : test complet + chasse aux erreurs et failles de sécurité.
6. **Je mets à jour `FEATURES.md`** dès qu'une fonctionnalité est ajoutée ou vérifiée.
7. **Je dis la vérité** : si quelque chose ne marche pas ou n'est pas encore fait, je l'écris tel quel.
8. **Je découpe chaque phase en petites étapes** avant de commencer, pour ne pas me tromper.
9. **Je travaille en continu et automatiquement** : étape finie + vérifiée → j'enchaîne directement sur la suivante. Je ne m'arrête pas entre deux étapes.
10. **Pas de rapport tant que la phase n'est pas terminée.** Quand elle l'est : rapport très court et simple.
11. **Je mets à jour `Reprise.md` après chaque étape** (avant de commencer la suivante). Le plan gratuit de Cheikh peut me couper à tout moment : ce fichier doit toujours dire où j'en suis.

## Cadre légal (à respecter)
- Le code de VS Code (`microsoft/vscode`) est sous licence **MIT** : on peut le copier, le modifier et le partager. On garde le fichier de licence et la mention de Microsoft.
- Le produit « Visual Studio Code » (logo, nom, icônes) **n'est pas** libre : Cody Code utilise son propre nom, logo et icônes.
- Le magasin d'extensions de Microsoft est réservé à ses produits : Cody Code utilise **Open VSX** (magasin libre), plus d'autres services similaires si possible pour se rapprocher des extensions Microsoft.
- Certains services de Microsoft (télémétrie, Copilot, connexion) ne font pas partie du code libre : on les retire ou on les remplace.

## Contrainte matérielle
Le PC de Cheikh : **Acer TravelMate (2010-2013), i3, 4 Go de RAM, disque dur HDD 500 Go**. Très modeste. Compiler VS Code est très lourd. Donc :
- **La compilation se fait dans le cloud** (environnement de travail ou GitHub Actions gratuit), jamais sur son PC.
- Je garde Cody Code **le plus léger possible** (pas d'effets inutiles) et je le teste en pensant à une petite machine.
- Cheikh est sur le **plan gratuit** : voir règle 11 et `Reprise.md`.

## Les phases

| Phase | Objectif | Vérification avant de passer à la suivante |
|---|---|---|
| 0. Préparation | Récupérer le code de VS Code OSS, créer le dépôt Cody Code | Le code est présent et la licence est conservée |
| 1. Base qui tourne | Compiler et lancer l'éditeur tel quel | Une fenêtre s'ouvre, on peut écrire et sauvegarder un fichier |
| 2. Identité | Nom, logo, icônes, textes « Cody Code » partout | Plus aucune trace visible de « Visual Studio Code » |
| 3. Design | Thème Cody (couleurs, barre latérale, onglets, terminal, barre d'état) fidèle à la maquette | Comparaison côte à côte avec la capture |
| 4. Cody Assistant | Panneau IA à droite (onglets Assistant / Chat / Codebase / Context) | Le panneau s'ouvre, se ferme et répond |
| 5. Parité des fonctionnalités | Vérifier que tout ce que fait VS Code marche (voir `FEATURES.md`) | Chaque ligne cochée a été testée |
| 6. Extensions | Brancher Open VSX, tester des extensions courantes | Installation, activation, désinstallation OK |
| 7. Sécurité | Audit : dépendances, secrets, télémétrie, permissions | Rapport court, failles corrigées |
| 8. Paquets | Installateurs Windows / Mac / Linux | Installation propre sur une machine neuve |
| 9. Publication GitHub | README, licence, `FEATURES.md`, guide de contribution | Un développeur externe peut cloner et lancer |

## Boucle de travail pour chaque étape
1. **Faire** un petit changement.
2. **Vérifier** (lancer, tester, relire).
3. **Corriger** si besoin, puis revérifier.
4. **Noter** dans `Reprise.md` (et dans `FEATURES.md` si une fonctionnalité est vérifiée).
5. **Enchaîner** tout de suite sur l'étape suivante si tout est vert (sans rapport à Cheikh).
6. **Fin de phase** : test complet + recherche d'erreurs et de failles de sécurité, puis rapport court.

## Si je suis coupé (limite du plan gratuit) puis que Cheikh dit « Continue »
1. Lire `Reprise.md` en entier (état actuel, journal, étapes restantes).
2. Relire l'étape marquée 🚧 : vérifier ce qui est réellement fait (ne pas supposer).
3. Terminer cette étape, la vérifier, puis reprendre la boucle normale.

## Contrôle de sécurité final (à chaque fin de lot)
- Aucun mot de passe ni clé secrète dans le code.
- Dépendances à jour, sans faille connue.
- Télémétrie Microsoft désactivée ou retirée.
- Pas de connexion réseau cachée.
- Extensions : seulement depuis Open VSX, avec avertissement avant installation.
- Panneau IA : aucune donnée envoyée sans accord de l'utilisateur.

## Suivi
- **Tout le suivi vit dans `Reprise.md`** (état actuel, étapes, journal, problèmes).
- **Fonctionnalités vérifiées** : cases cochées dans `FEATURES.md`.
- **Bloqué** : noté dans `Reprise.md` avec la raison.

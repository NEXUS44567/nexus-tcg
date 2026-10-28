# NEXUS TCG — V3

Nouvelle version du site, construite à part pour comparer avec la V2 (racine du dépôt), qui n'est pas modifiée.
En ligne : `https://nexus44567.github.io/nexus-tcg/v3/` (une fois la branche fusionnée dans `main`).

Mêmes fonctionnalités que la V2, mêmes adresses (`#/op`, `#/carte/…`, `#/collection`…) et mêmes données (`../db/`, relevées chaque jour par les robots de la V2) :

- écran de choix des deux univers, accueil One Piece et accueil Pokémon
- fiche carte : prix du jour sourcé, moyennes, historique, valeur selon l'état, alertes, comparateur, partage
- recherche, Top 100, extensions, Pokédex, Équipage, scanner avec note d'état
- boosters virtuels (Berrys / Pokéballs, display, taux, collection virtuelle, saison), boutique
- collection : valeur, courbe, classeur, grille, liste, progression par extension, export / import, lien de partage (même format que la V2)
- langues FR / EN / JP et devise associée, application installable, consultation hors ligne

En plus dans la V3 :

- recherche rapide partout (Ctrl/⌘ + K ou `/`) : cartes, extensions, Pokémon, personnages, pages
- reflets holographiques selon la rareté, inspecteur plein écran (la carte se tourne, recto / verso)
- page « Marché » : valeur cumulée, prix médian, extensions les plus précieuses, répartition des prix, prix moyen par rareté, indice du top 50
- boosters : choix parmi les dernières extensions, valeur réelle du tirage carte après carte, journal des tirages
- classeur 3D : couverture en cuir qui s'ouvre, feuilles qui se tournent, mode « Organiser » pour placer chaque carte, export CSV
- Équipage en avis de recherche (la prime est la valeur de la carte la plus chère), Pokédex avec radar des statistiques et cri du Pokémon
- succès à débloquer, réglages (effets allégés, sons, sauvegarde, reprise des données de la V2)
- comptes joueurs : inscription, connexion, carte de membre, progression enregistrée en ligne et synchronisée
  entre appareils (à activer avec Supabase, voir [COMPTES.md](COMPTES.md))

## Données de l'utilisateur

La V3 garde ses propres données (`localStorage` « nexus.v3 »). Au premier lancement, elle reprend une copie de celles de la V2
du même navigateur, sans jamais écrire dans celles-ci. Les réglages permettent de reprendre plus tard les nouveautés de la V2.
Avec un compte, ces données sont aussi enregistrées en ligne (table `nexus_saves`, une ligne par joueur) et reprises
sur chaque appareil où le joueur se connecte.

## Développement

```
cd v3
npm install
npm run build      # → index.html, assets/, sw.js, manifest.webmanifest
```

Sources dans `app/` (React 18, esbuild). Le service worker de la V3 a sa propre portée (`v3/`) et ses propres caches (`nexus3-…`).
Le build dépose aussi dans `assets/` un petit relais au nom du script de la V2 : si un navigateur ayant déjà le service worker de la V2
ouvre la V3 pour la première fois, ce relais retire ce service worker et recharge la page (la V2 le réinstalle à sa visite suivante).
Après une reconstruction de la V2, relancer `npm run build` ici pour mettre ce relais à jour.

Emblèmes et logo dessinés pour NEXUS (aucun logo officiel). One Piece © Eiichiro Oda / Shueisha, Toei Animation, Bandai.
Pokémon © Nintendo, Creatures, GAME FREAK, The Pokémon Company. Site de fan non officiel.

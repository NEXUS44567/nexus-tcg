# NEXUS TCG — V2

Site de prix et de collection pour **One Piece TCG** et **Pokémon TCG**, publié avec GitHub Pages.

- Accueil : recherche instantanée (noms anglais et français, numéros), podium des cartes les plus chères, hausses et baisses
- Fiche carte : prix du jour sourcé, moyennes, historique quotidien, valeur selon l'état, suivi et alertes de prix
- Comparateur : jusqu'à 4 cartes côte à côte avec courbes
- Scanner : photo ou caméra, détection de la carte, note d'état indicative sur 10 (centrage, coins, bords, surface), lecture du numéro (Tesseract.js), ajout à la collection
- Boosters virtuels : déchirage, révélation carte par carte, holo, valeur réelle du tirage, boosters Légende, collection virtuelle
- Collection : valeur au prix du jour selon l'état, courbe, classeur, progression par extension, export / import

## Prix réels

Le robot `.github/workflows/prices.yml` tourne chaque jour (et à la demande) et lance `scripts/fetch-prices.mjs` :

- One Piece : prix de marché TCGplayer via optcgapi.com, converti en euros au taux BCE du jour (frankfurter.app)
- Pokémon : tendance Cardmarket et prix TCGplayer via api.pokemontcg.io, ou tcgdex.dev si la première ne répond pas
- contrôle de cohérence : valeurs dupliquées écartées, cartes aux sources divergentes signalées et retirées du podium

Il écrit `db/prices/`, `db/history/` (180 jours) et `db/market.json`. Aucun prix n'est inventé : une carte sans relevé affiche « Pas de prix relevé ».
Une clé gratuite pokemontcg.io peut être ajoutée en secret de dépôt `POKEMONTCG_API_KEY`.

## Développement

- Code source : `app/` (React, sans dépendance à installer sur la machine de construction actuelle)
- Construction : `node scripts/build-site.mjs` → `index.html`, `404.html`, `assets/`
- Catalogue : `node scripts/build-catalog.mjs` → `db/catalog/` (à partir de l'ancien export `data/`)

Images : optcgapi.com, pokemontcg.io, Scrydex. One Piece © Eiichiro Oda / Shueisha, Toei Animation, Bandai. Pokémon © Nintendo, Creatures, GAME FREAK, The Pokémon Company. Site de fan non officiel.

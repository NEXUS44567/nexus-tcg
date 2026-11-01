# Kirakai a déménagé

Kirakai, construit ici dans `v3/`, a maintenant son propre dépôt et sa propre adresse :

- site : https://nexus44567.github.io/KirakaiTCG/
- dépôt : https://github.com/NEXUS44567/KirakaiTCG

Ce dossier ne garde que la redirection : `index.html` envoie vers la nouvelle adresse en gardant la page demandée
(`#/carte/…`, `#/collection`…), et `sw.js` retire l'ancien service worker et ses caches chez ceux qui l'avaient.
NEXUS V2, à la racine du dépôt, n'est pas concernée.

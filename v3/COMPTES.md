# Activer les comptes joueurs (V3)

Les comptes permettent à chacun de retrouver sa collection, ses boosters, son classeur et ses succès sur tous ses appareils.
Ils reposent sur [Supabase](https://supabase.com) (offre gratuite). Tant que la configuration n'est pas faite, le site
fonctionne comme avant : tout reste dans le navigateur, et la page « Mon compte » annonce que les comptes arrivent bientôt.

## 1. Créer le projet Supabase

1. Crée un compte sur supabase.com, puis **New project** (nom : `nexus-tcg`, région : Europe, choisis un mot de passe de base de données et garde-le).
2. Ouvre **SQL Editor → New query**, colle tout le contenu de [`supabase/comptes.sql`](supabase/comptes.sql) et clique sur **Run**.
   Pour le classement des collectionneurs, fais pareil avec [`../supabase/classement.sql`](../supabase/classement.sql).

## 2. Régler la connexion

Dans **Authentication** :

- **URL Configuration** : *Site URL* = `https://nexus44567.github.io/nexus-tcg/v3/`,
  et dans *Redirect URLs*, ajoute `https://nexus44567.github.io/nexus-tcg/v3/**`.
- **Sign In / Providers → Email** : laisse « Email » activé et **désactive « Confirm email »**.
  Sans serveur d'e-mails à toi, Supabase n'envoie des e-mails qu'aux membres de ton équipe Supabase (et au plus 2 par heure) :
  avec la confirmation activée, les visiteurs ne pourraient pas s'inscrire.

Le lien « Mot de passe oublié » envoie un e-mail : pour qu'il marche pour tout le monde, branche un serveur d'e-mails
(par exemple Resend ou Brevo, gratuits pour un petit volume) dans **Authentication → Emails → SMTP Settings**.
Tu pourras alors réactiver « Confirm email » si tu veux vérifier les adresses.

## 3. Brancher le site

Dans **Project Settings → API Keys** (et **Data API** pour l'adresse), copie :

- l'adresse du projet, du type `https://abcdefgh.supabase.co` ;
- la clé **publishable** (`sb_publishable_…`), ou à défaut la clé **anon public** de l'onglet « Legacy ».

Ces deux valeurs sont publiques par conception : elles ne donnent accès qu'à ce que les règles de la base autorisent
(chacun ne lit et ne modifie que sa propre sauvegarde). Ne communique jamais la clé **secret** ni la clé **service_role**.

Colle-les dans [`app/src/lib/config.js`](app/src/lib/config.js), puis :

```
cd v3
npm run build
```

Le classement des collectionneurs s'active en même temps.

## Connexion avec Google, Discord… (facultatif)

Active le fournisseur dans **Authentication → Sign In / Providers** (il faut créer une application chez Google, Discord…
et coller ses identifiants), puis ajoute son nom dans `providers` du fichier de configuration, par exemple `['google']`.
Un bouton « Continuer avec Google » apparaît alors sous le formulaire.

## Ce qui est enregistré

Tout ce qui est dans le navigateur (collection, suivis et alertes, comparateur, boosters, Berrys et Pokéballs,
classeur, succès, identité au classement, langue des cartes), sauf les réglages propres à l'appareil (effets visuels, sons,
mode administrateur). Chaque changement part vers le compte quelques secondes après ; en revenant sur le site, la dernière
version du compte est reprise. Si deux appareils ont changé chacun de leur côté, les deux progressions sont fusionnées.

À la première connexion, ce que le visiteur avait déjà fait sur l'appareil rejoint son compte. À la déconnexion,
l'appareil repart d'une progression vide (elle reste dans le compte).

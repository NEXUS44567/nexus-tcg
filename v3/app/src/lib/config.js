// Connexion à Supabase : comptes joueurs (sauvegarde de la progression) et classement en ligne.
// Tant que ces deux champs sont vides, le site fonctionne sans compte (tout reste dans le navigateur).
// La clé publique (« publishable » ou « anon public ») est faite pour être visible : elle ne donne accès qu'à ce que
// les règles de la base autorisent (voir supabase/comptes.sql et ../supabase/classement.sql).
export const SUPABASE = {
  url: '',   // ex. https://abcdefgh.supabase.co  (Project Settings → Data API)
  key: '',   // clé « publishable » ou « anon public » (Project Settings → API Keys)
  providers: [], // connexions en un clic activées dans Supabase (Authentication → Providers), ex. ['google', 'discord']
};

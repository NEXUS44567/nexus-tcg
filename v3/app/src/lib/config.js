// Connexion au classement en ligne (Supabase). La clé « anon » est publique par conception :
// elle ne permet que de lire les scores et d'appeler la fonction submit_score (voir supabase/classement.sql).
export const SUPABASE = {
  url: '',   // ex. https://abcdefgh.supabase.co
  key: '',   // clé « anon public » (Project Settings → API)
};

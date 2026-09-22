# DEMBELE, mon Prof de Maison

Prof particulier virtuel (maths, physique, chimie) pour élèves et étudiants en Licence.
TypeScript partout : React + Vite + Tailwind côté navigateur, Supabase (Postgres + RLS) et Edge Function (Deno/TypeScript) côté serveur.

## Démarrer

1. `npm install`
2. `cp .env.example .env` puis renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Base de données : `supabase link --project-ref TON_REF` puis `supabase db push` (applique `supabase/migrations/0001_init.sql`).
4. Dans le tableau de bord Supabase, active la confirmation d'email et impose 10 caractères minimum (comme dans `supabase/config.toml`).
5. Secrets serveur : `cp supabase/.env.example supabase/.env`, remplis `ANTHROPIC_API_KEY` et `ALLOWED_ORIGINS`, puis
   `supabase secrets set --env-file supabase/.env` et `supabase functions deploy chat`.
6. `npm run typecheck && npm run dev`

## Ce qui protège l'application

- **RLS partout** : chaque utilisateur ne voit que ses lignes.
- **Messages et mémoire** : écrits uniquement par l'Edge Function. Impossible de forger un faux message depuis le navigateur.
- **Clé IA** : uniquement dans les secrets Supabase, jamais dans le code client.
- **Blocage horaire** : calculé en base (`get_block_status`) et revérifié par l'Edge Function avant chaque appel IA.
- **Règles métier en base** : profil modifiable une fois par trimestre, emploi du temps verrouillé via `validate_schedule()`.
- **Rate limiting** par utilisateur, limite de requêtes simultanées, retry côté client.
- **Rendu des figures** : SVG nettoyé avec DOMPurify, formules évaluées par mathjs neutralisé, Mermaid en mode strict.
- **En-têtes de sécurité** (CSP, HSTS...) dans `public/_headers` (Netlify / Cloudflare Pages ; à reproduire ailleurs).

## À savoir

- Le verrou de 3 mois sur le profil démarre à la création : une faute de frappe à l'inscription reste 3 mois.
- Jours fériés fixes du Burkina pré-remplis (2026 à 2032). Les fêtes mobiles (Aïd, Tabaski, Maouloud, Pâques...) sont à ajouter chaque année.
- Droits admin : `insert into public.app_admins (user_id) values ('TON_USER_ID');`
- Ce code n'a pas encore été compilé : lance `npm run typecheck` et `npm run build` en premier et corrige ce qui remonte.
- Recommandé avant l'ouverture au public : CAPTCHA à l'inscription (Supabase Auth), `npm run audit:deps`, 2FA sur ton compte Supabase.


## Mise en ligne

Voir `DEPLOY.md` pour le test local, Supabase et le déploiement Netlify.

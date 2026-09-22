# DEMBELE, mon Prof de Maison — mise en route

## 1. Test local

Pré-requis : Node.js 22+, npm et un projet Supabase.

```bash
npm install
cp .env.example .env
```

Renseigne ensuite :

```env
VITE_SUPABASE_URL=https://TON-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=TA-CLE-ANON
```

Puis :

```bash
npx supabase login
npx supabase link --project-ref TON_REF
npx supabase db push
npm run typecheck
npm run dev
```

Ouvre l'adresse affichée par Vite, généralement `http://localhost:5173`.

## 2. Configurer l'IA

Dans `supabase/.env` :

```env
ANTHROPIC_API_KEY=TA_CLE_ANTHROPIC
ALLOWED_ORIGINS=http://localhost:5173,https://TON-DOMAINE.netlify.app
ANTHROPIC_MODEL=claude-sonnet-5
ANTHROPIC_MEMORY_MODEL=claude-haiku-4-5-20251001
```

Puis :

```bash
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy chat
```

La clé Anthropic ne doit jamais être placée dans `.env` côté navigateur.

## 3. Mise en ligne

Le projet contient déjà `netlify.toml`, `_redirects` et `_headers`.

Sur Netlify :

- Build command : `npm run build`
- Publish directory : `dist`
- Node : `22`
- Variables d'environnement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`

Après la publication, ajoute l'URL Netlify dans `ALLOWED_ORIGINS` côté Supabase et redéploie la fonction `chat`.

## 4. Première vérification

Créer un compte → confirmer l'e-mail → compléter le profil → créer un chapitre → envoyer une question → vérifier le streaming de la réponse → vérifier l'emploi du temps si le compte est un élève.

## Important

Les dépendances n'ont pas pu être téléchargées dans l'environnement de préparation actuel : les commandes `npm install` ont expiré. Le code et la configuration ont donc été préparés, mais une compilation complète doit être faite dans un environnement ayant accès au registre npm.

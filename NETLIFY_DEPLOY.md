# DEMBELE — Mon Prof de Maison / Netlify

## Configuration
- Build command : `npm run build`
- Publish directory : `dist`
- Node.js : `20`

## Variables d'environnement
Voir `.env.example`. Ajouter les valeurs réelles dans Netlify, jamais dans Git.

## Supabase
Configurer l'URL de production dans les redirect URLs de l'authentification Supabase. Vérifier les RLS et politiques Storage avant ouverture publique.

## Test local
```bash
npm install
npm run build
npm run dev
```

Pour utiliser Netlify AI afin de finaliser le projet, fournir `NETLIFY_MASTER_PROMPT.md` comme cahier des charges.

# PROMPT MAÎTRE — DEMBELE, MON PROF DE MAISON

Tu es l'ingénieur logiciel principal chargé de livrer cette application en production sur Netlify.

## Objectif
Transformer le projet fourni en application web réellement utilisable, responsive, sécurisée et déployable. Le produit s'appelle « DEMBELE — Mon Prof de Maison » : une plateforme éducative avec professeur numérique, conversations, exercices et outils d'organisation scolaire.

## Règles
- Pars du code fourni. Ne remplace pas l'application par une démo générique.
- Conserve les fonctionnalités existantes lorsqu'elles sont cohérentes.
- Corrige les erreurs TypeScript, React, build, routing et intégrations.
- Aucun bouton mort, lien mort ou écran vide non expliqué.
- N'invente aucune clé API. Si une clé manque, branche proprement la variable et documente-la.
- Aucun secret dans le frontend.

## Fonctionnalités à valider
1. Authentification : inscription, connexion, déconnexion, session, récupération de mot de passe et vérification e-mail si utilisée.
2. Professeur IA : question/réponse, conversations persistantes, historique, image d'exercice si prévue, réponses pédagogiques étape par étape.
3. Matières et niveaux : conserver les matières déjà présentes et une navigation claire.
4. Exercices : consultation et travail sur exercices.
5. Mathématiques : formules et graphiques si prévus.
6. Organisation scolaire : emploi du temps/calendrier/planning si présents, avec création, modification et suppression.
7. Mémoire pédagogique : seulement les données nécessaires, avec respect de la confidentialité et des RLS.

## Supabase
Vérifier tables, relations, RLS, stockage et permissions. Ne jamais utiliser une service-role key côté navigateur. Les opérations nécessitant un secret doivent être côté serveur/Netlify Functions/Supabase Functions.

Variables publiques typiques : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

## Netlify
Build command : `npm run build`
Publish directory : `dist`
Node : 20
Configurer le fallback SPA pour les routes internes. Les secrets doivent être ajoutés dans les variables d'environnement Netlify.

## Design
Interface moderne, claire, mobile-first. Tester au moins sur petit mobile, tablette et ordinateur. Le chat doit être confortable sur mobile. Pas d'effets décoratifs inutiles.

## Sécurité
Vérifier XSS, validation des entrées, uploads, permissions, RLS, exposition de secrets, appels IA abusifs, CORS et headers de sécurité.

## SEO
Titre : DEMBELE — Mon Prof de Maison
Description : Un professeur numérique pour apprendre, comprendre ses cours, travailler ses exercices et mieux organiser ses études.
Configurer favicon, viewport et Open Graph.

## Validation obligatoire
Avant de déclarer le travail terminé : installer les dépendances, lancer `npm run build`, corriger les erreurs, vérifier les routes, les variables d'environnement, l'authentification, Supabase, les fonctions serveur et les écrans principaux. Tester le responsive et vérifier qu'aucun secret n'est exposé.

À la fin, indiquer clairement :
- les variables à ajouter dans Netlify ;
- les actions éventuelles à faire dans Supabase ;
- l'URL de production si publiée ;
- les fonctionnalités réellement testées ;
- ce qui nécessite encore une clé ou une configuration externe.

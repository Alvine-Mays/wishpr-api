# Whispr — Backend (Express.js)

Backend Express.js sécurisé conforme à la spécification fournie.

## Démarrage local

1. Copier `.env.example` en `.env` et remplir les variables (ne jamais committer les secrets).
2. Installer les dépendances :

```
bun install
# ou: npm install / yarn install / pnpm install
```

3. Lancer en dev :
```
bun run dev
# ou: npm run dev
```

4. Exécuter les tests :
```
bun run test
# ou: npm test
```

## Points clés

- Sécurité: Helmet (CSP stricte), CORS restreint au frontend, parsing JSON limité, logs Pino sans contenu en clair.
- Anti‑spam: honeypot, délai minimal (>700ms), cooldown (10s par IP+username), rate limit global et spécifique.
- Auth dashboard: token privé base64url(random(32)||HMAC(userId, JWT_SECRET)), stocké uniquement en hash Argon2id + prefix indexé.
- Web Push: VAPID auto-géré. Si les clés ne sont pas présentes en env, elles sont générées et persistées en base (une fois), et un message d’admin explique comment les stocker définitivement.
- Modèles MongoDB: Users, Messages (TTL +7j), Subscriptions.
- Réponses standardisées: `{ ok: true, data }` / `{ ok: false, error: { code, message } }`.

## Endpoints (base: `/api` et alias `/api/v1`)

- `POST /users` → crée un utilisateur, renvoie `dashboard_token` UNE SEULE FOIS.
- `GET /users/:username/public` → bio, avatarUrl, coverUrl, theme.
- `POST /messages/:username` → envoi d’un message (validations + anti‑spam).
- `GET /dashboard/messages` (auth) → liste paginée + filtres.
- `PATCH /dashboard/messages/:id` (auth) → MAJ partielle flags.
- `DELETE /dashboard/messages/:id` (auth) → suppression.
- `GET /dashboard/stats?range=7d|30d` (auth) → séries par jour.
- `GET /push/public-key` → renvoie la clé publique VAPID (mise en cache 1h). Disponibile aussi via `/api/v1/push/public-key`.
- `POST /push/subscribe` (auth) → enregistre/actualise un abonnement Web Push (idempotent). Accepte `{ endpoint, keys }` ou `{ subscription: { endpoint, keys } }`.
- `POST /push/unsubscribe` (auth) → supprime un abonnement. Réponse 200 JSON sur `/api`, 204 sans contenu sur `/api/v1` pour compat.
- `GET /health` → healthcheck.

## Configuration (env)

- `API_ORIGIN` (ex: `https://whispr-api.onrender.com`)
- `FRONTEND_ORIGIN` (ex: `https://whispr-mobile.netlify.app`)
- `BASE_URL` (ex: `https://whispr-mobile.netlify.app`)
- `MONGO_URI`
- `JWT_SECRET`
- Web Push:
  - `WEB_PUSH_CONTACT` (email de contact, ex: `admin@votre-domaine.com`)
  - `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` (préférés)
  - Compat: `PUBLIC_VAPID_KEY` et `PRIVATE_VAPID_KEY` également pris en charge

Au premier démarrage sans clés, une paire VAPID est générée et stockée en base. Un message d’admin dans les logs affichera les clés UNE SEULE FOIS — recopiez‑les dans les variables d’environnement ci‑dessus et redéployez. Par la suite, les clés ne seront plus journalisées.

## Tester les push en local

1. Démarrer l’API avec un navigateur pointant vers le frontend configuré.
2. Sur le client (PWA), utilisez `GET /api/v1/push/public-key` pour récupérer la clé publique VAPID et appeler `registration.pushManager.subscribe(...)`.
3. Postez un message: `POST /api/messages/:username` — le client recevra une notification Web Push en quelques secondes.

Payload côté serveur:
```
{
  title: "Nouveau message Whispr",
  body: "<extrait du message> · <timestamp ISO>",
  icon: "/icons/icon-192.png",
  badge: "/icons/badge-72.png",
  data: { url: "/dashboard" },
  tag: "message-new"
}
```

En cas d’échec (endpoint 404/410), l’abonnement est automatiquement supprimé.

## Déploiement Render

- Node 18+
- Healthcheck: `/api/health`
- HTTP/2 activé côté Render recommandé pour de meilleures latences push
- Variables:
  - `API_ORIGIN` = URL Render
  - `FRONTEND_ORIGIN` = `https://whispr-mobile.netlify.app`
  - `BASE_URL` = même que le frontend
  - Web Push: `WEB_PUSH_CONTACT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

## Remarques de migration

- L’unicité des abonnements est désormais `{ userId, endpoint }`. Si vous aviez un index unique sur `endpoint` seul, supprimez‑le manuellement avant déploiement en production.

## Cloudinary

Aucune clé pour l’instant. Prévoir un flux signé côté serveur ultérieurement (placeholders).

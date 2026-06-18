# Portfolio Angel SANCHEZ — version GitHub Pages

## Structure

```
index.html        → la page (HTML sémantique, aucune dépendance JS externe)
css/style.css     → tout le style (style rétro pixel-art, responsive)
js/app.js         → rendu des projets/articles + mode administrateur
data/img/         → les images
```

## Mode administrateur

- Bouton ⚙ en bas à droite
- Une fois connecté : ajouter / modifier / supprimer projets et articles.
- Les données sont enregistrées dans le **localStorage du navigateur**.

### Changer le mot de passe

Le mot de passe n'est jamais stocké en clair, seulement son empreinte SHA-256.
Pour le changer :
1. Ouvre le site, puis la console du navigateur (F12).
2. Tape : `await sha256("ton-nouveau-mot-de-passe")`
3. Copie le résultat dans `js/app.js`, variable `PWD_HASH`.

## ⚠️ Limite de sécurité (à lire)

Pour une vraie administration (authentification réelle + modifications publiées) :
- **Decap CMS** (ex-Netlify CMS) — connexion via GitHub, les modifs sont commitées dans le dépôt. Idéal et gratuit pour ce cas.
- **Supabase** / **Firebase** — base de données + authentification réelles.

## Formulaire de contact

Le formulaire est une démo (il ne fait qu'afficher une alerte). Pour recevoir
réellement les messages sans backend : **Formspree** ou **Netlify Forms**.

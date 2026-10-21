# 🍷 Carnet de Dégustation

Une application web pour téléphone : **photographiez une bouteille**, Claude **lit l'étiquette** et vous donne les **repères du sommelier**, puis vous remplissez une **fiche de dégustation Œil · Nez · Bouche**.

Pas de compte, pas de serveur : tout tient dans des fichiers statiques, et vos fiches restent dans votre navigateur.

## Ce que fait l'outil

1. **Photo** : l'étiquette, et si possible la contre-étiquette (cépages, degré, conseils du producteur).
2. **Lecture par Claude** : domaine, cuvée, appellation, classement, millésime, couleur, cépages, degré… Les champs sont modifiables, et Claude signale ce qu'il n'a pas pu lire.
3. **Repères du sommelier** : le profil *attendu* du vin (style, robe, arômes typiques, structure, service, garde, accords). Ils s'affichent dans chaque section pour vous guider. Le bouton **Masquer** permet de déguster sans influence, comme à l'aveugle.
4. **Fiche de dégustation** :
   - **Œil** : limpidité, brillance, intensité, teinte (adaptée à la couleur du vin), reflets, larmes, bulles / mousse / cordon pour les effervescents ;
   - **Nez** : état (et défauts : bouchonné, réduit, oxydé, brett…), intensité au premier et au second nez, **roue des arômes** (17 familles classées en primaires / secondaires / tertiaires), complexité ;
   - **Bouche** : attaque, sucrosité, acidité, alcool, tanins (quantité et texture), corps, matière, milieu de bouche, rétro-olfaction, finale, **longueur en caudalies**, équilibre ;
   - **Conclusion** : qualité, stade de garde, service, verre, accords, note sur 20.
   Chaque critère a une bulle **?** qui explique quoi observer et comment l'interpréter.
5. **Rédiger avec Claude** : à partir de *vos* observations, Claude rédige un commentaire de sommelier, relève les incohérences (par exemple une robe tuilée avec un nez jugé « primaire ») et propose des pistes pour progresser.
6. **Cave** : toutes les fiches sont enregistrées automatiquement. Aperçu complet, impression / PDF, export Markdown, sauvegarde et import JSON.

## Utilisation

### Héberger l'application (recommandé : GitHub Pages)

1. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**, choisissez la branche et le dossier `/ (root)`.
2. Ouvrez l'adresse fournie (`https://<utilisateur>.github.io/Outils-Sommellerie/`) sur votre téléphone.
3. Ajoutez-la à l'écran d'accueil (Safari : Partager → *Sur l'écran d'accueil* ; Chrome : ⋮ → *Ajouter à l'écran d'accueil*).

L'appareil photo s'ouvre directement grâce au bouton de prise de vue. L'application doit être servie en HTTPS (c'est le cas sur GitHub Pages).

### En local

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

(Ouvrir `index.html` directement en `file://` ne fonctionne pas : les modules JavaScript exigent un serveur.)

### Clé API Anthropic

La lecture d'étiquette et la rédaction utilisent l'API Claude. Créez une clé sur [console.anthropic.com](https://console.anthropic.com/settings/keys), puis collez-la dans **⚙️ Réglages**.

- La clé est enregistrée **uniquement dans votre navigateur** et envoyée seulement à `api.anthropic.com`.
- Comme elle est stockée côté navigateur, utilisez une **clé dédiée avec une limite de dépense**, et ne partagez pas l'application ouverte sur un appareil que d'autres utilisent.
- Modèle par défaut : **Claude Opus 5.5** (le plus précis pour lire une étiquette). Sonnet 5.5 et Haiku 5.5 sont proposés pour aller plus vite ou dépenser moins. Pour Opus et Sonnet, un repli automatique vers un autre modèle est activé si une requête est refusée par les filtres de sécurité.
- Ordre de grandeur : quelques centimes par étiquette avec Opus 5.5.

Sans clé, l'application reste utilisable en saisie manuelle.

## Structure du code

| Fichier | Rôle |
|---|---|
| `index.html` | Les écrans : cave, photo, fiche, aperçu, réglages |
| `css/style.css` | Style mobile, mode sombre, mise en page d'impression |
| `js/lexique.js` | **Le référentiel de dégustation** : sections, critères, échelles, familles d'arômes, défauts, textes d'aide. Toute la fiche est générée à partir de ce fichier : pour ajouter un critère ou un arôme, c'est ici. |
| `js/app.js` | Interface : navigation, formulaire, roue des arômes, aperçu, export |
| `js/claude.js` | Appels à l'API Claude (lecture d'étiquette, rédaction), avec sortie JSON structurée |
| `js/image.js` | Redimensionnement des photos dans le navigateur |
| `js/stockage.js` | Sauvegarde locale des fiches et des réglages |

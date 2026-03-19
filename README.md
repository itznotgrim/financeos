# FinanceOS 💠 — Tableau de bord financier personnel

> https://www.denis-andronache.fr

> Un tableau de bord minimaliste et élégant pour piloter vos finances mensuelles.  
> **100 % local — aucune donnée ne quitte votre navigateur.**

---

## ✨ Fonctionnalités

- **Saisie mensuelle** : ajoutez autant de lignes de revenus et de dépenses que vous le souhaitez
- **Calcul en temps réel** : solde mis à jour à la saisie
- **Graphique interactif** : évolution revenus / dépenses / solde sur Chart.js
- **Historique complet** : visualisez, modifiez, complétez ou supprimez chaque mois enregistré
- **Mode "compléter"** : ajoutez de nouvelles lignes à un mois déjà enregistré sans écraser les données existantes
- **Détail en modal** : vue détaillée par mois avec le récapitulatif de chaque entrée
- **Design dark/neon** : interface sombre avec typographie Orbitron + DM Sans

---

## 🚀 Démarrage rapide

Aucune installation requise. Il suffit d'ouvrir le fichier dans votre navigateur :

```bash
git clone https://github.com/votre-pseudo/financeos.git
cd financeos
# Ouvrez index.html dans votre navigateur
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Ou hébergez-le gratuitement sur **GitHub Pages** en activant Pages depuis les Settings du dépôt.

---

## 🗂️ Structure du projet

```
financeos/
├── index.html     # Structure HTML
├── style.css      # Styles (dark theme, glassmorphism, animations)
├── script.js      # Logique JS (localStorage, Chart.js, UI dynamique)
└── README.md
```

---

## 🔐 Confidentialité & données

**Vos données ne quittent jamais votre machine.**

| Élément | Détail |
|---|---|
| Stockage | `localStorage` du navigateur (clé : `financeOS_data`) |
| Serveur | ❌ Aucun |
| Base de données | ❌ Aucune |
| Tracking | ❌ Aucun |
| Dépendances réseau | Chart.js (jsDelivr CDN) + Google Fonts — ressources statiques uniquement |

> ⚠️ **Limite importante** : `localStorage` est propre à chaque navigateur sur chaque appareil. Vos données ne se synchronisent pas entre appareils. Vider le cache ou les données du site supprime toutes les entrées.

---

## 🛠️ Technologies utilisées

- **HTML5 / CSS3 / JavaScript ES6+** — aucun framework
- **[Chart.js 4.4](https://www.chartjs.org/)** — graphiques interactifs
- **[Google Fonts](https://fonts.google.com/)** — Orbitron & DM Sans
- **localStorage** — persistance des données côté navigateur

---

## 🗺️ Roadmap

- [ ] Export des données en JSON / CSV
- [ ] Import depuis un fichier CSV
- [ ] Thème clair
- [ ] Catégories de dépenses avec filtres
- [ ] Objectifs d'épargne mensuels

---

<p align="center">Fait avec ❤️ et du CSS</p>

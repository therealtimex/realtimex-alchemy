# Intelligence et apprentissage actif

RealTimeX Alchemy n'est pas seulement un moteur de recherche ; c'est un système d'entraînement dynamique pour votre IA personnelle.

## Le système de notation Alchemist

Chaque fois que le Miner trouve une URL, le **Service Alchemist** analyse le contenu et lui attribue un score (0-100). Ce score détermine l'importance avec laquelle le signal apparaît dans votre onglet Découverte.

### Exemples de critères de notation :
-   **Impact élevé (80-100)** : Nouvelles critiques du marché, lancements de technologies majeures, changements de produits significatifs.
-   **Impact moyen (50-79)** : Articles de blog stimulants, tutoriels techniques de haute qualité, analyse détaillée de l'industrie.
-   **Faible impact (< 50)** : Nouvelles générales, bruit des réseaux sociaux, pages de destination sans contenu profond.

## Apprentissage actif : Entraînez votre IA

Alchemy apprend de votre comportement via le **Service Persona**.

### 1. Boost (Intérêt marqué)
Lorsque vous **"Booster"** un signal, il se passe ce qui suit :
-   L'IA enregistre votre intérêt pour les catégories et les tags du signal.
-   Un **Embedding vectoriel** est généré/priorisé pour ce signal, améliorant sa récupération dans le Chat.
-   Le contenu similaire sera mieux noté lors des prochaines synchronisations.

### 2. Dismiss (Non intéressé)
Lorsque vous **"Dismiss"** (écartez) un signal :
-   Le signal est masqué de votre flux principal.
-   L'IA apprend que ce type de contenu est du "bruit" pour vous.
-   Les scores des URL ou des sujets similaires seront pénalisés lors des prochaines synchronisations.

## Le persona utilisateur

Alchemy construit un modèle mathématique de vos intérêts. Vous pouvez considérer cela comme votre "jumeau numérique d'intelligence".
-   **Intérêts** : Sujets que vous boostez ou avec lesquels vous interagissez fréquemment.
-   **Anti-patterns** : Sujets ou domaines que vous écartez systématiquement.

Le **Moteur Transmute** utilise ce persona pour filtrer vos résumés, s'assurant que vous ne passiez du temps que sur des informations à haute densité qui comptent pour vous.

---

> [!NOTE]
> Même les signaux à "faible score" sont conservés dans votre historique (visibles dans les Logs Système). Cela vous permet de les "sauver" si vous estimez que l'Alchemist a mal calculé leur valeur.

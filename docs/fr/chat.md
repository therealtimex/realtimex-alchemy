# Chat de connaissances personnelles

RealTimeX Alchemy propose une interface de chat complète alimentée par **RAG** (Retrieval-Augmented Generation) qui vous permet de "parler" à votre historique de navigation.

## Comment ça marche

Lorsque vous posez une question dans l'onglet **Chat**, Alchemy ne se fie pas seulement aux données d'entraînement générales de l'IA. Au lieu de cela, il suit ces étapes :

1.  ### Recherche sémantique
    Votre question est convertie en un embedding vectoriel.
2.  ### Récupération des signaux
    Alchemy recherche dans votre base de données Supabase les signaux les plus pertinents (contenu source, résumés et entités) correspondant à votre question.
3.  ### Réponse contextuelle
    L'IA reçoit votre question *plus* le contexte pertinent de votre historique pour formuler une réponse précise et citée.

## Caractéristiques principales du chat

### 1. Citations de sources
L'IA mentionnera explicitement quels signaux elle a utilisés pour générer sa réponse. Vous pouvez cliquer sur ces citations pour ouvrir la source d'origine ou la carte du signal.

### 2. Gestion des sessions
Les chats sont organisés en sessions. Alchemy génère automatiquement un titre pertinent pour votre session (par exemple, "Synthèse des tendances IA" ou "Recherche de nouveaux frameworks") en fonction du sujet de la conversation.

### 3. Mémoire persistante
Vos sessions de chat sont enregistrées dans Supabase, vous pouvez donc reprendre une conversation là où vous vous étiez arrêté sur n'importe quel appareil connecté à votre base de données.

## Conseils pour de meilleurs résultats de chat

-   **Soyez spécifique** : Au lieu de demander "Qu'ai-je lu aujourd'hui ?", essayez "Qu'ai-je lu aujourd'hui sur les solutions de couche 2 d'Ethereum ?".
-   **Demandez des résumés** : "Résume les principales nouvelles que j'ai trouvées cette semaine concernant le concurrent X."
-   **Questions de synthèse** : "Compare les trois articles différents que j'ai lus sur React Server Components et dresse la liste des avantages/inconvénients mentionnés."

---

> [!TIP]
> L'interface de chat prend en charge le **GitHub Flavored Markdown (GFM)**, ce qui facilite la lecture des blocs de code, des tableaux et des listes formatées dans les réponses de l'IA.

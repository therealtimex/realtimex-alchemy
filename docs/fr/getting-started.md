# Pour commencer avec RealTimeX Alchemy

Ce guide vous accompagnera tout au long du processus de configuration de RealTimeX Alchemy pour la première fois.

## 1. Installation

RealTimeX Alchemy est conçu pour s'exécuter en tant qu'**Application Locale (Local App)** au sein de l'environnement **RealTimeX Desktop**. Cette intégration permet à Alchemy de tirer parti des puissantes capacités d'IA de l'application Desktop.

### Intégration RealTimeX (Requis)
1.  **Télécharger et Installer** : Obtenez l'application RealTimeX Desktop sur [realtimex.ai](https://realtimex.ai).
2.  **Ajouter Alchemy** :
    -   Ouvrez RealTimeX Desktop.
    -   Allez dans **Local Apps**.
    -   Cliquez sur **Add Local App** et collez la configuration du [Guide de Configuration](configuration.md#1-configuration-de-lapplication-desktop).

> [!IMPORTANT]
> Alchemy **doit** s'exécuter en tant qu'application locale pour accéder au SDK RealTimeX. L'exécution autonome via CLI est réservée au débogage avancé et n'aura pas accès aux fournisseurs d'IA à moins d'être configurée manuellement.

### Prérequis
-   **Node.js** : Version 18 ou supérieure.
-   **RealTimeX Desktop** : Doit être en cours d'exécution pour fournir les services LLM et d'Embedding.
-   **Compte Supabase** : Requis pour le modèle de confidentialité **"Possédez votre base de données"**.

## 2. Configuration Initiale

Lorsque vous lancez Alchemy via RealTimeX Desktop, il se connecte automatiquement au **SDK RealTimeX**.

### Étape 1 : Connexion à la Base de Données
Entrez votre **URL Supabase** et votre **Clé Publique Anon**. Cette connexion sécurisée permet à Alchemy de stocker et de récupérer vos signaux extraits, votre historique de chat et vos embeddings.

### Étape 2 : Exécution des Migrations
L'assistant de configuration détectera si votre base de données nécessite une initialisation. Pour configurer les tables et les fonctions en temps réel nécessaires, vous devrez fournir votre **Jeton d'Accès Supabase (Supabase Access Token)** (généré depuis votre tableau de bord Supabase).

### Fournisseurs d'IA (Automatique)
Contrairement aux applications autonomes, vous **n'avez pas besoin de configurer de clés API** (comme OpenAI ou Anthropic) au sein d'Alchemy. Alchemy hérite de ces fournisseurs directement de vos paramètres **RealTimeX Desktop** via le SDK.

## 3. Connexion des Sources de Navigateur

Alchemy explore votre historique de navigation pour trouver des "signaux".
1.  Allez dans l'onglet **Configuration**.
2.  Activez les navigateurs que vous souhaitez miner (Chrome, Edge, Safari, Brave).
3.  Définissez une date de début de synchronisation (**"Sync From"**). Alchemy traitera l'historique à partir de cette date.

## 4. Votre Première Synchronisation

Cliquez sur le bouton **"Sync History"** dans la barre latérale. Vous pouvez surveiller le **Terminal Live** pour voir les URL découvertes et notées en temps réel par les fournisseurs d'IA intégrés.

---

> [!TIP]
> Étant donné que le traitement de l'IA est géré par RealTimeX Desktop, assurez-vous d'avoir un fournisseur (comme Ollama ou OpenAI) configuré dans les **paramètres globaux de l'application Desktop** avant de commencer votre synchronisation.

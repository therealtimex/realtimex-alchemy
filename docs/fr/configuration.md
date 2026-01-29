# Configuration et sources

L'onglet **Configuration** est votre centre de commandement pour contrôler ce qu'Alchemy explore et comment son intelligence est appliquée.

## 1. Sources de navigateur

Alchemy prend en charge l'exploration multiplateforme pour les navigateurs suivants :
-   **Chrome** : Prend en charge plusieurs profils.
-   **Microsoft Edge** : Prend en charge plusieurs profils.
-   **Safari** : (macOS uniquement) Nécessite les autorisations d'accès complet au disque.
-   **Brave** : Prend en charge plusieurs profils.

### Conseils de configuration :
-   Assurez-vous que votre navigateur n'est PAS ouvert avec le fichier d'historique verrouillé exclusivement si vous rencontrez des erreurs d'extraction.
-   Sur macOS, si vous explorez Safari, assurez-vous que l'application Alchemy (ou le terminal) dispose de l'**Accès complet au disque** dans les paramètres système.

## 2. Fournisseurs d'IA (Gérés par le Desktop)

Alchemy ne gère **pas** ses propres clés de fournisseur d'IA. Au lieu de cela, il utilise le **SDK RealTimeX** pour accéder aux fournisseurs configurés dans votre application **RealTimeX Desktop**.

-   **Fournisseurs LLM** : Gérés via l'application Desktop (prend en charge OpenAI, Anthropic, Ollama, etc.).
-   **Fournisseurs d'Embedding** : Gérés via l'application Desktop.

Pour changer le modèle utilisé par Alchemy, mettez à jour vos paramètres globaux dans l'application RealTimeX Desktop.

## 3. Paramètres du moteur

### Fenêtre de synchronisation
-   **Sync From** : Détermine jusqu'où Alchemy remontera dans votre historique.
-   **Sync Frequency** : Contrôlez la fréquence à laquelle le Miner s'exécute en arrière-plan.

### Paramètres d'intelligence
-   **Blocked Tags** : Définissez manuellement les mots-clés ou les domaines qui doivent toujours être ignorés.
-   **Persona** : Votre profil d'apprentissage actif (Boost/Dismiss) qui guide la logique de notation de l'IA.

## 4. Paramètres du Compte (Connexion Supabase)

-   **Profil** : Gérez votre nom et votre avatar.
-   **Connexion Supabase** : Mettez à jour votre **URL Supabase** et votre **Clé Publique Anon** si vous déplacez votre base de données.
-   **Migrations de Base de Données** : Lors de la mise à jour de votre schéma via l'Assistant de configuration, votre **Jeton d'Accès Supabase (Access Token)** vous sera demandé.
-   **Sons et haptique** : Activez ou désactivez le retour audio pour les nouvelles découvertes ou les alertes de l'IA.

---

> [!TIP]
> Si Alchemy ne note pas les signaux, vérifiez vos paramètres globaux **RealTimeX Desktop** pour vous assurer qu'un fournisseur d'IA (comme Ollama ou OpenAI) est actif et connecté.

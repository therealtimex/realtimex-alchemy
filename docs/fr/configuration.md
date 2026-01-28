# Configuration et sources

L'onglet **Configuration** est votre centre de commandement pour contrôler ce qu'Alchemy explore et comment son intelligence est appliquée.

## 1. Configuration de l'application Desktop

RealTimeX Alchemy doit être ajouté en tant qu'**Application Locale (Local App)** au sein de **RealTimeX Desktop** pour fonctionner correctement et accéder aux services d'IA.

1.  Dans RealTimeX Desktop, allez dans **Local Apps**.
2.  Cliquez sur **Add Local App**.
3.  Collez la configuration suivante :

```json
{
  "command": "npx",
  "args": [
    "@realtimex/realtimex-alchemy@latest",
    "--port",
    "3024"
  ]
}
```

Cela récupérera automatiquement la dernière version d'Alchemy et la démarrera sur le port 3024.

## 2. Sources de navigateur

Alchemy prend en charge l'exploration multiplateforme pour les navigateurs suivants :
-   **Chrome** : Prend en charge plusieurs profils.
-   **Microsoft Edge** : Prend en charge plusieurs profils.
-   **Safari** : (macOS uniquement) Nécessite les autorisations d'accès complet au disque.
-   **Brave** : Prend en charge plusieurs profils.

### Conseils de configuration :
-   Assurez-vous que votre navigateur n'est PAS ouvert avec le fichier d'historique verrouillé exclusivement si vous rencontrez des erreurs d'extraction.
-   Sur macOS, si vous explorez Safari, assurez-vous que l'application Alchemy (ou le terminal) dispose de l'**Accès complet au disque** dans les paramètres système.

## 3. Fournisseurs d'IA (Gérés par le Desktop)

Alchemy ne gère **pas** ses propres clés de fournisseur d'IA. Au lieu de cela, il utilise le **SDK RealTimeX** pour accéder aux fournisseurs configurés dans votre application **RealTimeX Desktop**.

-   **Fournisseurs LLM** : Gérés via l'application Desktop (prend en charge OpenAI, Anthropic, Ollama, etc.).
-   **Fournisseurs d'Embedding** : Gérés via l'application Desktop.

Pour changer le modèle utilisé par Alchemy, mettez à jour vos paramètres globaux dans l'application RealTimeX Desktop.

## 4. Paramètres du moteur

### Fenêtre de synchronisation
-   **Sync From** : Détermine jusqu'où Alchemy remontera dans votre historique.
-   **Sync Frequency** : Contrôlez la fréquence à laquelle le Miner s'exécute en arrière-plan.

### Paramètres d'intelligence
-   **Blocked Tags** : Définissez manuellement les mots-clés ou les domaines qui doivent toujours être ignorés.
-   **Persona** : Votre profil d'apprentissage actif (Boost/Dismiss) qui guide la logique de notation de l'IA.

## 5. Paramètres du compte

-   **Profil** : Gérez votre nom et votre avatar.
-   **Connexion Supabase** : Mettez à jour l'URL et les clés de votre projet si vous déplacez votre base de données.
-   **Sons et haptique** : Activez ou désactivez le retour audio pour les nouvelles découvertes ou les alertes de l'IA.

---

> [!TIP]
> Si Alchemy ne note pas les signaux, vérifiez vos paramètres globaux **RealTimeX Desktop** pour vous assurer qu'un fournisseur d'IA (comme Ollama ou OpenAI) est actif et connecté.

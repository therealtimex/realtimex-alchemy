# Dépannage et support

Si vous rencontrez des problèmes avec RealTimeX Alchemy, ce guide vous aidera à diagnostiquer et à résoudre les problèmes courants.

## 1. Erreurs de connexion à la base de données

-   **"Failed to connect to Supabase"** : Vérifiez votre connexion Internet et vérifiez votre `SUPABASE_URL` et votre `SUPABASE_KEY` (Service Role ou Anon) dans l'Assistant de configuration ou le fichier `.env`.
-   **"Table 'xyz' does not exist"** : Vous avez peut-être manqué une migration. Allez dans l'Assistant de configuration et cliquez à nouveau sur **"Exécuter les migrations"**.

## 2. Problèmes d'exploration du navigateur

-   **"Extraction failed: History file is locked"** : Cela se produit si votre navigateur (Chrome/Edge/Brave) est actuellement ouvert et verrouille sa base de données d'historique. Essayez de fermer le navigateur et de relancer la synchronisation.
-   **"Permission Denied" (Safari)** : Sur macOS, l'historique de Safari est protégé. Vous devez accorder l'**Accès complet au disque** à l'application Alchemy (ou au Terminal/IDE depuis lequel vous l'exécutez) dans *Réglages Système > Confidentialité et sécurité > Accès complet au disque*.
-   **"No history found"** : Assurez-vous d'avoir défini la date de synchronisation (**"Sync From"**) sur une période où vous avez un historique de navigation.

## 3. Erreurs d'intelligence / IA (Intégration SDK)

Puisque Alchemy utilise le **SDK RealTimeX**, la plupart des erreurs d'IA sont liées aux paramètres globaux de votre **RealTimeX Desktop**.

-   **"AI Provider not found"** : Assurez-vous qu'un fournisseur d'IA (comme OpenAI ou Ollama) est configuré et actif dans les paramètres globaux de l'application **RealTimeX Desktop**.
-   **"SDK connection failed"** : Vérifiez qu'Alchemy s'exécute en tant qu'**Application Locale (Local App)** au sein de RealTimeX Desktop. Les instances autonomes ne peuvent pas accéder aux services du SDK.
-   **"Ollama unreachable"** : Si vous utilisez Ollama, assurez-vous qu'il fonctionne (`ollama serve`) et que le modèle que vous avez sélectionné dans RealTimeX Desktop est téléchargé.
-   **"Faible précision/réponses bizarres"** : Alchemy utilise le RAG. Assurez-vous d'avoir "Boosté" certains signaux pour donner à l'IA le contexte. Vérifiez également les **Logs Système** pour voir si le service Alchemist rencontre des erreurs lors de la notation.

## 4. Lecture des logs système

Pour un dépannage technique approfondi, visitez l'onglet **System Logs** :
-   **Live Terminal** : Surveillez les logs bruts du processus en temps réel.
-   **Recent Errors** : Affichez une liste agrégée des échecs lors de la synchronisation ou de l'analyse.
-   **Action Center** : Recherchez des suggestions de liste noire ou le nombre total de signaux pour voir si le moteur "étouffe" sous trop de bruit.

## 5. Obtenir de l'aide

Si votre problème n'est pas couvert ici :
-   Consultez le [Changelog](../CHANGELOG.md) pour voir si vous disposez de la dernière version.
-   Visitez le [répertoire GitHub](https://github.com/therealtimex/realtimex-alchemy) pour les discussions et le suivi des problèmes.

---

> [!CAUTION]
> Ne partagez jamais votre clé Supabase Service Role ou vos clés API dans des forums publics ou des rapports de problèmes.

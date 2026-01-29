# Configuración y Fuentes

La pestaña de **Configuración** es su centro de mando para controlar qué explora Alchemy y cómo se aplica su inteligencia.

## 1. Fuentes de Navegador

Alchemy admite la exploración multiplataforma para los siguientes navegadores:
-   **Chrome**: Soporta múltiples perfiles.
-   **Microsoft Edge**: Soporta múltiples perfiles.
-   **Safari**: (solo macOS) Requiere permisos de Acceso Total al Disco.
-   **Brave**: Soporta múltiples perfiles.

### Consejos de Configuración:
-   Asegúrese de que su navegador NO esté abierto con el archivo de historial bloqueado exclusivamente si encuentra errores de extracción.
-   En macOS, si explora Safari, asegúrese de que la aplicación Alchemy (o la terminal) tenga **Acceso Total al Disco** en los ajustes del sistema.

## 2. Proveedores de IA (Gestionados por el Desktop)

Alchemy **no** gestiona sus propias claves de proveedores de IA. En su lugar, utiliza el **SDK de RealTimeX** para acceder a los proveedores configurados en su aplicación **RealTimeX Desktop**.

-   **Proveedores de LLM**: Gestionados a través de la aplicación de escritorio (soporta OpenAI, Anthropic, Ollama, etc.).
-   **Proveedores de Embedder**: Gestionados a través de la aplicación de escritorio.

Para cambiar qué modelo utiliza Alchemy, actualice sus ajustes globales en la aplicación RealTimeX Desktop.

## 3. Ajustes del Motor

### Ventana de Sincronización
-   **Sync From**: Determina qué tan atrás en su historial buscará Alchemy.
-   **Sync Frequency**: Controla con qué frecuencia se ejecuta el Miner en segundo plano.

### Ajustes de Inteligencia
-   **Blocked Tags**: Defina manualmente palabras clave o dominios que siempre deben ignorarse.
-   **Persona**: Su perfil de aprendizaje activo (Boost/Dismiss) que guía la lógica de puntuación de la IA.

## 4. Configuración de la Cuenta (Conexión de Supabase)

-   **Perfil**: Gestione su nombre y avatar.
-   **Conexión de Supabase**: Actualice su **URL de Supabase** y su **Anon Public Key** si mueve su base de datos.
-   **Migraciones de Base de Datos**: Al actualizar su esquema a través del Asistente de configuración, se le solicitará su **Supabase Access Token**.
-   **Sonido y Háptica**: Active o desactive la retroalimentación de audio para nuevos descubrimientos o alertas de IA.

---

> [!TIP]
> Si Alchemy no está puntuando señales, compruebe sus ajustes globales de **RealTimeX Desktop** para asegurarse de que un proveedor de IA (como Ollama o OpenAI) esté activo y conectado.

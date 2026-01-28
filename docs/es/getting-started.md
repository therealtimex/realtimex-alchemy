# Primeros Pasos con RealTimeX Alchemy

Esta guía le ayudará a configurar RealTimeX Alchemy por primera vez.

## 1. Instalación

RealTimeX Alchemy está diseñado para ejecutarse como una **Aplicación Local (Local App)** dentro del entorno de **RealTimeX Desktop**. Esta integración permite a Alchemy aprovechar las potentes capacidades de IA de la aplicación de escritorio.

### Integración con RealTimeX (Requerido)
1.  **Descargar e Instalar**: Obtenga la aplicación RealTimeX Desktop en [realtimex.ai](https://realtimex.ai).
2.  **Añadir Alchemy**:
    -   Abra RealTimeX Desktop.
    -   Vaya a **Local Apps**.
    -   Haga clic en **Add Local App** y pegue la configuración de la [Guía de Configuración](configuration.md#1-configuracion-de-la-aplicacion-desktop).

> [!IMPORTANT]
> Alchemy **debe** ejecutarse como una aplicación local para acceder al SDK de RealTimeX. La ejecución independiente a través de CLI es solo para depuración avanzada y no tendrá acceso a los proveedores de IA a menos que se configure manualmente.

### Prerrequisitos
-   **Node.js**: Versión 18 o superior.
-   **RealTimeX Desktop**: Debe estar ejecutándose para proporcionar los servicios de LLM y Embedding.
-   **Cuenta de Supabase**: Necesaria para el modelo de privacidad **"Sea dueño de su base de datos"**.

## 2. Configuración Inicial

Cuando inicia Alchemy a través de RealTimeX Desktop, se conecta automáticamente al **SDK de RealTimeX**.

### Paso 1: Conexión a la Base de Datos
Introduzca su URL de Supabase y la Service Role Key. Esta conexión segura almacena sus señales extraídas, historial de chat y embeddings.

### Paso 2: Ejecutar Migraciones
El asistente de configuración detectará si su base de datos necesita inicialización. Haga clic en **"Run Migrations"** para configurar las tablas y funciones en tiempo real necesarias.

### Proveedores de IA (Automático)
A diferencia de las aplicaciones independientes, **no necesita configurar claves API** (como OpenAI o Anthropic) dentro de Alchemy. Alchemy hereda estos proveedores directamente de la configuración de su **RealTimeX Desktop** a través del SDK.

## 3. Conexión de Fuentes de Navegador

Alchemy explora su historial de navegación para encontrar "señales".
1.  Vaya a la pestaña de **Configuration**.
2.  Active los navegadores que desea explorar (Chrome, Edge, Safari, Brave).
3.  Establezca una fecha de inicio de sincronización (**"Sync From"**). Alchemy procesará el historial a partir de esa fecha.

## 4. Su Primera Sincronización

Haga clic en el botón **"Sync History"** en la barra lateral. Puede observar la **Terminal en Vivo** para ver las URL que se descubren y puntúan en tiempo real mediante los proveedores de IA integrados.

---

> [!TIP]
> Dado que el procesamiento de IA es manejado por RealTimeX Desktop, asegúrese de tener un proveedor (como Ollama o OpenAI) configurado en los **ajustes globales de la aplicación de escritorio** antes de comenzar su sincronización.

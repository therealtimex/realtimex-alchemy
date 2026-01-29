# Primeros Pasos con RealTimeX Alchemy

Esta guía le ayudará a configurar RealTimeX Alchemy por primera vez.

## 1. Instalación e Integración con Desktop

RealTimeX Alchemy está diseñado para ejecutarse como una **Aplicación Local (Local App)** dentro del entorno de **RealTimeX Desktop**. Esta integración permite a Alchemy aprovechar las potentes capacidades de IA y el entorno de Node.js de la aplicación de escritorio.

### Paso 1: Instalar RealTimeX Desktop
1.  **Descargar e Instalar**: Obtenga la aplicación RealTimeX Desktop en [realtimex.ai](https://realtimex.ai).
2.  **Abra RealTimeX Desktop**.

### Paso 2: Añadir Alchemy como una Aplicación Local
1.  En RealTimeX Desktop, vaya a **Local Apps**.
2.  Haga clic en **Add Local App**.
3.  Pegue la siguiente configuración:

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

Esto descargará automáticamente la última versión de Alchemy y la iniciará en el puerto 3024. (Puede cambiar `"3024"` por cualquier puerto disponible si es necesario).

> [!IMPORTANT]
> Alchemy **debe** ejecutarse como una aplicación local para acceder al SDK de RealTimeX. La ejecución independiente a través de CLI es solo para depuración avanzada y no tendrá acceso a los proveedores de IA a menos que se configure manualmente.

### Prerrequisitos
-   **RealTimeX Desktop**: Debe estar ejecutándose para proporcionar los servicios de LLM y Embedding, así como el entorno de servidor Node.js subyacente.
-   **Cuenta de Supabase**: Necesaria para el modelo de privacidad **"Sea dueño de su base de datos"**.

## 2. Configuración Inicial

Cuando inicia Alchemy a través de RealTimeX Desktop, se conecta automáticamente al **SDK de RealTimeX**.

### Paso 1: Conexión a la Base de Données
Introduzca su **URL de Supabase** y su **Anon Public Key**. Esta conexión segura permite a Alchemy almacenar y recuperar sus señales extraídas, historial de chat y embeddings.

### Paso 2: Ejecutar Migraciones
El asistente de configuración detectará si su base de datos necesita inicialización. Para configurar las tablas y funciones en tiempo real necesarias, deberá proporcionar su **Supabase Access Token** (generado desde su panel de control de Supabase).

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

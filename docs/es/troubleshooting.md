# Solución de Problemas y Soporte

Si encuentra problemas con RealTimeX Alchemy, esta guía le ayudará a diagnosticar y resolver problemas comunes.

## 1. Errores de Conexión a la Base de Datos

-   **"Failed to connect to Supabase"**: Compruebe su conexión a Internet y verifique su **URL de Supabase** y su **Anon Public Key** en el Asistente de Configuración o el archivo `.env`. NO use la Service Role Key para conexiones estándar.
-   **"Table 'xyz' does not exist"**: Es posible que se haya saltado una migración. Vaya al Asistente de Configuración y haga clic en **"Run Migrations"** de nuevo. Necesitará su **Supabase Access Token** para este paso.

## 2. Problemas de Minería de Navegador

-   **"Extraction failed: History file is locked"**: Esto sucede si su navegador (Chrome/Edge/Brave) está abierto actualmente y tiene un bloqueo estricto en su base de datos de historial. Intente cerrar el navegador y ejecutar la sincronización de nuevo.
-   **"Permission Denied" (Safari)**: En macOS, el historial de Safari está protegido. Debe conceder **Acceso Total al Disco** a la aplicación Alchemy (o a la Terminal/IDE desde la que la está ejecutando) en *Ajustes del Sistema > Privacidad y Seguridad > Acceso Total al Disco*.
-   **"No history found"**: Asegúrese de haber establecido la fecha de inicio de sincronización (**"Sync From"**) en un periodo en el que tenga historial de navegación.

## 3. Errores de Inteligencia / IA (Integración SDK)

Dado que Alchemy utiliza el **SDK de RealTimeX**, la mayoría de los errores de IA están relacionados con los ajustes globales de su **RealTimeX Desktop**.

-   **"AI Provider not found"**: Asegúrese de que un proveedor de IA (como OpenAI u Ollama) esté configurado y activo en los ajustes globales de la aplicación **RealTimeX Desktop**.
-   **"SDK connection failed"**: Verifique que Alchemy se esté ejecutando como una **Aplicación Local (Local App)** dentro de RealTimeX Desktop. Las instancias independientes no pueden acceder a los servicios del SDK.
-   **"Ollama unreachable"**: Si usa Ollama, asegúrese de que se esté ejecutando (`ollama serve`) y de que el modelo que seleccionó en RealTimeX Desktop esté descargado.
-   **"Baja precisión / respuestas extrañas"**: Alchemy utiliza RAG. Asegúrese de haber hecho un "Boost" en algunas señales para darle a la IA contexto. Además, compruebe los **Logs del Sistema** para ver si el servicio Alchemist está encontrando errores durante la puntuación.

## 4. Lectura de Registros del Sistema

Para una resolución de problemas técnica profunda, visite la pestaña **System Logs**:
-   **Live Terminal**: Observe los registros de proceso en bruto mientras ocurren.
-   **Recent Errors**: Vea una lista agregada de fallos durante la sincronización o el análisis.
-   **Action Center**: Compruebe las sugerencias de lista negra o los recuentos totales de señales para ver si el motor se está "ahogando" con demasiado ruido.

## 5. Obtener Ayuda

Si su problema no está cubierto aquí:
-   Consulte el [Changelog](../CHANGELOG.md) para ver si está en la última versión.
-   Visite el [repositorio de GitHub](https://github.com/therealtimex/realtimex-alchemy) para discusiones y seguimiento de problemas.

---

> [!CAUTION]
> Nunca comparta su Supabase Access Token o claves API en foros públicos o informes de problemas.

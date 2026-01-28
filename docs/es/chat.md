# Chat de Conocimiento Personal

RealTimeX Alchemy cuenta con una interfaz de chat completa potenciada por **RAG** (Generación Aumentada por Recuperación) que le permite "hablar" con su historial de navegación.

## Cómo funciona

Cuando hace una pregunta en la pestaña **Chat**, Alchemy no solo se basa en los datos de entrenamiento generales de la IA. En su lugar, sigue estos pasos:

1.  ### Búsqueda Semántica
    Su pregunta se convierte en un embedding vectorial.
2.  ### Recuperación de Señales
    Alchemy busca en su base de datos de Supabase las señales más relevantes (contenido fuente, resúmenes y entidades) que coincidan con su pregunta.
3.  ### Respuesta Contextual
    La IA recibe su pregunta *más* el contexto relevante de su historial para formular una respuesta precisa y citada.

## Características Clave del Chat

### 1. Citas de Fuentes
La IA mencionará explícitamente qué señales utilizó para generar su respuesta. Puede hacer clic en estas citas para abrir la fuente original o la tarjeta de señal.

### 2. Gestión de Sesiones
Los chats se organizan en sesiones. Alchemy genera automáticamente un título relevante para su sesión (p. ej., "Sintetizando Tendencias de IA" o "Investigando Nuevos Frameworks") basado en el tema de la conversación.

### 3. Memoria Persistente
Sus sesiones de chat se guardan en Supabase, por lo que puede retomar una conversación donde la dejó en cualquier dispositivo conectado a su base de datos.

## Consejos para Mejores Resultados de Chat

-   **Sea Específico**: En lugar de preguntar "¿Qué leí hoy?", intente "¿Qué leí hoy sobre soluciones de Capa 2 de Ethereum?".
-   **Solicite Resúmenes**: "Resume las principales noticias que encontré esta semana sobre el competidor X."
-   **Preguntas de Síntesis**: "Compara los tres artículos diferentes que leí sobre React Server Components y enumera los pros y contras mencionados."

---

> [!TIP]
> La interfaz de chat es compatible con **GitHub Flavored Markdown (GFM)**, lo que facilita la lectura de bloques de código, tablas y listas formateadas en las respuestas de la IA.

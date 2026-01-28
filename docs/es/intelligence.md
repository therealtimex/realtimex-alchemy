# Inteligencia y Aprendizaje Activo

RealTimeX Alchemy no es solo un motor de búsqueda; es un sistema de entrenamiento dinámico para su IA personal.

## El Sistema de Puntuación Alchemist

Cada vez que el Miner encuentra una URL, el **Servicio Alchemist** analiza el contenido y le asigna una puntuación (0-100). Esta puntuación determina qué tan prominentemente aparece la señal en su pestaña de Descubrimiento.

### Ejemplos de Criterios de Puntuación:
-   **Alto Impacto (80-100)**: Noticias críticas del mercado, lanzamientos tecnológicos importantes, cambios significativos en productos.
-   **Impacto Medio (50-79)**: Entradas de blog que invitan a la reflexión, tutoriales técnicos de alta calidad, análisis detallado de la industria.
-   **Bajo Impacto (< 50)**: Noticias generales, ruido de redes sociales, páginas de aterrizaje sin contenido profundo.

## Aprendizaje Activo: Entrenando a su IA

Alchemy aprende de su comportamiento a través del **Servicio Persona**.

### 1. Boost (Interés Fuerte)
Al hacer un **"Boost"** en una señal, ocurre lo siguiente:
-   La IA registra su interés en las categorías y etiquetas de la señal.
-   Se genera/prioriza un **Embedding Vectorial** para esa señal, mejorando su recuperación en el Chat.
-   El contenido similar recibirá una puntuación más alta en futuras sincronizaciones.

### 2. Dismiss (No interesado)
Al hacer un **"Dismiss"** (descartar) en una señal:
-   La señal se oculta de su flujo principal.
-   La IA aprende que este tipo de contenido es "ruido" para usted.
-   Las puntuaciones de URL o temas similares serán penalizadas en futuras sincronizaciones.

## El Persona de Usuario

Alchemy construye un modelo matemático de sus intereses. Puede pensar en esto como su "Gemelo Digital de Inteligencia".
-   **Intereses**: Temas que potencia o con los que interactúa con frecuencia.
-   **Anti-patrones**: Temas o dominios que descarta sistemáticamente.

El **Motor Transmute** utiliza este persona para filtrar sus resúmenes, asegurando que solo dedique tiempo a conocimientos de alta densidad que le interesen.

---

> [!NOTE]
> Incluso las señales con "Puntuación Baja" se mantienen en su historial (visibles en Logs del Sistema). Esto le permite "Rescatarlas" si cree que el Alchemist calculó mal su valor.

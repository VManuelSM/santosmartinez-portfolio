---
title: "Pipeline de PLN en paralelo: keywords, sentimiento y entidades sobre 50k productos"
author: Víctor Santos
description: "Cómo diseñé un sistema de extracción de características de texto que ejecuta TF-IDF, TextBlob y spaCy en procesos paralelos sobre un dataset de comercio electrónico de 50 425 instancias, aplicando los patrones Strategy y Template Method."
image:
  url: "/images/posts/cad-ecommerce/top-keywords.png"
  alt: "Gráfica de barras con los 15 keywords TF-IDF más frecuentes extraídos del corpus de e-commerce."
pubDate: 2026-06-11
tags:
  [
    "python", "nlp", "high-performance-computing", "parallel-computing", "data-science"
  ]
languages: ["python", "jupyter", "pandas", "sklearn", "spacy"]
---

Cuando el procesamiento de texto se vuelve costoso, la respuesta natural es el paralelismo. Esta actividad de Cómputo de Alto Desempeño propone exactamente eso: dado un dataset de ~50k descripciones de productos de comercio electrónico, extraer tres tipos de características de forma concurrente, una por núcleo de CPU.

## El dataset

El archivo `ecommerceDataset.csv` no tiene encabezado y contiene dos columnas: `category` y `description`. Cubre cuatro categorías que, según la literatura del dominio, representan cerca del 80% del inventario de cualquier sitio de e-commerce.

![Distribución de categorías en el dataset](/images/posts/cad-ecommerce/distribucion-categorias.png)

La distribución es razonablemente balanceada. Los 50 425 registros se cargan directamente con pandas, nombrando las columnas explícitamente al no haber encabezado. Hay un único registro con `description` nulo, que se reemplaza por cadena vacía para que todos los extractores reciban siempre un `str`.

## Longitud de las descripciones

Antes de procesar, conviene saber a qué escala de texto se enfrenta el pipeline:

![Distribución de la longitud de las descripciones](/images/posts/cad-ecommerce/longitud-descripciones.png)

La longitud media es de ~714 caracteres, pero la distribución tiene cola larga: algunos registros superan los 50 000 caracteres. Esta observación motivó una decisión de diseño importante para la etapa de NER.

## Diseño del pipeline: Strategy + Template Method

La lógica de extracción vive en `feature_extractors.py`, separado del notebook por dos razones:

1. **Separación de responsabilidades:** el notebook orquesta, el módulo extrae.
2. **Compatibilidad con `multiprocessing`:** las clases definidas dentro de un notebook (módulo `__main__`) no siempre son *picklables*. Al definirlas en un módulo `.py` importable, `ProcessPoolExecutor` puede enviarlas a procesos hijos sin problema.

El diseño sigue dos patrones clásicos:

- **Strategy:** `KeywordExtractor`, `SentimentExtractor` y `EntityExtractor` implementan la misma interfaz `FeatureExtractor.extract(texts) -> list`. El orquestador no necesita conocer los detalles de cada técnica.
- **Template Method:** `FeatureExtractor.run(texts)` cronometra cualquier estrategia y devuelve un `ExtractionResult(name, values, elapsed_seconds)`, evitando duplicar el código de medición de tiempo en cada clase.

| Estrategia | Núcleo | Técnica | Salida por instancia |
|---|---|---|---|
| `KeywordExtractor` | 1 | `TfidfVectorizer` (sklearn) | Top-5 keywords (string) |
| `SentimentExtractor` | 2 | TextBlob | Polaridad `[-1, +1]` |
| `EntityExtractor` | 3 | spaCy `en_core_web_sm` | Lista de entidades (JSON) |

## Ejecución en paralelo

Con los extractores definidos como objetos *picklables*, el dispatch a tres procesos es directo:

```python
with ProcessPoolExecutor(max_workers=3) as executor:
    futures = {executor.submit(run_extractor, ext, texts): ext.name for ext in extractors}
    for future in as_completed(futures):
        result = future.result()
        results[result.name] = result
        print(f"{result.name:<20} -> {result.elapsed_seconds:7.2f} s")
```

Los tiempos medidos sobre los 50 425 productos:

| Tarea | Tiempo |
|---|---|
| Keywords (TF-IDF) | 37.65 s |
| Sentimiento (TextBlob) | 99.62 s |
| Entidades (spaCy) | 846.66 s |
| **Total de pared (3 núcleos)** | **847.92 s** |

El punto clave del Cómputo de Alto Desempeño aparece aquí: el tiempo total de pared queda dominado por la tarea más lenta (NER con spaCy) en lugar de ser la suma de las tres ~984 s. La ganancia del paralelismo es justamente eso: evitar que tareas independientes esperen unas a otras.

## Decisión de ingeniería: truncado para NER

Las entidades relevantes de una descripción de producto (marca, modelo, dimensiones) se concentran en la primera oración; el resto suele ser texto publicitario repetitivo. `EntityExtractor` trunca cada texto a `max_chars=300` antes de aplicar spaCy. En pruebas preliminares esto redujo ~2.5x el tiempo sin perder las entidades más representativas.

## Exploración de resultados

### Sentimiento por categoría

![Polaridad de sentimiento por categoría](/images/posts/cad-ecommerce/sentimiento-por-categoria.png)

Todas las categorías tienen polaridad media positiva (rango aproximado 0.15–0.35), lo esperable en texto de marketing. Books muestra la distribución más amplia: las reseñas de libros incluidas en el dataset contienen lenguaje más variado que las fichas técnicas de Electronics o Household.

### Keywords más frecuentes

![Top-15 keywords TF-IDF más frecuentes](/images/posts/cad-ecommerce/top-keywords.png)

Los términos dominantes reflejan el vocabulario del catálogo: materiales (`wood`, `cotton`), atributos de producto (`size`, `pack`) y términos de categoría (`print`, `painting`). La alta frecuencia de estos términos confirma que TF-IDF captura el vocabulario discriminativo del dominio.

## Dataset de salida

El pipeline genera `processedEcommerceDataset.csv` conservando las columnas originales y añadiendo tres nuevas: `keywords`, `sentiment_polarity` y `entities`. El archivo original nunca se modifica, respetando el principio de inmutabilidad de los datos de entrada.

```
category | description | keywords | sentiment_polarity | entities
```

Ejemplo de fila procesada:

```
Household | SAF 'Floral' Framed Painting... | special, textured, painting, uv, print | 0.614 | ["SAF", "30 inch", "10 inch"]
```

## Conclusiones

- **TF-IDF es la etapa más rápida** porque opera sobre la matriz dispersa completa de forma vectorizada; spaCy, al procesar documento a documento con un modelo neuronal, es la más costosa por un margen de 8–22× respecto a las otras dos.
- **El paralelismo importa:** sin él, el tiempo total sería ~984 s; con tres núcleos, baja a 848 s. La ganancia crece cuanto más heterogéneo es el costo de las tareas.
- **El diseño modular pagó su deuda:** la separación en `feature_extractors.py` fue el requisito técnico para que `ProcessPoolExecutor` pudiera serializar los objetos y enviarlos a procesos hijos.

El código y los datos están disponibles en [GitHub](https://github.com/santosmartinezvm/MIA_C3_CAD_Corte_02_Bitacora_01).

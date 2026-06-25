---
title: "¿Las características de PLN mejoran la clasificación? Un experimento controlado en paralelo"
author: Víctor Santos
description: "Diseñé un experimento controlado para responder una pregunta concreta: ¿keywords, sentimiento y entidades extraídas mejoran la clasificación de productos frente a usar solo la descripción? Tres clasificadores (Random Forest, Regresión Logística y SVC) entrenados en procesos paralelos sobre 50 425 instancias de e-commerce."
image:
  url: "/images/posts/cad-ecommerce-corte2/comparacion-accuracy.png"
  alt: "Gráfica de barras comparando el accuracy de Random Forest, Regresión Logística y SVC entre el dataset original y el enriquecido."
pubDate: 2026-06-24
tags:
  [
    "python", "nlp", "high-performance-computing", "parallel-computing", "data-science", "machine-learning"
  ]
languages: ["python", "jupyter", "pandas", "sklearn"]
---

En el [Corte 1](/blog/posts/cad-pipeline-nlp-paralelo-ecommerce) construí un pipeline de PLN que extraía, en paralelo, tres tipos de características de un dataset de comercio electrónico: *keywords* con TF-IDF, *sentimiento* con TextBlob y *entidades nombradas* con spaCy. El resultado fue `processedEcommerceDataset.csv`, un superconjunto del original.

Pero quedaba una pregunta sin responder: **¿valió la pena ese preprocesamiento?** Esta entrega (Corte 2) agrega la fase de clasificación —también paralela— y persigue un objetivo de investigación concreto:

> **Pregunta guía:** ¿las características extraídas (keywords, sentimiento, entidades) **mejoran, empeoran o dejan igual** el desempeño de la clasificación frente a usar únicamente la descripción del producto?

Para responderla diseñé **dos experimentos** evaluados con los mismos tres clasificadores (`RandomForestClassifier`, `LogisticRegression` y `SVC`) y la misma partición de datos, de modo que la única variable que cambia es el conjunto de características.

## El conjunto de datos

Se parte de `processedEcommerceDataset.csv`, que conserva `category` y `description` y añade `keywords`, `sentiment_polarity` y `entities`. Usar un único archivo para ambos experimentos garantiza una partición train/test idéntica.

| Propiedad | Valor |
|---|---|
| Instancias | 50 425 |
| Clases | 4 |
| Columna objetivo | `category` |
| Características disponibles | `description`, `keywords`, `sentiment_polarity`, `entities` |
| Tarea | Clasificación multiclase |

![Distribución de instancias por categoría](/images/posts/cad-ecommerce-corte2/distribucion-clases.png)

El dataset presenta un desbalance moderado (`Household` es la clase mayoritaria), por lo que la partición se realiza de forma **estratificada**.

## Diseño experimental controlado

La clave metodológica está aquí: se realiza **una sola** división estratificada **80 % entrenamiento / 20 % prueba**, reutilizada en ambos experimentos. Al mantener fija la partición, la diferencia de desempeño entre experimentos es atribuible **exclusivamente** al conjunto de características, y no a la variabilidad del muestreo.

Para evitar **fuga de información** (*data leakage*), el `TfidfVectorizer` se ajusta (`fit`) **solo con el conjunto de entrenamiento** y se aplica (`transform`) sobre el de prueba; así, el vocabulario y los pesos IDF nunca "ven" los datos de evaluación.

| Experimento | Características usadas | Representación |
|---|---|---|
| **1 — Base** | Solo `description` | TF-IDF (máx. 20 000 términos) |
| **2 — Enriquecido** | `description` + `keywords` + `entities` + `sentiment_polarity` | TF-IDF del texto combinado + columna numérica de sentimiento |

En el experimento enriquecido se concatenan en un solo texto `description`, `keywords` y `entities` (estas últimas, originalmente una lista en formato JSON, se aplanan a texto plano) y se vectoriza con TF-IDF. A esa matriz dispersa se le añade, mediante `scipy.sparse.hstack`, la columna numérica `sentiment_polarity` como una característica adicional.

## Arquitectura: serial por fuera, paralelo por dentro

La implementación reproduce el mismo esquema del Corte 1. Las dos fases son secuenciales entre sí (la clasificación necesita el CSV que produce el preprocesamiento), pero cada fase explota paralelismo interno a nivel de tarea/algoritmo:

```
  ecommerceDataset.csv
          │
  ┌───────┴───────┐  Fase 1 · Corte 1 (paralela)
  │  Núcleo 1 → keywords (TF-IDF)
  │  Núcleo 2 → sentimiento (TextBlob)
  │  Núcleo 3 → entidades (spaCy NER)
  └───────┬───────┘
          ▼
  processedEcommerceDataset.csv
          │
  ┌───────┴───────┐  Fase 2 · Corte 2 (paralela)
  │  Núcleo 1 → Random Forest
  │  Núcleo 2 → Regresión Logística
  │  Núcleo 3 → SVC
  └───────┬───────┘
          ▼
   Accuracy + tiempo de cada algoritmo
```

Igual que antes, el código aplica dos patrones de diseño para unificar los tres clasificadores bajo una sola interfaz (`classification_models.py`):

- **Strategy:** cada algoritmo (`RandomForestStrategy`, `LogisticRegressionStrategy`, `SVCStrategy`) implementa `build()`.
- **Template Method:** `ClassifierStrategy.run()` cronometra el ciclo `fit`/`predict` y calcula el accuracy de forma homogénea, devolviendo un `ClassificationResult`.

La paralelización se realiza con `concurrent.futures.ProcessPoolExecutor` (`max_workers=3`): cada clasificador se entrena en su propio proceso/núcleo. Para que la medición sea limpia, cada estimador es **mono-hilo** (`n_jobs=1`), de modo que la única fuente de concurrencia es el *pool* de procesos.

De cada clasificador, en cada experimento, se registran dos magnitudes independientes: el **accuracy** sobre el conjunto de prueba (desempeño) y el **tiempo de entrenamiento** en segundos (costo computacional). Adicionalmente se mide el **tiempo de pared** de cada experimento para evidenciar la ganancia del paralelismo.

## Resultados

| Algoritmo | Núcleo | Acc Exp 1 | Tiempo Exp 1 (s) | Acc Exp 2 | Tiempo Exp 2 (s) | ΔAcc (pp) |
|---|---|---|---|---|---|---|
| Random Forest | 1 | 0.9731 | 88.89 | 0.9719 | 98.10 | −0.12 |
| Regresión Logística | 2 | 0.9674 | 7.10 | 0.9672 | 10.07 | −0.02 |
| SVC | 3 | **0.9775** | 183.73 | 0.9764 | 196.93 | −0.11 |

*Accuracy y tiempo de entrenamiento por algoritmo y experimento sobre las 50 425 instancias (partición estratificada 80/20: 40 340 entrenamiento / 10 085 prueba). ΔAcc = Acc Exp 2 − Acc Exp 1, en puntos porcentuales.*

![Comparación de accuracy entre el dataset original y el enriquecido](/images/posts/cad-ecommerce-corte2/comparacion-accuracy.png)

![Comparación del tiempo de entrenamiento entre ambos experimentos](/images/posts/cad-ecommerce-corte2/comparacion-tiempos.png)

En cuanto al **tiempo de pared medido**: Exp 1 = **223.4 s** · Exp 2 = **235.6 s**, frente a una ejecución secuencial que sumaría los tres algoritmos (≈ 319.8 s / ≈ 344.1 s) → *speedup* ≈ **1.43× – 1.46×**. El tiempo de pared queda acotado por el SVC, el algoritmo más lento.

## Discusión

**Las características extraídas no aportaron señal útil; fueron, en el mejor caso, neutras.** La columna *ΔAcc* es negativa pero diminuta en los tres algoritmos (−0.02 a −0.12 pp), magnitudes dentro del ruido del muestreo. La explicación es coherente con el diseño del pipeline: esas tres características se **derivan** de la propia descripción (las keywords son sus términos TF-IDF más representativos; las entidades, su reconocimiento NER; el sentimiento, su polaridad), por lo que **no agregan información nueva**, solo redundancia. Al concatenarlas al texto, duplican tokens ya presentes y alteran levemente los pesos IDF, diluyendo la representación en vez de reforzarla.

**Desempeño relativo de los algoritmos.** El SVC obtuvo el mejor accuracy (0.9775), seguido de Random Forest (0.9731) y Regresión Logística (0.9674); el orden se conserva en ambos experimentos. Las diferencias son pequeñas (≈ 1 pp entre el mejor y el peor), lo que sugiere que el problema es, en gran medida, **linealmente separable** con una representación TF-IDF: incluso un clasificador lineal barato alcanza ~96.7 %.

**Costo vs. beneficio (la lección de Alto Desempeño).** El contraste de *tiempos* es mucho más marcado que el de *accuracy*. La Regresión Logística entrena en **~7.1 s**, frente a **~89 s** de Random Forest y **~184 s** del SVC. Dicho de otro modo, el SVC es **~26× más lento** que la Regresión Logística para ganar apenas **~1 pp** de accuracy. En un sistema real de e-commerce a escala, esa inversión rara vez se justifica.

**Ganancia del paralelismo.** La fase paralela queda **acotada por el algoritmo más lento**. Cuando las tareas paralelas tienen duraciones muy desiguales (7 s vs 89 s vs 184 s), el tiempo total lo domina la más larga (un efecto de tipo Amdahl), por lo que el beneficio del paralelismo es menor que el número de núcleos empleados.

## Conclusiones

- **Respuesta a la pregunta guía:** para esta tarea, las características extraídas en el Corte 1 **no mejoran la clasificación**; el efecto fue neutro-ligeramente negativo (−0.02 a −0.12 pp) en los tres algoritmos. La descripción cruda, vectorizada con TF-IDF, ya contiene la señal discriminante. Desde la óptica de Alto Desempeño, esto implica que el costoso preprocesamiento del Corte 1 —en particular la extracción de entidades, la etapa más lenta— **no se tradujo en beneficio** para este problema concreto.
- **El SVC domina el costo de cómputo:** fue el algoritmo más lento por amplio margen (~21× la Regresión Logística) a cambio de una mejora marginal de accuracy (~1 pp). Confirma empíricamente por qué, en escenarios de HPC, es el candidato natural a paralelización/optimización o a ser reemplazado por alternativas lineales cuando el volumen de datos crece.
- **El paralelismo a nivel de algoritmo funcionó, pero su ganancia está acotada por la tarea más lenta:** *speedup* estimado ≈ 1.4×–1.55× (no 3×), por la fuerte disparidad de duraciones entre los tres clasificadores.
- **Recomendación práctica:** para un clasificador de catálogo de e-commerce como este, la **Regresión Logística sobre TF-IDF de la descripción** ofrece la mejor relación desempeño/costo (~96.7 % en ~8 s), sin necesidad del preprocesamiento adicional.
- **Trabajo futuro:** experimentación ampliada activando **una característica a la vez** (solo keywords, solo sentimiento, solo entidades) para aislar la contribución marginal de cada una, y evaluar `LinearSVC` o `nlp.pipe(n_process=N)` para acelerar las etapas más costosas.

El código y los datos están disponibles en [GitHub](https://github.com/VManuelSM/MIA_C3_CAD_Corte_02_Bitacora_02).

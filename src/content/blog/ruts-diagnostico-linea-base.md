---
title: "Diagnóstico y línea base de clasificación para el RUTS Hidalgo"
author: Víctor Santos
description: "Cómo construí el primer clasificador automático de trámites para el Registro Único de Trámites y Servicios del estado de Hidalgo: del diagnóstico inicial en MongoDB hasta comparar TF-IDF contra embeddings semánticos multilingüe."
image:
  url: "/images/posts/ruts/comparativa-f1.png"
  alt: "Gráfica comparativa de F1-score por categoría entre TF-IDF y embeddings semánticos sobre el corpus RUTS Hidalgo."
pubDate: 2026-06-09
tags:
  [
    "python", "machine-learning", "nlp", "data-science", "gobierno-digital"
  ]
languages: ["python", "jupyter", "pandas", "numpy", "sklearn", "mongodb"]
---

El Registro Único de Trámites y Servicios (RUTS) del estado de Hidalgo concentra más de 9 200 trámites gubernamentales. La pregunta que motivó este proyecto fue sencilla: ¿puede un modelo de lenguaje leer la ficha de un trámite y asignarle automáticamente su categoría temática? Este post documenta el proceso para responderla.

## El universo: 9 220 trámites, cuatro estatus

Lo primero fue entender con qué se trabaja. Una agregación sobre la colección completa de MongoDB reveló la distribución real:

| Estatus | Cantidad | % |
|---|---|---|
| Caducado | 3,889 | 42.18% |
| Histórico | 2,804 | 30.41% |
| Publicado | 2,211 | 23.98% |
| Nuevo | 316 | 3.43% |

![Distribución de trámites por estatus](/images/posts/ruts/pie-estatus.png)

Solo los trámites con `estatus = Publicado` son relevantes para clasificación: son los vigentes, los que un ciudadano puede iniciar hoy. El resto queda fuera del corpus.

## Diagnóstico de calidad: mapa de campos vacíos

Antes de entrenar cualquier modelo, hay que saber con qué texto se cuenta. El análisis de cobertura mostró los porcentajes de valores vacíos por campo y estatus:

| Campo | Publicado (vacío %) | Caducado (vacío %) |
|---|---|---|
| nombre | 0.0 | 0.0 |
| descripcion | 0.0 | 0.0 |
| requisitos | **36.6** | 17.1 |
| observaciones | 33.1 | 33.6 |

El campo `requisitos` tiene un 36.6% de vacíos entre los trámites Publicados, lo que no es menor: es una de las señales textuales más ricas para distinguir categorías. El texto de entrada de los clasificadores se construye concatenando `nombre + descripcion + requisitos + observaciones`, aplicando la estrategia de "mejor esfuerzo" con lo disponible.

## El corpus de clasificación: 13 categorías, desbalance severo

De los 2 211 trámites Publicados, 19 no tienen categoría válida y quedan fuera. Los 2 192 restantes se distribuyen en 13 categorías:

![Distribución de categorías en el corpus Publicados](/images/posts/ruts/distribucion-categorias.png)

El problema es evidente: Población tiene 549 muestras y Turismo apenas 30. Un ratio max/min de 18× es desbalance severo en clasificación multiclase. Esto motivó definir dos caminos de experimentación.

## Longitud textual y duplicados

Antes de vectorizar, conviene conocer la longitud de los textos:

![Distribución de longitud de campos textuales](/images/posts/ruts/longitud-textos.png)

La mediana de `descripcion` es manejable, pero `requisitos` tiene una cola larga: algunos trámites llevan listas muy detalladas. También se detectaron 258 trámites (11.67%) con nombre duplicado, señal de trámites replicados entre dependencias.

## Dos caminos, un ganador

**Camino A — todas las categorías con ≥2 muestras (13 clases):** el modelo sufre con las categorías chicas. Turismo y Agropecuario obtienen F1 = 0.00; el modelo los ignora por ser una minoría ínfima.

**Camino B — solo categorías con ≥80 muestras (7 clases):** al reducir el espacio a las categorías con masa crítica, el clasificador puede aprender patrones robustos.

```
              precision    recall  f1-score   support

   Educación       0.93      0.91      0.92        75
 Empresarial       1.00      0.06      0.11        18
    Finanzas       1.00      0.32      0.48        19
       Obras       0.91      0.82      0.86        38
   Población       0.61      0.78      0.68       110
       Salud       1.00      0.55      0.71        31
      Social       0.56      0.67      0.61        94

    accuracy                           0.71       385
   macro avg       0.86      0.58      0.62       385
```

**Accuracy: 0.71 | Macro F1: 0.62**

## TF-IDF vs Embeddings semánticos

El Camino C reemplaza TF-IDF con `paraphrase-multilingual-MiniLM-L12-v2` de Sentence Transformers. El resultado fue sorprendente en la dirección contraria a lo esperado:

| Modelo | Accuracy | Macro F1 |
|---|---|---|
| TF-IDF + Regresión Logística | **0.71** | **0.62** |
| Embeddings multilingüe + Regresión Logística | 0.65 | 0.61 |

![Comparativa F1 por categoría entre TF-IDF y embeddings](/images/posts/ruts/comparativa-f1.png)

El vocabulario institucional del RUTS (nombres de dependencias, tipos de trámite, requisitos formales) actúa como señal discriminativa directa. TF-IDF la captura de forma natural: si un trámite menciona "expediente clínico" y "IMSS", la categoría Salud se vuelve obvia por co-ocurrencia léxica. Los embeddings de propósito general tienden a proyectar Social y Población en regiones semánticas cercanas porque comparten vocabulario administrativo general, colapsando la distinción que el léxico específico sí preserva.

## Lo que sigue

Este notebook establece la línea base. Los siguientes pasos son:

1. Explorar técnicas de balanceo de clases (oversampling, class weights) para mejorar las categorías con pocos ejemplos.
2. Probar modelos de embeddings especializados en texto gubernamental en español.
3. Evaluar si añadir metadatos estructurados (dependencia, modalidad) como features adicionales mejora el Macro F1.

El código está disponible en [GitHub](https://github.com/santosmartinezvm/ruts-linea-base).

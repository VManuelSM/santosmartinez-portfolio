---
title: "Tres secretos a simple vista: un experimento de esteganografía"
author: Víctor Santos
description: "Una foto que lleva un PDF adentro, otra con un mensaje escrito en su canal azul y un párrafo con 448 caracteres invisibles. Los publico tal cual para comprobar si una página web los deja pasar intactos."
image:
  url: "/images/posts/esteganografia-actividad-5/toastmasters2.jpg"
  alt: "Víctor Santos dando un discurso en el Club Toastmasters Pachuca, junto al estandarte del club y un atril con el letrero AUDACIA."
pubDate: 2026-10-11
tags:
  [
    "ciberseguridad", "esteganografia", "seguridad-informatica", "maestria"
  ]
languages: ["python"]
---

En la materia de Ciberseguridad de la Maestría en Inteligencia Artificial (UPMH) empezamos el segundo corte con criptología. La criptografía vuelve ilegible un mensaje, pero el resultado delata que hay un secreto. La **esteganografía** persigue la misma confidencialidad por otro camino: esconder el mensaje de forma que nadie sospeche que existe.

La actividad pide ocultar información con tres técnicas y después **comprobar su robustez**: enviar los archivos por correo, por WhatsApp y publicarlos en una página web personal, para ver qué sobrevive. Esta entrada es esa última prueba. Los tres archivos de abajo son exactamente los que generé; si el servidor o el navegador los alteran, el secreto se pierde.

## Secreto 1: un PDF dentro de una foto

![Foto de un discurso en el Club Toastmasters Pachuca; el archivo lleva un PDF oculto después del final de la imagen](/images/posts/esteganografia-actividad-5/toastmasters2.jpg)

Esta foto pesa 17 KB más que la original. Un JPEG termina con el marcador `FF D9`, y todo lo que venga después lo ignora el visor de imágenes. Ahí pegué un archivo RAR con un PDF adentro:

```bash
rar a secreto.rar secreto.pdf
cat toastmasters.jpg secreto.rar > toastmasters2.jpg   # en Windows: copy /b
```

Para sacarlo, descarga la imagen y ábrela con un descompresor que lea RAR (`unrar x toastmasters2.jpg`, WinRAR o The Unarchiver).

## Secreto 2: un mensaje en el canal azul

![La misma foto en PNG; los primeros 49 píxeles de la fila superior llevan un mensaje en su canal azul](/images/posts/esteganografia-actividad-5/toastmasters_stego.png)

Con [StegOnline](https://georgeom.net/StegOnline/upload) escribí un mensaje en los ocho bits del canal azul. Cada carácter ocupa el azul completo de un píxel, así que el texto vive en los primeros 49 píxeles de la fila superior: 49 de 1 920 000. Para leerlo, sube la imagen a StegOnline, entra a *Extract Files/Data* y marca los bits 0 a 7 de la columna **B**.

## Secreto 3: un párrafo con caracteres invisibles

El siguiente párrafo parece una frase normal de 65 caracteres, pero mide 513:

> ‌‌‌‌‍‌﻿‌Hoy‌‌‌‌‍‬‌‍ ‌‌‌‌‌‬‌‌‌‌‌‌‍﻿‌‬practiqué ‌‌‌‌‍‬‍‍mi‌‌‌‌‍﻿‍‍‌‌‌‌‍‬﻿‬‌‌‌‌‍‬‬‍‌‌‌‌﻿﻿‌﻿ discurso‌‌‌‌‍‬﻿‬‌‌‌‌‌‬‌‌‌‌‌‌‍﻿‌﻿‌‌‌‌‍‬‍‍‌‌‌‌‍‬‌﻿ en‌‌‌‌‍﻿‌‬‌‌‌‌‍‬‍‍‌‌‌‌‍﻿‍‌ ‌‌‌‌‍‬‌‍‌‌‌‌‌‬‌‌‌‌‌‌‍‬‍‍‌‌‌‌‍﻿‌﻿‌‌‌‌‌‬‌‌‌‌‌‌‍‬‍‍‌‌‌‌‍‬﻿‌‌‌‌‌‌‬‌‌Toastmasters‌‌‌‌‍‬‬‬‌‌‌‌‍﻿‍‍‌‌‌‌‍‬‍‍‌‌‌‌‍﻿‍‬‌‌‌‌‍‬‍‍‌‌‌‌‍﻿‌﻿‌‌‌‌‌‬‌‌‌‌‌‌‍‬‌‍‌‌‌‌‌‬‌‌ y‌‌‌‌‍‬﻿‌‌‌‌‌‍‬‌‍‌‌‌‌‍﻿‌﻿‌‌‌‌‌‬‌‌‌‌‌‌‌﻿‌‍‌‌‌‌‌﻿‬‍‌‌‌‌‌﻿‬‬‌‌‌‌‌﻿‌‌‌‌‌‌‌﻿‌‌‌‌‌‌‌‬‌‌‌‌‌‌‍‬‍‍‌‌‌‌‍‬﻿‬‌‌‌‌‌‬‌‌‌‌‌‌‍‬﻿‌‌‌‌‌‍‬‌‍‌‌‌‌‌‬‌‌ ‌‌‌‌‍﻿‌﻿‌‌‌‌‍‬‌‍me‌‌‌‌‍‬﻿‌‌‌‌‌‍‬‌‍‌‌‌‌‌‬‌‌ ‌‌‌‌‍‌‌‬fue bastante bien.

Los 448 que no se ven son caracteres Unicode de ancho cero (U+200C, U+200D, U+202C y U+FEFF). Cópialo y pégalo en el cuadro *Steganography Text* de la [herramienta de 330k](https://330k.github.io/misc_tools/unicode_steganography.html), y pulsa *Decode*. También puedes [descargarlo como archivo de texto](/images/posts/esteganografia-actividad-5/stego_text.txt).

## Por qué importa la robustez

Un algoritmo esteganográfico se evalúa con dos criterios que tiran en direcciones opuestas: la **imperceptibilidad**, que nadie note el cambio, y la **robustez**, que el mensaje sobreviva al camino. Las plataformas procesan lo que les mandas, lo quieras o no: recomprimen fotos, cambian formatos, limpian caracteres. Un secreto que no sobrevive al canal no sirve para comunicarse.

La página web es el canal más amable de los tres, porque sirve los archivos tal como los subí. La prueba de fuego es WhatsApp.

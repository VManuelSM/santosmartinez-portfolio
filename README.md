# santosmartinez.com.mx

Portafolio personal de **Víctor Manuel Santos Martínez** — Colaborador en Inteligencia Artificial y Gobierno Digital. Subdirector Adjunto en COEMERE, desarrollador y futuro investigador.

## Stack

- **Framework**: Astro v5
- **Estilos**: TailwindCSS v4
- **UI reactiva**: Preact
- **Íconos**: astro-icon (SVGs locales en `src/icons/`)
- **Resaltado de código**: Shiki (tema `github-dark`)
- **Deploy**: GitHub Actions → GitHub Pages (dominio personalizado `santosmartinez.com.mx`)

## Estructura

```
src/
├── components/
│   ├── blog/        # Hero, LastPost, ListPosts, Tags, Languages…
│   ├── portfolio/   # HeroIndex, Tools, Experience, Projects…
│   ├── layout/      # Header, Footer, Nav…
│   └── ui/          # Button, Capsule, Tag, Heading…
├── content/
│   ├── blog/        # Posts en Markdown (Content Collections)
│   └── staticData/  # allStaticData.json — datos del perfil
├── icons/           # SVGs de tecnologías (uno por archivo)
├── layouts/
│   ├── Layout.astro
│   ├── MarkdownPostLayout.astro
│   └── MarkdownAbout.astro
├── pages/
│   ├── index.astro
│   ├── about-me.md
│   ├── blog/
│   └── portfolio/projects/
├── styles/
│   └── global.css   # Estilos de .markdown, tablas, bloques de código
└── utils/
    ├── languages.ts  # Mapa de tecnologías → icono + nombre
    └── getBlogPosts.ts
public/
└── images/
    └── posts/       # Imágenes de portada y gráficas de notebooks
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Build y preview

```bash
npm run build
npm run preview
```

## Agregar una tecnología al stack

1. Coloca el SVG en `src/icons/<nombre>.svg`.
2. Registra la entrada en `src/utils/languages.ts`:

```typescript
pandas: {
  name: "pandas",
  iconName: "pandas",
},
```

3. Úsala en `src/components/portfolio/Tools.astro` o en el frontmatter `languages:` de un post.

> Si el servidor no detecta el nuevo ícono, reinícialo — astro-icon no hace hot-reload de archivos SVG nuevos.

## Agregar un post

Crea un archivo `.md` en `src/content/blog/` con el siguiente frontmatter:

```yaml
---
title: "Título del post"
author: Víctor Santos
description: "Descripción breve."
image:
  url: "/images/posts/mi-imagen.webp"
  alt: "Descripción de la imagen."
pubDate: 2026-06-12
tags: ["tag-1", "tag-2"]
languages: ["python", "jupyter"]
---
```

## Créditos

Basado en la plantilla [NeonMint](https://github.com/EFEELE/NeonMint) de EFEELE (MIT License).

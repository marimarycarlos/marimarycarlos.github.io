# Boda María del Mar & Carlos

Web de invitación estática (HTML/CSS/JS sin dependencias) desplegada en GitHub Pages.

## Estructura

```
site/                  ← lo que se publica
  index.html           ← toda la web; el contenido editable está en el objeto CONFIG (al final)
  img/portada.webp|jpg ← foto con bordes difuminados a blanco
  img/villaluisa.*     ← foto del lugar
apps-script/Code.gs    ← backend del formulario RSVP (Google Sheets)
.github/workflows/deploy.yml
```

## Despliegue

1. Crear el repositorio y subir el contenido a `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Cada push a `main` que toque `site/` vuelve a desplegar.
4. URL: https://marimarycarlos.github.io/

## Formulario RSVP

Ver instrucciones en la cabecera de `apps-script/Code.gs`. Sin `rsvpEndpoint` el formulario funciona en modo demo (no guarda nada).

## Pendiente de datos

IBAN, horas del programa salvo la ceremonia y fecha límite de confirmación → `CONFIG` en `index.html`.

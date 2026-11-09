# Boda Carlos & María del Mar

Web de invitación estática (HTML/CSS/JS sin dependencias) desplegada en GitHub Pages.

## Estructura

```
site/                  ← lo que se publica
  index.html           ← toda la web; el contenido editable está en el objeto CONFIG (al final)
  boda.ics             ← evento para Apple Calendar / Outlook
  img/portada.webp|jpg ← foto con bordes difuminados a blanco
apps-script/Code.gs    ← backend del formulario RSVP (Google Sheets)
.github/workflows/deploy.yml
```

## Despliegue

1. Crear el repositorio y subir el contenido a `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Cada push a `main` que toque `site/` vuelve a desplegar.
4. URL: https://alvarogamero.github.io/wedding-maripi-carlos/

## Formulario RSVP

Ver instrucciones en la cabecera de `apps-script/Code.gs`. Sin `rsvpEndpoint` el formulario funciona en modo demo (no guarda nada).

## Pendiente de datos

Horarios, dirección, autobuses, IBAN, teléfonos y fecha límite de confirmación → `CONFIG` en `index.html`.
Al fijar el horario, actualizar también `DTSTART/DTEND` en `boda.ics` (UTC; febrero = hora de Madrid − 1) y `ini/fin` del enlace de Google Calendar.

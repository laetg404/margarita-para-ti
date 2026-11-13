# Una margarita para ti ♡

Versión web de la animación original hecha en Python Turtle. Esta adaptación utiliza HTML, CSS y JavaScript Canvas para que funcione en navegadores de escritorio y móviles.

## Ver localmente

Abre `index.html` en un navegador. No necesita instalar dependencias ni ejecutar un servidor.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `margarita-para-ti`.
2. Sube al repositorio `index.html`, `style.css`, `script.js` y `README.md` (puedes arrastrar los archivos desde la web de GitHub).
3. Entra a **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/(root)`, y pulsa **Save**.
6. Espera a que termine el despliegue. GitHub mostrará la dirección pública de tu página en esa misma sección.

Cada vez que hagas `commit` y `push` a la rama publicada, GitHub Pages actualizará el sitio.

## Personalización

- Textos de la animación: busca `setMessage(...)` y `messageLines` en `script.js`.
- Colores y tipografía: modifica las variables de `:root` en `style.css`.
- Tamaños y tiempos: revisa las constantes y duraciones dentro de `script.js`.

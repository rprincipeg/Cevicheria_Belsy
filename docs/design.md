# Design Guide — Cevicheria Belsy

Guía extraída de los HTML ya implementados. Su propósito es que cualquier HTML nuevo sea visualmente y funcionalmente coherente con los existentes sin necesidad de repasar el código anterior.

---

## 1. Boilerplate de `<head>` (copiar exacto)

Todos los HTML del proyecto usan este bloque de `<head>` sin excepción. La configuración de Tailwind **debe ser idéntica** en cada archivo para que los tokens de color/tipografía/spacing sean consistentes.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">
  <title>Cevicheria Belsy — [Nombre de la vista]</title>

  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

  <!-- Fuentes -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">

  <style>
    .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
    .fill-icon                  { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
    body { font-family: 'Inter', sans-serif; }
  </style>

  <!-- Config Tailwind (IDÉNTICA en todos los archivos) -->
  <script id="tailwind-config">
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            "primary-container": "#1e40af", "primary": "#00288e", "outline-variant": "#c4c5d5",
            "surface-container-low": "#f0f4f8", "on-primary-fixed-variant": "#173bab",
            "on-tertiary-fixed": "#370e00", "primary-fixed": "#dde1ff", "on-primary-fixed": "#001453",
            "on-surface": "#171c1f", "on-primary": "#ffffff", "secondary": "#006a61",
            "on-background": "#171c1f", "tertiary-container": "#872d00", "surface-container": "#eaeef2",
            "on-surface-variant": "#444653", "surface": "#f6fafe", "inverse-primary": "#b8c4ff",
            "surface-container-high": "#e4e9ed", "background": "#f6fafe",
            "surface-container-lowest": "#ffffff", "surface-variant": "#dfe3e7",
            "on-secondary-fixed": "#00201d", "secondary-fixed-dim": "#6bd8cb",
            "on-tertiary-container": "#ffa582", "tertiary-fixed": "#ffdbce",
            "on-tertiary-fixed-variant": "#7f2b00", "secondary-container": "#86f2e4",
            "outline": "#757684", "surface-tint": "#3755c3", "on-tertiary": "#ffffff",
            "on-secondary": "#ffffff", "tertiary": "#611e00", "on-primary-container": "#a8b8ff",
            "error": "#ba1a1a", "error-container": "#ffdad6", "on-error-container": "#93000a",
            "on-error": "#ffffff", "tertiary-fixed-dim": "#ffb599", "primary-fixed-dim": "#b8c4ff",
            "on-secondary-container": "#006f66", "surface-container-highest": "#dfe3e7"
          },
          borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
          spacing: {
            "touch-target-min": "48px", "container-max-width": "1280px",
            "margin": "32px", "unit": "8px", "gutter": "24px"
          },
          fontFamily: {
            "headline-md": ["Inter"], "label-md": ["Inter"], "body-lg": ["Inter"],
            "display-lg": ["Inter"], "headline-lg": ["Inter"], "body-md": ["Inter"], "label-lg": ["Inter"]
          },
          fontSize: {
            "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
            "label-md":    ["12px", { lineHeight: "16px", fontWeight: "500" }],
            "body-lg":     ["18px", { lineHeight: "28px", fontWeight: "400" }],
            "display-lg":  ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
            "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "600" }],
            "body-md":     ["16px", { lineHeight: "24px", fontWeight: "400" }],
            "label-lg":    ["14px", { lineHeight: "20px", fontWeight: "600" }]
          }
        }
      }
    }
  </script>

  <!-- Socket.io y auth siempre al final del head -->
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js" crossorigin="anonymous"></script>
  <script src="../Login/js/auth.js"></script>  <!-- ajustar path según carpeta -->
</head>
```

> **Regla:** No añadir ni quitar colores del config. Si se necesita un color puntual, usar el token más cercano del sistema, no un HEX hardcodeado nuevo.

---

## 2. Tokens de diseño

### 2.1 Tipografía

| Token clase Tailwind | Tamaño | Peso | Uso |
|---|---|---|---|
| `font-display-lg text-display-lg` | 40px | 700 | Número de mesa grande, marca en Login |
| `font-headline-lg text-headline-lg` | 32px | 600 | Títulos de sección / página |
| `font-headline-md text-headline-md` | 24px | 600 | Subtítulos, nombres en NavBar, totales |
| `font-body-lg text-body-lg` | 18px | 400 | Inputs, texto de lectura principal |
| `font-body-md text-body-md` | 16px | 400 | Párrafos secundarios, descripciones |
| `font-label-lg text-label-lg` | 14px | 600 | Botones, tabs, etiquetas de acción |
| `font-label-md text-label-md` | 12px | 500 | Chips de estado, timestamps, notas secundarias |

### 2.2 Espaciado

| Token | Valor | Uso |
|---|---|---|
| `p-margin` / `px-margin` | 32px | Padding exterior de páginas |
| `p-gutter` / `gap-gutter` | 24px | Gap entre secciones/columnas |
| `gap-unit` | 8px | Gap entre elementos inline pequeños |
| `h-touch-target-min` / `min-h-[48px]` | 48px | Alto mínimo de botones/controles táctiles |
| `max-w-container-max-width` | 1280px | Ancho máximo del contenido centrado |

### 2.3 Semántica de colores

El sistema usa MD3. Usar **siempre el par** de color y su `on-` correspondiente:

| Intención | Color de fondo | Color de texto | Uso concreto |
|---|---|---|---|
| Marca / Acción primaria | `primary` `#00288e` | `on-primary` | NavBar brand, botones CTA, tabs activos |
| Contenedor primario | `primary-container` `#1e40af` | `on-primary-container` | Columna "Pendiente" cocina, icono de marca |
| Secundario / Disponible | `secondary` `#006a61` | `on-secondary` | Estado "Listo", plato disponible |
| Contenedor secundario | `secondary-container` | `on-secondary-container` | Columna "Listo" cocina |
| Terciario / Ocupado | `tertiary` `#611e00` | `on-tertiary` | Estado "Ocupada", botones de acción urgente |
| Contenedor terciario | `tertiary-container` `#872d00` | `on-tertiary-container` | Columna "En proceso" cocina |
| Error / Eliminar | `error` `#ba1a1a` | `on-error` | Cerrar sesión, botones de borrar, error boxes |
| Contenedor de error | `error-container` | `on-error-container` | Fondo de alertas de error |
| Superficie base | `surface` `#f6fafe` | `on-surface` | Fondo NavBar, cards principales |
| Superficie contenedor | `surface-container` `#eaeef2` | `on-surface` | Fondo de columnas/secciones |
| Superficie baja | `surface-container-low` `#f0f4f8` | `on-surface` | Fondo general del body en vistas de gestión |
| Superficie alta | `surface-container-high` `#e4e9ed` | `on-surface` | Hover de botones ghost, imagen placeholder |
| Superficie blanca | `surface-container-lowest` `#ffffff` | `on-surface` | Cards elevadas, modales, inputs |
| Background | `background` `#f6fafe` | `on-background` | Body en vistas de listado/mapa |
| Borde sutil | `outline-variant` `#c4c5d5` | — | Bordes de inputs y separadores |
| Borde visible | `outline` `#757684` | — | Iconos de inputs, textos terciarios |
| Variante de superficie | `surface-variant` `#dfe3e7` | `on-surface-variant` | Bordes de cards, fondos de tabs |
| Texto secundario | — | `on-surface-variant` `#444653` | Labels de formulario, timestamps |

#### Colores de estado para inventario (nuevos en v5)

Mantener coherencia con el sistema existente:

| Estado inventario | Backend `stockAlert` | Color recomendado | Patrón existente en que se basa |
|---|---|---|---|
| Agotado | `'OUT'` | `text-error` / `bg-error-container` | Error boxes del Login, logout button |
| Bajo mínimo | `'LOW'` | `text-tertiary` / `bg-tertiary-fixed` | Mesa "Ocupada", columna "En proceso" |
| Normal | `'OK'` | `text-secondary` / `bg-secondary-container` | Estado "Libre", columna "Listo" |

---

## 3. Estructura de página estándar

### 3.1 Body base — vistas de gestión (Admin)

```html
<body class="bg-surface-container-low text-on-surface h-screen flex flex-col overflow-hidden font-body-md">
```

> Usado en Monitor_cocinero.html. Apropiado para Admin panels que muestran datos en tiempo real (inventario, reportes).

### 3.2 Body base — vistas de listado/mapa (Mesero)

```html
<body class="bg-background text-on-background min-h-screen flex flex-col">
```

> Usado en Mapa_mesas.html. Para vistas con scroll vertical libre.

### 3.3 Body base — vista de dos paneles (carta_pedido)

```html
<body class="bg-background text-on-background h-screen overflow-hidden flex flex-col antialiased">
```

---

## 4. NavBar — patrón único

Todos los HTML comparten la misma estructura de barra superior. Solo cambia el contenido de cada zona.

```html
<header class="bg-surface shadow-sm flex justify-between items-center w-full px-margin py-4 h-touch-target-min shrink-0 z-10">
  <!-- Zona izquierda: marca + título -->
  <div class="flex items-center gap-4">
    <span class="material-symbols-outlined text-primary text-3xl">restaurant</span>
    <h1 class="font-display-lg text-display-lg font-bold text-primary tracking-tight">Cevicheria Belsy</h1>
    <span class="font-headline-md text-headline-md text-on-surface-variant ml-4 border-l-2 border-outline-variant pl-4">
      [Nombre de la vista]
    </span>
  </div>

  <!-- Zona derecha: usuario + acciones + logout -->
  <div class="flex items-center gap-6">
    <div class="flex items-center gap-2 text-on-surface-variant">
      <span class="material-symbols-outlined">person</span>
      <span class="font-label-lg text-label-lg" id="topbar-user-label">Admin</span>
    </div>
    <!-- Botones de navegación opcionales (mismo patrón que btn-volver-admin en cocina) -->
    <button id="btn-logout"
      class="font-label-lg text-label-lg text-error hover:bg-error-container hover:text-on-error-container
             px-4 py-2 rounded-full transition-colors h-touch-target-min flex items-center gap-2">
      <span class="material-symbols-outlined">logout</span>
      Cerrar sesión
    </button>
  </div>
</header>
```

> **Regla:** El botón "Cerrar sesión" **siempre** usa `text-error hover:bg-error-container hover:text-on-error-container` y `rounded-full`. Sin excepciones.

---

## 5. Componentes reutilizables

### 5.1 Card de datos (tabla/lista)

```html
<!-- Card contenedora de sección -->
<section class="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant overflow-hidden">
  <!-- Header de la sección -->
  <div class="bg-primary-container text-on-primary-container p-4 flex justify-between items-center">
    <h2 class="font-headline-md text-headline-md flex items-center gap-2">
      <span class="material-symbols-outlined">[icono]</span>
      [Título de sección]
    </h2>
    <span class="font-label-lg text-label-lg">[contador u acción]</span>
  </div>
  <!-- Cuerpo -->
  <div class="p-4">...</div>
</section>
```

### 5.2 Chip de estado

Patrón extraído directamente de Mapa_mesas.html y Monitor_cocinero.html:

```html
<!-- Estado LIBRE / OK / LISTO (verde) -->
<span class="bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wide">
  Disponible
</span>

<!-- Estado OCUPADO / IN_PROGRESS / LOW (naranja/marrón) -->
<span class="bg-tertiary text-on-tertiary px-4 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wide shadow-sm">
  Ocupada
</span>

<!-- Estado AGOTADO / ERROR (rojo) -->
<span class="bg-error-container text-on-error-container px-4 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wide">
  Agotado
</span>
```

> Inventario específico: usar `secondary` para OK, `tertiary` para LOW (bajo mínimo), `error` para OUT (agotado). **No inventar colores nuevos.**

### 5.3 Fila de tabla con indicador de estado

Patrón para `admin_inventory.html`:

```html
<div class="flex items-center gap-4 px-4 py-3 bg-surface-container-lowest border-b border-surface-variant last:border-0 hover:bg-surface-container-low transition-colors">
  <!-- Nombre del insumo -->
  <span class="flex-1 font-label-lg text-label-lg text-on-surface">[nombre]</span>

  <!-- Stock actual — color según stockAlert -->
  <!-- OK  → text-secondary -->
  <!-- LOW → text-tertiary font-bold -->
  <!-- OUT → text-error font-bold animate-pulse -->
  <span class="font-headline-md text-headline-md [color-según-stockAlert]">[stock] [unidad]</span>

  <!-- Chip de estado (mismo sistema que § 5.2) -->
  <span class="... rounded-full font-label-md">[OK/BAJO/AGOTADO]</span>

  <!-- Acciones -->
  <div class="flex items-center gap-2 shrink-0">...</div>
</div>
```

### 5.4 Botones

```html
<!-- CTA principal (confirmar, guardar, enviar) -->
<button class="h-[56px] px-6 bg-primary text-on-primary rounded-xl font-label-lg text-label-lg
               shadow-sm flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-container
               transition-colors">
  <span class="material-symbols-outlined">save</span>
  Guardar
</button>

<!-- Acción secundaria (editar, ver) -->
<button class="h-touch-target-min px-4 bg-surface-container text-on-surface rounded-lg font-label-lg
               hover:bg-surface-container-high transition-colors flex items-center gap-2">
  <span class="material-symbols-outlined">edit</span>
  Editar
</button>

<!-- Acción peligrosa (eliminar) -->
<button class="h-8 w-8 rounded-full flex items-center justify-center text-error
               hover:bg-error-container transition-colors">
  <span class="material-symbols-outlined text-[18px]">delete</span>
</button>

<!-- Botón ghost de navegación (volver, cancelar) -->
<button class="font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container-high
               transition-colors h-touch-target-min px-4 rounded-full flex items-center gap-2">
  <span class="material-symbols-outlined">arrow_back</span>
  Volver
</button>

<!-- Botón de registrar stock (acción positiva con plus) -->
<button class="h-[48px] px-4 bg-secondary text-on-secondary rounded-lg font-label-lg
               hover:bg-on-secondary-container hover:text-secondary-container
               transition-colors flex items-center gap-2 shadow-sm">
  <span class="material-symbols-outlined">add</span>
  Registrar entrada
</button>
```

> **Regla:** Todos los botones con texto llevan `flex items-center gap-2` con icono y texto. Solo los icon buttons circulares van sin texto.

### 5.5 Input de formulario

```html
<div class="flex flex-col gap-2">
  <label class="font-label-lg text-label-lg text-on-surface" for="campo">Etiqueta</label>
  <div class="relative flex items-center">
    <span class="material-symbols-outlined absolute left-4 text-outline pointer-events-none">
      [icono-representativo]
    </span>
    <input id="campo" type="text"
      class="w-full min-h-[56px] pl-12 pr-4 bg-surface-container border border-outline-variant rounded-lg
             font-body-lg text-body-lg text-on-surface
             focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
             transition-shadow"
      placeholder="Placeholder...">
  </div>
</div>
```

**`<select>`** — mismo container, reemplazar `<input>` por:

```html
<select class="w-full min-h-[56px] pl-12 pr-4 bg-surface-container border border-outline-variant rounded-lg
               font-body-lg text-body-lg text-on-surface appearance-none
               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
  <option value="">Seleccionar...</option>
</select>
```

**`<textarea>`:**

```html
<textarea class="w-full bg-surface-container border border-surface-variant rounded-lg p-3
                 font-body-md text-on-surface resize-none
                 focus:outline-none focus:ring-1 focus:ring-primary"
  rows="3" placeholder="..."></textarea>
```

### 5.6 Caja de error / alerta

```html
<!-- Error de backend (validación, 4xx) -->
<div class="bg-error-container p-4 rounded-lg flex items-start gap-3 border border-error">
  <span class="material-symbols-outlined text-error mt-0.5">error</span>
  <p class="font-body-md text-body-md text-on-error-container">[mensaje]</p>
</div>

<!-- Alerta de inventario bajo mínimo (LOW) -->
<div class="bg-tertiary-fixed p-4 rounded-lg flex items-start gap-3 border border-tertiary-fixed-dim">
  <span class="material-symbols-outlined text-on-tertiary-fixed-variant mt-0.5">warning</span>
  <p class="font-body-md text-body-md text-on-tertiary-fixed-variant">[mensaje]</p>
</div>

<!-- Alerta stock agotado (OUT) — misma estructura que error -->
<div class="bg-error-container p-4 rounded-lg flex items-start gap-3 border border-error">
  <span class="material-symbols-outlined text-error mt-0.5">inventory_2</span>
  <p class="font-body-md text-body-md text-on-error-container">[insumo] sin stock — [n] platos bloqueados</p>
</div>

<!-- Nota informativa (tip) -->
<div class="bg-surface-container-low border border-dashed border-outline-variant rounded-lg p-3 flex items-start gap-2">
  <span class="material-symbols-outlined text-[18px] text-outline mt-0.5">info</span>
  <p class="font-label-md text-label-md text-on-surface-variant">[texto informativo]</p>
</div>
```

### 5.7 Tabs de navegación dentro de una vista Admin

Para vistas con sub-secciones (como admin_inventory con Categorías / Insumos / Recetas):

```html
<!-- Tab bar horizontal — patrón de carta_pedido.html adaptado a desktop -->
<div class="flex border-b border-surface-variant bg-surface px-margin shrink-0">
  <!-- Tab activo -->
  <button class="flex items-center gap-2 px-6 py-4 font-label-lg text-label-lg
                 text-primary border-b-2 border-primary transition-colors">
    <span class="material-symbols-outlined text-[18px]">category</span>
    Categorías
  </button>
  <!-- Tab inactivo -->
  <button class="flex items-center gap-2 px-6 py-4 font-label-lg text-label-lg
                 text-on-surface-variant border-b-2 border-transparent
                 hover:text-primary hover:bg-surface-container-high rounded-t-lg transition-colors">
    <span class="material-symbols-outlined text-[18px]">inventory_2</span>
    Insumos
  </button>
</div>
```

---

## 6. Layout recomendado para vistas Admin pendientes

### `admin_inventory.html` — 3 secciones con tabs

```
┌─ NavBar ────────────────────────────────────────────────────────────────┐
├─ Tab bar: [Categorías] [Insumos] [Recetas]  ──────────────────────────-─┤
├─ Panel de alertas activas (inventory:low_stock / out_of_stock) ─────────┤
│  (oculto si no hay alertas activas)                                     │
├─ Contenido del tab activo ──────────────────────────────────────────────┤
│                                                                         │
│  Tab "Insumos":                                                         │
│  ┌─ Toolbar: [+ Nuevo insumo]  [🔍 Buscar]  [Filtro: categoría] ──────┐ │
│  ├─ Tabla de insumos (filas con chip rojo/amarillo/verde)              │ │
│  │  Columnas: Nombre | Categoría | Stock actual | Mínimo | Alerta | ⋮  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Tab "Recetas":                                                         │
│  ┌─ Selector de plato ──────────────────────────────────────────────┐   │
│  ├─ Lista de ingredientes del plato (tabla con cantidad y unidad)   │   │
│  ├─ Formulario [Insumo] [Cantidad] [+ Añadir ingrediente]           │   │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### `admin_users.html` — lista con modal

```
┌─ NavBar ──────────────────────────────────────────────────────────────┐
├─ Main: max-w-container-max-width mx-auto p-margin ────────────────────┤
│  ┌─ Header de sección ──────────────────────────────────────────────┐ │
│  │  [icono] Gestión de Usuarios          [+ Nuevo usuario]          │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  ┌─ Tabla de usuarios ──────────────────────────────────────────────┐ │
│  │  Nombre | Usuario | Rol | Estado | Acciones (Editar / Deshab.)   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

> Modal: usar `bg-black/50` como overlay, card `bg-surface-container-lowest rounded-xl shadow-lg p-margin max-w-[480px]`.

---

## 7. Patrones de JavaScript

### 7.1 Estructura base de cada página

```javascript
(function () {
  // 1. Proteger la página según roles
  if (!CB.protectPage(['admin'])) return;

  // 2. Mostrar usuario en el topbar
  var sess = CB.getSession();
  var userLabel = document.getElementById('topbar-user-label');
  if (sess && userLabel) userLabel.textContent = sess.usuario || sess.rol;

  // 3. Logout
  document.getElementById('btn-logout').addEventListener('click', function () { CB.logout(); });

  // 4. Helper de API (copiar exactamente)
  function apiReq(method, path, body) {
    var token = sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
    var opts = { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } };
    if (body) opts.body = JSON.stringify(body);
    return fetch(CB.CONFIG.API_BASE + path, opts).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
    });
  }

  // 5. Escape HTML (siempre presente cuando se mete texto del backend en innerHTML)
  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 6. Carga inicial de datos + re-renders
  function load() { /* apiReq → store → render */ }
  load();

  // 7. Socket (siempre al final)
  if (CB.socket) {
    CB.socket.emit('join:room', 'admins'); // o el room que corresponda
    CB.socket.on('inventory:low_stock',    function (data) { showStockAlert(data, 'LOW'); });
    CB.socket.on('inventory:out_of_stock', function (data) { showStockAlert(data, 'OUT'); });
    CB.socket.on('menu:updated',           function () { /* re-fetch si hay datos de menú */ });
  }
})();
```

### 7.2 Manejo del error 422 (stock insuficiente)

Al confirmar un pedido, el backend puede devolver HTTP 422 con lista de insumos insuficientes. El mesero debe verlo como un mensaje claro, no como `alert()`:

```javascript
req.then(function (res) {
  if (res.status === 422) {
    // Mostrar banner de error con lista de insumos (no alert genérico)
    var list = (res.data.insufficientSupplies || [])
      .map(function (s) { return escHtml(s.supplyName) + ': necesita ' + s.needed + ' ' + s.unit + ', hay ' + s.available; })
      .join('<br>');
    errorBanner.innerHTML = '<strong>Stock insuficiente:</strong><br>' + list;
    errorBanner.classList.remove('hidden');
    return;
  }
  if (!res.ok) { /* error genérico */ return; }
  // éxito
});
```

### 7.3 Escuchar eventos de inventario en tiempo real

Las páginas que muestran el menú o alertas de stock deben escuchar:

```javascript
// En carta_pedido.html (mesero) — ya está el re-fetch de menu:updated
CB.socket.on('menu:updated', function () { loadCategories(); });

// Alerta visual de bajo stock (mesero — Had-05 criterio 3)
CB.socket.on('inventory:low_stock', function (data) {
  // Mostrar toast/banner con data.supplyName, data.currentStock, data.unit
});

// Stock agotado — no bloquear el UI (el backend ya cambió stockStatus),
// solo re-fetchear el menú para que los platos aparezcan bloqueados
CB.socket.on('inventory:out_of_stock', function () { loadCategories(); });
```

---

## 8. Coherencia con el backend

### 8.1 Autenticación

- Token: `sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN)`
- Siempre en header: `Authorization: 'Bearer ' + token`
- Protección de página: `CB.protectPage(['admin'])` — roles válidos: `'mesero'`, `'cocinero'`, `'admin'`
- Logout: `CB.logout()` — invalida sesión y redirige a Login

### 8.2 Formato de fechas y moneda

- Moneda: `'S/ ' + Number(val).toFixed(2)` — siempre con dos decimales y prefijo `S/ `
- Fechas: usar `new Date(isoString)` y formatos manuales (patrón de `timeLabel` en cocina)
- Stock: `Number(supply.currentStock).toFixed(3)` para kg/g, `Number(supply.currentStock)` para UNITS

### 8.3 Unidades de insumos

El backend devuelve el enum como string. Mapear a texto legible:

```javascript
var unitLabels = { KG: 'kg', G: 'g', L: 'l', ML: 'ml', UNITS: 'und.' };
// uso: unitLabels[supply.unit] || supply.unit
```

### 8.4 Rutas de API — inventario (Had-05/06)

Prefijo base: `CB.CONFIG.API_BASE` (ya incluye `/api`)

| Operación | Llamada JS |
|---|---|
| Listar insumos | `apiReq('GET', '/inventory/supplies')` |
| Registrar entrada de stock | `apiReq('PATCH', '/inventory/supplies/' + id + '/stock', { quantity })` |
| Listar categorías de insumos | `apiReq('GET', '/inventory/categories')` |
| Ver receta de un plato | `apiReq('GET', '/menu/admin/items/' + id + '/recipe')` |
| Reemplazar receta | `apiReq('PUT', '/menu/admin/items/' + id + '/recipe', [ {supplyId, quantity} ])` |
| Quitar ingrediente | `apiReq('DELETE', '/menu/admin/items/' + id + '/recipe/' + supplyId)` |

### 8.5 Socket rooms

| Room | `emit('join:room', ...)` | Eventos que recibe |
|---|---|---|
| `waiters` | Mesero al cargar su vista | `tables:updated`, `orders:ready`, `orders:delivered`, `menu:updated`, `inventory:low_stock`, `inventory:out_of_stock` |
| `kitchen` | Cocinero al cargar su vista | `orders:new`, `orders:updated` |
| *(sin room explícito)* | Admin — los eventos de inventario se emiten a todos | `inventory:low_stock`, `inventory:out_of_stock`, `menu:updated` |

---

## 9. Checklist antes de entregar un HTML nuevo

- [ ] El `<head>` es idéntico al boilerplate (mismo tailwind config, mismas fuentes)
- [ ] El body arranca con `CB.protectPage([roles])` como primera línea del IIFE
- [ ] El NavBar sigue el patrón de § 4 (misma clase `bg-surface shadow-sm`, logout en rojo)
- [ ] No hay colores HEX hardcodeados nuevos — todo usa tokens del config
- [ ] Los botones cumplen `h-touch-target-min` (48px) mínimo
- [ ] Todo texto del backend insertado con `innerHTML` pasa por `escHtml()`
- [ ] Los estados de insumos usan `secondary` (OK), `tertiary` (LOW), `error` (OUT)
- [ ] El error HTTP 422 (stock insuficiente) muestra la lista de insumos con sus cantidades
- [ ] El socket re-fetcha datos al recibir `menu:updated` si la vista muestra platos
- [ ] La `Content-Type: application/json` y `Authorization` están presentes en todos los fetch

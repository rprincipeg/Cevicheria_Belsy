# Guía de implementación — Cevichería Belsy

## Filosofía del proyecto

El código base fue generado bajo esta directiva:

> "Crea código de forma modular (como bloques que idealmente son removibles intuitivamente) y priorizando soluciones de estructura y patrones simples para la correcta implementación de las historias."

En la práctica esto significa:

- Cada función tiene una sola responsabilidad
- Los bloques de UI (`<nav>`, `<header>`, `<main>`) son independientes y reemplazables sin tocar el resto
- Se prefieren patrones repetibles sobre abstracciones inteligentes
- El código nuevo debe poder contrastarse con el material de referencia existente

---

## Regla #1: el material de referencia manda

**Antes de escribir una sola línea, leer el archivo ya implementado más cercano funcionalmente.(si no hay material de referencia, obviar un poco este paso)**

Los archivos stub contienen marcadores como `<!-- -POR HACERv2 -->` — son marcadores de posición vacíos. La implementación correcta (estructura, clases, patrones) ya existe en las páginas implementadas. No asumir la estructura: leerla.

**Lección aprendida:** En una primera ronda se escribió una sidebar inventada (secciones Caja/Almacenamiento/Reportes) en 4 páginas porque no se contrastó con Had-02. Resultado: 4 páginas con sidebar diferente a la referencia. Se corrigió completamente, pero fue trabajo evitable.

### Referencias canónicas actuales

| Qué necesitas                          | Lee este archivo primero                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| Estructura HTML de una página Admin    | `client/Admin/Had-02_administracion-menu.html`                                     |
| Patrón JS con socket y estado complejo | `client/Admin/js/Had-01_cobro-mesas.js`                                            |
| Controlador backend con Zod + Prisma    | `server/src/modules/Had-03_gestion-usuarios/Had-03_gestion-usuarios.controller.ts` |

---

## Estructura de archivos

```
Cevicheria_Belsy/
├── client/
│   ├── Admin/
│   │   ├── Had-0X_nombre.html       ← página (sidebar + header + main)
│   │   └── js/
│   │       └── Had-0X_nombre.js     ← lógica IIFE
│   ├── Cajero/
│   │   └── Had-01_cobro-mesas.html  ← stub: solo redirige a Admin (no editar)
│   └── Login/
│       └── acceso-por-rol.html
└── server/
    └── src/
        └── modules/
            └── Had-0X_nombre/
                ├── Had-0X_nombre.controller.ts
                └── Had-0X_nombre.routes.ts
```

---

## Patrones técnicos — backend

### Zod v4: extracción de error de validación

```ts
// ❌ INCORRECTO — Zod v4: flatten() retorna un objeto, no un string
res.status(400).json({ error: result.error.flatten() });

// ✅ CORRECTO
res.status(400).json({ error: result.error.issues[0]?.message ?? 'Datos inválidos' });
```

Aplica en **todo** bloque `if (!result.success)`. Verificar en cada controlador nuevo.

### Respuesta de error de conflicto (P2002 Prisma)

```ts
if (err?.code === 'P2002') {
  res.status(409).json({ error: 'El recurso ya existe' });
  return;
}
```

---

## Patrones técnicos — frontend

### Envoltorio de página (IIFE + protección de ruta)

```js
(function () {
  if (!window.CB || !CB.protectPage(['admin'])) return;
  var API_BASE = CB.CONFIG.API_BASE;
  // ...
})();
```

### apiReq — wrapper estándar para todas las peticiones autenticadas

```js
function getToken() {
  return sessionStorage.getItem(CB.CONFIG.STORAGE_KEY_TOKEN);
}

async function apiReq(method, path, body) {
  var headers = { Authorization: 'Bearer ' + getToken() };
  var opts = { method: method, headers: headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  var response = await fetch(API_BASE + path, opts);
  var data = null;
  try { data = await response.json(); } catch (_) { data = null; }
  if (response.status === 401) {
    CB.clearAuthSession();
    window.location.href = '../Login/acceso-por-rol.html';
    return null;
  }
  if (!response.ok) {
    var message = data && (data.error || data.message);
    if (typeof message === 'object') message = 'Datos inválidos';
    throw new Error(typeof message === 'string' ? message : 'Error en la petición');
  }
  return data;
}
```

**Reglas de uso:**

- **Toda** petición autenticada usa `apiReq`. Sin excepciones para GET, POST, PATCH, DELETE.
- Si `apiReq` retorna `null` → hubo 401, ya redirigió. Salir con `return`.
- Si el error de servidor viene como objeto (`typeof message === 'object'`), colapsar a `'Datos inválidos'`.

### Descarga de archivos Excel/PDF — NO usar apiReq

`apiReq` parsea el cuerpo como JSON. Para blobs usar fetch directo:

```js
fetch(API_BASE + '/ruta/export?param=X', {
  headers: { Authorization: 'Bearer ' + getToken() },
})
  .then(function (r) {
    if (!r.ok) throw new Error('No se pudo generar el archivo');
    return r.blob();
  })
  .then(function (blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nombre_archivo.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
  })
  .catch(function (err) { alert(err.message); });
```

---

## Barra lateral — referencia canónica

**Todas las páginas Admin tienen exactamente esta estructura de `<nav>`.** Solo cambia el ítem activo por página.

```
Sección "Caja":
  Cobro de Mesas          → ../Cajero/Had-01_cobro-mesas.html     [point_of_sale]

Sección "Admin":
  Administración del Menú → Had-02_administracion-menu.html       [restaurant_menu]

Sección sin etiqueta:
  Gestión de Usuarios     → Had-03_gestion-usuarios.html          [manage_accounts]
  Reportes de Ventas      → Had-04_reportes-ventas.html           [bar_chart]
  Historial de Pagos      → Had-07_historial-pagos.html           [receipt_long]
  Gestión de Cocina       → ../Cocinero/HCoc-01_gestion-cocina.html  [skillet]
```

**Clases de ítem:**

| Estado                  | Clases Tailwind                                                |
| ----------------------- | -------------------------------------------------------------- |
| Activo (página actual) | `bg-secondary-container text-on-secondary-container`         |
| Inactivo                | `text-on-surface-variant hover:bg-surface-container-highest` |

Copiar el bloque `<nav>` completo de Had-02, no reescribirlo.

---

## Checklist antes de implementar una historia

- [ ] Leer el HTML de referencia más cercano ya implementado
- [ ] Copiar `<nav>` de Had-02 con el ítem correcto activo
- [ ] El JS usa patrón IIFE + `CB.protectPage` + `CB.CONFIG.API_BASE`
- [ ] Toda petición usa `apiReq` (incluyendo GET)
- [ ] Descargas de archivo usan fetch+blob (no `apiReq`)
- [ ] El controlador usa `result.error.issues[0]?.message` (no `.flatten()`)
- [ ] Los archivos stub con `<!-- -POR HACERv2 -->` son marcadores, no estructura

---

## Señales de alerta

| Síntoma                                        | Causa probable                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `[object Object]` en respuesta de validación | `.flatten()` sin extraer `.issues[0]?.message` — error de Zod v4 |
| Sidebar visualmente diferente entre páginas    | Se escribió la nav de memoria en vez de copiar Had-02                |
| 401 silencioso sin redirección al login        | Petición que no pasa por `apiReq`                                  |
| Excel no descarga / error al exportar           | Se usó `apiReq` para un endpoint que retorna blob                  |
| Página en blanco / bucle de redirección       | `CB.protectPage` no está en la primera línea del IIFE             |

# PRD — Sistema de Gestión Integral "Cevichería Belsy" (RestaurantOS)

| Campo | Valor |
| --- | --- |
| **Producto** | Cevichería Belsy — Sistema de Gestión Integral para Restaurantes |
| **Versión del documento** | 1.0 |
| **Fecha** | 2026-06-22 |
| **Estado** | En desarrollo (MVP funcional, 3 sprints) |
| **Contexto** | Proyecto académico — curso de Agile Development (Scrum) |

---

## 1. Resumen ejecutivo

**Cevichería Belsy** es una plataforma web modular que automatiza y sincroniza en tiempo real las operaciones críticas de un restaurante: control de acceso por rol, gestión del salón (mapa de mesas), toma de comandas, línea de producción en cocina, cobro/facturación y control de inventario.

El sistema conecta de forma fluida a tres actores —**mesero**, **cocinero** y **administrador**— bajo un único modelo de datos, donde los cambios de estado (mesa ocupada, plato listo, pedido entregado, stock agotado) se propagan instantáneamente a todas las pantallas mediante WebSockets, eliminando la necesidad de comunicación verbal o recarga manual.

### Objetivo del producto
Reducir los tiempos de servicio y los errores operativos de un restaurante de cevichería mediante un flujo digital de extremo a extremo: desde que el mesero toma el pedido hasta que el cajero genera el comprobante y cierra la caja diaria.

---

## 2. Problema y oportunidad

| Problema actual | Impacto | Solución del producto |
| --- | --- | --- |
| La comanda se comunica verbalmente entre salón y cocina | Errores, olvidos, demoras | Pedidos digitales con estado en tiempo real |
| El mesero no sabe cuándo un plato está listo | Platos fríos, viajes innecesarios a cocina | Notificaciones push (WebSocket) por ítem y por pedido |
| El cobro es manual y sin comprobante formal | Descuadres de caja, sin trazabilidad | Cobro con cálculo de vuelto, boleta/factura en PDF y registro |
| No hay control de stock de insumos | Quiebres de stock, platos no disponibles | Inventario con recetas, descuento automático y alertas |
| No hay reportes de venta | Sin visibilidad financiera | Reporte diario, cierre de caja y exportación a Excel |

---

## 3. Usuarios y roles

El sistema define **3 roles** (enum `UserRole`). El administrador concentra las funciones de cajero y almacenero.

| Rol | Persona | Responsabilidades principales |
| --- | --- | --- |
| **MESERO** | Mesero de salón | Mapa de mesas, toma de pedidos, notificaciones de entrega, mover/juntar mesas |
| **COCINERO** | Cocinero | Monitor de cocina, cambio de estado de ítems y pedidos |
| **ADMIN** | Administrador / Cajero / Almacenero | Acceso total: cobro, administración de menú, usuarios, reportes, almacén, incidencias. Supervisa visualmente las vistas de mesero y cocinero |

> El Administrador es la **única figura** que puede ejercer simultáneamente varios roles (cajero + almacenero + supervisión).

---

## 4. Alcance del producto

### 4.1 Dentro de alcance (MVP + ampliaciones)
- Autenticación con JWT y control de acceso por rol (RBAC).
- Mapa de mesas en tiempo real (10 mesas + modalidad "Para llevar").
- Toma de pedidos por categorías con notas e ítems "para llevar".
- Monitor de cocina con estados por ítem y por pedido.
- Notificaciones de entrega al mesero.
- Cobro en efectivo y virtual (QR/Yape) con pago total y parcial.
- Generación de comprobantes (boleta/factura) en PDF + envío por email.
- Administración de menú (categorías, platos, imágenes, disponibilidad).
- Gestión de usuarios.
- Control de almacén, recetas y descuento automático de stock.
- Reportes de ventas, cierre de caja, historial de pagos y gráficas.
- Liberación forzosa de mesa con registro de pérdida (incidencias).
- Mover y juntar/fusionar mesas.

### 4.2 Fuera de alcance (versión actual)
- Aplicación móvil nativa.
- Integración con pasarelas de pago reales / facturación electrónica SUNAT.
- Reservas de mesa online por parte del cliente.
- Multi-local / multi-sucursal.

---

## 5. Requisitos funcionales (Historias de usuario)

Cada historia tiene **Prioridad (P, 1–4)** y **Dificultad en puntos (S)**. Los criterios de aceptación completos viven en `docs/Historias.md`; aquí se resume el comportamiento esperado.

### Épica 1 — Autenticación y Usuarios

#### US-01 · Acceso al sistema por rol — `P4 / S3`
Login/logout con credenciales. Redirige al panel según rol (mesero → mapa de mesas, cocinero → monitor de cocina, admin → panel administrativo). Bloquea accesos cruzados entre roles. Sesión expira a los **30 min de inactividad**. El admin asume rol de cajero y tiene accesos directos a todas las vistas.

#### Had-03 · Gestión de usuarios — `P2 / S5`
El admin crea, edita, habilita y deshabilita usuarios (mesero/cocinero). Valida usuario único y contraseña ≥ 6 caracteres. No puede deshabilitar su propia cuenta. Listas separadas de activos/deshabilitados con confirmación en acciones.

### Épica 2 — Gestión de Mesas

#### Hme-01 · Visualizar mapa de mesas — `P4 / S5`
Mapa con 10 mesas en estado **Libre / Ocupada** en tiempo real + opción "Para llevar". Mesa libre inicia pedido nuevo; mesa ocupada permite añadir ítems al pedido activo.

#### Hme-04 · Modificar mesas — `P2 / S5`
Mover el pedido activo de una mesa a otra libre; juntar (fusionar) dos o más mesas bajo un mismo pedido identificado como una unidad ("Mesa 1 y 2"). El cajero ve un total acumulado y al pagar se liberan todas. No aplica a pedidos pagados. Operación registrada (fecha, hora, usuario, origen/destino).

#### Had-09 · Cancelación de cobro por incidencia — `P1 / S2`
Botón "Liberar mesa forzosamente" sin cobro (fugas, platos mal servidos). Permite liberar un ítem o la mesa completa. Requiere confirmación. Registra el monto como **pérdida** en el historial de incidencias.

### Épica 3 — Gestión de Pedidos

#### Hme-02 · Visualizar platos — `P4 / S3`
Menú por categorías, ítems ordenados alfabéticamente con nombre, precio, descripción e imagen, indicando disponibilidad. Panel lateral "Pedido Actual" con ajuste de cantidades, notas adicionales, switch "para llevar" por ítem. Confirma con ≥ 1 ítem; al confirmar, la mesa pasa a Ocupada y el pedido llega a cocina como Pendiente.

#### HCoc-01 · Gestión de pedidos en cocina — `P3 / S3`
Monitor separado por ítems, ordenado por hora de llegada, con mesa, cantidades, indicador "para llevar" y notas. Estados **Pendiente → En proceso → Listo** por ítem. Cuando todos los ítems están listos, el pedido pasa a Listo automáticamente. Progreso visible (ej. 1/2 listos). Ítems listos desaparecen tras **5 min**.

#### Hme-03 · Notificaciones y entrega de pedidos — `P3 / S8`
Alerta visual en tiempo real al mesero cuando cocina marca Listo (por ítem o pedido), indicando mesa. Persiste hasta gestionarse. El mesero marca **Entregado** (registra fecha, hora y usuario). No se puede entregar un pedido que no esté Listo.

### Épica 4 — Almacén, Inventario y Menú

#### Had-02 · Administración del menú — `P4 / S5`
CRUD de categorías y platos (nombre, precio, categoría, descripción, imagen JPG/PNG opcional). Marcar/reactivar "Agotado" en tiempo real. No se elimina categoría con platos activos. Cambios reflejados al instante al mesero. **Soft-delete**: platos con historial se ocultan en vez de borrarse.

#### Had-05 · Control de almacén e insumos — `P3 / S8`
Categorías de insumos y registro con nombre, unidad (KG/G/L/ML/UNITS) y stock mínimo. Registro de entradas suma stock. Alertas: stock bajo mínimo (amarillo) y agotado (rojo). Stock en cero bloquea automáticamente los platos que lo usan; al reponer, se desbloquean.

#### Had-06 · Vinculación de insumos a platos (recetas) — `P3 / S5`
Cada plato tiene una receta (uno o más insumos con cantidad/unidad). Al confirmar un pedido con **n** unidades, se descuenta **n** veces la receta de forma simultánea. Alerta si el stock es insuficiente. El cajero consulta/modifica recetas desde almacén.

### Épica 5 — Cobro y Pagos

#### Had-01 · Cobro de mesas (efectivo) — `P4 / S8`
Detalle de cobro con historial de pedidos, ítems, cantidades, notas, precios y total. **Pago parcial** por ítems con saldo pendiente actualizado. Cálculo automático de vuelto. Comprobante **Boleta (DNI) / Factura (RUC + razón social)**. Genera PDF (datos del cliente, restaurante, fecha/hora, ítems, total), descargable e imprimible, agrupado por día. Mesa se libera manualmente solo cuando todo está cobrado.

#### Had-10 · Pago por modalidad virtual — `P2 / S5`
Cobro mediante banca móvil mostrando **QR del negocio** y monto. El cajero confirma manualmente la recepción. Pago registrado (método, monto, fecha, hora, mesa). Mesa se libera tras confirmar.

### Épica 6 — Reportes y Estadísticas

#### Had-04 · Reportes de ventas y cierre de caja — `P2 / S5`
Reporte del día (ganancias, mesas atendidas, pedidos completados, ítems vendidos, platos más vendidos), actualizado al confirmar pagos. Exportación a **Excel (.xlsx)** con totales y fecha en el nombre. **Cierre de caja** que divide jornadas, registrando fecha, hora y usuario.

#### Had-07 · Historial de pagos por rango de fechas — `P2 / S5`
Consulta por rango (máx. 90 días atrás) con total acumulado, número y promedio de pagos, y detalle por pago. Exportación a Excel con ID, mesa, fecha, hora, tipo de comprobante, método, modalidad, cajero y monto. Botón "Limpiar".

#### Had-08 · Gráficas de ventas y estadísticas — `P2 / S5`
Panel con indicadores del día (total vendido, mesas activas, pedidos en cocina), gráfica de barras de los últimos 7 días y gráfica del mes actual. Se actualizan al cerrar caja. Alertas de stock bajo en el panel.

---

## 6. Requisitos no funcionales

| Categoría | Requisito |
| --- | --- |
| **Tiempo real** | Propagación de cambios de estado < 1s vía WebSockets (Socket.io) a todas las vistas conectadas |
| **Seguridad** | Autenticación JWT; contraseñas con hash bcrypt; RBAC por middleware (`authenticate` + `authorize`); CORS restringido por origen permitido |
| **Sesión** | Expiración automática a los 30 minutos de inactividad |
| **Persistencia** | PostgreSQL con Prisma ORM; migraciones versionadas; soft-delete para datos con historial |
| **Disponibilidad de datos** | Comprobantes PDF y reportes Excel persistidos en disco, agrupados por día |
| **Compatibilidad** | Navegador web moderno (frontend HTML + vanilla JS + Tailwind vía CDN) |
| **Entorno** | Node.js ≥ 20; configuración por variables de entorno (`.env`) |
| **Integridad** | Descuento de stock atómico al confirmar pedidos; validaciones con Zod |

---

## 7. Arquitectura y stack tecnológico

Arquitectura **monorepo** (`client/` + `server/`).

| Capa | Tecnología |
| --- | --- |
| **Frontend** | HTML + JavaScript vanilla + Tailwind CSS por CDN (sin npm/build) + Socket.io-client. Organizado por rol: `Login/`, `Mesero/`, `Cocinero/`, `Cajero/`, `Admin/` |
| **Backend** | Node.js + Express 5 (TypeScript) |
| **ORM / BD** | Prisma 7 + PostgreSQL |
| **Tiempo real** | Socket.io (WebSockets) |
| **Auth** | JWT (`jsonwebtoken`) + bcryptjs + RBAC |
| **Validación** | Zod |
| **Documentos** | PDFKit (comprobantes), ExcelJS (reportes), Nodemailer (envío de email) |
| **Subida de archivos** | Multer (imágenes de platos) |

### Organización del backend por módulos (vertical slices)
Cada historia de usuario es un módulo autocontenido (`controller` + `routes` + `index`):

```
server/src/modules/
├── US-01_acceso-por-rol/          → /api/auth
├── Hme-01_mapa-mesas/             → /api/tables
├── Hme-02_visualizar-platos/      → /api/orders
├── HCoc-01_gestion-cocina/        → /api/kitchen
├── Had-01_cobro-mesas/            → /api/payments
├── Had-02_administracion-menu/    → /api/menu
├── Had-03_gestion-usuarios/       → /api/users
├── Had-04_reportes-ventas/        → /api/reports
├── Had-05_control-almacen/        → inventario y recetas
└── Had-09_cancelacion-cobro/      → incidencias
```

Servicios y utilidades compartidas en `server/src/shared/` (config CORS, middlewares de auth, servicios de PDF y socket, upload).

---

## 8. Modelo de datos (entidades principales)

| Entidad | Descripción |
| --- | --- |
| **User** | Usuario del sistema. Rol (MESERO/COCINERO/ADMIN) y estado (ACTIVE/INACTIVE) |
| **Category / MenuItem** | Categorías y platos del menú. `stockStatus`, `isPreparable`, `isActive` (soft-delete), imagen |
| **DiningTable** | Mesa física. Estado y `mergedIntoId` para fusión de mesas |
| **Order / OrderItem** | Pedido y sus ítems. Estados PENDING → IN_PROGRESS → READY → DELIVERED → PAID / CANCELLED. Soporta `isTakeaway`, notas, entrega y pago por ítem |
| **Payment** | Pago: método (CASH/QR/YAPE), modo (FULL/PARTIAL), comprobante (BOLETA/FACTURA), monto recibido, vuelto, datos del cliente, PDF |
| **DailyClosure** | Cierre de caja diario: total de ventas, pedidos, mesas servidas, usuario, ruta del Excel |
| **SupplyCategory / Supply** | Categorías e insumos de almacén con unidad, stock actual y mínimo |
| **RecipeItem** | Receta: vincula plato ↔ insumo con cantidad consumida |
| **Incident** | Pérdida por liberación forzosa de mesa/ítem sin cobro (snapshot, monto, motivo) |

**Enums clave:** `UserRole`, `UserStatus`, `StockStatus`, `OrderStatus`, `OrderItemStatus`, `SupplyUnit`.

---

## 9. Eventos en tiempo real (WebSockets)

El núcleo del producto es la sincronización instantánea. Eventos esperados:

- Mesa cambia de estado (Libre ↔ Ocupada, fusión/separación).
- Nuevo pedido / ítem llega a cocina.
- Ítem o pedido cambia a En proceso / Listo.
- Notificación de entrega al mesero.
- Plato marcado Agotado / reactivado.
- Stock de insumo bajo el mínimo o agotado → bloqueo/desbloqueo de platos.
- Confirmación de pago / liberación de mesa.

---

## 10. Métricas de éxito

| Métrica | Objetivo |
| --- | --- |
| Tiempo desde "pedido confirmado" hasta visible en cocina | < 1 segundo |
| Errores de comanda (plato equivocado / faltante) | Reducción frente al proceso manual |
| Descuadre de caja al cierre diario | S/ 0 (todo pago genera comprobante y registro) |
| Quiebres de stock no detectados | 0 (alertas automáticas antes del agotamiento) |
| Cobertura de historias del MVP (Sprint 1) | 100% (US-01, Hme-01, Hme-02, Had-02, HCoc-01, Had-01) |

---

## 11. Planificación (Scrum)

- **Sprint = 3 semanas**, 3 días hábiles/semana, equipo de 7 personas.
- **Velocidad máx.** ≈ 28.35 pts/sprint. **Total backlog:** 80 pts en 3 sprints.

| Sprint | Historias | Puntos |
| --- | --- | --- |
| **Sprint 1 (MVP)** | US-01, Hme-01, Hme-02, Had-02, HCoc-01, Had-01 | 27 |
| **Sprint 2** | Hme-03, Had-03, Had-04, Had-07, Hme-04 | 28 |
| **Sprint 3** | Had-05, Had-06, Had-08, Had-09, Had-10 | 25 |

---

## 12. Riesgos y supuestos

| Riesgo / Supuesto | Mitigación |
| --- | --- |
| Comprobantes no son facturación electrónica oficial (SUNAT) | Alcance académico; PDF como comprobante interno |
| Pago virtual (QR/Yape) se confirma manualmente, sin verificación bancaria | Confirmación manual del cajero como decisión de diseño |
| Concurrencia en descuento de stock al confirmar pedidos simultáneos | Operación atómica en BD vía Prisma/transacciones |
| Single-local: sin multi-sucursal | Fuera de alcance de esta versión |

---

## 13. Referencias

- `docs/Historias.md` — historias de usuario y criterios de aceptación completos.
- `docs/Arquitectura y Stack.md` — descripción de arquitectura.
- `docs/design.md` — guías de diseño.
- `server/prisma/schema.prisma` — modelo de datos canónico.
- `server/src/modules/` — implementación por módulo/historia.

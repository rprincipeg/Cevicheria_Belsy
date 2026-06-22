# Prioridad (P) y Puntos (S)

## Tabla de Historias de Usuario

| **ID**      | **Historia de Usuario**                         | **Prioridad** | **Dificultad** |
| ----------------- | ----------------------------------------------------- | ------------------- | -------------------- |
| **US-01**   | Acceso al sistema por rol                             | 4                   | 3                    |
| **Hme-01**  | Visualizar Mapa de Mesas                              | 4                   | 5                    |
| **Hme-02**  | Visualizar platos                                     | 4                   | 3                    |
| **Hme-03**  | Visualización de notificaciones y entrega de pedidos | 3                   | 8                    |
| **Hme-04**  | Modificar mesas                                       | 2                   | 5                    |
| **HCoc-01** | Gestión pedidos en cocina                            | 3                   | 3                    |
| **Had-01**  | Cobro de mesas                                        | 4                   | 8                    |
| **Had-02**  | Administración del menú                             | 4                   | 5                    |
| **Had-03**  | Gestión de usuarios del sistema                      | 2                   | 5                    |
| **Had-04**  | Reportes de ventas y cierre de caja                   | 2                   | 5                    |
| **Had-05**  | Control de almacén e insumos                         | 3                   | 8                    |
| **Had-06**  | Vinculación de insumos a platos                      | 3                   | 5                    |
| **Had-07**  | Historial de pagos por rango de fechas                | 2                   | 5                    |
| **Had-08**  | Gráficas de ventas y estadísticas                   | 2                   | 5                    |
| **Had-09**  | Cancelación de cobro por incidencia                  | 1                   | 2                    |
| **Had-10**  | Pago por modalidad virtual                            | 2                   | 5                    |

---

## Tabla Ordenada por Prioridad

> 16/7 — 2 Alejo · 2 André · 2 Julio · 3 Príncipe · 3 Jesús · 2 Caballero · 2 Vigo

| **ID**      | **Historia de Usuario**                         | **Prioridad** | **Dificultad** |
| ----------------- | ----------------------------------------------------- | ------------------- | -------------------- |
| **US-01**   | Acceso al sistema por rol                             | 4                   | 3                    |
| **Hme-01**  | Visualizar Mapa de Mesas                              | 4                   | 5                    |
| **Hme-02**  | Visualizar platos                                     | 4                   | 3                    |
| **Hcoc-02** | Gestión pedidos en Cocina                            | 4                   | 3                    |
| **Had-01**  | Administración del menú                             | 4                   | 5                    |
| **Had-03**  | Cobro de mesas                                        | 4                   | 8                    |
| **Hme-03**  | Visualización de notificaciones y entrega de pedidos | 3                   | 8                    |
| **Had-05**  | Control de almacén e insumos                         | 3                   | 8                    |
| **Had-06**  | Vinculación de insumos a platos                      | 3                   | 5                    |
| **Had-03**  | Gestión de usuarios del sistema                      | 2                   | 5                    |
| **Had-07**  | Historial de pagos por rango de fechas                | 2                   | 5                    |
| **Had-10**  | Pago por modalidad virtual                            | 2                   | 5                    |
| **Had-08**  | Gráficas de ventas y estadísticas                   | 2                   | 5                    |
| **Had-04**  | Reportes de ventas y cierre de caja                   | 2                   | 5                    |
| **Hme-04**  | Modificar mesas                                       | 2                   | 5                    |
| **Had-09**  | Cancelación de cobro por incidencia                  | 1                   | 2                    |

---

## Historias de Usuario

### USUARIOS

---

#### US-01 — Acceso al sistema por rol

**Prioridad:** 4 | **Puntos:** 3

**Descripción:**
Como usuario del sistema (mesero, cocinero o administrador que cumple el rol de cajero), quiero iniciar y cerrar sesión con mis credenciales para acceder únicamente a las funciones que corresponden a mi rol y proteger el sistema de accesos no autorizados.

**Criterios de aceptación:**

1. El sistema muestra un formulario de login con usuario y contraseña accesible para todos los roles.
2. Dado rol y contraseña correctas, el sistema redirige al panel correspondiente: Mapa de mesas (mesero), Monitor de cocina (cocinero) o panel administrativo (admin).
3. Si las credenciales son incorrectas, inexistentes o el usuario está deshabilitado, se muestra un mensaje de error "Credenciales incorrectas".
4. Cada rol solo puede acceder a las vistas y funciones que le corresponden; cualquier intento de acceso a otra sección no correspondiente **al rol con el que se ingresó** es bloqueado.
5. Tras un acceso exitoso, los roles visualizan su nombre del usuario y un botón de cierre de sesión presente en todas las vistas; al usarlo, la sesión se invalida y la página regresa al login.
6. La sesión expira automáticamente tras 30 minutos de inactividad.
7. El Administrador asume también el rol de Cajero, por lo que tiene acceso total a las funciones asignadas al rol de Cajero; siendo el administrador la única figura que puede ejercer simultáneamente ambos roles dentro del sistema.
8. El rol de Administrador tiene acceso a todas las vistas del sistema; su panel de inicio incluye accesos directos a las secciones de todos los demás roles (mesero, cocinero y cajero), pudiendo supervisar visualmente Mapa de Mesas, Notificación de entregas y Monitor de Cocina.

---

#### Hme-01 — Visualizar Mapa de mesas

**Prioridad:** 4 | **Puntos:** 5

**Descripción:**
Como mesero, quiero visualizar el estado de todas las mesas en tiempo real para saber cuáles están libres u ocupadas y acceder a las acciones correspondientes a mi rol.

**Criterios de aceptación:**

1. El sistema muestra un mapa simple con 10 mesas y su estado en tiempo real: Libre, Ocupada. También muestra la opción "Para llevar" para clientes que no requieren mesa; esta última opción no requiere de estado.
2. Al seleccionar una mesa libre o la opción 'Para llevar', se iniciará un nuevo pedido, y el estado de la mesa cambiará automáticamente a 'Ocupada' una vez que la orden sea confirmada.
3. El mesero puede presionar una mesa Ocupada para añadir más ítems al pedido activo de esa mesa. Una mesa puede acumular múltiples ítems añadiendo pedidos durante la visita sin interrumpirse entre uno u otro.
4. El mesero puede presionar una mesa Libre para ir a la vista de selección de la carta. Si no confirma ningún pedido y regresa, la mesa permanece en estado Libre.

> **NUEVO:** Agregar criterio de para llevar y criterio para notas.

---

#### Hme-02 — Visualizar platos

**Prioridad:** 4 | **Puntos:** 3

**Descripción:**
Como mesero quiero explorar el menú por categorías (Entradas, de fondo, bebidas, etc) para seleccionar ítems y confirmar un pedido.

**Criterios de aceptación:**

1. La vista de platos se abre al presionar una mesa/opción "Para llevar" desde el mapa y muestra el menú organizado por categorías.
2. Cada categoría debe mostrar la lista de **items** **ordenados alfabéticamente** disponibles listos a preparar.
3. Cada **ítem** debe incluir datos mínimos: nombre, precio. Adicionalmente: Descripción breve e imagen.
4. **El sistema permitirá visualizar el menú entero separado por categorías indicando claramente si un plato está disponible o no.**
5. El mesero puede seleccionar uno o varios platos de cualquier categoría y ajustar cantidades antes de confirmar en un apartado lateralizado a la derecha llamado "Pedido Actual".
6. Si el pedido es para mesa, el mesero podrá hacer uso de un switch "para llevar" al tomar un pedido; el mesero puede marcar ítems individuales como "para llevar" dentro de un mismo pedido.
7. Los **ítems** deben ser seleccionables para poder listar el pedido de la mesa y poder modificar cantidades antes de confirmar el pedido.
8. El pedido solo puede ser confirmado si se enlista al menos un ítem.
9. En el apartado "Pedido Actual" aparece una ventana de "Notas adicionales" por si hay alguna petición especificada por el cliente.
10. Al confirmar el pedido, la mesa cambia a estado Ocupada en tiempo real para todos los usuarios y el pedido aparece en cocina con estado pendiente.
11. Antes de confirmar el pedido, el mesero puede eliminar cualquier ítem de la lista; un ítem se elimina del pedido al modificar su cantidad a 0.
12. **Existirán ítems predeterminados con datos predefinidos sin la necesidad que se hayan configurado anteriormente a través de otras historias.**
13. **El mesero puede volver al mapa de mesas en cualquier momento antes de confirmar el pedido, lo que anulará el pedido por completo.**
14. **Ingresar a una mesa con un pedido activo te hará ver en el apartado de Pedido Actual los ”ítems del pedido”(ítems tomados antes) y “Nuevos ítems” en donde se tomará el nuevo pedido.**

---

#### Hme-03 — Visualización de notificaciones y entrega de pedidos

**Prioridad:** 3 | **Puntos:** 8

**Descripción:**
Como mesero, quiero recibir una alerta visual cuando un pedido esté listo en cocina y poder marcarlo como entregado una vez que lo llevo a la mesa, para mantener el flujo del servicio sin tener que consultar constantemente a cocina.

**Criterios de aceptación:**

1. Cuando cocina marca un pedido como Listo, aparece una notificación visual en tiempo real en la pantalla del mesero sin recargar la página.
2. La alerta indica claramente el número de mesa y el pedido correspondiente.
3. La notificación permanece visible y resaltada en la interfaz hasta que el mesero la gestione.
4. El mesero puede marcar el pedido como Entregado, lo que elimina el mensaje de la vista del mesero.
5. Si hay varios pedidos listos simultáneamente, se muestra una alerta por cada uno ordenadamente.
6. El mesero puede consultar el estado actual de todos los pedidos activos de cualquier mesa.
7. Se debe permitir acceder al detalle del pedido desde la alerta.
8. El cambio de estado debe realizarse de 	forma rápida desde la interfaz principal o desde el detalle del pedido.
9. Debe registrar la fecha, hora y usuario que marcó el pedido como entregado.
10. Los ítems individuales marcados como “Listo” por el cocinero deberán ser notificados de igual manera que si se tratase de un pedido completo listo.
11. No se debe permitir marcar como entregado un pedido que no esté en estado "listo".

Hme-04 — **Modificar mesas**

**Prioridad:** 2 | **Puntos:** 5

**Descripción:**
**Como mesero, quiero mover el pedido activo de una mesa a otra mesa o juntar dos mesas asociándolas a un mismo pedido (por ejemplo "Mesa 1 y 2") cuando llega un grupo grande, para reorganizar la atención sin perder el historial de consumo y mantener una sola cuenta cuando los clientes ocupan más de una mesa.**

**Criterios de aceptación:**

1. El mesero puede acceder a la vista "Modificar mesas" desde el mapa de mesas mediante un botón en el encabezado de la pantalla.
2. El mesero puede mover el pedido activo de una mesa Ocupada hacia otra mesa Libre; al confirmar, la mesa origen queda Libre y la mesa destino queda Ocupada en tiempo real para todos los usuarios.
3. El mesero puede juntar dos o más mesas asociando un mismo pedido a ellas; el sistema las identifica como una sola unidad en el mapa de mesas y en la pantalla de cobro (por ejemplo "Mesa 1 y 2").
4. Al juntar mesas, todas las mesas asociadas cambian a estado Ocupada en tiempo real para todos los usuarios.
5. El cajero ve un solo total acumulado al cobrar mesas juntadas, sumando los ítems de todos los pedidos asociados; al confirmar el pago, todas las mesas asociadas se liberan al mismo tiempo.
6. El mesero puede separar mesas previamente juntadas; al hacerlo, las mesas adicionales vuelven a estado Libre y el pedido permanece asociado a la mesa principal.
7. No se puede mover ni juntar una mesa cuyo pedido esté en estado Pagado.
8. La operación queda registrada con fecha, hora, usuario, mesa origen y mesa(s) destino.

---

### COCINERO

> **NUEVO:** Criterio 1: Visualizar si es para llevar o alguna nota.

---

#### HCoc-01 — Gestión de pedidos pendientes en cocina

**Prioridad:** 4 | **Puntos:** 3

**Descripción:**
Como cocinero, quiero ver en tiempo real todos los pedidos que llegan a cocina con sus detalles y poder actualizar su estado durante la preparación, para organizar el trabajo y notificar al mesero cuando esté listo.

**Criterios de aceptación:**

1. La pantalla de cocina muestra todos los pedidos activos separados por ítems, ordenados por hora de llegada, con número de mesa, ítems, cantidades, si es para llevar o si hay alguna nota sobre el pedido.
2. Los ítems de pedidos nuevos aparecen como "Pendientes" automáticamente en tiempo real sin recargar la página y ordenados por tiempo de llegada.
3. Los pedidos e ítems se distinguen visualmente por estado: Pendiente, En proceso, Listo.
4. El cocinero puede cambiar el estado de un pedido de "Pendiente" a "En proceso" cuando comienza la preparación.
5. Los pedidos o ítems en estado 'Listo' permanecen visibles en cocina hasta que pasen 5 min; luego desaparecen automáticamente y sin recargar la página.
6. Cada ítem dentro de un pedido puede marcarse de forma independiente como 'Listo' cuando el cocinero termina su preparación, pasando al estado "Listo" especificando la mesa sin necesidad de que todos los ítems del pedido estén finalizados.
7. Cuando todos los ítems de un pedido han sido marcados como 'Listo', el pedido completo cambia automáticamente a estado 'Listo'.
8. La pantalla de cocina muestra el progreso de cada pedido indicando cuántos ítems están listos y cuántos están pendientes (ej: 1/2 ítems listos), para que el cocinero tenga visibilidad del avance.
9. Al haberse añadido un pedido a una mesa con pedido activo listo, se debe visualizar un nuevo pedido desde pendiente para la misma mesa.

> **PENDIENTE:** Criterio de historial de pedidos listos junto con una alerta visual/sonora.

---

### CAJERO / ADMIN / ALMACENERO

> Nota: Administrador, cajero y almacenero son la misma persona.

---

#### Had-01 — Cobro de mesas

**Prioridad:** 4 | **Puntos:** 8

> **NUEVO:** Criterio 6 de pago parcial.

**Descripción:**
Como cajero, quiero ver el consumo total de una mesa y procesar el cobro mediante Efectivo, para cerrar correctamente la atención de cada grupo de clientes de forma rápida e intuitiva.

**Criterios de aceptación:**

1. El cajero visualiza un mapa de mesas donde puede seleccionar cualquier mesa ocupada o el pedido "Para llevar" activo; al seleccionarla, el sistema redirige a una pantalla con el detalle del cobro donde se muestra el historial completo de pedidos de esa mesa con sus ítems, cantidades, notas, precios unitarios y el total acumulado a cobrar.
2. El sistema muestra el monto total a cobrar por efectivo.
3. El cajero puede activar el modo "Pago parcial" desde la vista de cobro de una mesa. Se marcanlos items a pagar y a partir de ahí calcular y cobrar el montor; el sistema registra ese pago parcial y muestra el saldo pendiente actualizado de la mesa. El proceso puede repetirse hasta que el saldo llegue a cero.
4. El cajero ingresa el monto recibido y el sistema calcula y muestra automáticamente el vuelto a entregar al cliente.
5. El cajero selecciona el tipo de comprobante y llena los datos respectivos: Boleta (requiere DNI del cliente) o Factura (requiere RUC y razón social de la empresa).
6. Al confirmar el pago, el sistema genera automáticamente el comprobante en formato PDF con los datos del cliente, nombre del restaurante, fecha, hora, lista de ítems, cantidades, precios y total cobrado, que podrá descargar, habilitando la posibilidad de imprimir el comprobante.
7. El PDF generado queda guardado en el sistema agrupado por día para consulta posterior.
8. El pago queda registrado con: tipo de comprobante, modalidad de pago, monto cobrado, vuelto entregado (si aplica), fecha, hora y número de mesa.
9. **10. Una mesa “Ocupada” se podrá liberar manualmente desde la pantalla de Selector de mesas solo cuando la totalidad de pedidos en una mesa hayan sido completamente cobrados, presionando en la mesa totalmente cobrada para Liberarla.**

> ⚠️ **SIEMPRE GENERAR UNA BOLETA O FACTURA AL CONFIRMAR PAGO**
> ⚠️ **NO ADELANTAR LA IMPLEMENTACIÓN, SOLO LO ESPECIFICADO EN LOS CRITERIOS**

---

#### Had-02 — Administración del menú

**Prioridad:** 4 | **Puntos:** 5

**Descripción:**
**Como administrador, quiero gestionar el menú del restaurante creando, editando y eliminando categorías y platos con toda su información (nombre, precio, categoría, imagen y disponibilidad), para que el mesero siempre tenga el menú actualizado y visualmente claro al tomar pedidos.**

**Criterios de aceptación:**

1. El admin puede crear, editar y eliminar categorías del menú (Entradas, Platos de fondo, Bebidas, etc).
2. El admin puede agregar ítems con nombre, precio, categoría, descripción e imagen, así como editarlos o eliminar los existentes.
3. El admin puede subir opcionalmente una imagen JPG o PNG por plato; si no tiene imagen se muestra un ícono genérico.
4. El admin puede marcar un ítem ya creado como Agotado; este queda bloqueado para el mesero en tiempo real.
5. Después marcado como Agotado, el ítem puede volver a ser reactivado, volviendo a estar seleccionable inmediatamente para los meseros.
6. No se puede eliminar una categoría que tenga platos activos asociados.
7. Todos los cambios en el menú se reflejan en tiempo real a la vista del mesero.
8. El mesero puede ver la imagen en miniatura junto al plato y ampliarla tocando sobre ella.

---

#### Had-03 — Gestión de usuarios del sistema

**Prioridad:** 2 | **Puntos:** 5

**Descripción:**
**Como administrador, quiero visualizar, crear, editar y deshabilitar los usuarios del sistema (meseros y cocineros) para controlar quién tiene acceso y con qué rol, facilitando la gestión del personal.**

**Criterios de aceptación:**

1. El administrador visualiza el nombre, usuario, rol, estado  y acciones asociadas a cada usuario creado en el sistema pudiendo ver la lista de usuarios Activos y deshabilitados por separado.
2. El administrador puede crear un usuario ingresando nombre completo, nombre de usuario, contraseña y rol (mesero o cocinero), apareciendo en la lista de Usuarios Activos.
3. El sistema valida que el nombre de usuario no esté duplicado y que la contraseña tenga al menos 6 caracteres.
4. El administrador puede editar el nombre, usuario o contraseña de cualquier cuenta existente.
5. El administrador puede deshabilitar un usuario; este no puede iniciar sesión mientras esté deshabilitado.
6. El administrador puede activar un usuario deshabilitado en cualquier momento presionando en Habilitar dentro de Usuarios deshabilitados.
7. El administrador no puede deshabilitar ni eliminar su propia cuenta.
8. Las acciones de deshabilitar y habilitar usuarios deben realizarse tras una confirmación.

---

#### Had-04 — Reportes de ventas y cierre de caja

**Prioridad:** 2 | **Puntos:** 5

**Descripción:**
Como cajero, quiero consultar el reporte de ventas del día en pantalla, exportarlo a Excel y ejecutar el cierre de caja diario para tener control financiero del restaurante y registrar los ingresos de cada jornada.

**Criterios de aceptación:**

1. El cajero puede ver en pantalla el reporte de ventas y datos relacionados del día con: Ganancias del día, número de mesas atendidas, pedidos completados, ítems vendidos y platos más vendidos.
2. El reporte se actualiza automáticamente conforme se confirman nuevos pagos durante el día.
3. El cajero puede presionar un botón que exporta el reporte a un archivo .xlsx con los Detalles del día en donde se incluyen datos como: Platos más vendidos, Total de Ventas, Pedidos Pagados, Ítems pagados individualemnte y su mesa, id único, Precio Unitario, Hora de Pedido, Hora de Pago, Fecha(creación de archivo), Hora(creación de archivo) y nombre del usuario que lo ejecutó.
4. El archivo Excel incluye una fila de totales y lleva la fecha en el nombre del archivo.
5. El cajero puede ejecutar el cierre de caja, lo que refresca los datos dentro de reporte de ventas para dividir jornadas laborales.
6. El cierre queda registrado con fecha, hora y nombre del usuario que lo ejecutó, se descarga un archivo .xlsx con los mismos detalles que como si se presionase en exportar.

---

#### Had-05 — Control de almacén e insumos

**Prioridad:** 3 | **Puntos:** 8

**Descripción:**
Como almacenero, quiero gestionar el inventario de insumos del restaurante organizados por categorías, registrar las entradas de mercadería y configurar el stock mínimo de alerta, para garantizar que siempre haya ingredientes suficientes para los platos del menú.

**Criterios de aceptación:**

1. El almacenero puede crear categorías de insumos (Carnes, Mariscos, Verduras, Bebidas, etc.) y registrar insumos con nombre, unidad (kg/g/unidades) y stock mínimo.
2. Al llegar la mercadería, el cajero registra la cantidad recibida y el sistema la suma al stock actual del insumo.
3. Cuando el stock de un insumo baja del mínimo configurado, el sistema muestra una alerta visual en tiempo real al mesero.
4. Cuando el stock de un insumo llega a cero, todos los platos que lo usan se bloquean automáticamente para el mesero.
5. Al registrar nueva mercadería y el stock supera cero, los platos bloqueados se desbloquean automáticamente.
6. El almacenero puede ver en todo momento el stock actual de todos los insumos, destacando en rojo los agotados y en amarillo los que están bajo el mínimo.

---

#### Had-06 — Vinculación de insumos a platos

**Prioridad:** 3 | **Puntos:** 5

> **Nota:** Cambio de nombre y descripción en el Had-06 aún no aplicado al .md.

**Descripción:**
Como administrador del sistema, quiero asociar insumos del almacén a cada plato del menú indicando la cantidad que se consume por unidad según los ingredientes que se usen en un plato, para que el sistema descuente el stock automáticamente cada vez que se confirme un pedido con ese plato.

**Criterios de aceptación:**

1. Cada plato puede tener asociados uno o más insumos con su cantidad y unidad exacta.
2. Un mismo insumo puede formar parte de la receta de varios platos.
3. Al confirmar un pedido con **n** unidades de un plato, el sistema descuenta **n** veces la receta de ese plato del stock.
4. El descuento de todos los insumos del pedido ocurre de forma simultánea al momento de confirmar.
5. Si el stock de un insumo es insuficiente para completar el pedido, el sistema alerta al mesero antes de confirmar.
6. El cajero puede consultar y modificar la receta de cualquier plato desde el módulo de almacén.

---

#### Had-07 — Historial de pagos por rango de fechas

**Prioridad:** 2 | **Puntos:** 5

**Descripción:**
Como cajero, quiero consultar el historial de pagos de días anteriores filtrando por rango de fechas y exportarlo a Excel, para revisar transacciones pasadas y hacer seguimiento de los ingresos del restaurante.

**Criterios de aceptación:**

1. El cajero puede seleccionar una fecha de inicio y fin para consultar pagos en un intervalo determinado de días.
2. El sistema muestra todos los pagos del período consultado con los datos: Total acumulado, Número de Pagos encontrados, Promedio por pago, así como la mesa fecha, hora y monto de cada pago individual.
3. Los resultados pueden exportarse a Excel con el formato .xlsx con el rango de fechas en el título con los datos: Total acumulado, Total de pagos, ID transacción, Mesa, Fecha, Hora, Tipo de comprobante,  Identificador Tributario, Método, Modalidad, Cajero(nombre del usuario) y Monto.
4. El rango máximo de consulta es de 90 días hacia atrás, si se intenta una consulta fuera de esos límites aparece un mensaje de alerta y un error de carga en Pagos del Periodo.
5. Se puede limpiar la búsqueda por fecha haciendo uso del botón Limpiar.

---

#### Had-08 — Gráficas de ventas y estadísticas

**Prioridad:** 2 | **Puntos:** 5

**Descripción:**
Como cajero, quiero ver gráficas de ventas de la última semana y del mes actual, junto con un panel de indicadores clave del día, para analizar tendencias y tomar decisiones sobre el negocio.

**Criterios de aceptación:**

1. El panel principal muestra indicadores del día: total vendido, mesas activas y pedidos en cocina.
2. El sistema muestra una gráfica de barras con las ventas diarias de los últimos 7 días.
3. El sistema muestra una gráfica con el total de ventas del mes actual.
4. Las gráficas se actualizan al ejecutar el cierre de caja diario.
5. El cajero puede ver el total semanal y mensual junto a las gráficas.
6. Las alertas de insumos bajo stock aparecen como notificaciones en el panel principal.

---

#### Had-09 — Cancelación de cobro por incidencia

**Prioridad:** 1 | **Puntos:** 2

**Descripción:**
Como cajero, quiero tener la opción de liberar una mesa de forma forzada y sin registrar pago en caso de pérdidas (platos mal servidos, fugas, etc.) para poder reinsertar dicha mesa en la lista de Libres lo antes posible.

**Criterios de aceptación:**

1. Botón 'Liberar mesa forzosamente' disponible sin confirmar pago.
2. Se puede solo liberar el pago por un ítem y no toda la mesa.
3. Al liberar, el estado cambia a "libre" en todo el sistema en tiempo real.
4. Se registra el costo del pedido de la mesa en cuestión como pérdida en el historial.
5. Se solicita confirmación antes de liberar la mesa.

---

#### Had-10 — Pago por modalidad virtual

**Prioridad:** 2 | **Puntos:** 5

**Descripción:**
Como cajero, quiero ver el consumo total de una mesa y tener la opción de procesar el cobro mediante bancas móviles, para cerrar correctamente la atención de cada grupo de clientes de forma rápida e intuitiva.

**Criterios de aceptación:**

1. El cajero puede seleccionar cualquier mesa del mapa y ver el historial completo de pedidos con ítems, cantidades, precios y total acumulado.
2. El sistema muestra el monto total a cobrar.
3. El sistema muestra el QR asociado al negocio y el monto, para que el cliente realice la transferencia. El cajero confirma el pago manualmente al recibirlo.
4. El pago queda registrado con: método de pago, monto, fecha, hora y número de mesa.
5. Solo después de confirmar el pago, el cajero puede marcar la mesa como Libre.

> **Pregunta al profe:** Al añadir esta historia, ¿qué tan específica debe ser? ¿Ponemos los mismos criterios que en la historia de Cobro de mesa solo cambiando el método de pago?

---

## Historias Épicas

### Épica 1: Autenticación y Usuarios

| **ID**     | **Historia de Usuario**    | **Prioridad** | **Dificultad** | **Descripción breve**                                                                           |
| ---------------- | -------------------------------- | ------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| **US-01**  | Acceso al sistema por rol        | 4                   | 3                    | Login/logout con credenciales por rol, redirección al panel correspondiente y expiración de sesión. |
| **Had-03** | Gestión de usuarios del sistema | 2                   | 5                    | El cajero crea, edita y deshabilita cuentas de meseros y cocineros.                                    |

### Épica 2: Gestión de Mesas

| **ID**     | **Historia de Usuario**        | **Prioridad** | **Dificultad** | **Descripción breve**                                                           |
| ---------------- | ------------------------------------ | ------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| **Hme-01** | Visualizar Mapa de Mesas             | 4                   | 5                    | Mapa con las 10 mesas y su estado en tiempo real: Libre / Ocupada.                     |
| **Had-09** | Cancelación de cobro por incidencia | 1                   | 2                    | El cajero libera una mesa sin cobro en casos de incidencia; se registra como pérdida. |
| **Hme-04** | Modificar mesas                      | 2                   | 3                    | Mover pedido a otra mesa o juntar mesas en un mismo pedido.                            |

### Épica 3: Gestión de Pedidos

| **ID**      | **Historia de Usuario**                         | **Prioridad** | **Dificultad** | **Descripción breve**                                                                           |
| ----------------- | ----------------------------------------------------- | ------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| **Hme-02**  | Visualizar Platos                                     | 4                   | 3                    | El mesero navega el menú por categorías, selecciona platos disponibles y confirma el pedido.         |
| **Hme-03**  | Visualización de notificaciones y entrega de pedidos | 3                   | 8                    | El mesero recibe alerta en tiempo real cuando un pedido está listo y lo marca como entregado.         |
| **HCoc-01** | Gestión de pedidos en cocina                         | 3                   | 3                    | El cocinero ve los pedidos en tiempo real, cambia su estado y notifica al mesero cuando están listos. |

### Épica 4: Gestión de Almacén, Inventario y Menú

| **ID**     | **Historia de Usuario**    | **Prioridad** | **Dificultad** | **Descripción breve**                                                                                |
| ---------------- | -------------------------------- | ------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Had-05** | Control de almacén e insumos    | 3                   | 8                    | Gestión de insumos por categorías, registro de entradas y alertas de stock mínimo en tiempo real.        |
| **Had-06** | Vinculación de insumos a platos | 3                   | 5                    | Define qué insumos y cantidades usa cada plato para descontar stock automáticamente al confirmar pedidos. |
| **Had-02** | Administración del menú        | 4                   | 5                    | El cajero crea, edita y elimina categorías y platos, y controla su disponibilidad en tiempo real.          |

### Épica 5: Cobro y Pagos

| **ID**     | **Historia de Usuario** | **Prioridad** | **Dificultad** | **Descripción breve**                                                                        |
| ---------------- | ----------------------------- | ------------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| **Had-01** | Cobro de mesas                | 4                   | 8                    | El cajero ve el consumo total, procesa el cobro en efectivo, calcula vuelto y libera la mesa.       |
| **Had-10** | Pago por modalidad virtual    | 2                   | 5                    | El cajero puede cobrar con Yape, además de efectivo; el pago queda registrado con método y monto. |

### Épica 6: Reportes y Estadísticas

| **ID**     | **Historia de Usuario**          | **Prioridad** | **Dificultad** | **Descripción breve**                                                             |
| ---------------- | -------------------------------------- | ------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| **Had-04** | Reportes de ventas y cierre de caja    | 2                   | 5                    | Reporte del día en pantalla, exportable a Excel, con cierre de caja diario registrado.  |
| **Had-07** | Historial de pagos por rango de fechas | 2                   | 5                    | Consulta pagos anteriores filtrando por fechas (hasta 90 días) y exporta a Excel.       |
| **Had-08** | Gráficas de ventas y estadísticas    | 2                   | 5                    | Panel con indicadores del día, gráfica de barras semanal y gráfica mensual de ventas. |

---

## Planificación de Sprints

> Sprint = 3 semanas

### Cálculo de Velocidad del Equipo

| **Parámetro**                   | **Fórmula / Detalle**             | **Resultado**        |
| -------------------------------------- | ---------------------------------------- | -------------------------- |
| Duración del sprint                   | 3 semanas                                | 3 semanas                  |
| Días hábiles por semana              | 3 días                                  | 3 días/semana             |
| Número de personas                    | Equipo completo                          | 7 personas                 |
| Factor de disponibilidad (total días) | 3sem × 3 días/sem × 7 personas        | 63 días                   |
| Puntos brutos (1 pto = 2 días)        | 63 / 2                                   | 31.5 pts/sprint            |
| Contingencia aplicada (90%)            | 31.5 × 0.9                              | 28.35 pts/sprint           |
| **Velocidad máxima del equipo** | Puntos máximos a comprometer por sprint | **28.35 pts/sprint** |

- **Total de dificultad de historias:** 80 pts
- **Distribución:** 80 pts / 3 sprints = 26.6 pts/sprint

### Costo del Proyecto

| Concepto              | Detalle                                             |
| --------------------- | --------------------------------------------------- |
| Inicio Sprint 1       | 8 de mayo 8:00 am                                   |
| Fin Sprint 1          | 29 de mayo 8:00 am                                  |
| Duración total       | 9 semanas × 3 días/semana = 27 días              |
| Pago por día         | S/ 35 soles                                         |
| **Costo total** | 7 personas × 27 días × S/ 35 =**S/ 6,615** |

---

### Sprint 1 (MVP)

|   **ID**   | **Historia**            | **Puntos** |
| :---------------: | :---------------------------- | ---------------- |
|  **US-01**  | Acceso al sistema por rol     | 3                |
| **Hme-01** | Visualizar mapas de mesas     | 5                |
| **Hme-02** | Visualizar platos             | 3                |
| **Had-02** | Administración del menú     | 5                |
| **HCoc-01** | Gestión de pedidos en cocina | 3                |
| **Had-01** | Cobro de mesas                | 8                |
|  **Total**  |                               | **27**     |

### Sprint 2

| **ID**     | **Historia**                                     | **Puntos** |
| ---------------- | ------------------------------------------------------ | ---------------- |
| **Hme-03** | Visualización de notificaciones y entregas de pedidos | 8                |
| **Had-03** | Gestión de usuario del sistema                        | 5                |
| **Had-04** | Reportes de ventas y cierres de cajas                  | 5                |
| **Had-07** | Historial de pagos por rango de fechas                 | 5                |
| **Hme-04** | Modificar mesas                                        | 5                |
| **Total**  |                                                        | **28**     |

### Sprint 3

| **ID**     | **Historia**                   | **Puntos** |
| ---------------- | ------------------------------------ | ---------------- |
| **Had-05** | Control de almacén e insumos        | 8                |
| **Had-06** | Vinculación de insumos a platos     | 5                |
| **Had-08** | Gráficas de ventas y estadísticas  | 5                |
| **Had-09** | Cancelación de cobro por incidencia | 2                |
| **Had-10** | Pago por modalidad virtual           | 5                |
| **Total**  |                                      | **25**     |

> Se intercambiaron Had-06 con Had-04 para que Had-06 y Had-05 estén en el mismo sprint.

---

## Estructura de Épicas e Historias

- **Épicas:** Solo tienen nombre.
- **Historias:** Código, Título, Prioridad, Dificultad, Descripción y Criterios de aceptación.
- **Tareas:** Tipo (Configuración, Diseño, Codificación), Estado, Responsable, Tiempo de realización.

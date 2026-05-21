# 🍽️ RestaurantOS - Sistema de Gestión Integral para Restaurantes

**RestaurantOS** es una plataforma web modular y de alto rendimiento diseñada para automatizar y sincronizar las operaciones críticas de un restaurante en tiempo real. Este sistema conecta de forma fluida el control de accesos, la gestión del salón (mesas), la toma de comandas, la línea de producción en cocina y el cierre de caja.

Proyecto desarrollado bajo metodologías ágiles (Scrum) para el curso de **Agile Development**.

---

## 🚀 Arquitectura y Stack Tecnológico

El proyecto utiliza un modelo de arquitectura **Monorrepo** dividido de la siguiente manera:

* **Frontend (Cliente):** React.js + Tailwind CSS + Socket.io-client.
* **Backend (Servidor):** Node.js + Express.js.
* **Persistencia y ORM:** PostgreSQL + Prisma ORM.
* **Comunicación en Tiempo Real:** WebSockets (`Socket.io`).
* **Seguridad:** Autenticación por Tokens (JWT) y Control de Acceso Basado en Roles (RBAC).

## 📁 Estructura del Proyecto


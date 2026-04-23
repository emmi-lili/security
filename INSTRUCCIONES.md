# Sistema de Gestión de Seguridad - SecurityPro

## 🎯 Descripción General

Sistema completo de gestión y supervisión para empresas de seguridad privada con arquitectura multi-tenant, diseñado para funcionar en web y dispositivos móviles.

## 🚀 Características Principales

### Panel Administrativo
- **Dashboard**: Métricas en tiempo real, gráficos y estadísticas
- **Gestión de Lugares**: Crear y administrar ubicaciones de servicio
- **Gestión de Guardias**: Administrar personal de seguridad
- **Registro de Visitas**: Control centralizado de todas las visitas
- **Sistema de Rondas**: Crear puntos de control y generar códigos QR
- **Monitoreo**: Supervisión en tiempo real de rondas con geolocalización

### Panel de Guardias
- **Registro de Visitas**: Formulario con captura de foto mediante cámara
- **Escaneo de Rondas**: Lector QR para registro de rondas con GPS

## 👥 Credenciales de Acceso

### Administrador
- **Usuario**: `admin`
- **Contraseña**: cualquier texto (modo demo)
- **Acceso**: Panel administrativo completo

### Supervisor
- **Usuario**: `supervisor1`
- **Contraseña**: cualquier texto (modo demo)
- **Acceso**: Panel administrativo completo

### Guardia
- **Usuario**: `guard001` o `guard002`
- **Contraseña**: cualquier texto (modo demo)
- **Acceso**: Panel de guardia (móvil)

## 📱 Flujo de Uso

### Para Administradores

1. **Crear Lugares**
   - Ir a "Lugares" > "Nuevo Lugar"
   - Completar información del lugar
   - Asignar código de acceso y supervisor

2. **Crear Guardias**
   - Ir a "Guardias" > "Nuevo Guardia"
   - Ingresar datos del guardia
   - Asignar ubicaciones de trabajo

3. **Crear Puntos de Control**
   - Ir a "Rondas"
   - Seleccionar un lugar
   - Crear puntos de control (se generan QR automáticamente)
   - Descargar e imprimir los códigos QR
   - Colocar físicamente en las ubicaciones

4. **Monitorear**
   - Dashboard: Ver métricas generales
   - Visitas: Controlar todas las visitas en tiempo real
   - Monitoreo: Supervisar rondas con ubicación GPS

### Para Guardias

1. **Registrar Visitas**
   - Seleccionar ubicación
   - Capturar foto del visitante
   - Completar formulario de ingreso
   - Datos opcionales de vehículo
   - Registrar visita

2. **Realizar Rondas**
   - Ir a "Escanear Ronda"
   - Activar escáner
   - Escanear código QR del punto de control
   - El sistema registra automáticamente:
     - Hora exacta
     - Ubicación GPS
     - Punto de control
     - Guardia que realizó la ronda

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React + TypeScript
- **Routing**: React Router 7
- **UI**: Tailwind CSS
- **Gráficos**: Recharts
- **QR**: qrcode (generación) + html5-qrcode (escaneo)
- **Iconos**: Lucide React
- **Notificaciones**: Sonner
- **Formularios**: React Hook Form
- **Fechas**: date-fns

## 📊 Estructura de Datos

### Lugares
- Condominios, empresas, edificios, hospitales, centros comerciales
- Información completa: dirección, tipo, supervisor, guardias asignados
- Código de acceso único

### Guardias
- Perfil completo con documento, contacto
- Asignación múltiple a ubicaciones
- Control de estado (activo/inactivo)

### Visitas
- Datos del visitante (nombre, documento, foto)
- Destino y persona a visitar
- Información de vehículo (opcional)
- Registro de entrada y salida
- Trazabilidad completa

### Rondas
- Puntos de control con QR único
- Registro con timestamp exacto
- Geolocalización GPS
- Trazabilidad por guardia y ubicación

## 🔒 Seguridad

**Nota importante**: Esta aplicación es una demostración frontend. Para uso en producción:

1. Implementar backend real con Supabase o similar
2. Autenticación segura con tokens JWT
3. Encriptación de datos sensibles
4. Políticas de privacidad y cumplimiento GDPR
5. Backup automático de datos
6. Logs de auditoría
7. Control de acceso basado en roles (RBAC)

## 📈 Características Avanzadas Implementadas

✅ Multi-tenant (separación por empresa)
✅ Geolocalización GPS en tiempo real
✅ Generación automática de códigos QR
✅ Escaneo de QR con cámara del dispositivo
✅ Captura de fotos de visitantes
✅ Dashboard con métricas y gráficos
✅ Filtros y búsqueda avanzada
✅ Exportación de reportes
✅ Diseño responsive (web y móvil)
✅ Notificaciones en tiempo real
✅ Historial completo de actividades
✅ Estados de visitas (activa/completada)
✅ Asignación múltiple (guardias ↔ lugares)

## 🎨 Diseño

- Interfaz moderna y limpia
- Optimizada para uso móvil (guardias)
- Panel administrativo completo (desktop)
- Navegación intuitiva
- Feedback visual claro
- Modo oscuro en iconos y elementos

## 📝 Próximos Pasos Recomendados

Para convertir esto en un sistema de producción:

1. Conectar con Supabase para persistencia real
2. Implementar autenticación segura
3. Añadir notificaciones push
4. Sistema de alertas automáticas
5. Reportes PDF descargables
6. Panel de analíticas avanzado
7. App móvil nativa (React Native)
8. Modo offline con sincronización
9. Chat/mensajería interna
10. Sistema de turnos y horarios

## 🆘 Soporte

Para más información o personalización del sistema, contactar al administrador del proyecto.

---

**SecurityPro** - Sistema profesional de gestión de seguridad privada

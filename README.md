# Sistema de reservas SB

Aplicación web para gestionar las citas de **Santiago Barber**, una barbería que hoy agenda por WhatsApp y en una libreta.

- **Clientes** (`/`): eligen semana, día y hora, y reservan con nombre y celular. Reciben un código `SB-XXXXXX` para consultar o cancelar en **Mi reserva** (`/mi-reserva`).
- **Administrador** (`/admin`): crea la agenda semanal, genera y edita horarios, publica días y comparte la agenda con un código QR. Admite varias cuentas de administrador, con una sola sesión activa a la vez.

**Tecnologías:** React + Vite + Tailwind CSS · Node.js + Express + Sequelize · PostgreSQL.

## Requisitos

- Node.js 22.12 o superior.
- PostgreSQL 17 o superior, instalado localmente o con Docker.

## Cómo ejecutarlo

Los comandos usan `npm.cmd` para que funcionen en PowerShell de Windows; en otros sistemas usa `npm`.

**1. Instalar dependencias**

```powershell
npm.cmd install
```

**2. Crear los archivos de configuración**

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

En `backend/.env`, escribe en `AUTH_SECRET` una cadena aleatoria de 32 caracteres o más, y ajusta `DATABASE_URL` si tu PostgreSQL usa otro usuario, contraseña o puerto.

**3. Preparar la base de datos**

Crea en PostgreSQL el usuario y la base que indica `DATABASE_URL` (por defecto, usuario `srsb`, contraseña `srsb_local` y base `srsb`). Con Docker puedes usar `npm.cmd run db:up`. Después:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

**4. Iniciar la aplicación**

```powershell
npm.cmd run dev
```

- Reservas: http://localhost:5173
- Panel de administración: http://localhost:5173/admin. La primera vez pide crear la cuenta principal. Guarda el código de recuperación que se muestra al final, porque no se vuelve a mostrar.

Para probar desde un celular en la misma red, pon en `VITE_PUBLIC_URL` (en `frontend/.env`) la IP del computador, por ejemplo `http://192.168.1.19:5173`.

## Otros comandos

| Comando | Para qué sirve |
| --- | --- |
| `npm.cmd run check` | Revisión de código, pruebas y compilación |
| `npm.cmd run build` | Compila el frontend en `frontend/dist` |

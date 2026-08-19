# CHUNGUITA Jr — paquete para Vercel

Aplicación Next.js adaptable a computador, celular, tablet y iPad.

## Despliegue

1. Descomprime este ZIP.
2. En Vercel elige **Add New > Project** y sube/importa esta carpeta.
3. En el proyecto de Vercel abre **Storage** y crea una base **Neon Postgres**.
4. Comprueba que Vercel haya agregado `DATABASE_URL`.
5. En **Settings > Environment Variables** agrega:
   - `DEFAULT_USER_PASSWORD`: la clave inicial que usarán los cuatro usuarios.
6. Pulsa **Deploy**.

La aplicación crea automáticamente sus tablas y los cuatro usuarios en el
primer inicio de sesión.

## Usuarios iniciales

- Juan Pablo
- Soledad Cortes
- Miguel Angel Contreras
- Administrador

Todos usan inicialmente el valor configurado en `DEFAULT_USER_PASSWORD`.

## Uso local

1. Copia `.env.example` como `.env.local` y completa los valores.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev`.

## Importante

Este paquete no contiene los datos comerciales guardados en el sitio anterior.
El despliegue de Vercel comienza con una base nueva. Nunca subas `.env.local`
ni claves reales a un repositorio público.

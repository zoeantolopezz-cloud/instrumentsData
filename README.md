# InstrumentsData

Aplicación web sencilla para registrar instrumentos con responsable, nombre, número de parte, número de serie y fotografía.

## Requisitos

- Node.js 18.0 o superior y npm.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrí la URL local que muestra Vite (normalmente `http://localhost:5173`). Sin variables de Supabase, los registros y fotos se guardan en el almacenamiento local del navegador. Esos datos no se comparten con otros dispositivos ni navegadores.

Para generar la versión de producción local: `npm run build`. Para verla: `npm run preview`.

## Conectar una base de datos Supabase

1. Creá un proyecto en Supabase.
2. Ejecutá el contenido de `supabase/schema.sql` desde el SQL Editor del proyecto. Crea la tabla, el bucket público para las fotos y las políticas iniciales.
3. Copiá `.env.example` a `.env.local` y completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de **Project URL** y **anon/public key** de Supabase. No uses la `service_role` key en el navegador.
4. Reiniciá `npm run dev`. La aplicación usará Supabase automáticamente cuando ambas variables estén configuradas.

El esquema incluido deja lectura, alta y eliminación públicas, sin autenticación, para simplificar una primera prueba. Cualquier persona con acceso al sitio podría modificar el inventario. Antes de usar datos reales, agregá autenticación y restringí las políticas RLS según los usuarios autorizados.

## Desplegar en Vercel

1. Subí el repositorio a GitHub.
2. En Vercel, importá el repositorio. La configuración de `vercel.json` usa `npm run build` y publica `dist`.
3. Si conectaste Supabase, agregá `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y (opcionalmente) `VITE_SUPABASE_BUCKET` en **Project Settings → Environment Variables** de Vercel.
4. Volvé a desplegar después de agregar las variables.

Sin esas variables, la aplicación seguirá funcionando con almacenamiento local en cada navegador. Las claves `VITE_*` son visibles en el cliente; solo deben contener la URL y la clave pública/anon de Supabase, nunca una clave secreta.

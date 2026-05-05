# 🛍️ Tiendas Doña Mati — Plataforma E-Commerce Completa

## Descripción General
Plataforma de comercio electrónico completa con tienda pública, dashboard de administrador, integración con WhatsApp y base de datos Supabase.

---

## 🗂️ Estructura del Proyecto

```
tienda-dona-mati/
├── index.html              ← Página principal (tienda pública)
├── admin.html              ← Dashboard del administrador
├── src/
│   ├── styles/
│   │   ├── main.css        ← Estilos globales de la tienda
│   │   └── admin.css       ← Estilos del dashboard
│   ├── lib/
│   │   └── supabase.js     ← Configuración y funciones de Supabase
│   ├── components/
│   │   ├── navbar.js       ← Barra de navegación
│   │   ├── products.js     ← Grid de productos, filtros, búsqueda
│   │   ├── cart.js         ← Carrito de compras
│   │   ├── whatsapp.js     ← Integración WhatsApp
│   │   └── news.js         ← Sección de noticias
│   └── pages/
│       ├── home.js         ← Lógica de la página de inicio
│       └── admin.js        ← Lógica del dashboard admin
├── netlify.toml            ← Configuración de Netlify
└── README.md               ← Esta documentación
```

---

## 🚀 Configuración Paso a Paso

### 1. Crear cuenta en Supabase
1. Ve a https://supabase.com y crea una cuenta gratuita
2. Crea un nuevo proyecto
3. En "Settings → API", copia:
   - **Project URL** (ej: `https://xxxx.supabase.co`)
   - **anon/public key**

### 2. Crear tablas en Supabase
Ejecuta este SQL en el Editor de Supabase:

```sql
-- Tabla de productos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  stock INTEGER DEFAULT 0,
  is_new BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  whatsapp_number TEXT DEFAULT '50412345678',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de noticias/anuncios
CREATE TABLE news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bucket de imágenes (Storage)
-- Ir a Storage en Supabase y crear bucket llamado "products"
-- Configurarlo como público

-- Políticas de acceso (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Lectura pública para todos
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read news" ON news FOR SELECT USING (published = true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);

-- Insertar/editar solo con service_role (admin)
CREATE POLICY "Admin write products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin write news" ON news FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin write categories" ON categories FOR ALL USING (true) WITH CHECK (true);
```

### 3. Configurar el proyecto
Edita el archivo `src/lib/supabase.js` y reemplaza:
```js
const SUPABASE_URL = 'TU_URL_DE_SUPABASE';
const SUPABASE_ANON_KEY = 'TU_CLAVE_PUBLICA';
```

### 4. Configurar WhatsApp
En `src/lib/supabase.js` cambia el número:
```js
const WHATSAPP_NUMBER = '50412345678'; // Tu número con código de país
```

### 5. Contraseña del Admin
En `src/pages/admin.js`, cambia la contraseña:
```js
const ADMIN_PASSWORD = 'TU_CONTRASEÑA_SEGURA';
```

### 6. Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit - Tiendas Doña Mati"
git remote add origin https://github.com/TU_USUARIO/tienda-dona-mati.git
git push -u origin main
```

### 7. Desplegar en Netlify
1. Ve a https://netlify.com
2. "Add new site → Import from Git"
3. Conecta tu repositorio de GitHub
4. Build settings: dejar vacío (sitio estático)
5. Click "Deploy"

---

## 📦 Características Incluidas

### Tienda Pública
- ✅ Página de inicio con banner animado
- ✅ Sección "Nueva Mercadería" con badge especial
- ✅ Catálogo con filtros por categoría
- ✅ Búsqueda en tiempo real
- ✅ Carrito de compras con localStorage
- ✅ Botón "Preguntar por WhatsApp" en cada producto
- ✅ Sección de Noticias/Anuncios
- ✅ Diseño completamente responsive

### Dashboard Admin
- ✅ Login con contraseña
- ✅ Subir productos con múltiples imágenes
- ✅ Editar y eliminar productos
- ✅ Gestión de noticias
- ✅ Estadísticas básicas
- ✅ Subida de imágenes a Supabase Storage

---

## 💡 Notas Importantes
- Las imágenes se guardan en Supabase Storage (gratis hasta 1GB)
- El carrito se guarda en localStorage del navegador
- El admin requiere contraseña (configurar en admin.js)
- WhatsApp genera un mensaje automático con nombre y precio del producto

-- ============================================================
-- supabase-setup.sql
-- Pega todo este código en el Editor SQL de Supabase
-- Proyecto: Tiendas Doña Mati
-- ============================================================

-- ─── 1. Tabla de Categorías ────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  icon       TEXT DEFAULT '📦',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Tabla de Productos ─────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  price          DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  original_price DECIMAL(10,2),
  category       TEXT,
  images         TEXT[] DEFAULT '{}',
  stock          INTEGER DEFAULT 0 CHECK (stock >= 0),
  is_new         BOOLEAN DEFAULT false,
  is_featured    BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Tabla de Noticias ──────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT,
  image_url  TEXT,
  published  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Trigger para updated_at automático ─────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 5. Row Level Security (RLS) ───────────────────────────
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE news       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Lectura pública (todos pueden ver)
CREATE POLICY "Lectura publica productos"
  ON products FOR SELECT USING (true);

CREATE POLICY "Lectura publica noticias"
  ON news FOR SELECT USING (published = true);

CREATE POLICY "Lectura publica categorias"
  ON categories FOR SELECT USING (true);

-- Escritura pública (para el admin desde el frontend)
-- NOTA: En producción usa un service_role key en el backend
CREATE POLICY "Escritura productos"
  ON products FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Escritura noticias"
  ON news FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Escritura categorias"
  ON categories FOR ALL USING (true) WITH CHECK (true);

-- ─── 6. Datos de ejemplo ───────────────────────────────────

-- Categorías de ejemplo
INSERT INTO categories (name, slug, icon) VALUES
  ('Ropa',       'ropa',       '👗'),
  ('Zapatos',    'zapatos',    '👟'),
  ('Hogar',      'hogar',      '🏠'),
  ('Electrónica','electronica','📱'),
  ('Juguetes',   'juguetes',   '🧸'),
  ('Alimentos',  'alimentos',  '🛒')
ON CONFLICT (slug) DO NOTHING;

-- Productos de ejemplo
INSERT INTO products (name, description, price, original_price, category, stock, is_new, is_featured) VALUES
  ('Camisa casual azul',    'Camisa de algodón, muy cómoda para el día a día.',  250.00, 300.00, 'ropa',  15, true,  true),
  ('Vestido floral',        'Vestido de verano con estampado floral moderno.',   350.00, NULL,   'ropa',   8, true,  false),
  ('Tenis deportivos',      'Tenis cómodos para uso diario y deporte.',          650.00, 800.00, 'zapatos',10, false, true),
  ('Set de cocina',         'Set de utensilios de cocina antiadherentes.',       450.00, NULL,   'hogar',   5, false, true),
  ('Auriculares Bluetooth', 'Auriculares inalámbricos con gran calidad de sonido.', 900.00, 1100.00, 'electronica', 3, true, false),
  ('Muñeca articulada',     'Muñeca con accesorios incluidos, ideal para niñas.', 180.00, NULL,  'juguetes', 20, true, false)
ON CONFLICT DO NOTHING;

-- Noticia de bienvenida
INSERT INTO news (title, content, published) VALUES
  ('¡Bienvenidos a Tiendas Doña Mati!',
   'Nos complace anunciar la apertura de nuestra tienda en línea. Aquí encontrarás los mejores productos al mejor precio. ¡Visítanos pronto!',
   true)
ON CONFLICT DO NOTHING;

-- ─── 7. Storage Bucket ─────────────────────────────────────
-- IMPORTANTE: Ir a Supabase → Storage → New Bucket
-- Nombre: "products"
-- Tipo: PUBLIC (marcar como público)
-- Esto NO se puede hacer con SQL, debe hacerse en la interfaz web

-- ─── Verificar las tablas creadas ──────────────────────────
SELECT 'categories' as tabla, COUNT(*) as registros FROM categories
UNION ALL
SELECT 'products',  COUNT(*) FROM products
UNION ALL
SELECT 'news',      COUNT(*) FROM news;

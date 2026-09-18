-- ============================================================================
--  dump.sql — Base de datos cafeteria_itlc
--  Esquema reconstruido desde el código del backend + catálogo del frontend
--  (la BD local original ya no existe en el disco)
-- ============================================================================

SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS cafeteria_itlc;
USE cafeteria_itlc;
SET FOREIGN_KEY_CHECKS = 0;

-- ── roles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id_rol  INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── usuarios ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario        INT AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(50)  NOT NULL,
  apellido          VARCHAR(50)  NOT NULL,
  telefono          VARCHAR(10)  NOT NULL UNIQUE,
  contrasena        VARCHAR(255) NOT NULL,
  id_rol            INT NOT NULL DEFAULT 2,
  intentos_fallidos INT NOT NULL DEFAULT 0,
  activo            TINYINT(1) NOT NULL DEFAULT 1,
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── recuperacion_contrasena ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recuperacion_contrasena (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  codigo     VARCHAR(6) NOT NULL,
  expira_en  DATETIME NOT NULL,
  usado      TINYINT(1) NOT NULL DEFAULT 0,
  creado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── categorias ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(50) NOT NULL,
  icono        VARCHAR(10),
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  orden        INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── productos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id_producto  INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria INT NOT NULL,
  nombre       VARCHAR(100) NOT NULL,
  descripcion  TEXT,
  precio       DECIMAL(8,2) NOT NULL,
  imagen_url   VARCHAR(255),
  unidad       VARCHAR(50),
  disponible   TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── promociones ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promociones (
  id_promocion INT AUTO_INCREMENT PRIMARY KEY,
  id_producto  INT NULL,
  titulo       VARCHAR(100) NOT NULL,
  descripcion  TEXT,
  descuento    VARCHAR(50),
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── pedidos ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido  INT AUTO_INCREMENT PRIMARY KEY,
  folio      VARCHAR(10) NOT NULL,
  id_usuario INT NOT NULL,
  total      DECIMAL(8,2) NOT NULL,
  estado     VARCHAR(30) DEFAULT 'pendiente',
  creado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── pedido_detalle ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedido_detalle (
  id_detalle      INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido       INT NOT NULL,
  id_producto     INT NOT NULL,
  cantidad        INT NOT NULL,
  precio_unitario DECIMAL(8,2) NOT NULL,
  subtotal        DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido),
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── pagos ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id_pago     INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido   INT NOT NULL,
  estado      VARCHAR(30) DEFAULT 'pendiente',
  metodo      VARCHAR(30),
  monto       DECIMAL(8,2),
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
--  DATOS SEMILLA
-- ============================================================================

-- Roles: 1 = administrador, 2 = cliente (el registro asigna id_rol = 2)
INSERT INTO roles (id_rol, nombre) VALUES
  (1, 'administrador'),
  (2, 'cliente');

-- Categorías del menú (orden = orden de aparición en el frontend)
INSERT INTO categorias (id_categoria, nombre, icono, activo, orden) VALUES
  (1, 'Comida',       '🍽️', 1, 1),
  (2, 'Bebidas',      '🥤', 1, 2),
  (3, 'Postres',      '🍰', 1, 3),
  (4, 'Otros',        '🛍️', 1, 4),
  (5, 'Promociones',  '🏷️', 1, 5);

-- Productos (catálogo del frontend)
INSERT INTO productos (id_categoria, nombre, descripcion, precio, unidad) VALUES
  -- Comida (1)
  (1, 'Club Sándwich',        'Triple con jamón, pollo, queso, lechuga, tomate y papas.', 80.00, '1 plato'),
  (1, 'Sándwich Caprese',     'Mozzarella, jitomate y albahaca fresca.',                  65.00, '1 pieza'),
  (1, 'Sándwich de Pollo',    'Pollo a la plancha con lechuga y tomate.',                 70.00, '1 pieza'),
  (1, 'Torta de Milanesa',    'Milanesa de res con frijoles y aguacate.',                 75.00, '1 pieza'),
  (1, 'Torta Cubana',         'Jamón, queso, chorizo y milanesa.',                        85.00, '1 pieza'),
  (1, 'Tacos de Barbacoa',    'Barbacoa de res con cilantro, cebolla y salsa.',           65.00, '3 piezas'),
  (1, 'Tacos al Pastor',      'Cerdo al pastor con piña, cilantro y cebolla.',            60.00, '3 piezas'),
  (1, 'Quesadillas',          'Con queso y opción de guisado.',                           55.00, '2 piezas'),
  (1, 'Enchiladas Verdes',    'Con salsa verde, crema y queso.',                          75.00, '4 piezas'),
  (1, 'Combo Sándwich+Agua',  'Sándwich club + agua fresca del día.',                     85.00, '1 combo'),
  (1, 'Combo Tacos+Refresco', '3 tacos al pastor + refresco 600ml.',                      80.00, '1 combo'),
  (1, 'Morisqueta',           'Arroz, frijoles, carne asada y plátano.',                  85.00, '1 plato'),
  (1, 'Ensalada César',       'Lechuga romana, crutones y aderezo césar.',                70.00, '1 plato'),
  -- Bebidas (2)
  (2, 'Americano',            'Café espresso diluido en agua caliente.',                  28.00, '1 vaso'),
  (2, 'Cappuccino',           'Café espresso con espuma de leche.',                       35.00, '1 vaso'),
  (2, 'Latte',                'Espresso con leche vaporizada.',                           38.00, '1 vaso'),
  (2, 'Frappe Mocha',         'Frappé con chocolate, crema batida y toque de chocolate.', 42.00, '1 vaso'),
  (2, 'Frappe Caramelo',      'Frappé con caramelo, crema batida y salsa de caramelo.',   42.00, '1 vaso'),
  (2, 'Jugo de Naranja',      'Jugo natural de naranja recién exprimida.',                28.00, '1 vaso'),
  (2, 'Jugo Verde',           'Nopal, piña, apio, manzana y limón.',                      30.00, '1 vaso'),
  (2, 'Licuado de Fresa',     'Licuado de fresa con leche y azúcar.',                     35.00, '1 vaso'),
  (2, 'Licuado de Plátano',   'Licuado de plátano con leche y canela.',                   32.00, '1 vaso'),
  -- Postres (3)
  (3, 'Cheesecake de Fresa',  'Suave cheesecake con cobertura de fresa.',                 50.00, '1 pieza'),
  (3, 'Pastel de Chocolate',  'Pastel de chocolate con cobertura cremosa.',               42.00, '1 rebanada'),
  (3, 'Pastel de Zanahoria',  'Con betún de queso crema.',                                40.00, '1 rebanada'),
  (3, 'Muffin de Chocolate',  'Suave muffin de chocolate con chispas.',                   25.00, '1 pieza'),
  (3, 'Muffin de Arándanos',  'Muffin esponjoso con arándanos naturales.',                25.00, '1 pieza'),
  (3, 'Muffin de Vainilla',   'Suave muffin con betún de vainilla.',                      22.00, '1 pieza'),
  -- Otros (4)
  (4, 'Refresco',             'Variedad de sabores disponibles.',                         22.00, '600ml'),
  (4, 'Agua Mineral',         'Natural o con gas.',                                       18.00, '600ml'),
  (4, 'Agua Fresca',          'Jamaica, horchata o limón.',                               20.00, '1 vaso'),
  (4, 'Papas Sabritas',       'Papas fritas sabor original.',                             25.00, '1 bolsa'),
  (4, 'Chetos',               'Crujientes y deliciosos.',                                 20.00, '1 bolsa'),
  (4, 'Dulces',               'Variedad de dulces y gomitas.',                            10.00, '1 pieza'),
  (4, 'Galletas Oreo',        'Galletas de chocolate clásicas.',                          20.00, '1 paquete'),
  (4, 'Chocolates',           'Variedad de marcas y sabores.',                            20.00, '1 pieza'),
  -- Promociones (5)
  (5, 'Sándwich + Bebida',    'Sándwich club + bebida incluida.',                         85.00, 'Combo del día'),
  (5, 'Descuento en café',    'En cafés seleccionados, todos los miércoles.',              0.00, '20% OFF'),
  (5, 'Combo Tacos+Refresco', '3 tacos al pastor + refresco 600ml.',                      80.00, 'Precio especial');

-- Promociones destacadas (tarjetas del frontend)
INSERT INTO promociones (id_producto, titulo, descripcion, descuento, activo) VALUES
  (38, 'Sándwich + Bebida',  'Disfruta nuestro combo especial del día con bebida incluida.',        'Combo',    1),
  (39, 'Descuento en café',  'Todos los miércoles 20% de descuento en cafés seleccionados.',        '20% OFF',  1);

-- ⚠️ ADMIN SEMILLA — usuario de ejemplo para entrar al panel /admin
--    Teléfono: 5500000000  ·  Contraseña: Admin1234  (cámbiala tras el primer login)
INSERT INTO usuarios (nombre, apellido, telefono, contrasena, id_rol, intentos_fallidos, activo) VALUES
  ('Admin', 'ITLC', '5500000000', '$2b$12$3Sha5DCnWy8mDvjSCDyKx.kjK8nCQ5KRfRiqPiJWyf.Mn1IM.WEI6', 1, 0, 1);

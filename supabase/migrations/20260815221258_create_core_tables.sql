/*
# Schéma initial - Gestion de buvette

1. Nouvelles tables
  - `profiles` : profil de chaque utilisateur (lié à auth.users)
    - `id` (uuid, PK, référence auth.users)
    - `email` (text)
    - `full_name` (text)
    - `role` (text: 'admin' ou 'employee')
    - `permissions` (text[], liste des permissions accordées à l'employé)
    - `is_active` (boolean, permet de désactiver un accès sans supprimer le compte)
    - `created_at`, `created_by`
  - `products` : catalogue des produits/boissons
    - nom, catégorie, prix d'achat, prix de vente, quantité en stock, seuil d'alerte, disponibilité
  - `sales` : ventes enregistrées à la caisse
    - montant total, mode de paiement, statut (completed/cancelled), auteur, infos d'annulation
  - `sale_items` : détail des articles de chaque vente (copie figée du nom/prix au moment de la vente)
  - `stock_history` : historique des mouvements de stock (entrée, sortie, ajustement)

2. Sécurité
  - RLS activé sur toutes les tables.
  - `profiles` : chacun voit son propre profil, les admins voient tout le monde ; seule la colonne `full_name` est modifiable directement par l'utilisateur (le rôle et les permissions sont protégés).
  - `products` : tous les membres du personnel connectés peuvent consulter le catalogue ; seuls les admins peuvent créer/modifier/supprimer un produit directement.
  - `sales` et `sale_items` : aucune écriture directe autorisée (tout passe par des fonctions sécurisées ajoutées dans une migration suivante) ; lecture réservée aux admins, aux personnes ayant la permission `voir_rapports`, ou à l'auteur de la vente.
  - `stock_history` : lecture réservée aux admins et aux personnes ayant la permission `voir_stocks` ou `gerer_stock` ; aucune écriture directe.

3. Notes importantes
  - Aucune donnée de démonstration n'est insérée : les tables démarrent vides.
  - Les mouvements de stock et les ventes ne pourront être créés que via des fonctions dédiées (prochaine migration), afin qu'un employé ne puisse jamais falsifier un prix, un total ou une quantité de stock.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  permissions text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Autre',
  purchase_price numeric(10,2) NOT NULL DEFAULT 0,
  selling_price numeric(10,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  min_stock_threshold integer NOT NULL DEFAULT 5,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'mobile_money', 'card')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  cancelled_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity integer NOT NULL,
  reason text NOT NULL DEFAULT '',
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_product_id ON stock_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_created_at ON stock_history(created_at DESC);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

-- Fonctions utilitaires (SECURITY DEFINER pour éviter la récursion des policies)
CREATE OR REPLACE FUNCTION is_admin(p_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_uid AND role = 'admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION has_permission(p_uid uuid, p_perm text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_uid AND is_active = true
    AND (role = 'admin' OR p_perm = ANY(permissions))
  );
$$;

REVOKE ALL ON FUNCTION is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
REVOKE ALL ON FUNCTION has_permission(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION has_permission(uuid, text) TO authenticated;

-- profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name) ON profiles TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- products policies
DROP POLICY IF EXISTS "products_select_staff" ON products;
CREATE POLICY "products_select_staff" ON products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "products_insert_admin" ON products;
CREATE POLICY "products_insert_admin" ON products FOR INSERT
  TO authenticated WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "products_update_admin" ON products;
CREATE POLICY "products_update_admin" ON products FOR UPDATE
  TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "products_delete_admin" ON products;
CREATE POLICY "products_delete_admin" ON products FOR DELETE
  TO authenticated USING (is_admin(auth.uid()));

-- sales policies (lecture seule ; écritures via fonctions sécurisées)
DROP POLICY IF EXISTS "sales_select_visible" ON sales;
CREATE POLICY "sales_select_visible" ON sales FOR SELECT
  TO authenticated USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'voir_rapports')
    OR created_by = auth.uid()
  );

-- sale_items policies (lecture seule ; écritures via fonctions sécurisées)
DROP POLICY IF EXISTS "sale_items_select_visible" ON sale_items;
CREATE POLICY "sale_items_select_visible" ON sale_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND (
        is_admin(auth.uid())
        OR has_permission(auth.uid(), 'voir_rapports')
        OR sales.created_by = auth.uid()
      )
    )
  );

-- stock_history policies (lecture seule ; écritures via fonctions sécurisées)
DROP POLICY IF EXISTS "stock_history_select_visible" ON stock_history;
CREATE POLICY "stock_history_select_visible" ON stock_history FOR SELECT
  TO authenticated USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'voir_stocks')
    OR has_permission(auth.uid(), 'gerer_stock')
  );

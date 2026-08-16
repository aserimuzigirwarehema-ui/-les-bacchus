/*
# Fonctions métier sécurisées

1. Objectif
  Toutes les opérations sensibles (encaisser une vente, réapprovisionner un produit,
  annuler une vente, modifier le rôle/les permissions d'un employé) passent par des
  fonctions "SECURITY DEFINER" qui vérifient elles-mêmes les droits de la personne
  qui appelle, recalculent les prix et quantités côté serveur, et écrivent dans
  plusieurs tables de façon atomique. Le navigateur ne peut jamais falsifier un prix,
  un total ou un stock.

2. Fonctions ajoutées
  - `process_sale(items, payment_method)` : encaisse une vente. Vérifie le stock et
    la disponibilité de chaque produit, calcule le total à partir du prix de vente
    réel en base, décrémente le stock, journalise la sortie de stock, insère la vente
    et ses lignes. Réservé aux admins et aux personnes ayant la permission
    `enregistrer_vente`.
  - `restock_product(product_id, quantity, reason)` : ajoute du stock à un produit et
    journalise l'entrée. Réservé aux admins et aux personnes ayant la permission
    `gerer_stock`.
  - `cancel_sale(sale_id)` : annule une vente existante, restitue le stock vendu et
    journalise l'ajustement. Réservé aux admins et aux personnes ayant la permission
    `annuler_vente`.
  - `admin_update_employee(user_id, role, permissions, is_active)` : modifie le rôle,
    les permissions et l'activation d'un profil employé. Réservé aux admins.

3. Sécurité
  - Chaque fonction vérifie `auth.uid()` (jamais un paramètre fourni par le client)
    pour authentifier l'appelant.
  - `search_path` fixé sur chaque fonction pour éviter tout détournement.
  - Droits d'exécution retirés au rôle anonyme, accordés uniquement aux utilisateurs
    connectés (la vérification de permission se fait ensuite à l'intérieur).
*/

CREATE OR REPLACE FUNCTION process_sale(p_items jsonb, p_payment_method text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_quantity integer;
  v_total numeric(10,2) := 0;
  v_item_count integer := 0;
BEGIN
  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(), 'enregistrer_vente')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_payment_method NOT IN ('cash', 'mobile_money', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items in sale';
  END IF;

  v_sale_id := gen_random_uuid();

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 1000 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT * INTO v_product FROM products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found';
    END IF;

    IF NOT v_product.is_available THEN
      RAISE EXCEPTION 'Product % is not available', v_product.name;
    END IF;

    IF v_product.stock_quantity < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
    END IF;

    v_total := v_total + (v_product.selling_price * v_quantity);
    v_item_count := v_item_count + 1;

    UPDATE products SET stock_quantity = stock_quantity - v_quantity, updated_at = now()
    WHERE id = v_product.id;

    INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price)
    VALUES (v_sale_id, v_product.id, v_product.name, v_quantity, v_product.selling_price);

    INSERT INTO stock_history (product_id, type, quantity, reason, performed_by)
    VALUES (v_product.id, 'out', v_quantity, 'Vente', auth.uid());
  END LOOP;

  INSERT INTO sales (id, total_amount, payment_method, status, created_by)
  VALUES (v_sale_id, v_total, p_payment_method, 'completed', auth.uid());

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION process_sale(jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION process_sale(jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION restock_product(p_product_id uuid, p_quantity integer, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(), 'gerer_stock')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 1000000 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  UPDATE products SET stock_quantity = stock_quantity + p_quantity, updated_at = now()
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  INSERT INTO stock_history (product_id, type, quantity, reason, performed_by)
  VALUES (p_product_id, 'in', p_quantity, COALESCE(NULLIF(trim(p_reason), ''), 'Réapprovisionnement'), auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION restock_product(uuid, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION restock_product(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION cancel_sale(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale sales%ROWTYPE;
  v_item sale_items%ROWTYPE;
BEGIN
  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(), 'annuler_vente')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  IF v_sale.status = 'cancelled' THEN
    RAISE EXCEPTION 'Sale already cancelled';
  END IF;

  FOR v_item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products SET stock_quantity = stock_quantity + v_item.quantity, updated_at = now()
      WHERE id = v_item.product_id;

      INSERT INTO stock_history (product_id, type, quantity, reason, performed_by)
      VALUES (v_item.product_id, 'adjustment', v_item.quantity, 'Annulation de vente', auth.uid());
    END IF;
  END LOOP;

  UPDATE sales SET status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now()
  WHERE id = p_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION cancel_sale(uuid) FROM public;
GRANT EXECUTE ON FUNCTION cancel_sale(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION admin_update_employee(
  p_user_id uuid,
  p_role text,
  p_permissions text[],
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_role NOT IN ('admin', 'employee') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE profiles
  SET role = p_role,
      permissions = COALESCE(p_permissions, '{}'),
      is_active = COALESCE(p_is_active, true)
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION admin_update_employee(uuid, text, text[], boolean) FROM public;
GRANT EXECUTE ON FUNCTION admin_update_employee(uuid, text, text[], boolean) TO authenticated;

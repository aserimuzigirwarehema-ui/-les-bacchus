/*
# Restreindre l'exécution des fonctions métier aux utilisateurs connectés

1. Contexte
  Supabase accorde par défaut le droit d'exécution des nouvelles fonctions au rôle
  anonyme (`anon`). Toutes nos fonctions vérifient déjà l'identité de l'appelant en
  interne, mais par prudence on retire explicitement le droit d'exécution à `anon`
  pour qu'aucune de ces fonctions ne soit joignable sans être connecté.

2. Fonctions concernées
  is_admin, has_permission, process_sale, restock_product, cancel_sale,
  admin_update_employee.
*/

REVOKE EXECUTE ON FUNCTION is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION has_permission(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION process_sale(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION restock_product(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION cancel_sale(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_update_employee(uuid, text, text[], boolean) FROM anon;

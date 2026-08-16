export type Role = 'admin' | 'employee';

export type Permission =
  | 'enregistrer_vente'
  | 'voir_stocks'
  | 'gerer_stock'
  | 'annuler_vente'
  | 'voir_rapports';

export const ALL_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  {
    key: 'enregistrer_vente',
    label: 'Enregistrer une vente',
    description: 'Accès à la caisse pour encaisser les clients',
  },
  {
    key: 'voir_stocks',
    label: 'Voir les stocks',
    description: "Consulter l'état de l'inventaire",
  },
  {
    key: 'gerer_stock',
    label: 'Gérer les stocks',
    description: 'Réapprovisionner les produits',
  },
  {
    key: 'annuler_vente',
    label: 'Annuler une vente',
    description: 'Annuler une transaction et restituer le stock',
  },
  {
    key: 'voir_rapports',
    label: 'Voir les rapports',
    description: "Accéder au tableau de bord et à l'historique complet des ventes",
  },
];

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  permissions: Permission[];
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_threshold: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'cash' | 'mobile_money' | 'card';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  mobile_money: 'Mobile Money',
  card: 'Carte bancaire',
};

export type SaleStatus = 'completed' | 'cancelled';

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface Sale {
  id: string;
  total_amount: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  created_by: string;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  sale_items?: SaleItem[];
  cashier_name?: string;
}

export type StockMovementType = 'in' | 'out' | 'adjustment';

export interface StockHistoryEntry {
  id: string;
  product_id: string | null;
  type: StockMovementType;
  quantity: number;
  reason: string;
  performed_by: string | null;
  created_at: string;
  product_name?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

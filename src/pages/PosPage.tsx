import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Wallet, Smartphone, CreditCard, Receipt, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import type { CartItem, PaymentMethod, Product, SaleItem } from '@/types';
import { PAYMENT_METHOD_LABELS } from '@/types';

const PAYMENT_ICONS: Record<PaymentMethod, typeof Wallet> = {
  cash: Wallet,
  mobile_money: Smartphone,
  card: CreditCard,
};

export function PosPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<{ items: SaleItem[]; total: number; payment: PaymentMethod; saleId: string } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      showToast('Impossible de charger les produits', 'error');
    } else {
      setProducts((data as Product[]) || []);
    }
    setLoading(false);
  };

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['Toutes', ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category !== 'Toutes' && p.category !== category) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, search, category]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    if (!product.is_available || product.stock_quantity <= 0) {
      showToast(`${product.name} indisponible`, 'error');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          showToast('Stock maximum atteint', 'error');
          return prev;
        }
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock_quantity) {
            showToast('Stock maximum atteint', 'error');
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const checkout = async () => {
    if (cart.length === 0 || !session) return;
    setProcessing(true);

    const itemsJson = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    const { data, error } = await supabase.rpc('process_sale', {
      p_items: itemsJson,
      p_payment_method: paymentMethod,
    });

    if (error) {
      showToast('Vente échouée, veuillez réessayer', 'error');
      setProcessing(false);
      return;
    }

    const saleId = data as string;
    const receiptItems: SaleItem[] = cart.map((item) => ({
      id: '',
      sale_id: saleId,
      product_id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.selling_price,
    }));

    setReceipt({ items: receiptItems, total: cartTotal, payment: paymentMethod, saleId });
    setCart([]);
    setProcessing(false);
    showToast('Vente enregistrée', 'success');
    loadProducts();
  };

  const printReceipt = () => {
    if (!receipt) return;
    const win = window.open('', '_blank', 'width=380,height=600');
    if (!win) {
      showToast('Veuillez autoriser les popups', 'error');
      return;
    }
    const itemsHtml = receipt.items
      .map(
        (i) =>
          `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${(i.unit_price * i.quantity).toLocaleString('fr-FR')} F</td></tr>`
      )
      .join('');
    win.document.write(`
      <html><head><title>Reçu - Les Bacchus</title>
      <style>
        body{font-family:monospace;font-size:12px;padding:16px;max-width:320px;margin:0 auto}
        h1{text-align:center;font-size:18px;margin:8px 0}
        .sub{text-align:center;font-size:11px;color:#666;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        td,th{padding:2px 4px}
        .total{border-top:1px dashed #000;margin-top:8px;padding-top:8px;font-weight:bold;font-size:14px;text-align:right}
        .foot{text-align:center;font-size:10px;margin-top:12px;color:#666}
      </style></head><body>
      <h1>Les Bacchus</h1>
      <div class="sub">Buvette &middot; Reçu de caisse</div>
      <div style="font-size:11px;margin-bottom:8px">Reçu N°: ${receipt.saleId.slice(0, 8).toUpperCase()}<br/>Date: ${new Date().toLocaleString('fr-FR')}</div>
      <table><thead><tr><th>Article</th><th style="text-align:center">Qté</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody></table>
      <div class="total">Total: ${receipt.total.toLocaleString('fr-FR')} F</div>
      <div style="font-size:11px;margin-top:4px">Paiement: ${PAYMENT_METHOD_LABELS[receipt.payment]}</div>
      <div class="foot">Merci de votre visite !</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Product grid */}
      <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Rechercher une boisson..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  category === cat
                    ? 'text-white'
                    : 'surface-2 text-muted hover:text-primary'
                }`}
                style={category === cat ? { backgroundColor: 'rgb(var(--primary))' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner className="w-8 h-8 text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted gap-2">
            <ShoppingCart className="w-12 h-12 opacity-40" />
            <p className="text-sm">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-4">
              {filtered.map((product) => {
                const out = product.stock_quantity <= 0 || !product.is_available;
                const lowStock = !out && product.stock_quantity <= product.min_stock_threshold;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={out}
                    className="card p-4 text-left hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full surface-2 text-muted">{product.category}</span>
                      {out ? (
                        <span className="badge bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">Épuisé</span>
                      ) : lowStock ? (
                        <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Stock faible</span>
                      ) : null}
                    </div>
                    <p className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</p>
                    <div className="flex items-end justify-between mt-2">
                      <span className="text-lg font-bold text-primary">
                        {product.selling_price.toLocaleString('fr-FR')} <span className="text-xs font-normal">F</span>
                      </span>
                      <span className="text-xs text-muted">Stock: {product.stock_quantity}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cart sidebar */}
      <aside className="lg:w-96 shrink-0 surface border-t lg:border-t-0 lg:border-l flex flex-col" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgb(var(--border))' }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Panier</h2>
            {cart.length > 0 && (
              <span className="badge text-white" style={{ backgroundColor: 'rgb(var(--primary))' }}>{cart.length}</span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-muted hover:text-red-600">Vider</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted gap-2 py-12">
              <ShoppingCart className="w-10 h-10 opacity-40" />
              <p className="text-sm">Panier vide</p>
              <p className="text-xs">Cliquez sur un produit pour l'ajouter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 surface-2 rounded-xl p-3 animate-fade-in">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted">
                      {item.product.selling_price.toLocaleString('fr-FR')} F × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeFromCart(item.product.id)} className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="px-5 py-4 border-t space-y-4" style={{ borderColor: 'rgb(var(--border))' }}>
            <div>
              <p className="text-xs text-muted mb-2">Mode de paiement</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => {
                  const Icon = PAYMENT_ICONS[method];
                  const active = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 transition-all ${
                        active ? 'border-primary text-primary' : 'border-transparent surface-2 text-muted'
                      }`}
                      style={active ? { borderColor: 'rgb(var(--primary))', backgroundColor: 'rgba(var(--primary) / 0.08)' } : {}}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{PAYMENT_METHOD_LABELS[method]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Total</span>
              <span className="text-2xl font-bold text-primary">
                {cartTotal.toLocaleString('fr-FR')} <span className="text-sm font-normal">F</span>
              </span>
            </div>

            <button onClick={checkout} disabled={processing} className="btn btn-primary w-full text-base py-3">
              {processing ? <Spinner /> : <Check className="w-5 h-5" />}
              {processing ? 'Traitement...' : 'Encaisser'}
            </button>
          </div>
        )}
      </aside>

      {/* Receipt modal */}
      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title="Vente enregistrée"
        footer={
          <>
            <button onClick={() => setReceipt(null)} className="btn btn-ghost">Fermer</button>
            <button onClick={printReceipt} className="btn btn-primary">
              <Receipt className="w-4 h-4" />
              Imprimer le reçu
            </button>
          </>
        }
      >
        {receipt && (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto" style={{ backgroundColor: 'rgba(var(--primary) / 0.15)' }}>
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted">Reçu N° {receipt.saleId.slice(0, 8).toUpperCase()}</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {receipt.total.toLocaleString('fr-FR')} F
              </p>
              <p className="text-xs text-muted mt-1">{PAYMENT_METHOD_LABELS[receipt.payment]}</p>
            </div>
            <div className="surface-2 rounded-xl p-3 space-y-1">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-medium">{(item.unit_price * item.quantity).toLocaleString('fr-FR')} F</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

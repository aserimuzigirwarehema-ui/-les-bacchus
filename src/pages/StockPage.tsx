import { useEffect, useMemo, useState } from 'react';
import { Search, Package, AlertTriangle, Plus, Edit3, Trash2, Boxes, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Spinner, SkeletonCard } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import type { Product } from '@/types';

export function StockPage() {
  const { isAdmin, hasPermission } = useAuth();
  const { showToast } = useToast();
  const canManage = isAdmin || hasPermission('gerer_stock');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [restockReason, setRestockReason] = useState('');
  const [restocking, setRestocking] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) {
      showToast('Impossible de charger les produits', 'error');
    } else {
      setProducts((data as Product[]) || []);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.category.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'low' && !(p.stock_quantity <= p.min_stock_threshold && p.stock_quantity > 0)) return false;
      if (filter === 'out' && p.stock_quantity > 0) return false;
      return true;
    });
  }, [products, search, filter]);

  const stats = useMemo(() => {
    const total = products.length;
    const low = products.filter((p) => p.stock_quantity <= p.min_stock_threshold && p.stock_quantity > 0).length;
    const out = products.filter((p) => p.stock_quantity <= 0).length;
    const value = products.reduce((sum, p) => sum + p.purchase_price * p.stock_quantity, 0);
    return { total, low, out, value };
  }, [products]);

  const handleRestock = async () => {
    if (!restockProduct || restockQty < 1) return;
    setRestocking(true);
    const { error } = await supabase.rpc('restock_product', {
      p_product_id: restockProduct.id,
      p_quantity: restockQty,
      p_reason: restockReason,
    });
    setRestocking(false);
    if (error) {
      showToast('Réapprovisionnement échoué', 'error');
      return;
    }
    showToast(`${restockProduct.name} réapprovisionné`, 'success');
    setRestockProduct(null);
    setRestockQty(1);
    setRestockReason('');
    loadProducts();
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    const { error } = await supabase.from('products').delete().eq('id', deleteProduct.id);
    if (error) {
      showToast('Suppression impossible', 'error');
      return;
    }
    showToast('Produit supprimé', 'success');
    setDeleteProduct(null);
    loadProducts();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestion des stocks</h1>
          <p className="text-sm text-muted">Suivez et réapprovisionnez votre inventaire</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Ajouter un produit
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <StatCard icon={Boxes} label="Produits" value={stats.total.toString()} color="primary" />
            <StatCard icon={TrendingUp} label="Valeur du stock" value={`${stats.value.toLocaleString('fr-FR')} F`} color="accent" />
            <StatCard icon={AlertTriangle} label="Stock faible" value={stats.low.toString()} color="warning" />
            <StatCard icon={Package} label="Épuisé" value={stats.out.toString()} color="danger" />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: 'all', label: 'Tous' },
            { key: 'low', label: 'Stock faible' },
            { key: 'out', label: 'Épuisé' },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key ? 'text-white' : 'surface-2 text-muted hover:text-primary'
              }`}
              style={filter === f.key ? { backgroundColor: 'rgb(var(--primary))' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="w-8 h-8 text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
            <Package className="w-12 h-12 opacity-40" />
            <p className="text-sm">Aucun produit</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                  <th className="text-left px-4 py-3 font-medium text-muted">Produit</th>
                  <th className="text-left px-4 py-3 font-medium text-muted hidden sm:table-cell">Catégorie</th>
                  <th className="text-right px-4 py-3 font-medium text-muted hidden md:table-cell">Prix d'achat</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Prix de vente</th>
                  <th className="text-center px-4 py-3 font-medium text-muted">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const out = product.stock_quantity <= 0;
                  const low = !out && product.stock_quantity <= product.min_stock_threshold;
                  return (
                    <tr key={product.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ borderColor: 'rgb(var(--border))' }}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{product.name}</p>
                        {!product.is_available && <span className="text-xs text-red-500">Indisponible</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted">{product.category}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-right text-muted">{product.purchase_price.toLocaleString('fr-FR')} F</td>
                      <td className="px-4 py-3 text-right font-semibold">{product.selling_price.toLocaleString('fr-FR')} F</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${
                          out ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          : low ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}>
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <button
                              onClick={() => { setRestockProduct(product); setRestockQty(1); setRestockReason(''); }}
                              className="btn-ghost p-1.5 rounded-lg text-primary"
                              title="Réapprovisionner"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <>
                              <button onClick={() => setEditProduct(product)} className="btn-ghost p-1.5 rounded-lg" title="Modifier">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteProduct(product)} className="btn-ghost p-1.5 rounded-lg text-red-500" title="Supprimer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock modal */}
      <Modal
        open={!!restockProduct}
        onClose={() => setRestockProduct(null)}
        title="Réapprovisionner"
        footer={
          <>
            <button onClick={() => setRestockProduct(null)} className="btn btn-ghost">Annuler</button>
            <button onClick={handleRestock} disabled={restocking} className="btn btn-primary">
              {restocking ? <Spinner /> : <Plus className="w-4 h-4" />}
              Confirmer
            </button>
          </>
        }
      >
        {restockProduct && (
          <div className="space-y-4">
            <div className="surface-2 rounded-xl p-3">
              <p className="font-medium">{restockProduct.name}</p>
              <p className="text-sm text-muted">Stock actuel: {restockProduct.stock_quantity}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Quantité à ajouter</label>
              <input
                type="number"
                min={1}
                value={restockQty}
                onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Raison (optionnel)</label>
              <input
                type="text"
                value={restockReason}
                onChange={(e) => setRestockReason(e.target.value)}
                className="input"
                placeholder="Achat fournisseur, inventaire..."
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit product modal */}
      {(showAddForm || editProduct) && (
        <ProductForm
          product={editProduct}
          onClose={() => { setShowAddForm(false); setEditProduct(null); }}
          onSaved={() => { setShowAddForm(false); setEditProduct(null); loadProducts(); }}
        />
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        title="Supprimer le produit"
        footer={
          <>
            <button onClick={() => setDeleteProduct(null)} className="btn btn-ghost">Annuler</button>
            <button onClick={handleDelete} className="btn btn-danger">Supprimer</button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Voulez-vous vraiment supprimer <span className="font-semibold text-primary">{deleteProduct?.name}</span> ? Cette action est irréversible.
        </p>
      </Modal>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Package; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'rgb(var(--primary))',
    accent: 'rgb(var(--accent))',
    warning: 'rgb(var(--warning))',
    danger: 'rgb(var(--danger))',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `rgba(${color === 'primary' ? 'var(--primary)' : color === 'accent' ? 'var(--accent)' : color === 'warning' ? 'var(--warning)' : 'var(--danger)'} / 0.12)` }}>
          <Icon className="w-5 h-5" style={{ color: colorMap[color] }} />
        </div>
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || '',
    purchase_price: product?.purchase_price?.toString() || '0',
    selling_price: product?.selling_price?.toString() || '0',
    stock_quantity: product?.stock_quantity?.toString() || '0',
    min_stock_threshold: product?.min_stock_threshold?.toString() || '5',
    is_available: product?.is_available ?? true,
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Le nom du produit est requis', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || 'Autre',
      purchase_price: parseFloat(form.purchase_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      min_stock_threshold: parseInt(form.min_stock_threshold) || 5,
      is_available: form.is_available,
    };

    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload);

    setSaving(false);
    if (error) {
      showToast('Enregistrement impossible', 'error');
      return;
    }
    showToast(product ? 'Produit modifié' : 'Produit ajouté', 'success');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? 'Modifier le produit' : 'Ajouter un produit'}
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-ghost">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? <Spinner /> : null}
            Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nom du produit</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Bière Primus 33cl" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Catégorie</label>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" placeholder="Bières, Sodas, Eaux..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Prix d'achat (F)</label>
            <input type="number" min={0} value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Prix de vente (F)</label>
            <input type="number" min={0} value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Stock initial</label>
            <input type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className="input" disabled={!!product} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Seil d'alerte</label>
            <input type="number" min={0} value={form.min_stock_threshold} onChange={(e) => setForm({ ...form, min_stock_threshold: e.target.value })} className="input" />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="w-4 h-4 rounded" />
          <span className="text-sm">Produit disponible à la vente</span>
        </label>
      </div>
    </Modal>
  );
}

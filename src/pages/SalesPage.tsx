import { useEffect, useMemo, useState } from 'react';
import { Search, Ban, Eye, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import type { Sale, SaleItem } from '@/types';
import { PAYMENT_METHOD_LABELS } from '@/types';

export function SalesPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canCancel = hasPermission('annuler_vente');
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => { loadSales(); }, []);

  const loadSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      showToast('Impossible de charger l\'historique', 'error');
    } else {
      setSales((data as Sale[]) || []);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (search) {
        const id = s.id.slice(0, 8).toUpperCase();
        if (!id.includes(search.toUpperCase())) return false;
      }
      return true;
    });
  }, [sales, search, statusFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    const { error } = await supabase.rpc('cancel_sale', { p_sale_id: cancelTarget.id });
    setCancelling(false);
    if (error) {
      showToast('Annulation impossible', 'error');
      return;
    }
    showToast('Vente annulée, stock restitué', 'success');
    setCancelTarget(null);
    loadSales();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historique des ventes</h1>
        <p className="text-sm text-muted">Toutes les transactions de la buvette</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Rechercher par N° de reçu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: 'all', label: 'Toutes' },
            { key: 'completed', label: 'Validées' },
            { key: 'cancelled', label: 'Annulées' },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.key ? 'text-white' : 'surface-2 text-muted hover:text-primary'
              }`}
              style={statusFilter === f.key ? { backgroundColor: 'rgb(var(--primary))' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-primary" /></div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
            <Calendar className="w-12 h-12 opacity-40" />
            <p className="text-sm">Aucune vente trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                  <th className="text-left px-4 py-3 font-medium text-muted">Reçu</th>
                  <th className="text-left px-4 py-3 font-medium text-muted hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted hidden md:table-cell">Paiement</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Montant</th>
                  <th className="text-center px-4 py-3 font-medium text-muted">Statut</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((sale) => (
                  <tr key={sale.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ borderColor: 'rgb(var(--border))' }}>
                    <td className="px-4 py-3 font-mono text-xs">{sale.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted">
                      {new Date(sale.created_at).toLocaleDateString('fr-FR')} {new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted">{PAYMENT_METHOD_LABELS[sale.payment_method]}</td>
                    <td className="px-4 py-3 text-right font-semibold">{Number(sale.total_amount).toLocaleString('fr-FR')} F</td>
                    <td className="px-4 py-3 text-center">
                      {sale.status === 'completed' ? (
                        <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Validée</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">Annulée</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetailSale(sale)} className="btn-ghost p-1.5 rounded-lg" title="Voir le détail">
                          <Eye className="w-4 h-4" />
                        </button>
                        {canCancel && sale.status === 'completed' && (
                          <button onClick={() => setCancelTarget(sale)} className="btn-ghost p-1.5 rounded-lg text-red-500" title="Annuler">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-outline">
            Précédent
          </button>
          <span className="text-sm text-muted">Page {page + 1} / {Math.ceil(filtered.length / PAGE_SIZE)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= filtered.length} className="btn btn-outline">
            Suivant
          </button>
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!detailSale} onClose={() => setDetailSale(null)} title="Détail de la vente" maxWidth="max-w-lg">
        {detailSale && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted">Reçu N°</p>
                <p className="font-mono text-sm">{detailSale.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Date</p>
                <p className="text-sm">{new Date(detailSale.created_at).toLocaleString('fr-FR')}</p>
              </div>
            </div>
            <div className="surface-2 rounded-xl p-3 space-y-2">
              {(detailSale.sale_items || []).map((item: SaleItem, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-medium">{(item.unit_price * item.quantity).toLocaleString('fr-FR')} F</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Mode de paiement</span>
              <span className="font-medium">{PAYMENT_METHOD_LABELS[detailSale.payment_method]}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">{Number(detailSale.total_amount).toLocaleString('fr-FR')} F</span>
            </div>
            {detailSale.status === 'cancelled' && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg px-3 py-2">
                Cette vente a été annulée. Le stock a été restitué.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel confirmation */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Annuler la vente"
        footer={
          <>
            <button onClick={() => setCancelTarget(null)} className="btn btn-ghost">Retour</button>
            <button onClick={handleCancel} disabled={cancelling} className="btn btn-danger">
              {cancelling ? <Spinner /> : <Ban className="w-4 h-4" />}
              Confirmer l'annulation
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Voulez-vous vraiment annuler la vente <span className="font-semibold text-primary">{cancelTarget?.id.slice(0, 8).toUpperCase()}</span> d'un montant de{' '}
          <span className="font-semibold">{cancelTarget ? Number(cancelTarget.total_amount).toLocaleString('fr-FR') : ''} F</span> ? Le stock sera automatiquement restitué.
        </p>
      </Modal>
    </div>
  );
}

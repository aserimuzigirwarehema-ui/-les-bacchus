import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, ShoppingBag, Trophy, Calendar, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { SkeletonCard } from '@/components/ui/Loading';
import type { Sale, SaleItem } from '@/types';
import { PAYMENT_METHOD_LABELS } from '@/types';

const CHART_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#ec4899'];

export function DashboardPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => { loadSales(); }, []);

  const loadSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      showToast('Impossible de charger les données', 'error');
    } else {
      setSales((data as Sale[]) || []);
    }
    setLoading(false);
  };

  const completedSales = useMemo(() => sales.filter((s) => s.status === 'completed'), [sales]);

  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return start;
  }, []);

  const monthStart = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todaySales = useMemo(
    () => completedSales.filter((s) => new Date(s.created_at) >= today),
    [completedSales, today]
  );
  const monthSales = useMemo(
    () => completedSales.filter((s) => new Date(s.created_at) >= monthStart),
    [completedSales, monthStart]
  );

  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.total_amount), 0);

  // Last 7 days chart
  const weeklyData = useMemo(() => {
    const days: { label: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const daySales = completedSales.filter((s) => {
        const sd = new Date(s.created_at);
        return sd >= d && sd < next;
      });
      days.push({
        label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        revenue: daySales.reduce((sum, s) => sum + Number(s.total_amount), 0),
        count: daySales.length,
      });
    }
    return days;
  }, [completedSales]);

  // Top products
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; revenue: number }> = {};
    completedSales.forEach((sale) => {
      (sale.sale_items || []).forEach((item: SaleItem) => {
        if (!counts[item.name]) counts[item.name] = { name: item.name, qty: 0, revenue: 0 };
        counts[item.name].qty += item.quantity;
        counts[item.name].revenue += item.unit_price * item.quantity;
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [completedSales]);

  // Payment method breakdown
  const paymentData = useMemo(() => {
    const counts: Record<string, number> = {};
    completedSales.forEach((s) => {
      counts[s.payment_method] = (counts[s.payment_method] || 0) + Number(s.total_amount);
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: PAYMENT_METHOD_LABELS[key as keyof typeof PAYMENT_METHOD_LABELS] || key,
      value,
    }));
  }, [completedSales]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-muted">Vue d'ensemble de votre activité</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <KpiCard icon={TrendingUp} label="Chiffre d'affaires du jour" value={`${todayRevenue.toLocaleString('fr-FR')} F`} sub={`${todaySales.length} ventes`} trend="up" />
            <KpiCard icon={Calendar} label="Chiffre d'affaires du mois" value={`${monthRevenue.toLocaleString('fr-FR')} F`} sub={`${monthSales.length} ventes`} trend="up" />
            <KpiCard icon={ShoppingBag} label="Total des ventes" value={completedSales.length.toString()} sub="Toutes ventes confondues" />
            <KpiCard icon={Trophy} label="Boisson phare" value={topProducts[0]?.name || '—'} sub={topProducts[0] ? `${topProducts[0].qty} ventes` : 'Aucune vente'} />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Weekly chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">Ventes des 7 derniers jours</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center"><div className="text-sm text-muted">Chargement...</div></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(var(--surface))',
                    border: '1px solid rgb(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString('fr-FR')} F`, 'Revenu']}
                />
                <Bar dataKey="revenue" fill="rgb(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Modes de paiement</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center"><div className="text-sm text-muted">Chargement...</div></div>
          ) : paymentData.length === 0 ? (
            <div className="h-64 flex items-center justify-center"><div className="text-sm text-muted">Aucune donnée</div></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {paymentData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(var(--surface))',
                    border: '1px solid rgb(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                  }}
                  formatter={(value: number) => `${value.toLocaleString('fr-FR')} F`}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top products */}
      <div className="card p-5">
        <h3 className="font-semibold mb-4">Boissons les plus vendues</h3>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <div className="py-8 text-center text-muted text-sm">Aucune vente enregistrée pour le moment</div>
        ) : (
          <div className="space-y-2">
            {topProducts.map((product, i) => {
              const maxQty = topProducts[0].qty;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold surface-2 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium truncate">{product.name}</span>
                      <span className="text-sm text-muted shrink-0 ml-2">{product.qty} ventes</span>
                    </div>
                    <div className="h-2 rounded-full surface-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(product.qty / maxQty) * 100}%`, backgroundColor: 'rgb(var(--primary))' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, trend }: { icon: typeof TrendingUp; label: string; value: string; sub: string; trend?: 'up' | 'down' }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(var(--primary) / 0.12)' }}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : trend === 'down' ? <ArrowDownRight className="w-4 h-4 text-red-500" /> : null}
      </div>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  );
}

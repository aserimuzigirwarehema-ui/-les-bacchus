import { useEffect, useState } from 'react';
import { UserPlus, Mail, ShieldCheck, Shield, ToggleLeft, ToggleRight, Trash2, Settings2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import type { Permission, Profile } from '@/types';
import { ALL_PERMISSIONS } from '@/types';

export function EmployeesPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Impossible de charger le personnel', 'error');
    } else {
      setEmployees((data as Profile[]) || []);
    }
    setLoading(false);
  };

  const updateEmployee = async (emp: Profile, changes: Partial<Profile>) => {
    setSaving(true);
    const { error } = await supabase.rpc('admin_update_employee', {
      p_user_id: emp.id,
      p_role: changes.role ?? emp.role,
      p_permissions: changes.permissions ?? emp.permissions,
      p_is_active: changes.is_active ?? emp.is_active,
    });
    setSaving(false);
    if (error) {
      showToast('Modification impossible', 'error');
      return;
    }
    showToast('Profil mis à jour', 'success');
    setEditTarget(null);
    loadEmployees();
  };

  const toggleActive = async (emp: Profile) => {
    await updateEmployee(emp, { is_active: !emp.is_active });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestion du personnel</h1>
          <p className="text-sm text-muted">Gérez les comptes employés et leurs permissions</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
          <UserPlus className="w-4 h-4" /> Ajouter un employé
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-primary" /></div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
            <ShieldCheck className="w-12 h-12 opacity-40" />
            <p className="text-sm">Aucun membre du personnel</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                  <th className="text-left px-4 py-3 font-medium text-muted">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-muted hidden sm:table-cell">E-mail</th>
                  <th className="text-center px-4 py-3 font-medium text-muted">Rôle</th>
                  <th className="text-center px-4 py-3 font-medium text-muted hidden md:table-cell">Permissions</th>
                  <th className="text-center px-4 py-3 font-medium text-muted">Statut</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ borderColor: 'rgb(var(--border))' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold surface-2">
                          {emp.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{emp.full_name || 'Sans nom'}</p>
                          {emp.id === profile?.id && <span className="text-xs text-primary">Vous</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted">{emp.email}</td>
                    <td className="px-4 py-3 text-center">
                      {emp.role === 'admin' ? (
                        <span className="badge bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="badge surface-2 text-muted">
                          <Shield className="w-3 h-3" /> Employé
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-center text-muted">
                      {emp.role === 'admin' ? 'Toutes' : `${emp.permissions.length} permission${emp.permissions.length > 1 ? 's' : ''}`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.is_active ? (
                        <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Actif</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">Désactivé</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleActive(emp)} disabled={emp.id === profile?.id || saving} className="btn-ghost p-1.5 rounded-lg" title={emp.is_active ? 'Désactiver' : 'Activer'}>
                          {emp.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted" />}
                        </button>
                        <button onClick={() => setEditTarget(emp)} disabled={emp.id === profile?.id} className="btn-ghost p-1.5 rounded-lg text-primary" title="Paramètres d’accès">
                          <Settings2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <AddEmployeeForm
          onClose={() => setShowAddForm(false)}
          onSaved={() => { setShowAddForm(false); loadEmployees(); }}
        />
      )}

      {editTarget && (
        <EditPermissionsModal
          employee={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(changes) => updateEmployee(editTarget, changes)}
          saving={saving}
        />
      )}
    </div>
  );
}

function AddEmployeeForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'employee',
    permissions: [] as Permission[],
  });

  const togglePermission = (perm: Permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.email.trim() || form.password.length < 6) {
      showToast('Veuillez remplir tous les champs correctement', 'error');
      return;
    }
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
          permissions: form.role === 'employee' ? form.permissions : [],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur');
      }

      showToast('Employé créé avec succès', 'success');
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Création impossible', 'error');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Ajouter un employé"
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-ghost">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
            {saving ? <Spinner /> : null}
            Créer le compte
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nom complet</label>
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input" placeholder="Jean Dupont" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input pl-10" placeholder="jean@lesbacchus.com" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" placeholder="Minimum 6 caractères" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Rôle</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setForm({ ...form, role: 'employee' })}
              className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${form.role === 'employee' ? 'border-primary text-primary' : 'border-transparent surface-2 text-muted'}`}
              style={form.role === 'employee' ? { backgroundColor: 'rgba(var(--primary) / 0.08)' } : {}}
            >
              Employé
            </button>
            <button
              onClick={() => setForm({ ...form, role: 'admin' })}
              className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${form.role === 'admin' ? 'border-primary text-primary' : 'border-transparent surface-2 text-muted'}`}
              style={form.role === 'admin' ? { backgroundColor: 'rgba(var(--primary) / 0.08)' } : {}}
            >
              Administrateur
            </button>
          </div>
        </div>
        {form.role === 'employee' && (
          <div>
            <label className="block text-sm font-medium mb-2">Permissions</label>
            <div className="space-y-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm.key} className="flex items-center gap-3 surface-2 rounded-lg p-3 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm.key)}
                    onChange={() => togglePermission(perm.key)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{perm.label}</p>
                    <p className="text-xs text-muted">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function EditPermissionsModal({ employee, onClose, onSave, saving }: { employee: Profile; onClose: () => void; onSave: (changes: Partial<Profile>) => void; saving: boolean }) {
  const [role, setRole] = useState(employee.role);
  const [permissions, setPermissions] = useState<Permission[]>(employee.permissions);

  const togglePermission = (perm: Permission) => {
    setPermissions((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Permissions - ${employee.full_name}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-ghost">Annuler</button>
          <button onClick={() => onSave({ role, permissions })} disabled={saving} className="btn btn-primary">
            {saving ? <Spinner /> : null}
            Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Rôle</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRole('employee')}
              className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${role === 'employee' ? 'border-primary text-primary' : 'border-transparent surface-2 text-muted'}`}
              style={role === 'employee' ? { backgroundColor: 'rgba(var(--primary) / 0.08)' } : {}}
            >
              Employé
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${role === 'admin' ? 'border-primary text-primary' : 'border-transparent surface-2 text-muted'}`}
              style={role === 'admin' ? { backgroundColor: 'rgba(var(--primary) / 0.08)' } : {}}
            >
              Administrateur
            </button>
          </div>
        </div>
        {role === 'employee' && (
          <div>
            <label className="block text-sm font-medium mb-2">Permissions accordées</label>
            <div className="space-y-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm.key} className="flex items-center gap-3 surface-2 rounded-lg p-3 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                  <input
                    type="checkbox"
                    checked={permissions.includes(perm.key)}
                    onChange={() => togglePermission(perm.key)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{perm.label}</p>
                    <p className="text-xs text-muted">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        {role === 'admin' && (
          <p className="text-sm text-muted bg-black/[0.03] dark:bg-white/[0.03] rounded-lg p-3">
            Les administrateurs ont accès à toutes les fonctionnalités par défaut.
          </p>
        )}
      </div>
    </Modal>
  );
}

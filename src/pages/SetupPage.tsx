import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wine, User, Mail, Lock } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Loading';
import { supabase } from '@/lib/supabase';

export function SetupPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
        if (profile?.role === 'admin') {
          navigate('/dashboard');
          return;
        }
      }

      const { data, error: functionError } = await supabase.functions.invoke('bootstrap-admin', {
        method: 'POST',
        body: {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
        },
      });

      if (functionError || !data?.success) {
        setError(functionError?.message || data?.error || 'Configuration impossible');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        showToast('Administrateur créé. Veuillez vous connecter.', 'success');
        navigate('/login');
        return;
      }

      showToast('Compte administrateur créé', 'success');
      navigate('/dashboard');
    } catch {
      setError('Configuration impossible, veuillez réessayer');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo_App.jpg" alt="Les Bacchus" className="brand-logo w-20 h-20 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight brand-wordmark">Configuration initiale</h1>
          <p className="text-sm brand-subtitle mt-1 text-center">Créez le compte administrateur de votre buvette</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input pl-10"
                  placeholder="Jean Dupont"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="admin@lesbacchus.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Minimum 6 caractères"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg px-3 py-2 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? <Spinner /> : 'Créer l\'administrateur'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Déjà configuré ?{' '}
          <button onClick={() => navigate('/login')} className="text-primary font-medium hover:underline">
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wine, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Loading';

export function LoginPage() {
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    showToast('Connexion réussie', 'success');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo_App.jpg" alt="Les Bacchus" className="brand-logo w-20 h-20 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight brand-wordmark">Les Bacchus</h1>
          <p className="text-sm brand-subtitle mt-1">Gestion de buvette</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg px-3 py-2 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? <Spinner /> : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Premier lancement ?{' '}
          <button onClick={() => navigate('/setup')} className="text-primary font-medium hover:underline">
            Configurer l'administrateur
          </button>
        </p>
      </div>
    </div>
  );
}

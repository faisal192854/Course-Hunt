import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Lock, Mail, ArrowRight, AlertCircle, LogIn } from 'lucide-react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';

export default function AdminLogin() {
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const correctKey = import.meta.env.VITE_ADMIN_SECRET_KEY || 'Bns1928@';

    if (secretKey === correctKey) {
      sessionStorage.setItem('admin_session', 'true');
      navigate('/admin');
    } else {
      setError('Invalid secret key. Access denied.');
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email?.toLowerCase() === 'official.faisaln8n@gmail.com') {
        sessionStorage.setItem('admin_session', 'true');
        navigate('/admin');
      } else {
        setError('Unauthorized email. Only the administrator can access this panel.');
        await auth.signOut();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-200">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
          <p className="mt-2 text-slate-500">Access the administrative dashboard</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-70"
            >
              <img src="https://www.gstatic.com/firebase/anonymous-scan/google.svg" alt="Google" className="h-5 w-5" />
              Sign in with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">Or use secret key</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="secretKey" className="text-sm font-medium text-slate-700">
                  Secret Key
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="secretKey"
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter secret key"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Access Dashboard
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">Authorized Personnel Only</span>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/')}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Back to Course Hunt
          </button>
        </div>
      </div>
    </div>
  );
}

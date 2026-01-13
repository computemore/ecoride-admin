import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '@/assets/ecoride.svg';
import background from '@/assets/background.png';

// Icons as Image components
const EcorideIcon = () => (
  <img src={logo} alt="Ecoride" className="w-12 h-12 object-contain" />
);

// // Icons as SVG components
// const EcorideIcon = () => (
//   <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
//     <rect width="48" height="48" rx="12" fill="#ef4444"/>
//     <path d="M14 28C14 28 16 32 24 32C32 32 34 28 34 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
//     <circle cx="17" cy="24" r="3" fill="white"/>
//     <circle cx="31" cy="24" r="3" fill="white"/>
//     <path d="M12 20L16 14H32L36 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// );

const EmailIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {open ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </>
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    )}
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={background}
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
      </div>

      {/* Foreground layer */}
      <div className="relative z-10 min-h-screen lg:flex flex">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-2/5 p-12 flex-col justify-between relative overflow-hidden">
          {/* Background Pattern */}
          {/* <div className="absolute inset-0 opacity-10">
            <div className="absolute top-5 left-20 w-64 h-64 rounded-full border-4 border-white"></div>
            <div className="absolute bottom-40 right-10 w-96 h-96 rounded-full border-4 border-white"></div>
            <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full border-4 border-white"></div>
          </div> */}

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <EcorideIcon />
              <div>
                <span className="text-3xlfont-bold text-white">Ecoride</span>
                <span className="text-white/80 text-xl ml-2">Admin</span>
              </div>
            </div>
            <p className="text-red-100 text-lg">Manage drivers and operations</p>
          </div>

          <div className="relative z-10 space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Driver Management</h3>
                <p className="text-red-100 mt-1">Approve, monitor, and manage drivers</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Analytics Dashboard</h3>
                <p className="text-red-100 mt-1">Real-time insights and reports on driver behavior</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Real-time Notifications</h3>
                <p className="text-red-100 mt-1">Instant alerts for pending approvals of new registrants</p>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-red-100 text-sm">© 2025 Ecoride. All rights reserved.</p>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="relative z-10 lg:hidden flex flex-col items-center justify-center mb-8">
              <img src={logo} alt="Ecoride" className="w-12 h-12 object-contain mb-1" />
              <div className="text-center">
                <span className="text-2xl font-bold text-white block">Ecoride</span>
                <span className="text-white/80 text-xl block">Admin</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-xl font-bold text-gray-900">Admin Portal</h1>
                <p className="text-gray-500 mt-2">Sign in to manage your fleet</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-12 w-full"
                      style={{ paddingLeft: '2.6rem' }}
                      placeholder=""
                      autoComplete="email"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EmailIcon />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input w-full pr-4"
                      style={{ paddingLeft: '2.6rem' }}
                      placeholder=""
                      autoComplete="current-password"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockIcon />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center hover:opacity-70 transition"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            </div>

            {/* Demo Credentials */}
            {/* <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-700 font-medium mb-2">Demo Admin Account</p>
              <p className="text-sm text-blue-600">
                <code className="bg-blue-100 px-2 py-0.5 rounded">admin@ecoride.co.za</code>
                <br />
                <code className="bg-blue-100 px-2 py-0.5 rounded mt-1 inline-block">Admin123!</code>
              </p>
            </div> */}

            <p className="mt-4 text-center text-base text-white/80">
              Ecoride Admin Portal App v0.6.4-alpha
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

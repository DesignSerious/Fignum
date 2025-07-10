import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';

interface AuthFormProps {
  mode: 'signin';
  onSubmit: (email: string, password: string) => Promise<void>;
  onToggleMode: () => void;
  loading: boolean;
  error: string | null;
  onBackToLanding: () => void;
}

// Official Fignum logo component for authentication
const FignumLogo = () => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  if (imageError) {
    return (
      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-2xl">F</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {!imageLoaded && (
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center animate-pulse shadow-lg">
          <span className="text-white font-bold text-xl">F</span>
        </div>
      )}
      <img 
        src="/fignum-logo.png" 
        alt="Fignum - Patent annotation tool" 
        className={`w-16 h-16 rounded-2xl object-cover shadow-lg transition-opacity duration-200 ${
          imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{ 
          display: imageLoaded ? 'block' : 'none'
        }}
      />
    </div>
  );
};

export const AuthForm: React.FC<AuthFormProps> = ({
  mode,
  onSubmit,
  onToggleMode,
  loading,
  error,
  onBackToLanding
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await onSubmit(email, password);
  };

  const isInvalidCredentialsError = error?.includes('email or password') || error?.includes('incorrect') || error?.includes('Invalid login credentials');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBackToLanding}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Home</span>
        </button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FignumLogo />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome Back
          </h1>
          <p className="text-blue-600 font-medium mb-4">
            Drag. Drop. Number. Done.
          </p>
          <p className="text-gray-600">
            Sign in to access your patent annotation projects
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-red-700 block">{error}</span>
                {isInvalidCredentialsError && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <div className="text-xs text-red-600 space-y-1">
                      <p className="font-medium">Please check the following:</p>
                      <p>• Double-check your email address for typos</p>
                      <p>• Make sure your password is correct</p>
                      <p>• Check if Caps Lock is on</p>
                      <p>• Try copying and pasting your credentials to avoid typos</p>
                      <p>• If you forgot your password, you may need to create a new account</p>
                      <p>• Make sure you're using the same email you signed up with</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                required
                minLength={6}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?
            <button
              onClick={onToggleMode}
              className="ml-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Start Free Trial
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
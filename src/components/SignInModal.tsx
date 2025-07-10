import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, password: string) => Promise<void>;
  onToggleMode: () => void;
  loading: boolean;
  error: string | null;
  mode: 'signin' | 'signup';
}

// Official Fignum logo component matching the reference design
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
      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
        <div className="text-white">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M8 32L32 8M32 8H16M32 8V24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {!imageLoaded && (
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg">
          <div className="text-white">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M8 32L32 8M32 8H16M32 8V24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}
      <img 
        src="/fignum-logo.png" 
        alt="Fignum Logo" 
        className={`w-20 h-20 rounded-2xl object-cover shadow-lg transition-opacity duration-200 ${
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

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onToggleMode,
  loading,
  error,
  mode
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error states
    setEmailError(false);
    setPasswordError(false);
    
    // Validate fields
    if (!email) {
      setEmailError(true);
      return;
    }
    if (!password) {
      setPasswordError(true);
      return;
    }
    
    await onSubmit(email, password);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError && e.target.value) {
      setEmailError(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError && e.target.value) {
      setPasswordError(false);
    }
  };

  const isInvalidCredentialsError = error?.includes('email or password') || error?.includes('incorrect') || error?.includes('Invalid login credentials');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-auto relative">
        {/* Back button */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        <div className="px-8 py-12 pt-20">
          {/* Logo and branding */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <FignumLogo />
            </div>
            <h1 className="text-4xl font-bold text-black mb-3">
              Fignum
            </h1>
            <p className="text-xl text-gray-700">
              Drag. Drop. Number. <span className="text-blue-600 font-medium">Done.</span>
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-700 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
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
            {/* Email field */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-3">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`w-full pl-12 pr-12 py-4 border-2 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors ${
                    emailError ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
                {emailError && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-3">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full pl-12 pr-20 py-4 border-2 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors ${
                    passwordError ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  {passwordError && (
                    <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gray-300 hover:bg-gray-400 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-600 font-medium py-4 px-6 rounded-xl transition-colors text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                  {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-8 text-center">
            <p className="text-gray-500">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={onToggleMode}
                className="ml-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
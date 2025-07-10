import React, { useState } from 'react';
import { CreditCard, Check, X, Zap, Shield, Clock, ArrowLeft } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (paymentData: PaymentData) => Promise<void>;
  loading?: boolean;
}

interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  loading = false
}) => {
  const [step, setStep] = useState<'pricing' | 'payment'>('pricing');
  const [upgrading, setUpgrading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    }
  });

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await onUpgrade(paymentData);
    } finally {
      setUpgrading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setPaymentData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setPaymentData(prev => ({ ...prev, expiryDate: formatted }));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPaymentData(prev => ({ ...prev, cvv: digits }));
  };

  const isPaymentFormValid = () => {
    return (
      paymentData.cardNumber.replace(/\s/g, '').length === 16 &&
      paymentData.expiryDate.length === 5 &&
      paymentData.cvv.length >= 3 &&
      paymentData.cardholderName.trim() &&
      paymentData.billingAddress.street.trim() &&
      paymentData.billingAddress.city.trim() &&
      paymentData.billingAddress.state.trim() &&
      paymentData.billingAddress.zipCode.trim()
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step === 'payment' && (
                <button
                  onClick={() => setStep('pricing')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
              )}
              <div className="bg-blue-100 p-2 rounded-lg">
                <Zap size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {step === 'pricing' ? 'Upgrade to Pro' : 'Payment Details'}
                </h3>
                <p className="text-gray-600">
                  {step === 'pricing' ? 'Continue with full access' : 'Secure checkout for $19.99/month'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {step === 'pricing' ? (
          /* Pricing Step */
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">$19.99</div>
              <div className="text-gray-600">per month</div>
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mt-2 inline-block">
                Cancel anytime
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <Check size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Unlimited patent annotation projects</span>
              </div>
              <div className="flex items-center gap-3">
                <Check size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-700">CSV/Excel reference import</span>
              </div>
              <div className="flex items-center gap-3">
                <Check size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Professional leader lines & callouts</span>
              </div>
              <div className="flex items-center gap-3">
                <Check size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Publication-ready PDF exports</span>
              </div>
              <div className="flex items-center gap-3">
                <Check size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Cloud storage & sync</span>
              </div>
              <div className="flex items-center gap-3">
                <Check size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Priority customer support</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Shield size={16} />
                <span className="text-sm font-medium">Secure Payment</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Your payment information is encrypted and secure. Cancel anytime with no questions asked.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setStep('payment')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                Continue to Payment
              </button>
              
              <button
                onClick={onClose}
                className="w-full text-gray-600 hover:text-gray-800 py-2 transition-colors"
              >
                Maybe later
              </button>
            </div>

            {/* Trial Info */}
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Clock size={14} />
                <span>Your trial data will be preserved</span>
              </div>
            </div>
          </div>
        ) : (
          /* Payment Step */
          <div className="p-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Order Summary</h4>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Fignum Pro (Monthly)</span>
                <span className="font-semibold text-gray-900">$19.99/month</span>
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span>$19.99/month</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <form className="space-y-4">
              {/* Card Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Card Information</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={paymentData.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={paymentData.expiryDate}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={paymentData.cvv}
                        onChange={handleCvvChange}
                        placeholder="123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={paymentData.cardholderName}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, cardholderName: e.target.value }))}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Billing Address</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={paymentData.billingAddress.street}
                      onChange={(e) => setPaymentData(prev => ({ 
                        ...prev, 
                        billingAddress: { ...prev.billingAddress, street: e.target.value }
                      }))}
                      placeholder="123 Main Street"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={paymentData.billingAddress.city}
                        onChange={(e) => setPaymentData(prev => ({ 
                          ...prev, 
                          billingAddress: { ...prev.billingAddress, city: e.target.value }
                        }))}
                        placeholder="New York"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={paymentData.billingAddress.state}
                        onChange={(e) => setPaymentData(prev => ({ 
                          ...prev, 
                          billingAddress: { ...prev.billingAddress, state: e.target.value }
                        }))}
                        placeholder="NY"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={paymentData.billingAddress.zipCode}
                        onChange={(e) => setPaymentData(prev => ({ 
                          ...prev, 
                          billingAddress: { ...prev.billingAddress, zipCode: e.target.value }
                        }))}
                        placeholder="10001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        value={paymentData.billingAddress.country}
                        onChange={(e) => setPaymentData(prev => ({ 
                          ...prev, 
                          billingAddress: { ...prev.billingAddress, country: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Security Notice */}
            <div className="bg-green-50 rounded-lg p-3 mt-4 mb-6">
              <div className="flex items-center gap-2 text-green-700">
                <Shield size={16} />
                <span className="text-sm font-medium">256-bit SSL Encryption</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Your payment information is encrypted and never stored on our servers.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleUpgrade}
                disabled={upgrading || loading || !isPaymentFormValid()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {upgrading || loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Complete Purchase - $19.99/month
                  </>
                )}
              </button>
              
              <button
                onClick={() => setStep('pricing')}
                className="w-full text-gray-600 hover:text-gray-800 py-2 transition-colors"
              >
                Back to pricing
              </button>
            </div>

            {/* Terms */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                By completing this purchase, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
                You can cancel anytime.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
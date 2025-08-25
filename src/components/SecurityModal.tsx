import React, { useState } from 'react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (key: string) => void;
  loading: boolean;
}

const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose, onConfirm, loading }) => {
  const [securityKey, setSecurityKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityKey.trim()) {
      onConfirm(securityKey.trim());
    }
  };

  const handleClose = () => {
    setSecurityKey('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Security Verification Required
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="security-key" className="block text-sm font-medium text-gray-700 mb-2">
              Enter security key to proceed with download:
            </label>
            <input
              type="password"
              id="security-key"
              value={securityKey}
              onChange={(e) => setSecurityKey(e.target.value)}
              placeholder="Security key..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              autoFocus
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !securityKey.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Download'}
            </button>
          </div>
        </form>
        
        <p className="text-xs text-gray-500 mt-3">
          This security check helps protect against unauthorized downloads.
        </p>
      </div>
    </div>
  );
};

export default SecurityModal;
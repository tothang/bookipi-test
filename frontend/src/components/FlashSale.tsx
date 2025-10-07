import React, { useState, useEffect } from 'react';
import {
  getProductStatus,
  purchaseProduct,
  getUserPurchaseStatus,
  ProductStatus,
  UserPurchaseStatus,
} from '../services/api';
import { API_BASE_URL } from '../services/api';

interface FlashSaleProps {
  productId: string;
  onBack: () => void;
}

const FlashSale: React.FC<FlashSaleProps> = ({ productId, onBack }) => {
  const [product, setProduct] = useState<ProductStatus | null>(null);
  const [userStatus, setUserStatus] = useState<UserPurchaseStatus | null>(null);
  const [userId, setUserId] = useState<string>(
    process.env.REACT_APP_DEFAULT_USER_ID || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadProductStatus();
    const interval = setInterval(loadProductStatus, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [productId]);

  useEffect(() => {
    if (userId && productId) {
      loadUserStatus();
    }
  }, [userId, productId]);

  const loadProductStatus = async () => {
    try {
      const data = await getProductStatus(productId);
      setProduct(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load product status');
    }
  };

  const loadUserStatus = async () => {
    if (!userId) return;
    try {
      const data = await getUserPurchaseStatus(productId, userId);
      setUserStatus(data);
    } catch (err: any) {
      console.error('Failed to load user status:', err);
    }
  };

  const handlePurchase = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }

    setIsPurchasing(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await purchaseProduct(
        {
          productId,
          userId,
        },
        userId
      );

      setSuccessMessage(
        `🎉 Purchase successful! Order ID: ${result.orderId}`
      );
      await loadUserStatus();
      await loadProductStatus();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Purchase failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'upcoming':
        return 'text-yellow-400';
      case 'ended':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'upcoming':
        return 'bg-yellow-500';
      case 'ended':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!product) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-300 mt-4">Loading flash sale...</p>
      </div>
    );
  }

  const progressPercentage =
    (product.soldQuantity / product.totalQuantity) * 100;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
      >
        ← Back to Product Selection
      </button>

      <div className="bg-gray-800 rounded-lg shadow-2xl p-8">
        {/* Product Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {product.productName}
            </h2>
            <p className="text-gray-400">Product ID: {product.productId}</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-4 py-2 rounded-full text-white font-semibold ${getStatusBadge(
                product.status
              )}`}
            >
              {product.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <p className="text-4xl font-bold text-blue-400">
            ${product.price.toFixed(2)}
          </p>
        </div>

        {/* Inventory Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Available: {product.availableQuantity}</span>
            <span>
              Sold: {product.soldQuantity} / {product.totalQuantity}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Sale Time */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-gray-700 p-3 rounded-lg">
            <p className="text-gray-400">Start Time</p>
            <p className="text-white font-semibold">
              {new Date(product.saleStartAt).toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg">
            <p className="text-gray-400">End Time</p>
            <p className="text-white font-semibold">
              {new Date(product.saleEndAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* User Input */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-semibold">
            Enter Your User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g., user-123"
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* User Purchase Status */}
        {userStatus && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              userStatus.hasPurchased
                ? 'bg-green-900 border border-green-500'
                : 'bg-gray-700'
            }`}
          >
            {userStatus.hasPurchased ? (
              <div>
                <p className="text-green-400 font-semibold mb-2">
                  ✅ You have already purchased this item!
                </p>
                {userStatus.order && (
                  <div className="text-sm text-gray-300">
                    <p>Order ID: {userStatus.order.id}</p>
                    <p>Quantity: {userStatus.order.quantity}</p>
                    <p>Price: ${userStatus.order.price}</p>
                    <p>
                      Purchased:{' '}
                      {new Date(userStatus.order.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-300">
                You haven't purchased this item yet.
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-500 rounded-lg">
            <p className="text-red-400">❌ {error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-900 border border-green-500 rounded-lg">
            <p className="text-green-400">{successMessage}</p>
          </div>
        )}

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={
            isPurchasing ||
            !userId ||
            product.status !== 'active' ||
            product.availableQuantity <= 0 ||
            userStatus?.hasPurchased
          }
          className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition duration-200 ${
            isPurchasing ||
            !userId ||
            product.status !== 'active' ||
            product.availableQuantity <= 0 ||
            userStatus?.hasPurchased
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
          }`}
        >
          {isPurchasing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processing...
            </span>
          ) : userStatus?.hasPurchased ? (
            'Already Purchased'
          ) : product.status !== 'active' ? (
            `Sale ${product.status === 'upcoming' ? 'Not Started' : 'Ended'}`
          ) : product.availableQuantity <= 0 ? (
            'Sold Out'
          ) : (
            '🛒 Buy Now'
          )}
        </button>

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">
            ℹ️ Each user can only purchase one item. The system uses distributed
            locks to prevent overselling.
          </p>
        </div>

        {/* Testing Info Panel */}
        <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-white font-semibold mb-2">Testing Info</h3>
          <p className="text-gray-300 text-sm mb-2">API Base: {API_BASE_URL}</p>
          <pre className="text-xs bg-gray-900 text-gray-200 p-3 rounded mb-2 overflow-auto">
{`# Check status
curl -s ${API_BASE_URL}/sale/status/${product.productId} | jq

# Attempt purchase
curl -s -X POST ${API_BASE_URL}/sale/purchase \
  -H 'Content-Type: application/json' \
  -H 'x-user-id: ${userId || 'USER_ID'}' \
  -d '{"productId":"${product.productId}","userId":"${userId || 'USER_ID'}"}' | jq

# Check user status
curl -s "${API_BASE_URL}/sale/user/status?productId=${product.productId}" \
  -H 'x-user-id: ${userId || 'USER_ID'}' | jq`}
          </pre>
          <p className="text-gray-400 text-xs">Tip: set REACT_APP_DEFAULT_USER_ID in frontend .env to prefill your user ID.</p>
        </div>
      </div>
    </div>
  );
};

export default FlashSale;

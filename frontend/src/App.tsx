import React, { useState, useEffect } from 'react';
import './App.css';
import FlashSale from './components/FlashSale';
import { getFirstProductStatus } from './services/api';

function App() {
  const [productId, setProductId] = useState<string>(
    process.env.REACT_APP_DEFAULT_PRODUCT_ID || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadLatest = async () => {
      if (!productId) {
        try {
          setIsLoading(true);
          const first = await getFirstProductStatus();
          setProductId(first.productId);
        } catch (e: any) {
          setError(e?.response?.data?.message || 'No product available to load');
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadLatest();
  }, [productId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            ⚡ Flash Sale Platform
          </h1>
          <p className="text-gray-300 text-lg">
            High-performance flash sale system - Limited stock, unlimited excitement!
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          {isLoading && (
            <div className="text-gray-300">Loading product…</div>
          )}
          {error && (
            <div className="text-red-400 mb-4">❌ {error}</div>
          )}
          {!isLoading && productId && (
            <FlashSale productId={productId} onBack={() => { /* auto mode */ }} />
          )}
          {!isLoading && !productId && !error && (
            <div className="text-gray-300">No product found. Seed or create a product.</div>
          )}
        </div>

        <footer className="mt-16 text-center text-gray-400">
          <p>Built with React, NestJS, PostgreSQL, and Redis</p>
          <p className="mt-2 text-sm">Designed for high concurrency and scalability</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

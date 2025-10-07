import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1.0';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ProductStatus {
  productId: string;
  productName: string;
  status: 'upcoming' | 'active' | 'ended';
  availableQuantity: number;
  totalQuantity: number;
  soldQuantity: number;
  price: number;
  saleStartAt: string;
  saleEndAt: string;
}

export interface PurchaseRequest {
  productId: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface PurchaseResponse {
  orderId: string;
  productId: string;
  userId: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
  purchasedAt: string;
}

export interface UserPurchaseStatus {
  hasPurchased: boolean;
  order?: {
    id: string;
    status: string;
    quantity: number;
    price: number;
    createdAt: string;
  };
}

export const getProductStatus = async (productId: string): Promise<ProductStatus> => {
  const response = await apiClient.get(`/sale/status/${productId}`);
  const { success, data, error } = response.data || {};
  if (success === false) {
    throw new Error(error || 'Failed to load product status');
  }
  return data;
};

export const getFirstProductStatus = async (): Promise<ProductStatus> => {
  const response = await apiClient.get(`/sale/first`);
  const { success, data, error } = response.data || {};
  if (success === false) {
    throw new Error(error || 'Failed to load product');
  }
  return data;
};

export const purchaseProduct = async (
  request: PurchaseRequest,
  userId: string
): Promise<PurchaseResponse> => {
  const response = await apiClient.post('/sale/purchase', request, {
    headers: {
      'x-user-id': userId,
    },
  });
  const { success, data, error } = response.data || {};
  if (success === false) {
    throw new Error(error || 'Purchase failed');
  }
  return data;
};

export const getUserPurchaseStatus = async (
  productId: string,
  userId: string
): Promise<UserPurchaseStatus> => {
  const response = await apiClient.get(`/sale/user/status?productId=${productId}`, {
    headers: {
      'x-user-id': userId,
    },
  });
  const { success, data, error } = response.data || {};
  if (success === false) {
    throw new Error(error || 'Failed to load user status');
  }
  return data;
};

export const createProduct = async (productData: any): Promise<any> => {
  const response = await apiClient.post('/sale/admin/products', productData);
  return response.data.data;
};

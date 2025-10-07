import axios from 'axios';

export interface SaleStatusResponse {
  success: boolean;
  data: {
    productId: string;
    productName: string;
    status: 'upcoming' | 'active' | 'ended';
    availableQuantity: number;
    totalQuantity: number;
    soldQuantity: number;
    price: number;
    saleStartAt?: string;
    saleEndAt?: string;
  };
}

export interface PurchaseResponse {
  success: boolean;
  data: {
    orderId: string;
    productId: string;
    userId: string;
    quantity: number;
    price: number;
    total: number;
    status: string;
    purchasedAt: string;
  };
}

export interface UserStatusResponse {
  success: boolean;
  data: {
    hasPurchased: boolean;
    order: null | {
      id: string;
      status: string;
      quantity: number;
      price: number;
      createdAt: string;
    };
  };
}

export async function getSaleStatus(productId: string) {
  const { data } = await axios.get<SaleStatusResponse>(`/sale/status/${productId}`);
  return data;
}

export async function purchase(productId: string, userId: string, token?: string) {
  const { data } = await axios.post<PurchaseResponse>(
    `/sale/purchase`,
    { productId, userId },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
  return data;
}

export async function getUserStatus(productId: string, token?: string) {
  const { data } = await axios.get<UserStatusResponse>(
    `/sale/user/status`,
    {
      params: { productId },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data;
}

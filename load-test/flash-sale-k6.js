import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Config
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1.0';

// Load users from CSV (header: userId)
const users = new SharedArray('users', () => {
  // Use path relative to this script's directory
  const text = open('./users.csv'); // first line: userId
  const lines = text.trim().split('\n');
  lines.shift(); // remove header
  return lines.map((l) => l.trim()).filter(Boolean);
});

// Fetch productId in setup via /sale/first
export function setup() {
  const res = http.get(`${BASE_URL}/sale/first`, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'got first product 200': (r) => r.status === 200 });

  const data = res.json('data');
  if (!data || !data.productId) {
    throw new Error('No productId returned from /sale/first');
  }

  return {
    productId: data.productId,
  };
}

// Scenarios
export const options = {
  scenarios: {
    check_status: {
      executor: 'ramping-vus',
      exec: 'checkStatus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 20 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      gracefulStop: '5s',
    },
    attempt_purchase: {
      executor: 'ramping-vus',
      exec: 'attemptPurchase',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '60s', target: 200 },
        { duration: '10s', target: 0 },
      ],
      gracefulStop: '5s',
      startTime: '5s',
    },
    user_status: {
      executor: 'ramping-vus',
      exec: 'checkUserStatus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '30s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      gracefulStop: '5s',
      startTime: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

function pickUser() {
  const idx = Math.floor(Math.random() * users.length);
  return users[idx];
}

// 1) Check sale status
export function checkStatus(data) {
  const url = `${BASE_URL}/sale/status/${data.productId}`;
  const res = http.get(url);
  check(res, {
    'status 200': (r) => r.status === 200,
    'has data': (r) => !!r.json('data'),
  });
  sleep(0.2);
}

// 2) Attempt a purchase (one per user)
export function attemptPurchase(data) {
  const userId = pickUser();
  const payload = JSON.stringify({
    productId: data.productId,
    userId: userId,
  });
  const res = http.post(`${BASE_URL}/sale/purchase`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
  });
  check(res, {
    'purchase 2xx/4xx acceptable': (r) => [200, 201, 400, 403].includes(r.status),
  });
  sleep(0.2);
}

// 3) Check user purchase status
export function checkUserStatus(data) {
  const userId = pickUser();
  const url = `${BASE_URL}/sale/user/status?productId=${data.productId}`;
  const res = http.get(url, {
    headers: { 'x-user-id': userId },
  });
  check(res, {
    'user status 200': (r) => r.status === 200,
  });
  sleep(0.2);
}

import axios from 'axios';
import http from 'http';
import https from 'https';
import { randomUserAgent } from './user-agents';

export const httpClient = axios.create({
  timeout: 15_000,
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 20,
    maxFreeSockets: 10,
    keepAliveMsecs: 3000,
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 20,
    maxFreeSockets: 10,
    keepAliveMsecs: 3000,
  }),
  headers: {
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
  },
});

httpClient.interceptors.request.use((config) => {
  config.headers['User-Agent'] = randomUserAgent();
  return config;
});

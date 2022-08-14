import axios from 'axios';
import { CONFIG } from '../config';

export const Request = axios.create({
  headers: {
    'Accept-Encoding': 'gzip, deflate',
  },
  decompress: true,
  timeout: 5000,
});

export const API = axios.create({
  baseURL: CONFIG.twcnApi.url,
  headers: {
    'Accept-Encoding': 'gzip, deflate',
  },
  decompress: true,
  timeout: 5000,
});

import axios from 'axios';

export const Request = axios.create({
  headers: {
    'Accept-Encoding': 'gzip, deflate',
  },
  decompress: true,
  timeout: 5000,
});

export const API = axios.create({
  baseURL: process.env.TWCN_API_URL,
  headers: {
    'Accept-Encoding': 'gzip, deflate',
  },
  decompress: true,
  timeout: 5000,
});

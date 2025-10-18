import axios from 'axios';
import { env } from './env';

export const http = axios.create({
  baseURL: env.KOI_API_URL || 'http://localhost:3001',
  timeout: 15_000,
});

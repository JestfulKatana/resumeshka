import type { ApiClient } from '../types/api';
import { httpClient } from './client';

export const api: ApiClient = httpClient;

import * as SecureStore from 'expo-secure-store';

import { authenticate, getHomeData, type HomeData, type LocalSession } from './db';

const SESSION_KEY = 'pim_local_session';

export async function login(username: string, password: string) {
  const session = await authenticate(username, password);
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function readSession(): Promise<LocalSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    await logout();
    return null;
  }
}

export async function logout() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function fetchHomeData(session: LocalSession): Promise<HomeData> {
  return getHomeData(session);
}

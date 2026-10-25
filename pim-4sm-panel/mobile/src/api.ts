import * as SecureStore from 'expo-secure-store';

import { authenticate, getHomeData, type Discipline, type HomeData, type LocalSession } from './db';

const SESSION_KEY = 'pim_local_session';
const DEFAULT_BASE_URL = 'http://192.168.0.10:3000/api';

export const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

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

async function responseError(response: Response, fallback: string) {
  const body = await response.text();
  if (!body) return fallback;
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null && 'message' in parsed && typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    return body;
  }
  return body;
}

export async function authenticateRemoteUser(username: string, password: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(await responseError(response, `Falha na autenticação remota (HTTP ${response.status}).`));
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('token' in payload) ||
    typeof payload.token !== 'string' ||
    payload.token.length === 0
  ) {
    throw new Error('A API retornou uma resposta de autenticação inválida.');
  }
  return payload.token;
}

export async function fetchDisciplinasRemotas(token: string): Promise<Discipline[]> {
  const response = await fetch(`${BASE_URL}/disciplinas`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(await responseError(response, `Falha ao carregar disciplinas da API (HTTP ${response.status}).`));
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('A API retornou uma lista de disciplinas inválida.');
  }

  return payload.map((item: unknown, index: number) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('id' in item) ||
      !('nome' in item) ||
      !('carga_hora' in item) ||
      typeof item.id !== 'number' ||
      !Number.isInteger(item.id) ||
      typeof item.nome !== 'string' ||
      typeof item.carga_hora !== 'number' ||
      !Number.isFinite(item.carga_hora)
    ) {
      throw new Error(`A disciplina recebida na posição ${index + 1} possui dados inválidos.`);
    }

    return {
      id: item.id,
      nome: item.nome,
      carga_hora: item.carga_hora,
    };
  });
}

import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchHomeData, login, logout, readSession } from './src/api';
import { initializeDatabase, type HomeData, type LocalSession } from './src/db';
import type { UserRole } from './src/types';

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  ALUNO: 'Aluno',
};

type Session = LocalSession;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [booting, setBooting] = useState(true);
  const [loadingHome, setLoadingHome] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeDatabase()
      .then(() => readSession())
      .then((savedSession) => {
        setSession(savedSession);
        if (savedSession) void loadHome(savedSession);
      })
      .catch(() => setError('Não foi possível restaurar sua sessão.'))
      .finally(() => setBooting(false));
  }, []);

  async function loadHome(nextSession: Session) {
    setLoadingHome(true);
    setError('');
    try {
      setHomeData(await fetchHomeData(nextSession));
    } catch {
      setError('Não foi possível carregar os dados locais de demonstração.');
    } finally {
      setLoadingHome(false);
    }
  }

  async function handleLogout() {
    await logout();
    setSession(null);
    setHomeData(null);
    setError('');
  }

  if (booting) return <LoadingScreen />;
  if (!session) return <LoginScreen onAuthenticated={(nextSession) => { setSession(nextSession); void loadHome(nextSession); }} />;
  return <HomeScreen session={session} data={homeData} loading={loadingHome} error={error} onRetry={() => void loadHome(session)} onLogout={() => void handleLogout()} />;
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (username.trim().length < 3 || password.length < 8) {
      setError('Informe um username válido e uma senha com pelo menos 8 caracteres.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      onAuthenticated(await login(username.trim(), password));
    } catch {
      setError('Usuário ou senha inválidos.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.loginContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>SC</Text></View>
          <Text style={styles.eyebrow}>SISCOL</Text>
          <Text style={styles.title}>Acesso ao sistema</Text>
          <Text style={styles.subtitle}>Entre com suas credenciais para continuar.</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" />
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, submitting && styles.disabled]} onPress={() => void handleSubmit()} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Entrar</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HomeScreen({ session, data, loading, error, onRetry, onLogout }: { session: Session; data: HomeData | null; loading: boolean; error: string; onRetry: () => void; onLogout: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.homeContainer}>
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.eyebrow}>SISCOL · {roleLabels[session.role]}</Text>
            <Text style={styles.title}>{data?.title ?? 'Carregando...'}</Text>
            <Text style={styles.subtitle}>{data?.subtitle ?? 'Carregando seus dados...'}</Text>
          </View>
          <Pressable onPress={onLogout} style={styles.logoutButton}><Text style={styles.logoutText}>Sair</Text></Pressable>
        </View>
        {loading ? <ActivityIndicator color="#a78bfa" size="large" style={styles.loader} /> : null}
        {error ? <View style={styles.errorCard}><Text style={styles.error}>{error}</Text><Pressable onPress={onRetry}><Text style={styles.retry}>Tentar novamente</Text></Pressable></View> : null}
        {data?.cards.map((card) => <View style={styles.card} key={card.label}><Text style={styles.cardLabel}>{card.label}</Text><Text style={styles.cardValue}>{card.value}</Text></View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingScreen() {
  return <SafeAreaView style={[styles.safeArea, styles.center]}><StatusBar style="light" /><ActivityIndicator color="#a78bfa" size="large" /></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b0f19' },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loginContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  homeContainer: { padding: 24, gap: 16 },
  homeHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  brandMark: { alignItems: 'center', backgroundColor: '#8b5cf6', borderRadius: 14, height: 56, justifyContent: 'center', marginBottom: 18, width: 56 },
  brandMarkText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 2 },
  eyebrow: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 15, lineHeight: 22 },
  form: { gap: 10, marginTop: 28 },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: '700', marginTop: 8 },
  input: { backgroundColor: '#111827', borderColor: 'rgba(148,163,184,0.25)', borderRadius: 12, borderWidth: 1, color: '#f8fafc', fontSize: 16, minHeight: 50, paddingHorizontal: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: '#8b5cf6', borderRadius: 12, justifyContent: 'center', marginTop: 12, minHeight: 52 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  logoutButton: { borderColor: 'rgba(148,163,184,0.25)', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  logoutText: { color: '#cbd5e1', fontWeight: '700' },
  card: { backgroundColor: '#111827', borderColor: 'rgba(139,92,246,0.4)', borderRadius: 16, borderWidth: 1, padding: 20 },
  cardLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  cardValue: { color: '#f8fafc', fontSize: 36, fontWeight: '800', marginTop: 10 },
  error: { color: '#fca5a5', fontSize: 14, lineHeight: 20 },
  errorCard: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, borderWidth: 1, gap: 10, padding: 14 },
  retry: { color: '#c4b5fd', fontWeight: '800' },
  loader: { marginVertical: 30 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
});

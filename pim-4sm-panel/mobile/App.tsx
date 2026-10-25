import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal as NativeModal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity as ActivityIcon, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, ChevronUp, CircleDashed, CirclePlus, ClipboardList, Eye, FileText, ListChecks, Pencil, Plus, RefreshCw, Search, Send, Trash2, X } from 'lucide-react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { all, authenticate, initializeDatabase, profile, run, sincronizarDisciplinasLocal, type Activity, type Discipline, type LocalSession, type Professor, type Question, type SchoolClass, type Student, type Submission } from './src/db';
import { NativeDataTable } from './src/components/NativeDataTable';
import { authenticateRemoteUser, fetchDisciplinasRemotas } from './src/api';

const SESSION = 'pim-session';
const labels = { ADMIN: 'Administrador', PROFESSOR: 'Professor', ALUNO: 'Aluno' } as const;
type Screen = 'home'|'disciplines'|'classes'|'professors'|'students'|'subjects'|'activities'|'newActivity'|'pending'|'profile'|'respond';
const sessionStorageAdapter = {
  get: () => Platform.OS === 'web' ? Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(SESSION)) : SecureStore.getItemAsync(SESSION),
  set: (value: string) => Platform.OS === 'web' ? Promise.resolve(typeof localStorage === 'undefined' ? undefined : localStorage.setItem(SESSION, value)) : SecureStore.setItemAsync(SESSION, value),
  delete: () => Platform.OS === 'web' ? Promise.resolve(typeof localStorage === 'undefined' ? undefined : localStorage.removeItem(SESSION)) : SecureStore.deleteItemAsync(SESSION),
};
const demo = [
  { label: 'Administrador', username: 'admin', password: 'Admin123!' },
  { label: 'Professora · Matemática', username: 'prof.ana.silva', password: 'Professor123!' },
  { label: 'Professor · História', username: 'prof.carlos.rocha', password: 'Professor123!' },
  { label: 'Professora · Programação', username: 'prof.bruna.costa', password: 'Professor123!' },
  { label: 'Aluno · João', username: 'joao.pereira', password: 'Aluno123!' },
  { label: 'Aluna · Maria', username: 'maria.souza', password: 'Aluno123!' },
  { label: 'Aluna · Lúcia', username: 'lucia.almeida', password: 'Aluno123!' },
  { label: 'Aluno · Pedro', username: 'pedro.martins', password: 'Aluno123!' },
  { label: 'Aluna · Fernanda', username: 'fernanda.costa', password: 'Aluno123!' },
];

export default function App() {
  const [session, setSession] = useState<LocalSession | null>(null); const [boot, setBoot] = useState(true); const [screen, setScreen] = useState<Screen>('home'); const [activityId, setActivityId] = useState<number | null>(null); const [refresh, setRefresh] = useState(0);
  useEffect(() => { initializeDatabase().then(() => sessionStorageAdapter.get()).then(v => v && setSession(JSON.parse(v))).finally(() => setBoot(false)); }, []);
  const login = async (u: string, p: string) => { try { const s = await authenticate(u.trim(), p); await sessionStorageAdapter.set(JSON.stringify(s)); setScreen('home'); setSession(s); } catch { Alert.alert('Acesso negado', 'Usuário ou senha inválidos.'); } };
  if (boot) return <SafeAreaProvider><View style={s.center}><ActivityIndicator color="#8b5cf6" size="large"/></View></SafeAreaProvider>;
  if (!session) return <SafeAreaProvider><Login onLogin={login}/></SafeAreaProvider>;
  const signOut = async () => { await sessionStorageAdapter.delete(); setScreen('home'); setSession(null); };
  return <SafeAreaProvider><AuthenticatedApp session={session} screen={screen} setScreen={setScreen} activityId={activityId} setActivityId={setActivityId} signOut={signOut} refresh={refresh} bump={() => setRefresh(value => value + 1)} /></SafeAreaProvider>;
}
function Login({onLogin}:{onLogin:(u:string,p:string)=>void}) { const [u,setU]=useState(''); const [p,setP]=useState(''); const insets=useSafeAreaInsets(); return <View style={[s.safe,{paddingTop:insets.top,paddingBottom:insets.bottom}]}><StatusBar style="light"/><ScrollView contentContainerStyle={s.login}><View style={s.authBrand}><View style={s.brandMark}><Text style={s.brandMarkText}>SC</Text></View><View><Text style={s.eyebrow}>Siscol</Text><Text style={s.brandTitle}>PIM</Text></View></View><Text style={s.eyebrow}>Acesso ao sistema</Text><Text style={s.authTitle}>Entrar na sua conta</Text><Input label="Username" value={u} onChangeText={setU}/><Input label="Password" value={p} onChangeText={setP} secureTextEntry/><Button title="Entrar" onPress={()=>onLogin(u,p)}/><Text style={s.section}>Acesso rápido</Text>{demo.map(d=><Pressable key={d.username} style={s.demo} onPress={()=>onLogin(d.username,d.password)}><Text style={s.bold}>{d.label}</Text><Text style={s.muted}>{d.username} · senha de demonstração</Text></Pressable>)}</ScrollView></View> }
function AuthenticatedApp({session,screen,setScreen,activityId,setActivityId,signOut,refresh,bump}:{session:LocalSession;screen:Screen;activityId:number|null;setActivityId:(id:number|null)=>void;setScreen:(screen:Screen)=>void;signOut:()=>Promise<void>;refresh:number;bump:()=>void}) {
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<Array<{entity:string;name:string}>>([]);
  const insets=useSafeAreaInsets();
  useEffect(()=>{let active=true;const value=query.trim();if(session.role!=='ADMIN'||!value){setResults([]);return undefined;}const timer=setTimeout(async()=>{const found=await Promise.all([
    all<{nome:string}>('SELECT nome FROM alunos WHERE nome LIKE ? LIMIT 5',`%${value}%`).then(rows=>rows.map(row=>({entity:'Alunos',name:row.nome}))),
    all<{nome:string}>('SELECT nome FROM professores WHERE nome LIKE ? LIMIT 5',`%${value}%`).then(rows=>rows.map(row=>({entity:'Professores',name:row.nome}))),
    all<{nome:string}>('SELECT nome FROM disciplinas WHERE nome LIKE ? LIMIT 5',`%${value}%`).then(rows=>rows.map(row=>({entity:'Disciplinas',name:row.nome}))),
    all<{nome:string}>('SELECT nome FROM turmas WHERE nome LIKE ? LIMIT 5',`%${value}%`).then(rows=>rows.map(row=>({entity:'Turmas',name:row.nome}))),
  ]);if(active)setResults(found.flat());},300);return()=>{active=false;clearTimeout(timer)}},[query,session.role]);
  return <View style={[s.safe,{paddingTop:insets.top,paddingBottom:insets.bottom}]}><StatusBar style="light"/><View style={s.sidebar}><View style={s.sidebarHead}><Pressable style={s.menuToggle} onPress={()=>setOpen(value=>!value)} accessibilityLabel={open?'Fechar navegação':'Abrir navegação'}>{open?<ChevronUp color="#f8fafc" size={20}/>:<ChevronDown color="#f8fafc" size={20}/>}</Pressable><View style={s.brandBlock}><View style={s.brandMark}><Text style={s.brandMarkText}>SC</Text></View><View><Text style={s.eyebrow}>Siscol</Text><Text style={s.brandTitle}>PIM</Text></View></View></View>{open&&<Menu role={session.role} screen={screen} go={value=>{setScreen(value);setOpen(false)}}/>}</View><View style={s.mainPanel}><View style={s.topbar}><Text style={s.roleBadge}>{labels[session.role]}</Text><Pressable style={s.secondaryButton} onPress={()=>void signOut()}><Text style={s.secondaryText}>Sair</Text></Pressable>{session.role==='ADMIN'&&<View style={s.searchShell}><Search color="#94a3b8" size={18} style={s.searchIcon}/><TextInput value={query} onChangeText={setQuery} placeholder="Buscar alunos, professores, turmas" placeholderTextColor="#94a3b8" style={s.searchInput}/>{query.trim()!==''&&<View style={s.searchResults}>{results.length?results.map((item,index)=><Pressable key={`${item.entity}-${item.name}-${index}`} style={s.searchResult}><Text style={s.searchResultName}>{item.name}</Text><Text style={s.searchResultEntity}>{item.entity}</Text></Pressable>):<Text style={s.searchEmpty}>Nenhum resultado encontrado.</Text>}</View>}</View>}</View><ScrollView contentContainerStyle={s.contentArea}>{screen === 'home' && <Home session={session} go={setScreen} refresh={refresh}/>}{screen === 'disciplines' && <ExactDisciplineAdmin onChange={bump}/>}{screen === 'classes' && <ExactClassAdmin onChange={bump}/>}{screen === 'professors' && <ExactProfessorAdmin onChange={bump}/>}{screen === 'students' && (session.role==='PROFESSOR'?<ExactProfessorStudents session={session}/>:<ExactStudentAdmin onChange={bump}/>)}{screen === 'subjects' && (session.role==='PROFESSOR'?<ExactProfessorDiscipline session={session}/>:<ExactStudentSubjects session={session}/>)}{screen === 'activities' && <Activities session={session} selectActivity={id=>{setActivityId(id);setScreen('respond')}} refresh={refresh}/>}{screen === 'newActivity' && <NewActivity session={session} done={()=>{setScreen('activities');bump()}} />}{screen === 'pending' && <Pending session={session} refresh={refresh}/>}{screen === 'profile' && <Profile session={session}/>}{screen === 'respond' && <Respond session={session} activityId={activityId} done={()=>{setScreen('activities');bump()}} />}</ScrollView></View></View>
}
function Menu({role,screen,go}:{role:LocalSession['role'];screen:Screen;go:(x:Screen)=>void}) { const items:Screen[] = role==='ADMIN'?['home','disciplines','classes','professors','students']:role==='PROFESSOR'?['home','subjects','students','newActivity','pending']:['home','profile','subjects','activities']; const names:Record<Screen,string>={home:role==='ADMIN'?'Dashboard':role==='PROFESSOR'?'Desempenho':'Meu Desempenho',disciplines:'Disciplinas',classes:'Turmas',professors:'Professores',students:role==='PROFESSOR'?'Meus Alunos':'Alunos',subjects:role==='PROFESSOR'?'Minha Disciplina':'Minhas Disciplinas',activities:'Atividades',newActivity:'Nova Atividade',pending:'Correções pendentes',profile:'Meu Perfil',respond:'Responder'}; return <View style={s.menu}>{items.map(i=><Pressable key={i} onPress={()=>go(i)} style={[s.navItem,screen===i&&s.navItemActive]}><View style={s.navDot}/><Text style={screen===i?s.navTextActive:s.navText}>{names[i]}</Text></Pressable>)}</View> }
function Home({session,go,refresh}:{session:LocalSession;go:(x:Screen)=>void;refresh:number}) {
  const [counts,setCounts]=useState<Record<string,number>>({});
  const [classes,setClasses]=useState<Array<{turma:string;count:number}>>([]);
  const [disciplines,setDisciplines]=useState<Array<{nome:string;horas:number}>>([]);
  const [polarData,setPolarData]=useState<Array<{label:string;value:number}>>([]);
  const [classPerformance,setClassPerformance]=useState<Array<{label:string;value:number}>>([]);
  const [overallAverage,setOverallAverage]=useState<number|null>(null);
  const [syncing,setSyncing]=useState(false);
  const [syncRevision,setSyncRevision]=useState(0);
  const [syncDialogOpen,setSyncDialogOpen]=useState(false);
  const [remoteUsername,setRemoteUsername]=useState(session.username);
  const [remotePassword,setRemotePassword]=useState('');
  const [syncError,setSyncError]=useState('');
  useEffect(()=>{
    Promise.all(['disciplinas','turmas','professores','alunos','atividades'].map(async table=>[table,(await all<{n:number}>(`SELECT COUNT(*) n FROM ${table}`))[0]?.n||0])).then(values=>setCounts(Object.fromEntries(values)));
    const performanceQuery=session.role==='PROFESSOR'
      ?'SELECT al.nome label, COALESCE(AVG(e.nota),0) value FROM entregas e JOIN alunos al ON al.id=e.aluno_id JOIN atividades at ON at.id=e.atividade_id JOIN professores p ON p.disciplina_id=at.disciplina_id WHERE p.usuario_id=? AND e.nota IS NOT NULL GROUP BY al.id,al.nome ORDER BY al.nome'
      :'SELECT d.nome label, COALESCE(AVG(e.nota),0) value FROM entregas e JOIN atividades at ON at.id=e.atividade_id JOIN disciplinas d ON d.id=at.disciplina_id JOIN alunos al ON al.id=e.aluno_id WHERE al.usuario_id=? AND e.nota IS NOT NULL GROUP BY d.id,d.nome ORDER BY d.nome';
    const classQuery='SELECT t.nome label, COALESCE(AVG(e.nota),0) value FROM entregas e JOIN alunos al ON al.id=e.aluno_id JOIN turmas t ON t.id=al.turma_id JOIN atividades at ON at.id=e.atividade_id JOIN professores p ON p.disciplina_id=at.disciplina_id WHERE p.usuario_id=? AND e.nota IS NOT NULL GROUP BY t.id,t.nome';
    const averageQuery=session.role==='PROFESSOR'
      ?'SELECT AVG(e.nota) value FROM entregas e JOIN atividades at ON at.id=e.atividade_id JOIN professores p ON p.disciplina_id=at.disciplina_id WHERE p.usuario_id=? AND e.nota IS NOT NULL'
      :'SELECT AVG(e.nota) value FROM entregas e JOIN alunos al ON al.id=e.aluno_id WHERE al.usuario_id=? AND e.nota IS NOT NULL';
    Promise.all([
      all<{turma:string;count:number}>('SELECT t.nome turma, COUNT(a.id) count FROM turmas t LEFT JOIN alunos a ON a.turma_id=t.id GROUP BY t.id,t.nome ORDER BY t.nome'),
      all<{nome:string;horas:number}>('SELECT nome, carga_hora horas FROM disciplinas ORDER BY nome'),
      all<{label:string;value:number}>(performanceQuery,session.userId),
      all<{label:string;value:number}>(classQuery,session.userId),
      all<{value:number|null}>(averageQuery,session.userId),
    ]).then(([classRows,disciplineRows,performanceRows,classPerformanceRows,averageRows])=>{
      setClasses(classRows);
      setDisciplines(disciplineRows);
      setPolarData(performanceRows);
      setClassPerformance(classPerformanceRows);
      setOverallAverage(averageRows[0]?.value===null||averageRows[0]?.value===undefined?null:Number(averageRows[0].value));
    });
  },[refresh,session.role,session.userId,syncRevision]);
  const handleSync=async()=>{
    setSyncError('');
    if(!remoteUsername.trim()||!remotePassword){
      setSyncError('Informe o usuário e a senha da API para sincronizar.');
      return;
    }
    setSyncing(true);
    try{
      const token=await authenticateRemoteUser(remoteUsername.trim(),remotePassword);
      const remoteDisciplines=await fetchDisciplinasRemotas(token);
      await sincronizarDisciplinasLocal(remoteDisciplines);
      setSyncRevision(value=>value+1);
      setSyncDialogOpen(false);
      setRemotePassword('');
      const message=`Sincronização concluída. ${remoteDisciplines.length} ${remoteDisciplines.length===1?'disciplina foi sincronizada':'disciplinas foram sincronizadas'}.`;
      if(Platform.OS==='web'&&typeof window!=='undefined')window.alert(message);
      else Alert.alert('Sincronização concluída',message);
    }catch(error){
      console.error('Failed to synchronize disciplines.',error);
      const message=error instanceof Error?error.message:'Ocorreu um erro inesperado durante a sincronização.';
      setSyncError(message);
      if(Platform.OS==='web'&&typeof window!=='undefined')window.alert(`Falha na sincronização: ${message}`);
      else Alert.alert('Falha na sincronização',message);
    }finally{
      setSyncing(false);
    }
  };
  const closeSyncDialog=()=>{
    if(syncing)return;
    setSyncDialogOpen(false);
    setRemotePassword('');
    setSyncError('');
  };
  if(session.role==='ADMIN') return (
    <View style={s.pageSection}>
      <PageHeader eyebrow="Visão geral" title="Dashboard acadêmico" action={<Button title="Sincronizar Dados" icon={<RefreshCw color="#fff" size={15}/>} onPress={()=>{setSyncError('');setSyncDialogOpen(true)}}/>}/>
      <View style={s.statsGrid}>{[['Total de alunos','alunos','purple'],['Total de professores','professores','blue'],['Total de turmas','turmas','green'],['Total de disciplinas','disciplinas','amber']].map(([label,key,accent])=><StatCard key={key} label={label} value={counts[key]||0} accent={accent}/>)}</View>
      <View style={s.chartGrid}>
        <ChartPanel title="Alunos por turma"><BarChartNative data={classes}/></ChartPanel>
        <ChartPanel title="Carga horária por disciplina"><DonutChart data={disciplines}/></ChartPanel>
      </View>
      <ModalCard
        visible={syncDialogOpen}
        title="Sincronizar Dados"
        onClose={closeSyncDialog}
        footer={
          <View style={s.modalActions}>
            <Button title="Cancelar" variant="secondary" compact onPress={closeSyncDialog} disabled={syncing}/>
            <Button title={syncing?'Sincronizando...':'Sincronizar'} compact onPress={()=>void handleSync()} disabled={syncing}/>
          </View>
        }
      >
        <Text style={s.muted}>Use as credenciais cadastradas no backend. Elas podem ser diferentes do acesso local; a senha não será salva.</Text>
        <Input label="Usuário da API" value={remoteUsername} onChangeText={setRemoteUsername} autoCapitalize="none" autoComplete="username"/>
        <Input label="Senha da API" value={remotePassword} onChangeText={setRemotePassword} secureTextEntry autoComplete="current-password"/>
        {syncError!==''&&<Text accessibilityRole="alert" style={s.formError}>{syncError}</Text>}
      </ModalCard>
    </View>
  );
  const isProfessor=session.role==='PROFESSOR';
  return <View style={s.pageSection}><PageHeader eyebrow={isProfessor?'Área do professor':'Área do aluno'} title={isProfessor?'Desempenho da disciplina':'Meu Desempenho Geral'}/><View style={s.gradeSummaryRow}><GradeStatCard label={isProfessor?'Turmas avaliadas':'Disciplinas avaliadas'} value={isProfessor?classPerformance.length:polarData.length} accent="purple"/><GradeStatCard label={isProfessor?'Alunos avaliados':'Média geral'} value={isProfessor?polarData.length:(overallAverage===null?'—':overallAverage.toFixed(1))} accent="blue"/>{isProfessor&&<GradeStatCard label="Média geral" value={overallAverage===null?'—':overallAverage.toFixed(1)} accent="green" />}</View>{isProfessor?<View style={s.chartGrid}><ChartPanel title="Desempenho por Turma"><GradePolarPanel labels={classPerformance.map(item=>item.label)} values={classPerformance.map(item=>Number(item.value)||0)} emptyTitle="Sem notas por turma" emptyDescription="As médias aparecerão após as primeiras correções."/></ChartPanel><ChartPanel title="Notas dos Alunos"><GradePolarPanel labels={polarData.map(item=>item.label)} values={polarData.map(item=>Number(item.value)||0)} emptyTitle="Sem notas de alunos" emptyDescription="As médias individuais aparecerão após as primeiras correções."/></ChartPanel></View>:<ChartPanel title="Desempenho por disciplina"><GradePolarPanel labels={polarData.map(item=>item.label)} values={polarData.map(item=>Number(item.value)||0)} emptyTitle="Ainda sem notas" emptyDescription="Suas médias aparecerão aqui quando suas atividades forem corrigidas."/></ChartPanel>}</View>
}
function StatCard({label,value,accent}:{label:string;value:number|string;accent:string}) { return <View style={[s.statCard,accent==='purple'&&s.statPurple,accent==='blue'&&s.statBlue,accent==='green'&&s.statGreen,accent==='amber'&&s.statAmber]}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{value}</Text></View> }
function GradeStatCard({label,value,accent}:{label:string;value:number|string;accent:string}) { return <View style={[s.gradeStatCard,accent==='purple'&&s.statPurple,accent==='blue'&&s.statBlue,accent==='green'&&s.statGreen]}><Text style={s.gradeStatLabel}>{label}</Text><Text style={s.gradeStatValue}>{value}</Text></View> }
function ChartPanel({title,children}:{title:string;children:React.ReactNode}) { return <View style={s.chartPanel}><Text style={s.chartTitle}>{title}</Text>{children}</View> }
function GradePolarPanel({labels,values,emptyTitle,emptyDescription}:{labels:string[];values:number[];emptyTitle:string;emptyDescription:string}) { return labels.length?<PolarChart labels={labels} values={values}/>:<EmptyState title={emptyTitle} description={emptyDescription}/> }
const chartColors=['#8b5cf6','#a78bfa','#60a5fa','#c084fc','#818cf8'];
function BarChartNative({data}:{data:Array<{turma:string;count:number}>}) {
  const maximum=Math.max(4,...data.map(item=>item.count));
  const ticks=[0,1,2,3,4].map(index=>maximum*index/4);
  const plotLeft=63;
  const plotRight=315;
  const plotTop=5;
  const plotBottom=225;
  const plotHeight=plotBottom-plotTop;
  const step=(plotRight-plotLeft)/Math.max(data.length,1);
  const barWidth=Math.min(105,step*0.8);
  return <View style={s.nativeChart}>
    <Svg width="100%" height={260} viewBox="0 0 320 260">
      {ticks.map((tick,index)=>{
        const y=plotBottom-plotHeight*index/4;
        return <G key={tick}>
          <Line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3"/>
          <SvgText x={plotLeft-10} y={y+4} fill="#cbd5e1" fontSize="12" textAnchor="end">{String(tick)}</SvgText>
        </G>;
      })}
      {data.slice(0,6).map((item,index)=>{
        const height=(item.count/maximum)*plotHeight;
        const center=plotLeft+step*(index+0.5);
        const x=center-barWidth/2;
        return <G key={`${item.turma}-${index}`}>
          <Rect x={x} y={plotBottom-height} width={barWidth} height={height} rx="8" fill="#8b5cf6"/>
          <SvgText x={center} y={plotBottom+20} fill="#cbd5e1" fontSize="12" textAnchor="middle">{item.turma.slice(0,8)}</SvgText>
          <SvgText x={center} y={plotBottom-height-6} fill="#f8fafc" fontSize="12" textAnchor="middle">{String(item.count)}</SvgText>
        </G>;
      })}
    </Svg>
  </View>;
}
function DonutChart({data}:{data:Array<{nome:string;horas:number}>}) {
  const total=data.reduce((sum,item)=>sum+item.horas,0);
  let cursor=0;
  return <View style={s.donutLayout}>
    <Svg width="100%" height={260} viewBox="0 0 260 260">
      {data.slice(0,6).map((item,index)=>{
        const fraction=total?item.horas/total:0;
        const sweep=fraction*Math.PI*2;
        const gap=Math.min(Math.PI/90,sweep);
        const start=cursor+gap/2;
        cursor+=sweep;
        const end=cursor-gap/2;
        if(end<=start)return null;
        const large=end-start>Math.PI?1:0;
        const x1=130+75*Math.cos(start);
        const y1=130-75*Math.sin(start);
        const x2=130+75*Math.cos(end);
        const y2=130-75*Math.sin(end);
        return <Path key={`${item.nome}-${index}`} d={`M ${x1} ${y1} A 75 75 0 ${large} 0 ${x2} ${y2}`} fill="none" stroke={chartColors[index%chartColors.length]} strokeWidth="34"/>;
      })}
    </Svg>
    <View style={s.donutLegend}>
      {data.slice(0,6).map((item,index)=><View key={`${item.nome}-legend`} style={s.donutLegendRow}>
        <View style={[s.legendDot,{backgroundColor:chartColors[index%chartColors.length]}]}/>
        <Text style={s.donutLegendText} numberOfLines={1}>{item.nome}</Text>
        <Text style={s.donutLegendValue}>{item.horas}h</Text>
      </View>)}
    </View>
  </View>;
}
const polarChartColors=['rgba(139,92,246,0.76)','rgba(96,165,250,0.76)','rgba(34,197,94,0.72)','rgba(245,158,11,0.76)','rgba(192,132,252,0.76)','rgba(20,184,166,0.72)'];
const polarChartBorders=['#a78bfa','#93c5fd','#86efac','#fcd34d','#d8b4fe','#5eead4'];
function PolarChart({labels,values}:{labels:string[];values:number[]}) {
  const points=labels.slice(0,6);
  const centerX=120;
  const centerY=105;
  const radius=108;
  const segmentAngle=(Math.PI*2)/(points.length||1);
  return <View style={s.polarChart}>
    <Svg width="100%" height={268} viewBox="0 0 240 220">
      {[2,4,6,8,10].map(tick=><G key={tick}>
        <Circle cx={centerX} cy={centerY} r={radius*tick/10} fill="none" stroke="rgba(148,163,184,0.16)"/>
        <SvgText x={centerX+4} y={centerY-radius*tick/10+3} fill="#94a3b8" fontSize="8">{String(tick)}</SvgText>
      </G>)}
      {points.map((label,index)=>{
        const start=-Math.PI/2+index*segmentAngle;
        const end=start+segmentAngle;
        const value=Math.min(10,Math.max(0,values[index]||0));
        const outerRadius=radius*value/10;
        const startX=centerX+outerRadius*Math.cos(start);
        const startY=centerY+outerRadius*Math.sin(start);
        const endX=centerX+outerRadius*Math.cos(end);
        const endY=centerY+outerRadius*Math.sin(end);
        const path=outerRadius===0?'':`M ${centerX} ${centerY} L ${startX} ${startY} A ${outerRadius} ${outerRadius} 0 ${segmentAngle>Math.PI?1:0} 1 ${endX} ${endY} Z`;
        const lineAngle=start+segmentAngle/2;
        return <G key={`${label}-${index}`}>
          <Line x1={centerX} y1={centerY} x2={centerX+radius*Math.cos(lineAngle)} y2={centerY+radius*Math.sin(lineAngle)} stroke="rgba(148,163,184,0.2)"/>
          {points.length===1&&outerRadius>0
            ?<Circle cx={centerX} cy={centerY} r={outerRadius} fill={polarChartColors[index%polarChartColors.length]} stroke={polarChartBorders[index%polarChartBorders.length]} strokeWidth="1.5"/>
            :path!==''&&<Path d={path} fill={polarChartColors[index%polarChartColors.length]} stroke={polarChartBorders[index%polarChartBorders.length]} strokeWidth="1.5"/>}
        </G>;
      })}
    </Svg>
    <View style={s.polarLegend}>{points.map((label,index)=><View key={`${label}-${index}`} style={s.legendRow}>
      <View style={[s.legendDot,{backgroundColor:polarChartBorders[index%polarChartBorders.length]}]}/>
      <Text style={s.legendText}>{label}</Text>
    </View>)}</View>
  </View>;
}
function MetricRow({label,value}:{label:string;value:number}) { return <View style={s.metricRow}><Text style={s.muted}>{label}</Text><Text style={s.metricValue}>{value}</Text></View> }
function ExactDisciplineAdmin({onChange}:{onChange:()=>void}) {
  const [rows,setRows]=useState<Discipline[]>([]);
  const [open,setOpen]=useState(false);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [name,setName]=useState('');
  const [hours,setHours]=useState('0');
  const load=()=>all<Discipline>('SELECT * FROM disciplinas ORDER BY id').then(setRows);
  useEffect(()=>{void load()},[]);
  const edit=(row:Discipline)=>{setEditingId(row.id);setName(row.nome);setHours(String(row.carga_hora));setOpen(true)};
  const save=async()=>{
    if(!name.trim())return;
    const value=Number(hours);
    if(editingId===null)await run('INSERT INTO disciplinas(nome,carga_hora) VALUES(?,?)',name.trim(),value);
    else await run('UPDATE disciplinas SET nome=?,carga_hora=? WHERE id=?',name.trim(),value,editingId);
    setOpen(false);setEditingId(null);setName('');setHours('0');await load();onChange();
  };
  return <View style={s.pageSection}>
    <PageHeader eyebrow="Cadastro" title="Disciplinas" action={<Button title="Nova disciplina" icon={<Plus color="#fff" size={15}/>} onPress={()=>{setEditingId(null);setName('');setHours('0');setOpen(true)}}/>}/>
    <NativeDataTable columns={[{key:'id',header:'ID',width:62,render:r=>String(r.id)},{key:'nome',header:'Nome',width:195,render:r=>r.nome},{key:'hours',header:'Carga horária',width:211,render:r=>String(r.carga_hora)}]} actionsWidth={172} data={rows} emptyMessage="Nenhuma disciplina cadastrada." onEdit={edit} onDelete={row=>confirmDelete('Deseja excluir esta disciplina?',row.nome,async()=>{await run('DELETE FROM disciplinas WHERE id=?',row.id);await load();onChange()},async()=>{const [teachers,studentLinks,activities]=await Promise.all([all<{count:number}>('SELECT COUNT(*) count FROM professores WHERE disciplina_id=?',row.id),all<{count:number}>('SELECT COUNT(*) count FROM aluno_disciplina WHERE disciplina_id=?',row.id),all<{count:number}>('SELECT COUNT(*) count FROM atividades WHERE disciplina_id=?',row.id)]);return linkedRecordsMessage('disciplina',[{count:teachers[0]?.count??0,singular:'professor',plural:'professores'},{count:studentLinks[0]?.count??0,singular:'vínculo de aluno',plural:'vínculos de alunos'},{count:activities[0]?.count??0,singular:'atividade',plural:'atividades'}])})}/>
    <ModalCard visible={open} title={editingId===null?'Nova disciplina':'Editar disciplina'} onClose={()=>setOpen(false)} footer={<View style={s.modalActions}><Button title="Cancelar" variant="secondary" compact onPress={()=>setOpen(false)}/><Button title={editingId===null?'Salvar':'Atualizar'} compact onPress={save}/></View>}>
      <View style={s.formGrid}>
        <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex: Matemática"/>
        <Input label="Carga horária" value={hours} onChangeText={setHours} keyboardType="numeric"/>
      </View>
    </ModalCard>
  </View>;
}
function DisciplineAdmin({onChange}:{onChange:()=>void}) { const [rows,setRows]=useState<Discipline[]>([]); const [name,setName]=useState('');const [hours,setHours]=useState('40');const [editingId,setEditingId]=useState<number|null>(null);const load=()=>all<Discipline>('SELECT * FROM disciplinas ORDER BY nome').then(setRows);useEffect(()=>{void load()},[]);const save=async()=>{if(name.trim()){if(editingId===null)await run('INSERT INTO disciplinas(nome,carga_hora) VALUES(?,?)',name.trim(),Number(hours)||40);else await run('UPDATE disciplinas SET nome=?,carga_hora=? WHERE id=?',name.trim(),Number(hours)||40,editingId);setName('');setHours('40');setEditingId(null);void load();onChange()}};return <Crud title="Disciplinas" fields={<><Input label="Nome" value={name} onChangeText={setName}/><Input label="Carga horária" value={hours} onChangeText={setHours} keyboardType="numeric"/></>} add={save} rows={rows.map(x=>({id:x.id,text:`${x.nome} · ${x.carga_hora}h`,sql:'disciplinas'}))} onEdit={id=>{const row=rows.find(item=>item.id===id);if(row){setEditingId(id);setName(row.nome);setHours(String(row.carga_hora))}}} reload={()=>{void load()}}/> }
function ExactClassAdmin({onChange}:{onChange:()=>void}) {
  const [rows,setRows]=useState<SchoolClass[]>([]);
  const [open,setOpen]=useState(false);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [name,setName]=useState('');
  const [selected,setSelected]=useState<SchoolClass|null>(null);
  const [students,setStudents]=useState<Array<Student & {disciplinas:string}>>([]);
  const load=()=>all<SchoolClass>('SELECT * FROM turmas ORDER BY nome').then(setRows);
  useEffect(()=>{void load()},[]);
  const select=async(row:SchoolClass)=>{
    setSelected(row);
    setStudents(await all<Student & {disciplinas:string}>(
      'SELECT a.*,GROUP_CONCAT(d.nome, ?) disciplinas FROM alunos a LEFT JOIN aluno_disciplina ad ON ad.aluno_id=a.id LEFT JOIN disciplinas d ON d.id=ad.disciplina_id WHERE a.turma_id=? GROUP BY a.id',
      ', ',row.id,
    ));
  };
  const save=async()=>{
    if(!name.trim())return;
    if(editingId===null)await run('INSERT INTO turmas(nome) VALUES(?)',name.trim());
    else await run('UPDATE turmas SET nome=? WHERE id=?',name.trim(),editingId);
    setOpen(false);setEditingId(null);setName('');await load();onChange();
  };
  return <View style={s.pageSection}>
    <PageHeader eyebrow="Cadastro" title="Turmas" action={<Button title="Nova turma" icon={<Plus color="#fff" size={15}/>} onPress={()=>{setEditingId(null);setName('');setOpen(true)}}/>}/>
    <NativeDataTable columns={[{key:'id',header:'ID',width:97,render:r=>String(r.id)},{key:'nome',header:'Nome',width:160,render:r=>r.nome}]} actionsWidth={383} data={rows} emptyMessage="Nenhuma turma cadastrada." onView={row=>void select(row)} onEdit={row=>{setEditingId(row.id);setName(row.nome);setOpen(true)}} onDelete={row=>confirmDelete('Deseja excluir esta turma?',row.nome,async()=>{await run('DELETE FROM turmas WHERE id=?',row.id);await load();onChange()},async()=>{const [students]=await all<{count:number}>('SELECT COUNT(*) count FROM alunos WHERE turma_id=?',row.id);return linkedRecordsMessage('turma',[{count:students?.count??0,singular:'aluno',plural:'alunos'}])})}/>
    {selected&&<Panel>
      <Text style={s.chartTitle}>Alunos de {selected.nome}</Text>
      <NativeDataTable columns={[{key:'nome',header:'Nome',render:r=>r.nome},{key:'status',header:'Matrícula',render:r=>r.matriculado?'Ativa':'Inativa'},{key:'disciplinas',header:'Disciplinas',render:r=>r.disciplinas||'—'}]} data={students} emptyMessage="Nenhum aluno nesta turma."/>
    </Panel>}
    <ModalCard visible={open} title={editingId===null?'Nova turma':'Editar turma'} onClose={()=>setOpen(false)} footer={<View style={s.modalActions}><Button title="Cancelar" variant="secondary" compact onPress={()=>setOpen(false)}/><Button title={editingId===null?'Salvar':'Atualizar'} compact onPress={save}/></View>}>
      <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex: A"/>
    </ModalCard>
  </View>;
}
function ClassAdmin({onChange}:{onChange:()=>void}) { const [rows,setRows]=useState<SchoolClass[]>([]);const [name,setName]=useState('');const [editingId,setEditingId]=useState<number|null>(null);const [selected,setSelected]=useState<SchoolClass|null>(null);const [students,setStudents]=useState<Student[]>([]);const load=()=>all<SchoolClass>('SELECT * FROM turmas ORDER BY nome').then(setRows);useEffect(()=>{void load()},[]);const select=async(row:SchoolClass)=>{setSelected(row);setStudents(await all<Student>('SELECT a.*,t.nome turma FROM alunos a LEFT JOIN turmas t ON t.id=a.turma_id WHERE a.turma_id=?',row.id))};return <View style={s.pageSection}><PageHeader eyebrow="Cadastro" title="Turmas" action={<Button title="+ Nova turma" onPress={()=>{setEditingId(null);setName('')}}/>} /><Panel><Input label="Nome da turma" value={name} onChangeText={setName}/><Button title={editingId===null?'Salvar turma':'Atualizar turma'} onPress={async()=>{if(name){if(editingId===null)await run('INSERT INTO turmas(nome) VALUES(?)',name);else await run('UPDATE turmas SET nome=? WHERE id=?',name,editingId);setName('');setEditingId(null);void load();onChange()}}}/>{rows.map(row=><View style={s.tableRow} key={row.id}><Pressable style={s.tableCopy} onPress={()=>void select(row)}><Text style={s.tableId}>ID {row.id}</Text><Text style={s.rowText}>{row.nome}</Text></Pressable><View style={s.rowActions}><Pressable style={s.iconButton} onPress={()=>{setEditingId(row.id);setName(row.nome)}}><Pencil color="#cbd5e1" size={17}/></Pressable><Pressable style={[s.iconButton,s.deleteButton]} onPress={()=>confirmDelete('Deseja excluir?',row.nome,async()=>{await run('DELETE FROM turmas WHERE id=?',row.id);void load()})}><Trash2 color="#fca5a5" size={17}/></Pressable></View></View>)}</Panel>{selected&&<Panel><Text style={s.chartTitle}>Alunos de {selected.nome}</Text>{students.length?students.map(student=><View style={s.detailRow} key={student.id}><Text style={s.muted}>{student.nome}</Text><Text style={s.detailValue}>{student.matriculado?'Ativa':'Inativa'}</Text></View>):<EmptyState title="Nenhum aluno nesta turma."/>}</Panel>}</View> }
function ProfessorAdmin({onChange}:{onChange:()=>void}) { const [rows,setRows]=useState<Professor[]>([]);const [name,setName]=useState('');const [username,setUsername]=useState('');const [password,setPassword]=useState('Professor123!');const [disc,setDisc]=useState<Discipline[]>([]);const [did,setDid]=useState('');const [editingId,setEditingId]=useState<number|null>(null);useEffect(()=>{all<Professor>('SELECT p.*,d.nome disciplina FROM professores p LEFT JOIN disciplinas d ON d.id=p.disciplina_id').then(setRows);all<Discipline>('SELECT * FROM disciplinas').then(setDisc)},[]);const save=async()=>{if(name&&did){if(editingId===null){const u=await run('INSERT INTO usuarios(username,password_hash,role) VALUES(?,?,?)',username,await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,password),'PROFESSOR');await run('INSERT INTO professores(nome,disciplina_id,usuario_id) VALUES(?,?,?)',name,Number(did),u.lastInsertRowId)}else await run('UPDATE professores SET nome=?,disciplina_id=? WHERE id=?',name,Number(did),editingId);setName('');setUsername('');setEditingId(null);onChange()}};return <Crud title="Professores" fields={<><Input label="Nome" value={name} onChangeText={setName}/><Input label="Username" value={username} onChangeText={setUsername}/><Input label="Password" value={password} onChangeText={setPassword} secureTextEntry/><Text style={s.muted}>Disciplinas disponíveis: {disc.map(d=>`${d.id}=${d.nome}`).join(', ')}</Text><Input label="ID da disciplina" value={did} onChangeText={setDid} keyboardType="numeric"/></>} add={save} onEdit={id=>{const row=rows.find(item=>item.id===id);if(row){setEditingId(id);setName(row.nome);setDid(String(row.disciplina_id))}}} rows={rows.map(x=>({id:x.id,text:`${x.nome} · ${x.disciplina||'sem disciplina'}`,sql:'professores'}))} reload={()=>all<Professor>('SELECT p.*,d.nome disciplina FROM professores p LEFT JOIN disciplinas d ON d.id=p.disciplina_id').then(setRows)}/> }
function ExactProfessorAdmin({onChange}:{onChange:()=>void}) {
  const [rows,setRows]=useState<Professor[]>([]);
  const [disciplines,setDisciplines]=useState<Discipline[]>([]);
  const [open,setOpen]=useState(false);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [name,setName]=useState('');
  const [did,setDid]=useState('');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [formError,setFormError]=useState('');
  const load=async()=>{
    const [professors,subjects]=await Promise.all([
      all<Professor>('SELECT p.*,d.nome disciplina FROM professores p LEFT JOIN disciplinas d ON d.id=p.disciplina_id ORDER BY p.id'),
      all<Discipline>('SELECT * FROM disciplinas ORDER BY id'),
    ]);
    setRows(professors);setDisciplines(subjects);
  };
  useEffect(()=>{void load()},[]);
  const reset=()=>{setEditingId(null);setName('');setDid('');setUsername('');setPassword('');setFormError('')};
  const save=async()=>{
    setFormError('');
    if(!name.trim()||!did){setFormError('Preencha o nome e selecione uma disciplina.');return;}
    const creating=editingId===null;
    if(!credentialsAreValid(username,password,creating)){
      setFormError(creating?'Username deve ter de 3 a 100 caracteres e senha de 8 a 128 caracteres.':'Username ou senha informados não atendem aos requisitos.');
      return;
    }
    if(editingId===null){
      const user=await run('INSERT INTO usuarios(username,password_hash,role) VALUES(?,?,?)',username,await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,password),'PROFESSOR');
      await run('INSERT INTO professores(nome,disciplina_id,usuario_id) VALUES(?,?,?)',name.trim(),Number(did),user.lastInsertRowId);
    }else {
      await run('UPDATE professores SET nome=?,disciplina_id=? WHERE id=?',name.trim(),Number(did),editingId);
      if(username.trim()||password){
        const professor=rows.find(row=>row.id===editingId);
        if(!professor)throw new Error(`Professor ${editingId} não foi encontrado para atualizar as credenciais.`);
        const credentials=(await all<{username:string;password_hash:string}>('SELECT username,password_hash FROM usuarios WHERE id=?',professor.usuario_id))[0];
        if(!credentials)throw new Error(`Credenciais do professor ${editingId} não foram encontradas.`);
        await run('UPDATE usuarios SET username=?,password_hash=? WHERE id=?',username.trim()||credentials.username,password?await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,password):credentials.password_hash,professor.usuario_id);
      }
    }
    setOpen(false);reset();await load();onChange();
  };
  return <View style={s.pageSection}>
    <PageHeader eyebrow="Cadastro" title="Professores" action={<Button title="Novo professor" icon={<Plus color="#fff" size={15}/>} onPress={()=>{reset();setOpen(true)}}/>}/>
    <NativeDataTable columns={[{key:'id',header:'ID',width:58,render:r=>String(r.id)},{key:'nome',header:'Nome',width:236,render:r=>r.nome},{key:'disciplina',header:'Disciplina',width:183,render:r=>r.disciplina||'—'}]} actionsWidth={162} data={rows} emptyMessage="Nenhum professor cadastrado." onEdit={row=>{setEditingId(row.id);setName(row.nome);setDid(String(row.disciplina_id));setUsername('');setPassword('');setFormError('');setOpen(true)}} onDelete={row=>confirmDelete('Deseja excluir este professor?',row.nome,async()=>{await run('DELETE FROM professores WHERE id=?',row.id);await load();onChange()})}/>
    <ModalCard visible={open} title={editingId===null?'Novo professor':'Editar professor'} onClose={()=>setOpen(false)} footer={<View style={s.modalActions}><Button title="Cancelar" variant="secondary" compact onPress={()=>setOpen(false)}/><Button title={editingId===null?'Salvar':'Atualizar'} compact onPress={save}/></View>}>
      <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex: Prof. Ana Silva"/>
      <SelectField label="Disciplina" value={did} options={disciplines.map(item=>({value:String(item.id),label:item.nome}))} onChange={setDid}/>
      <CredentialFields username={username} password={password} creating={editingId===null} onUsernameChange={setUsername} onPasswordChange={setPassword}/>
      {formError!==''&&<Text style={s.formError}>{formError}</Text>}
    </ModalCard>
  </View>;
}
function StudentAdmin({onChange}:{onChange:()=>void}) { const [rows,setRows]=useState<Student[]>([]);const [name,setName]=useState('');const [username,setUsername]=useState('');const [password,setPassword]=useState('Aluno123!');const [tid,setTid]=useState('1');const [editingId,setEditingId]=useState<number|null>(null);const load=()=>all<Student>('SELECT a.*,t.nome turma FROM alunos a LEFT JOIN turmas t ON t.id=a.turma_id').then(setRows);useEffect(()=>{void load()},[]);const save=async()=>{if(name&&tid){if(editingId===null){const u=await run('INSERT INTO usuarios(username,password_hash,role) VALUES(?,?,?)',username,await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,password),'ALUNO');await run('INSERT INTO alunos(nome,turma_id,usuario_id) VALUES(?,?,?)',name,Number(tid)||1,u.lastInsertRowId)}else await run('UPDATE alunos SET nome=?,turma_id=? WHERE id=?',name,Number(tid)||1,editingId);setName('');setUsername('');setEditingId(null);void load();onChange()}};return <Crud title="Alunos" fields={<><Input label="Nome" value={name} onChangeText={setName}/><Input label="Username" value={username} onChangeText={setUsername}/><Input label="Password" value={password} onChangeText={setPassword} secureTextEntry/><Input label="ID da turma" value={tid} onChangeText={setTid} keyboardType="numeric"/></>} add={save} onEdit={id=>{const row=rows.find(item=>item.id===id);if(row){setEditingId(id);setName(row.nome);setTid(String(row.turma_id))}}} rows={rows.map(x=>({id:x.id,text:`${x.nome} · ${x.turma||'sem turma'}`,sql:'alunos'}))} reload={()=>{void load()}}/> }
function ExactStudentAdmin({onChange}:{onChange:()=>void}) {
  const [rows,setRows]=useState<Array<Student & {disciplinas:string}>>([]);
  const [subjects,setSubjects]=useState<Discipline[]>([]);
  const [classes,setClasses]=useState<SchoolClass[]>([]);
  const [open,setOpen]=useState(false);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [name,setName]=useState('');
  const [enrolled,setEnrolled]=useState(true);
  const [tid,setTid]=useState('');
  const [selectedSubjects,setSelectedSubjects]=useState<number[]>([]);
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [formError,setFormError]=useState('');
  const load=async()=>{
    const [students,subjectRows,classRows]=await Promise.all([
      all<Student & {disciplinas:string}>('SELECT a.*,t.nome turma,GROUP_CONCAT(d.nome, ?) disciplinas FROM alunos a LEFT JOIN turmas t ON t.id=a.turma_id LEFT JOIN aluno_disciplina ad ON ad.aluno_id=a.id LEFT JOIN disciplinas d ON d.id=ad.disciplina_id GROUP BY a.id ORDER BY a.nome',', '),
      all<Discipline>('SELECT * FROM disciplinas ORDER BY id'),
      all<SchoolClass>('SELECT * FROM turmas ORDER BY nome'),
    ]);
    setRows(students);setSubjects(subjectRows);setClasses(classRows);
  };
  useEffect(()=>{void load()},[]);
  const reset=()=>{setEditingId(null);setName('');setEnrolled(false);setTid('');setSelectedSubjects([]);setUsername('');setPassword('');setFormError('')};
  const toggle=(id:number)=>setSelectedSubjects(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const save=async()=>{
    setFormError('');
    if(!name.trim()||!tid||!selectedSubjects.length){setFormError('Preencha os campos obrigatórios e selecione ao menos uma disciplina.');return;}
    const creating=editingId===null;
    if(!credentialsAreValid(username,password,creating)){
      setFormError(creating?'Username deve ter de 3 a 100 caracteres e senha de 8 a 128 caracteres.':'Username ou senha informados não atendem aos requisitos.');
      return;
    }
    let studentId=editingId;
    if(studentId===null){
      const user=await run('INSERT INTO usuarios(username,password_hash,role) VALUES(?,?,?)',username,await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,password),'ALUNO');
      const student=await run('INSERT INTO alunos(nome,matriculado,turma_id,usuario_id) VALUES(?,?,?,?)',name.trim(),enrolled?1:0,Number(tid),user.lastInsertRowId);
      studentId=student.lastInsertRowId;
    }else {
      await run('UPDATE alunos SET nome=?,matriculado=?,turma_id=? WHERE id=?',name.trim(),enrolled?1:0,Number(tid),studentId);
      if(username.trim()||password){
        const student=rows.find(row=>row.id===studentId);
        if(!student)throw new Error(`Aluno ${studentId} não foi encontrado para atualizar as credenciais.`);
        const credentials=(await all<{username:string;password_hash:string}>('SELECT username,password_hash FROM usuarios WHERE id=?',student.usuario_id))[0];
        if(!credentials)throw new Error(`Credenciais do aluno ${studentId} não foram encontradas.`);
        await run('UPDATE usuarios SET username=?,password_hash=? WHERE id=?',username.trim()||credentials.username,password?await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,password):credentials.password_hash,student.usuario_id);
      }
    }
    await run('DELETE FROM aluno_disciplina WHERE aluno_id=?',studentId);
    for(const subjectId of selectedSubjects)await run('INSERT INTO aluno_disciplina(aluno_id,disciplina_id) VALUES(?,?)',studentId,subjectId);
    setOpen(false);reset();await load();onChange();
  };
  return <View style={s.pageSection}>
    <PageHeader eyebrow="Cadastro" title="Alunos" action={<Button title="Novo aluno" icon={<Plus color="#fff" size={15}/>} onPress={()=>{reset();setOpen(true)}}/>}/>
    <NativeDataTable columns={[
      {key:'id',header:'ID',width:52,render:r=>String(r.id)},
      {key:'nome',header:'Nome',width:114,render:r=>r.nome},
      {key:'status',header:'Status',width:128,render:r=>r.matriculado?'Matriculado':'Não matriculado'},
      {key:'turma',header:'Turma',width:84,render:r=>r.turma||'—'},
      {key:'disciplinas',header:'Disciplinas',width:205,render:r=>r.disciplinas||'—'},
    ]} actionsWidth={87} data={rows} emptyMessage="Nenhum aluno cadastrado."
      onEdit={async row=>{
        setEditingId(row.id);setName(row.nome);setEnrolled(Boolean(row.matriculado));setTid(String(row.turma_id));setUsername('');setPassword('');setFormError('');
        setSelectedSubjects((await all<{disciplina_id:number}>('SELECT disciplina_id FROM aluno_disciplina WHERE aluno_id=?',row.id)).map(item=>item.disciplina_id));
        setOpen(true);
      }}
      onDelete={row=>confirmDelete('Deseja excluir este aluno?',row.nome,async()=>{await run('DELETE FROM alunos WHERE id=?',row.id);await load();onChange()})}/>
    <ModalCard visible={open} title={editingId===null?'Novo aluno':'Editar aluno'} onClose={()=>setOpen(false)} contentStyle={s.studentModalBody} footer={<View style={s.modalActions}><Button title="Cancelar" variant="secondary" compact onPress={()=>setOpen(false)}/><Button title={editingId===null?'Salvar':'Atualizar'} compact onPress={save}/></View>}>
      <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex: Maria Souza"/>
      <CheckboxField label="Matriculado" checked={enrolled} onChange={setEnrolled}/>
      <SelectField label="Turma" value={tid} options={classes.map(item=>({value:String(item.id),label:item.nome}))} onChange={setTid}/>
      <View style={s.disciplineCheckboxField}>
        <Text style={s.label}>Disciplinas</Text>
        <View style={s.disciplineCheckboxGroup}>{subjects.map(subject=><Pressable key={subject.id} accessibilityRole="checkbox" accessibilityState={{checked:selectedSubjects.includes(subject.id)}} style={s.disciplineOption} onPress={()=>toggle(subject.id)}>
          <View style={[s.checkBox,selectedSubjects.includes(subject.id)&&s.checkBoxSelected]}>{selectedSubjects.includes(subject.id)&&<Check color="#fff" size={14}/>}</View>
          <Text style={s.muted}>{subject.nome}</Text>
        </Pressable>)}</View>
      </View>
      <CredentialFields username={username} password={password} creating={editingId===null} onUsernameChange={setUsername} onPasswordChange={setPassword}/>
      {formError!==''&&<Text style={s.formError}>{formError}</Text>}
    </ModalCard>
  </View>;
}
function PageHeader({eyebrow,title,action}:{eyebrow:string;title:string;action?:React.ReactNode}) { return <View style={s.pageHeader}><View><Text style={[s.eyebrow,s.pageEyebrow]}>{eyebrow}</Text><Text style={s.pageTitle}>{title}</Text></View>{action&&<View style={s.pageHeaderAction}>{action}</View>}</View> }
function Panel({children}:{children:React.ReactNode}) { return <View style={s.panel}>{children}</View> }
function ModalCard({visible,title,onClose,children,footer,contentStyle,modalStyle}:{visible:boolean;title:string;onClose:()=>void;children:React.ReactNode;footer?:React.ReactNode;contentStyle?:StyleProp<ViewStyle>;modalStyle?:StyleProp<ViewStyle>}) { const insets=useSafeAreaInsets(); return <NativeModal visible={visible} transparent animationType="fade" onRequestClose={onClose}><KeyboardAvoidingView pointerEvents="auto" behavior={Platform.OS==='ios'?'padding':undefined} style={s.modalBackdrop}><View style={[s.modal,{maxHeight:'98%',marginTop:insets.top,marginBottom:insets.bottom},modalStyle]}><View style={s.modalHeader}><Text style={s.modalTitle}>{title}</Text><Pressable onPress={onClose} accessibilityLabel="Fechar modal"><X color="#94a3b8" size={22}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.modalBody,contentStyle]}>{children}</ScrollView>{footer&&<View style={s.modalFooter}>{footer}</View>}</View></KeyboardAvoidingView></NativeModal> }
function Crud({title,fields,add,rows,onEdit,reload}:{title:string;fields:React.ReactNode;add:()=>Promise<void>;rows:{id:number;text:string;sql:string}[];onEdit?:(id:number)=>void;reload:()=>void}) {
  const [open,setOpen]=useState(false);
  const tableRows = rows.map((row) => ({ id: row.id, text: row.text }));
  return <View style={s.pageSection}><PageHeader eyebrow="Cadastro" title={title} action={<Button title={`+ Novo ${title.slice(0,-1).toLowerCase()}`} onPress={()=>setOpen(true)}/>} /><Panel><NativeDataTable columns={[{key:'id',header:'ID',render:row=>String(row.id)},{key:'name',header:'Nome',render:row=>row.text}]} data={tableRows} emptyMessage={`Nenhum ${title.toLowerCase()} cadastrado.`} onEdit={row=>{onEdit?.(row.id);setOpen(true)}} onDelete={row=>confirmDelete(`Deseja excluir este ${title.slice(0,-1).toLowerCase()}?`,row.text,async()=>{await run(`DELETE FROM ${rows.find(item=>item.id===row.id)?.sql} WHERE id=?`,row.id);reload()})}/></Panel><ModalCard visible={open} title={`${onEdit?'Editar':'Novo'} ${title.slice(0,-1).toLowerCase()}`} onClose={()=>setOpen(false)}><View style={s.formGrid}>{fields}</View><View style={s.modalActions}><Button title="Cancelar" variant="secondary" compact onPress={()=>setOpen(false)}/><Button title="Salvar" compact onPress={async()=>{await add();setOpen(false)}}/></View></ModalCard></View>
}
function EmptyState({title,description}:{title:string;description?:string}) { return <View style={s.emptyState}><View style={s.emptyStateIcon}><CircleDashed color="#f8fafc" size={22}/></View><Text style={s.emptyTitle}>{title}</Text>{description&&<Text style={s.emptyStateDescription}>{description}</Text>}</View> }
function BuilderActionButton({title,onPress,icon,primary=false,disabled=false}:{title:string;onPress:()=>void;icon:React.ReactNode;primary?:boolean;disabled?:boolean}) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.builderActionButton,primary?s.builderPrimaryButton:s.builderSecondaryButton,disabled&&s.builderButtonDisabled]}><>{icon}<Text style={[s.builderActionText,primary&&s.builderPrimaryText]}>{title}</Text></></Pressable> }
function ExactProfessorDiscipline({session}:{session:LocalSession}) { const [professor,setProfessor]=useState<Professor|null>(null);const [discipline,setDiscipline]=useState<Discipline|null>(null);useEffect(()=>{profile(session).then(async item=>{const value=item as Professor|undefined;if(value){setProfessor(value);setDiscipline((await all<Discipline>('SELECT * FROM disciplinas WHERE id=?',value.disciplina_id))[0]||null)}})},[session]);if(!professor||!discipline)return <View style={s.panel}><Text style={s.muted}>Carregando sua disciplina...</Text></View>;return <View style={s.pageSection}><PageHeader eyebrow="Área do professor" title="Minha Disciplina"/><View style={s.profilePanel}><View style={s.profileHeading}><View style={s.profileMark}><Text style={s.profileMarkText}>{discipline.nome.slice(0,1).toUpperCase()}</Text></View><View><Text style={s.eyebrow}>Professor</Text><Text style={s.profileName}>{professor.nome}</Text></View></View><View style={s.profileDetails}><View style={s.profileDetail}><Text style={s.profileDetailLabel}>Disciplina</Text><Text style={s.profileDetailValue}>{discipline.nome}</Text></View><View style={s.profileDetail}><Text style={s.profileDetailLabel}>Carga horária</Text><Text style={s.profileDetailValue}>{discipline.carga_hora} horas</Text></View></View></View></View> }
function ExactStudentSubjects({session}:{session:LocalSession}) {
  const [student,setStudent]=useState<Student|null>(null);
  const [rows,setRows]=useState<Discipline[]>([]);
  useEffect(()=>{
    profile(session).then(async item=>{
      const value=item as Student|undefined;
      if(value){
        setStudent(value);
        setRows(await all<Discipline>('SELECT d.* FROM disciplinas d JOIN aluno_disciplina ad ON ad.disciplina_id=d.id WHERE ad.aluno_id=? ORDER BY d.id',value.id));
      }
    });
  },[session]);
  if(!student)return <View style={s.panel}><Text style={s.muted}>Carregando suas disciplinas...</Text></View>;
  return <View style={s.pageSection}>
    <PageHeader eyebrow="Área do aluno" title="Minhas Disciplinas"/>
    <View style={[s.panel,s.studentSubjectsPanel]}>
      <Text style={s.eyebrow}>Turma</Text>
      <View style={s.studentClassList}>
        {student.turma
          ?<View style={s.classBadge}><Text style={s.classBadgeText}>{student.turma}</Text></View>
          :<Text style={s.muted}>Não há turma vinculada.</Text>}
      </View>
      <View style={s.subjectList}>
        {rows.length
          ?rows.map(row=><View style={[s.subjectRow,s.studentSubjectRow]} key={row.id}>
            <View style={s.subjectMark}/>
            <View><Text style={s.bold}>{row.nome}</Text><Text style={s.muted}>{row.carga_hora} horas</Text></View>
          </View>)
          :<Text style={s.muted}>Nenhuma disciplina vinculada.</Text>}
      </View>
    </View>
  </View>;
}
function Subjects({session}:{session:LocalSession}) { const [rows,setRows]=useState<Discipline[]>([]);useEffect(()=>{const q=session.role==='ALUNO'?'SELECT d.* FROM disciplinas d JOIN aluno_disciplina ad ON ad.disciplina_id=d.id JOIN alunos a ON a.id=ad.aluno_id WHERE a.usuario_id=?':'SELECT d.* FROM disciplinas d JOIN professores p ON p.disciplina_id=d.id WHERE p.usuario_id=?';all<Discipline>(q,session.userId).then(setRows)},[session]);return <View style={s.pageSection}><PageHeader eyebrow={session.role==='ALUNO'?'Área do aluno':'Área do professor'} title={session.role==='ALUNO'?'Minhas Disciplinas':'Minha Disciplina'}/><Panel>{rows.length?rows.map(x=><View style={s.subjectRow} key={x.id}><View style={s.subjectMark}/><View><Text style={s.bold}>{x.nome}</Text><Text style={s.muted}>{x.carga_hora} horas</Text></View></View>):<EmptyState title="Nenhuma disciplina vinculada."/ >}</Panel></View> }
function ExactProfessorStudents({session}:{session:LocalSession}) { const [rows,setRows]=useState<Array<Student & {disciplinas:string}>>([]);useEffect(()=>{all<Student & {disciplinas:string}>('SELECT DISTINCT a.*,t.nome turma,GROUP_CONCAT(d.nome, ?) disciplinas FROM alunos a JOIN aluno_disciplina ad ON ad.aluno_id=a.id JOIN professores p ON p.disciplina_id=ad.disciplina_id LEFT JOIN turmas t ON t.id=a.turma_id LEFT JOIN disciplinas d ON d.id=ad.disciplina_id WHERE p.usuario_id=? GROUP BY a.id',', ',session.userId).then(setRows)},[session]);return <View style={s.pageSection}><PageHeader eyebrow="Área do professor" title="Meus Alunos"/><NativeDataTable columns={[{key:'nome',header:'Aluno',width:160,render:r=>r.nome},{key:'turma',header:'Turma',width:160,render:r=>r.turma||'—'},{key:'status',header:'Status',width:160,render:r=>r.matriculado?'Matriculado':'Não matriculado'},{key:'disciplinas',header:'Disciplina',width:160,render:r=>r.disciplinas||'—'}]} data={rows} emptyMessage="Nenhum aluno matriculado na sua disciplina."/></View> }
function ProfessorStudents({session}:{session:LocalSession}) { const [rows,setRows]=useState<Student[]>([]);useEffect(()=>{all<Student>('SELECT DISTINCT a.*,t.nome turma FROM alunos a JOIN aluno_disciplina ad ON ad.aluno_id=a.id JOIN professores p ON p.disciplina_id=ad.disciplina_id LEFT JOIN turmas t ON t.id=a.turma_id WHERE p.usuario_id=?',session.userId).then(setRows)},[session]);return <View style={s.pageSection}><PageHeader eyebrow="Área do professor" title="Meus Alunos"/><Panel>{rows.length?rows.map(row=><View style={s.tableRow} key={row.id}><View style={s.tableCopy}><Text style={s.rowText}>{row.nome}</Text><Text style={s.muted}>{row.turma||'—'}</Text></View><Text style={s.statusText}>{row.matriculado?'Matriculado':'Não matriculado'}</Text></View>):<EmptyState title="Nenhum aluno matriculado na sua disciplina."/>}</Panel></View> }
function Activities({session,selectActivity,refresh}:{session:LocalSession;selectActivity:(id:number)=>void;refresh:number}) { const [rows,setRows]=useState<Array<Activity & {minha_nota?:number|null;minha_entrega_id?:number|null}>>([]);useEffect(()=>{const q=session.role==='ALUNO'?'SELECT DISTINCT a.*,d.nome disciplina,e.id minha_entrega_id,e.nota minha_nota FROM atividades a JOIN disciplinas d ON d.id=a.disciplina_id JOIN aluno_disciplina ad ON ad.disciplina_id=d.id JOIN alunos al ON al.id=ad.aluno_id LEFT JOIN entregas e ON e.atividade_id=a.id AND e.aluno_id=al.id WHERE al.usuario_id=?':'SELECT a.*,d.nome disciplina FROM atividades a JOIN disciplinas d ON d.id=a.disciplina_id';void all<Activity & {minha_nota?:number|null;minha_entrega_id?:number|null}>(q,...(session.role==='ALUNO'?[session.userId]:[])).then(async activities=>{const hydrated=await Promise.all(activities.map(async activity=>({...activity,questoes:await all<Question>('SELECT * FROM questoes WHERE atividade_id=? ORDER BY id',activity.id)})));setRows(hydrated)})},[session,refresh]);return <View style={s.pageSection}><PageHeader eyebrow="Área do aluno" title="Atividades"/>{rows.length?rows.map(x=><View style={s.activityRow} key={x.id}><View style={s.activityIcon}><ClipboardList color="#93c5fd" size={19}/></View><View style={s.activityCopy}><Text style={s.eyebrow}>{x.disciplina||'Disciplina'}</Text><Text style={s.activityTitle}>{x.titulo}</Text><Text style={s.muted}>{x.questoes?.length||0} {(x.questoes?.length||0)===1?'questão':'questões'}</Text>{session.role==='ALUNO'&&x.minha_entrega_id!=null&&<Text style={s.muted}>{x.minha_nota===null?'Aguardando correção':`Nota: ${Number(x.minha_nota).toFixed(1)}`}</Text>}</View>{session.role==='ALUNO'&&x.minha_entrega_id==null&&<Button title="Responder" style={s.activityStartButton} textStyle={s.activityStartButtonText} iconAfter={<ArrowRight color="#fff" size={16}/>} onPress={()=>selectActivity(x.id)}/>}</View>):<EmptyState title="Nenhuma atividade disponível" description="As atividades das suas disciplinas aparecerão aqui."/>}</View> }
function NewActivity({session,done}:{session:LocalSession;done:()=>void}) {
  const [title,setTitle]=useState('');
  const [did,setDid]=useState<number|null>(null);
  const [disciplineName,setDisciplineName]=useState('');
  const [open,setOpen]=useState(false);
  const [activities,setActivities]=useState<Array<Activity & {questoes:Question[]}>>([]);
  const [questions,setQuestions]=useState<Array<{tipo:'MULTIPLACADA'|'DISSERTATIVA';enunciado:string;options:string[];correct:string}>>([]);
  const loadActivities=()=>all<Activity>('SELECT a.*,d.nome disciplina FROM atividades a JOIN disciplinas d ON d.id=a.disciplina_id WHERE a.disciplina_id=? ORDER BY a.id',did).then(async rows=>setActivities(await Promise.all(rows.map(async activity=>({...activity,questoes:await all<Question>('SELECT * FROM questoes WHERE atividade_id=? ORDER BY id',activity.id)})))));
  useEffect(()=>{profile(session).then(item=>{const professor=item as Professor|undefined;if(professor){setDid(professor.disciplina_id);setDisciplineName(professor.disciplina||'')}})},[session]);
  useEffect(()=>{if(did!==null)void loadActivities()},[did]);
  const addQuestion=(tipo:'MULTIPLACADA'|'DISSERTATIVA')=>setQuestions(current=>[...current,{tipo,enunciado:'',options:['','','',''],correct:''}]);
  return <View style={s.pageSection}>
    <PageHeader eyebrow={disciplineName||'Área do professor'} title="Atividades" action={<Button title="Nova Atividade" icon={<Plus color="#fff" size={15}/>} onPress={()=>{setQuestions([]);setOpen(true)}}/>}/>
    <View style={s.activityList}>
      {activities.length?activities.map(activity=><View style={s.activityRow} key={activity.id}>
        <View style={s.activityIcon}><FileText color="#a78bfa" size={22}/></View>
        <View style={s.activityCopy}>
          <Text style={s.eyebrow}>{disciplineName}</Text>
          <Text style={s.activityTitle}>{activity.titulo}</Text>
          <Text style={s.muted}>{activity.questoes.length} {activity.questoes.length===1?'questão':'questões'}</Text>
        </View>
        <Text style={s.statusText}>Disponível</Text>
      </View>):<Text style={s.muted}>As atividades desta disciplina aparecerão aqui.</Text>}
    </View>
    <ModalCard visible={open} title="Nova Atividade" onClose={()=>setOpen(false)} contentStyle={s.builderModalBody} modalStyle={s.activityBuilderModal}>
      <Text style={s.activityModalSubtitle}>{disciplineName}</Text>
      <Input label="Título da atividade" value={title} onChangeText={setTitle} placeholder="Ex: Revisão de funções" placeholderTextColor="#94a3b8"/>
      <View style={s.questionActions}>
        <BuilderActionButton title="Adicionar Questão Múltipla Escolha" icon={<ListChecks color="#f8fafc" size={16}/>} onPress={()=>addQuestion('MULTIPLACADA')}/>
        <BuilderActionButton title="Adicionar Questão Dissertativa" icon={<FileText color="#f8fafc" size={16}/>} onPress={()=>addQuestion('DISSERTATIVA')}/>
      </View>
      {questions.length===0&&<EmptyState title="Sua atividade está vazia" description="Adicione uma questão para começar a montar a avaliação."/>}
      {questions.map((question,index)=><View style={s.questionCard} key={index}>
        <View style={s.questionHeading}>
          <Text style={s.bold}>Questão {index+1}</Text>
          <Text style={s.questionType}>{question.tipo==='MULTIPLACADA'?'Múltipla escolha':'Dissertativa'}</Text>
        </View>
        <Input label="Enunciado" value={question.enunciado} onChangeText={value=>setQuestions(current=>current.map((item,itemIndex)=>itemIndex===index?{...item,enunciado:value}:item))} multiline placeholder="Escreva a questão..." placeholderTextColor="#94a3b8"/>
        {question.tipo==='MULTIPLACADA'&&<View style={s.questionOptions}>
          <Text style={s.questionHelper}>Opções de resposta. Marque a correta.</Text>
          {question.options.map((option,optionIndex)=>{
            const optionLabel=String.fromCharCode(65+optionIndex);
            const isCorrect=question.correct===String(optionIndex);
            return <View style={s.optionRow} key={optionIndex}>
              <Text style={s.optionLetter}>{optionLabel}</Text>
              <TextInput value={option} onChangeText={value=>setQuestions(current=>current.map((item,itemIndex)=>itemIndex===index?{...item,options:item.options.map((entry,entryIndex)=>entryIndex===optionIndex?value:entry)}:item))} placeholder={`Opção ${optionLabel}`} placeholderTextColor="#94a3b8" style={[s.input,s.optionInput]}/>
              <Pressable accessibilityRole="radio" accessibilityLabel={`Marcar opção ${optionLabel} como correta`} accessibilityState={{checked:isCorrect}} style={s.correctOption} onPress={()=>setQuestions(current=>current.map((item,itemIndex)=>itemIndex===index?{...item,correct:String(optionIndex)}:item))}>
                <View style={[s.radioIndicator,isCorrect&&s.radioIndicatorSelected]}>{isCorrect&&<View style={s.radioIndicatorDot}/>}</View>
              </Pressable>
            </View>;
          })}
        </View>}
        <Pressable style={s.removeQuestion} onPress={()=>setQuestions(current=>current.filter((_,itemIndex)=>itemIndex!==index))}>
          <Trash2 color="#94a3b8" size={16}/>
          <Text style={s.removeQuestionText}>Remover questão</Text>
        </Pressable>
      </View>)}
      <View style={s.builderActions}>
        <BuilderActionButton title="Cancelar" icon={<X color="#f8fafc" size={16}/>} onPress={()=>setOpen(false)}/>
        <BuilderActionButton title="Criar atividade" primary disabled={!questions.length} icon={<CirclePlus color="#fff" size={16}/>} onPress={async()=>{
          if(title&&did&&questions.length&&questions.every(question=>question.enunciado.trim()&&(question.tipo==='DISSERTATIVA'||question.options.every(Boolean)&&question.correct!==''))){
            const ac=await run('INSERT INTO atividades(titulo,descricao,disciplina_id) VALUES(?,?,?)',title,'',did);
            for(const question of questions)await run('INSERT INTO questoes(atividade_id,tipo,enunciado,opcoes_json,resposta_correta) VALUES(?,?,?,?,?)',ac.lastInsertRowId,question.tipo,question.enunciado,question.tipo==='MULTIPLACADA'?JSON.stringify(question.options):null,question.tipo==='MULTIPLACADA'?question.options[Number(question.correct)]:null);
            setOpen(false);
            done();
          }else Alert.alert('Revise a atividade','Adicione questões válidas e preencha os campos obrigatórios.');
        }}/>
      </View>
    </ModalCard>
  </View>;
}
function Pending({session,refresh}:{session:LocalSession;refresh:number}) { const [rows,setRows]=useState<Submission[]>([]);const [selected,setSelected]=useState<Submission|null>(null);useEffect(()=>{all<Submission>('SELECT e.id,e.atividade_id,e.aluno_id,e.nota,a.titulo atividade,al.nome aluno,GROUP_CONCAT(r.resposta, ?) resposta FROM entregas e JOIN atividades a ON a.id=e.atividade_id JOIN alunos al ON al.id=e.aluno_id JOIN respostas r ON r.entrega_id=e.id JOIN questoes q ON q.id=r.questao_id WHERE e.nota IS NULL AND q.tipo=? GROUP BY e.id,a.titulo,al.nome', '\\n', 'DISSERTATIVA').then(setRows)},[session,refresh]);return <View style={s.pageSection}><PageHeader eyebrow="Área do professor" title="Correções pendentes" action={<View style={s.inboxCount}><Text style={s.inboxText}>{rows.length}</Text></View>}/>{rows.length?rows.map(x=><View style={s.gradingRow} key={x.id}><View style={s.avatar}><Text style={s.avatarText}>{x.aluno?.slice(0,1).toUpperCase()}</Text></View><View style={s.activityCopy}><Text style={s.activityTitle}>{x.aluno}</Text><Text style={s.muted}>{x.atividade}</Text><Text style={s.muted}>Resposta para revisar</Text></View><Button title="Revisar respostas" onPress={()=>setSelected(x)}/></View>):<EmptyState title="Tudo corrigido" description="Não há respostas dissertativas aguardando revisão."/>}<ModalCard visible={Boolean(selected)} title={selected?`${selected.aluno} · ${selected.atividade}`:'Revisar respostas'} onClose={()=>setSelected(null)}>{selected&&<View style={s.gradingReview}><Text style={s.eyebrow}>Questão dissertativa</Text><Text style={s.questionText}>Resposta enviada</Text><Text style={s.answerBlock}>{selected.resposta}</Text><View style={s.gradingActions}><Button title="Correto" onPress={async()=>{await run('UPDATE entregas SET nota=? WHERE id=?',10,selected.id);setRows(current=>current.filter(row=>row.id!==selected.id));setSelected(null)}}/><Button title="Incorreto" onPress={async()=>{await run('UPDATE entregas SET nota=? WHERE id=?',0,selected.id);setRows(current=>current.filter(row=>row.id!==selected.id));setSelected(null)}}/></View></View>}</ModalCard></View> }
function Grade({row}:{row:Submission}) { const [nota,setNota]=useState('');return <View style={s.card}><Text style={s.bold}>{row.aluno} · {row.atividade}</Text><Text style={s.muted}>{row.resposta}</Text><Input label="Nota" value={nota} onChangeText={setNota} keyboardType="numeric"/><Button title="Salvar nota" onPress={async()=>{await run('UPDATE entregas SET nota=? WHERE id=?',Number(nota),row.id);Alert.alert('Salvo')}}/></View> }
function Profile({session}:{session:LocalSession}) { const [p,setP]=useState<Student|Professor>();const [subjects,setSubjects]=useState<Discipline[]>([]);useEffect(()=>{profile(session).then(async value=>{setP(value);if(session.role==='ALUNO'&&value){setSubjects(await all<Discipline>('SELECT d.* FROM disciplinas d JOIN aluno_disciplina ad ON ad.disciplina_id=d.id WHERE ad.aluno_id=?',value.id))}})},[session]);return <View style={s.pageSection}><PageHeader eyebrow="Área do aluno" title="Meu Perfil"/><View style={s.profilePanel}><View style={s.profileHeading}><View style={s.profileMark}><Text style={s.profileMarkText}>{(p?.nome||session.username).slice(0,1).toUpperCase()}</Text></View><View><Text style={s.eyebrow}>Estudante</Text><Text style={s.profileName}>{p?.nome||session.username}</Text></View></View><View style={s.profileDetails}><View style={s.profileDetail}><Text style={s.profileDetailLabel}>Status</Text><Text style={s.profileDetailValue}>{(p as Student)?.matriculado?'Matriculado':'Não matriculado'}</Text></View><View style={s.profileDetail}><Text style={s.profileDetailLabel}>Turma</Text><Text style={s.profileDetailValue}>{(p as Student)?.turma||'Não vinculada'}</Text></View><View style={s.profileDetail}><Text style={s.profileDetailLabel}>Disciplinas</Text><Text style={s.profileDetailValue}>{subjects.map(subject=>subject.nome).join(', ')||'Nenhuma disciplina vinculada'}</Text></View></View></View></View> }
function Respond({session,activityId,done}:{session:LocalSession;activityId:number|null;done:()=>void}) {
  const [activity,setActivity]=useState<Activity|null>(null);
  const [answers,setAnswers]=useState<Record<number,string>>({});
  const [formError,setFormError]=useState('');
  useEffect(()=>{
    if(activityId)void all<Activity>('SELECT a.*,d.nome disciplina FROM atividades a LEFT JOIN disciplinas d ON d.id=a.disciplina_id WHERE a.id=?',activityId).then(async rows=>{
      const item=rows[0];
      if(item)setActivity({...item,questoes:await all<Question>('SELECT * FROM questoes WHERE atividade_id=? ORDER BY id',item.id)});
    });
  },[activityId]);
  if(!activity)return <EmptyState title="Atividade indisponível" description="A atividade não foi encontrada."/>;
  return <View style={s.pageSection}>
    <Pressable onPress={done}><Text style={s.backLink}><ArrowLeft color="#a78bfa" size={16}/> Atividades</Text></Pressable>
    <View style={s.responseHeading}>
      <Text style={s.eyebrow}>{activity.disciplina||'Disciplina'}</Text>
      <Text style={s.pageTitle}>{activity.titulo}</Text>
      <Text style={s.muted}>{activity.questoes?.length||0} {(activity.questoes?.length||0)===1?'questão':'questões'}</Text>
    </View>
    <View style={s.responseQuestions}>
      {(activity.questoes||[]).map((question,index)=><View style={[s.questionCard,{padding:15}]} key={question.id}>
        <Text style={s.eyebrow}>Questão {index+1}</Text>
        <Text style={s.questionText}>{question.enunciado}</Text>
        {question.tipo==='MULTIPLACADA'
          ?JSON.parse(question.opcoes_json||'[]').map((option:string,optionIndex:number)=>{
            const selected=answers[question.id]===option;
            return <Pressable
              key={optionIndex}
              accessibilityRole="radio"
              accessibilityState={{checked:selected}}
              style={[
                s.responseOption,
                selected&&s.responseOptionSelected,
                selected&&{backgroundColor:'rgba(139,92,246,0.18)'},
              ]}
              onPress={()=>setAnswers(current=>({...current,[question.id]:option}))}
            >
              <View style={[s.radioIndicator,selected&&s.radioIndicatorSelected]}>
                {selected&&<View style={s.radioIndicatorDot}/>}
              </View>
              <Text style={[s.muted,selected&&{color:'#f8fafc'}]}>{option}</Text>
            </Pressable>;
          })
          :<TextInput
            accessibilityLabel={`Resposta da questão ${index+1}`}
            value={answers[question.id]||''}
            onChangeText={value=>setAnswers(current=>({...current,[question.id]:value}))}
            placeholder="Escreva sua resposta..."
            placeholderTextColor="#94a3b8"
            multiline
            style={[s.input,{height:131,textAlignVertical:'top',borderRadius:8,padding:12}]}
          />}
      </View>)}
    </View>
    {formError!==''&&<Text style={s.formError}>{formError}</Text>}
    <Button title="Enviar atividade" onPress={async()=>{
      const questions=activity.questoes||[];
      if(questions.some(question=>!answers[question.id]?.trim())){
        setFormError('Responda todas as questões antes de enviar.');
        return;
      }
      setFormError('');
      const st=(await all<Student>('SELECT id FROM alunos WHERE usuario_id=?',session.userId))[0];
      if(st){
        const delivery=await run('INSERT OR REPLACE INTO entregas(atividade_id,aluno_id,resposta) VALUES(?,?,?)',activity.id,st.id,questions.map(question=>answers[question.id]).join('\\n'));
        for(const question of questions)await run('INSERT INTO respostas(entrega_id,questao_id,resposta) VALUES(?,?,?)',delivery.lastInsertRowId,question.id,answers[question.id]);
        Alert.alert('Atividade enviada','Suas respostas foram registradas.');
        done();
      }
    }}/>
  </View>;
}
function credentialsAreValid(username:string,password:string,creating:boolean) { const user=username.trim();return creating?user.length>=3&&user.length<=100&&password.length>=8&&password.length<=128:(!user||(user.length>=3&&user.length<=100))&&(!password||(password.length>=8&&password.length<=128)); }
function Input({label,...props}:{label:string}&React.ComponentProps<typeof TextInput>) { return <View style={s.inputField}><Text style={s.label}>{label}</Text><TextInput {...props} placeholderTextColor={props.placeholderTextColor??'#64748b'} style={[s.input,props.multiline&&{height:92,textAlignVertical:'top'}]}/></View> }
function SelectField({label,value,options,onChange}:{label:string;value:string;options:Array<{value:string;label:string}>;onChange:(value:string)=>void}) { const [expanded,setExpanded]=useState(false);const selected=options.find(option=>option.value===value);return <View style={s.inputField}><Text style={s.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label||'Selecione...'}`} onPress={()=>setExpanded(current=>!current)} style={s.selectControl}><Text style={[s.selectValue,!selected&&s.selectPlaceholder]}>{selected?.label||'Selecione...'}</Text><ChevronDown color="#94a3b8" size={18}/></Pressable>{expanded&&<View style={s.selectOptions}>{options.map(option=><Pressable key={option.value} accessibilityRole="button" accessibilityState={{selected:option.value===value}} onPress={()=>{onChange(option.value);setExpanded(false)}} style={[s.selectOption,option.value===value&&s.selectOptionSelected]}><Text style={s.selectOptionText}>{option.label}</Text></Pressable>)}</View>}</View> }
function CheckboxField({label,checked,onChange}:{label:string;checked:boolean;onChange:(checked:boolean)=>void}) { return <Pressable accessibilityRole="checkbox" accessibilityState={{checked}} onPress={()=>onChange(!checked)} style={s.checkboxField}><View style={[s.checkBox,checked&&s.checkBoxSelected]}>{checked&&<Check color="#fff" size={14}/>}</View><Text style={s.checkboxLabel}>{label}</Text></Pressable> }
function CredentialFields({username,password,creating,onUsernameChange,onPasswordChange}:{username:string;password:string;creating:boolean;onUsernameChange:(value:string)=>void;onPasswordChange:(value:string)=>void}) { return <View style={s.credentialsFields}><Text style={s.credentialsLegend}>Account Credentials</Text><Input label="Username" value={username} onChangeText={onUsernameChange} placeholder={creating?'Ex: maria.souza':'Deixe vazio para manter'} autoComplete="username" maxLength={100}/><Input label="Password" value={password} onChangeText={onPasswordChange} placeholder={creating?'Mínimo de 8 caracteres':'Deixe vazio para manter'} secureTextEntry autoComplete="new-password" maxLength={128}/></View> }
function confirmDelete(title:string,message:string,onConfirm:()=>Promise<void>,checkDependencies?:()=>Promise<string|null>) {
  const reportFailure=(error:unknown)=>{
    console.error('Failed to delete record.',error);
    const errorMessage='Não foi possível excluir o registro. Tente novamente.';
    if(Platform.OS==='web'&&typeof window!=='undefined')window.alert(errorMessage);
    else Alert.alert('Falha ao excluir',errorMessage);
  };
  void (async()=>{
    try{
      const blocker=await checkDependencies?.();
      if(blocker){
        if(Platform.OS==='web'&&typeof window!=='undefined')window.alert(blocker);
        else Alert.alert('Exclusão bloqueada',blocker);
        return;
      }
    }catch(error){
      reportFailure(error);
      return;
    }
    const confirm=async()=>{
      try{await onConfirm()}catch(error){reportFailure(error)}
    };
    if(Platform.OS==='web'&&typeof window!=='undefined'){
      if(window.confirm(`${title}\n\n${message}`))void confirm();
      return;
    }
    Alert.alert(title,message,[{text:'Cancelar'},{text:'Excluir',style:'destructive',onPress:()=>{void confirm()}}]);
  })();
}
function linkedRecordsMessage(entity:'disciplina'|'turma',records:Array<{count:number;singular:string;plural:string}>) {
  const linked=records.filter(record=>record.count>0);
  if(!linked.length)return null;
  const details=linked.map(record=>`${record.count} ${record.count===1?record.singular:record.plural}`).join(', ');
  return `Não é possível excluir a ${entity}. A exclusão está bloqueada porque ainda existem registros associados: ${details}. Remova ou reassocie esses registros primeiro.`;
}
function Button({title,onPress,icon,iconAfter,variant='primary',compact=false,disabled=false,style,textStyle}:{title:string;onPress:()=>void;icon?:React.ReactNode;iconAfter?:React.ReactNode;variant?:'primary'|'secondary';compact?:boolean;disabled?:boolean;style?:StyleProp<ViewStyle>;textStyle?:StyleProp<TextStyle>}){return <Pressable onPress={onPress} disabled={disabled} accessibilityState={{disabled}} style={[s.button,compact&&s.modalActionButton,variant==='secondary'&&s.modalSecondaryButton,disabled&&s.disabledButton,style]}><View style={s.buttonContent}>{icon}<Text style={[s.buttonText,textStyle]}>{title}</Text>{iconAfter}</View></Pressable>}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#0b0f19'},
  center:{flex:1,backgroundColor:'#0b0f19',alignItems:'center',justifyContent:'center'},
  login:{flexGrow:1,justifyContent:'center',padding:24,gap:12},
  authBrand:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:18},
  brandBlock:{flexDirection:'row',alignItems:'center',gap:10},
  brandMark:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#8b5cf6'},
  brandMarkText:{color:'#fff',fontSize:13,fontWeight:'800',letterSpacing:1},
  brandTitle:{color:'#f8fafc',fontSize:20,fontWeight:'700'},
  eyebrow:{color:'#94a3b8',fontSize:11,fontWeight:'700',letterSpacing:1.2,textTransform:'uppercase'},
  authTitle:{color:'#f8fafc',fontSize:25,fontWeight:'800',marginBottom:8},
  sidebar:{backgroundColor:'rgba(15,23,42,0.98)',borderBottomColor:'rgba(148,163,184,0.18)',borderBottomWidth:1,paddingHorizontal:14,paddingVertical:12},
  sidebarHead:{minHeight:42,flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center'},
  menuToggle:{width:36,height:36,borderRadius:10,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',backgroundColor:'#1e293b',alignItems:'center',justifyContent:'center'},
  menuToggleText:{color:'#f8fafc',fontSize:20,lineHeight:22},
  menu:{marginTop:10,paddingTop:8,borderTopColor:'rgba(148,163,184,0.18)',borderTopWidth:1},
  navItem:{minHeight:42,paddingHorizontal:12,paddingVertical:10,borderRadius:12,flexDirection:'row',alignItems:'center',gap:10,marginBottom:4},
  navItemActive:{backgroundColor:'rgba(139,92,246,0.18)'},
  navDot:{width:8,height:8,borderRadius:8,backgroundColor:'#94a3b8'},
  navText:{color:'#94a3b8',fontWeight:'600',fontSize:15},
  navTextActive:{color:'#fff',fontWeight:'700',fontSize:15},
  mainPanel:{flex:1,minWidth:0},
  topbar:{minHeight:58,paddingHorizontal:20,paddingVertical:15,flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12,borderBottomColor:'rgba(148,163,184,0.18)',borderBottomWidth:1,backgroundColor:'#0b0f19'},
  roleBadge:{paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:999,color:'#cbd5e1',fontSize:12},
  secondaryButton:{paddingHorizontal:16,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',backgroundColor:'rgba(148,163,184,0.12)'},
  secondaryText:{color:'#fff',fontWeight:'600'},
  searchShell:{position:'relative',width:'100%',marginTop:2},
  searchIcon:{position:'absolute',zIndex:1,left:14,top:11,color:'#94a3b8',fontSize:18},
  searchInput:{height:46,paddingLeft:40,paddingRight:12,borderRadius:14,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',backgroundColor:'rgba(15,23,42,0.88)',color:'#f8fafc',fontSize:15},
  searchResults:{position:'absolute',zIndex:10,top:52,left:0,right:0,borderRadius:16,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',backgroundColor:'#0f172a',overflow:'hidden'},
  searchResult:{paddingHorizontal:14,paddingVertical:11,borderBottomWidth:1,borderBottomColor:'rgba(148,163,184,0.18)',flexDirection:'row',justifyContent:'space-between',gap:12},
  searchResultName:{color:'#f8fafc',flex:1},searchResultEntity:{color:'#94a3b8',fontSize:12},searchEmpty:{padding:16,color:'#94a3b8'},
  contentArea:{paddingHorizontal:14,paddingTop:18,paddingBottom:40,gap:18},
  pageSection:{gap:18},
  pageHeader:{minHeight:54,gap:12},
  pageEyebrow:{marginBottom:6},
  pageHeaderAction:{width:'100%',marginVertical:-10},
  activityList:{gap:8},
  pageTitle:{color:'#fff',fontSize:24,lineHeight:36,fontWeight:'800'},
  profilePanel:{maxWidth:900,padding:14,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:12,backgroundColor:'rgba(15,23,42,0.82)',gap:24},
  profileDetails:{gap:16},
  profileDetail:{gap:5},
  profileDetailLabel:{color:'#94a3b8',fontSize:12,lineHeight:18,fontWeight:'700',letterSpacing:.3,textTransform:'uppercase'},
  profileDetailValue:{color:'#f8fafc',fontSize:16,lineHeight:24},
  panel:{backgroundColor:'rgba(15,23,42,0.8)',borderColor:'rgba(148,163,184,0.18)',borderWidth:1,borderRadius:18,padding:14,gap:8},
  tableRow:{minHeight:62,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'rgba(148,163,184,0.18)',flexDirection:'row',alignItems:'center',gap:12},
  tableCopy:{flex:1,minWidth:0,gap:4},tableId:{color:'#94a3b8',fontSize:11,textTransform:'uppercase',letterSpacing:.6},
  rowActions:{flexDirection:'row',gap:8},iconButton:{width:36,height:36,borderRadius:10,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',backgroundColor:'rgba(96,165,250,0.12)',alignItems:'center',justifyContent:'center'},deleteButton:{backgroundColor:'rgba(239,68,68,0.12)'},iconText:{color:'#f8fafc',fontSize:18,fontWeight:'700'},
  emptyState:{padding:28,alignItems:'center',gap:10,borderWidth:1,borderStyle:'dashed',borderColor:'rgba(148,163,184,0.18)',borderRadius:18,backgroundColor:'rgba(15,23,42,0.6)'},emptyStateIcon:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(139,92,246,0.18)',alignItems:'center',justifyContent:'center'},emptyStateDescription:{color:'#94a3b8',fontSize:16,lineHeight:24,textAlign:'center'},emptyTitle:{color:'#f8fafc',fontWeight:'700',fontSize:16,lineHeight:24,textAlign:'center'},
  formGrid:{gap:16},studentModalBody:{gap:12},activityModalSubtitle:{color:'#94a3b8',fontSize:14},builderModalBody:{gap:18},activityBuilderModal:{maxHeight:'97.5%'},builderActions:{gap:10,marginTop:20},builderActionButton:{minHeight:42,width:'100%',paddingVertical:10,paddingHorizontal:16,borderWidth:1,borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},builderSecondaryButton:{backgroundColor:'rgba(148,163,184,0.12)',borderColor:'rgba(148,163,184,0.18)'},builderPrimaryButton:{backgroundColor:'#8b5cf6',borderColor:'#8b5cf6'},builderButtonDisabled:{opacity:1},builderActionText:{color:'#f8fafc',fontWeight:'600'},builderPrimaryText:{color:'#fff'},modalBackdrop:{position:'absolute',zIndex:100,top:0,bottom:0,left:0,right:0,padding:10,backgroundColor:'rgba(2,6,23,0.7)',justifyContent:'center'},modal:{maxHeight:'98%',backgroundColor:'#0f172a',borderColor:'rgba(148,163,184,0.18)',borderWidth:1,borderRadius:18,padding:14},modalHeader:{minHeight:32,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},modalTitle:{color:'#fff',fontSize:19,fontWeight:'700'},closeText:{color:'#94a3b8',fontSize:30,lineHeight:30},modalBody:{gap:14},modalFooter:{paddingTop:8},modalActions:{flexDirection:'column',alignItems:'stretch',gap:8,marginTop:6},modalActionButton:{width:'100%',minHeight:42,paddingVertical:8,marginVertical:0,borderWidth:1,borderRadius:10},modalSecondaryButton:{backgroundColor:'rgba(148,163,184,0.12)',borderColor:'rgba(148,163,184,0.18)'},
  statsGrid:{gap:16},
  statCard:{minHeight:130,paddingVertical:20,paddingHorizontal:22,borderRadius:18,borderWidth:1,backgroundColor:'rgba(15,23,42,0.9)',justifyContent:'center',gap:10},
  statPurple:{borderColor:'rgba(139,92,246,0.45)'},statBlue:{borderColor:'rgba(96,165,250,0.35)'},statGreen:{borderColor:'rgba(34,197,94,0.35)'},statAmber:{borderColor:'rgba(245,158,11,0.35)'},
  statLabel:{color:'#94a3b8',fontSize:12,fontWeight:'700',letterSpacing:.5,textTransform:'uppercase'},
  statValue:{color:'#fff',fontSize:38,fontWeight:'800'},
  subjectRow:{minHeight:62,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'rgba(148,163,184,0.18)',flexDirection:'row',alignItems:'center',gap:12},
  classList:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:'rgba(148,163,184,0.18)'},studentSubjectsPanel:{gap:24},studentClassList:{paddingVertical:2,borderBottomWidth:1,borderBottomColor:'rgba(148,163,184,0.18)'},studentSubjectRow:{minHeight:75},classBadge:{alignSelf:'flex-start',paddingHorizontal:10,paddingVertical:6,borderWidth:1,borderColor:'rgba(96,165,250,0.3)',borderRadius:999,backgroundColor:'rgba(96,165,250,0.1)'},classBadgeText:{color:'#bfdbfe'},subjectList:{gap:2},
  subjectMark:{width:10,height:10,borderRadius:10,backgroundColor:'#8b5cf6'},
  activityRow:{minHeight:82,padding:13,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:8,backgroundColor:'rgba(15,23,42,0.76)',flexDirection:'row',alignItems:'flex-start',flexWrap:'wrap',gap:12},
  activityStartButton:{width:'100%',paddingHorizontal:16,paddingVertical:10,marginVertical:0,borderRadius:10},activityStartButtonText:{fontSize:16,fontWeight:'600'},
  activityIcon:{width:42,height:42,borderRadius:8,backgroundColor:'rgba(96,165,250,0.12)',alignItems:'center',justifyContent:'center'},activityIconText:{color:'#93c5fd',fontSize:20},
  activityCopy:{flex:1,minWidth:0,gap:3},activityTitle:{color:'#f8fafc',fontSize:16,fontWeight:'700'},questionText:{color:'#cbd5e1',fontSize:16,lineHeight:24,paddingVertical:8},
  inboxCount:{minWidth:30,height:30,borderRadius:99,paddingHorizontal:8,backgroundColor:'rgba(245,158,11,0.14)',alignItems:'center',justifyContent:'center'},inboxText:{color:'#fcd34d',fontWeight:'700'},
  gradingRow:{minHeight:82,padding:13,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:8,backgroundColor:'rgba(15,23,42,0.76)',flexDirection:'row',alignItems:'center',gap:12},
  avatar:{width:42,height:42,borderRadius:8,backgroundColor:'rgba(34,197,94,0.12)',alignItems:'center',justifyContent:'center'},avatarText:{color:'#86efac',fontSize:18,fontWeight:'800'},
  gradingReview:{gap:14},answerBlock:{padding:14,borderLeftWidth:3,borderLeftColor:'#60a5fa',backgroundColor:'rgba(96,165,250,0.07)',color:'#cbd5e1',fontSize:15,lineHeight:22},gradingActions:{flexDirection:'row',gap:10},
  profileHeading:{minHeight:49,flexDirection:'row',alignItems:'center',gap:14},profileMark:{width:46,height:46,borderRadius:10,backgroundColor:'rgba(34,197,94,0.14)',alignItems:'center',justifyContent:'center'},profileMarkText:{color:'#86efac',fontSize:16,fontWeight:'700'},profileName:{color:'#f8fafc',fontSize:18,fontWeight:'700'},detailRow:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:'rgba(148,163,184,0.18)',flexDirection:'row',justifyContent:'space-between',gap:12},detailValue:{color:'#f8fafc',fontWeight:'600',flexShrink:1,textAlign:'right'},
  statusText:{color:'#cbd5e1',fontSize:12,fontWeight:'700'},
  questionActions:{gap:10},questionCard:{padding:18,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:8,backgroundColor:'rgba(15,23,42,0.7)',gap:16},questionHeading:{flexDirection:'row',alignItems:'center',gap:10},questionType:{color:'#94a3b8',fontSize:12},questionOptions:{gap:10},questionHelper:{color:'#94a3b8',fontSize:13},removeQuestion:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:8},removeQuestionText:{color:'#94a3b8',fontSize:13},optionRow:{flexDirection:'row',alignItems:'center',gap:10},optionLetter:{width:30,color:'#94a3b8',fontWeight:'700',textAlign:'center'},optionInput:{flex:1},correctOption:{width:36,height:36,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:8,backgroundColor:'rgba(139,92,246,0.08)',alignItems:'center',justifyContent:'center'},radioIndicator:{width:17,height:17,borderWidth:1,borderColor:'#f8fafc',borderRadius:9,backgroundColor:'#f8fafc',alignItems:'center',justifyContent:'center'},radioIndicatorSelected:{borderColor:'#8b5cf6'},radioIndicatorDot:{width:9,height:9,borderRadius:5,backgroundColor:'#8b5cf6'},backLink:{color:'#94a3b8',fontSize:15},responseHeading:{paddingVertical:18,borderBottomWidth:1,borderBottomColor:'rgba(148,163,184,0.18)',gap:7},responseQuestions:{gap:14},responseOption:{minHeight:46,padding:12,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:8,flexDirection:'row',alignItems:'center',gap:10},responseOptionSelected:{borderColor:'rgba(139,92,246,0.55)',backgroundColor:'rgba(139,92,163,0.18)'},radio:{color:'#c4b5fd',fontSize:18},
  checkRow:{minHeight:42,flexDirection:'row',alignItems:'center',gap:10},checkBox:{width:18,height:18,borderRadius:4,borderWidth:1,borderColor:'rgba(148,163,184,0.55)',alignItems:'center',justifyContent:'center'},checkBoxSelected:{backgroundColor:'#8b5cf6',borderColor:'#8b5cf6'},
  checkboxField:{minHeight:24,flexDirection:'row',alignItems:'center',gap:10},checkboxLabel:{color:'#94a3b8',fontSize:16,fontWeight:'600'},
  selectControl:{minHeight:48,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',backgroundColor:'rgba(15,23,42,0.8)',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},selectValue:{flex:1,color:'#f8fafc',fontSize:16},selectPlaceholder:{color:'#94a3b8'},selectOptions:{borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:10,backgroundColor:'#0f172a',overflow:'hidden'},selectOption:{minHeight:42,paddingHorizontal:12,justifyContent:'center',borderBottomWidth:1,borderBottomColor:'rgba(148,163,184,0.12)'},selectOptionSelected:{backgroundColor:'rgba(139,92,246,0.18)'},selectOptionText:{color:'#f8fafc',fontSize:15},
  disciplineCheckboxField:{gap:8},disciplineCheckboxGroup:{gap:8,padding:12,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:12,backgroundColor:'rgba(15,23,42,0.7)'},disciplineOption:{minHeight:24,flexDirection:'row',alignItems:'center',gap:10},
  credentialsFields:{gap:14,padding:14,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',borderRadius:12},credentialsLegend:{alignSelf:'flex-start',color:'#cbd5e1',fontWeight:'700'},formError:{color:'#fca5a5',fontSize:14},
  chartGrid:{gap:18},
  chartPanel:{padding:18,borderRadius:18,borderWidth:1,borderColor:'rgba(148,163,184,0.18)',backgroundColor:'rgba(15,23,42,0.9)',gap:12},
  chartTitle:{color:'#f8fafc',fontSize:17,fontWeight:'700'},
  gradeSummaryRow:{gap:12},
  gradeStatCard:{minHeight:99,padding:16,borderWidth:1,borderRadius:8,backgroundColor:'rgba(15,23,42,0.76)',gap:8},
  gradeStatLabel:{color:'#94a3b8',fontSize:12,lineHeight:18,fontWeight:'400',textTransform:'uppercase'},
  gradeStatValue:{color:'#f8fafc',fontSize:26,lineHeight:38.4,fontWeight:'700'},
  metricRow:{minHeight:44,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'rgba(148,163,184,0.18)',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  metricValue:{color:'#fff',fontSize:22,fontWeight:'800'},
  h1:{color:'#f8fafc',fontSize:27,fontWeight:'800',marginTop:8},
  muted:{color:'#94a3b8',lineHeight:21},
  inputField:{gap:8},label:{color:'#cbd5e1',fontSize:16,lineHeight:24,fontWeight:'700'},
  input:{backgroundColor:'rgba(15,23,42,0.8)',borderColor:'rgba(148,163,184,0.18)',borderWidth:1,borderRadius:10,color:'#fff',padding:13,fontSize:16},
  button:{backgroundColor:'#8b5cf6',borderRadius:10,padding:15,alignItems:'center',marginVertical:8},
  disabledButton:{opacity:0.6},
  buttonContent:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  buttonText:{color:'#fff',fontWeight:'800'},
  section:{color:'#f8fafc',fontSize:18,fontWeight:'800',marginTop:20},
  demo:{backgroundColor:'rgba(15,23,42,0.8)',borderColor:'rgba(148,163,184,0.18)',borderWidth:1,borderRadius:12,padding:15,gap:4},
  bold:{color:'#f8fafc',fontWeight:'800',fontSize:16},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  card:{backgroundColor:'rgba(15,23,42,0.8)',borderColor:'rgba(148,163,184,0.18)',borderWidth:1,borderRadius:18,padding:16,gap:6,shadowColor:'#020617',shadowOpacity:.25,shadowRadius:12},
  big:{color:'#fff',fontSize:30,fontWeight:'800'},
  row:{backgroundColor:'rgba(15,23,42,0.75)',borderColor:'rgba(148,163,184,0.18)',borderWidth:1,borderRadius:10,padding:14,flexDirection:'row',alignItems:'center',gap:8},
  rowText:{color:'#f8fafc',flex:1},
  nativeChart:{minHeight:220,justifyContent:'center',alignItems:'center'},
  polarChart:{width:'100%',height:320,alignItems:'center',justifyContent:'center',gap:6},
  polarLegend:{width:'100%',gap:16,paddingHorizontal:4,flexDirection:'row',flexWrap:'wrap',justifyContent:'center',alignItems:'center'},
  donutLayout:{width:'100%',alignItems:'center'},
  donutLegend:{width:'100%',gap:8,marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:'rgba(148,163,184,0.18)'},
  donutLegendRow:{flexDirection:'row',alignItems:'center',gap:10},
  donutLegendText:{color:'#cbd5e1',fontSize:11,flex:1},
  donutLegendValue:{color:'#f8fafc',fontSize:10,fontWeight:'700'},
  legend:{maxWidth:135,gap:8},
  legendRow:{flexDirection:'row',alignItems:'center',gap:6},
  legendDot:{width:9,height:9,borderRadius:5},
  legendText:{color:'#cbd5e1',fontSize:12,flexShrink:1},
  chartHint:{color:'#94a3b8',fontSize:11,marginTop:-14},
  danger:{color:'#fca5a5',fontWeight:'700'}
})

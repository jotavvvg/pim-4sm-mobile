# Siscol

Sistema colaborativo acadêmico desenvolvido para o **PIM — Projeto Integrado Multidisciplinar**.

O projeto reúne uma versão web responsiva e uma versão mobile em Expo para apoiar o gerenciamento acadêmico de disciplinas, turmas, professores, alunos, atividades e avaliações.

Os comandos deste documento partem da raiz do repositório, que contém a pasta `pim-4sm-panel`.

### Link para instalação do app mobile
https://expo.dev/accounts/jotavvvg/projects/mobile/builds/b837c787-4802-4c6f-b3b4-47842c43f34d

### Estrutura do Projeto
<!-- START_TREE -->
<!-- END_TREE -->

### Histórico Recente de Atualizações
<!-- START_CHANGELOG -->
<!-- END_CHANGELOG -->

## Início rápido

### Pré-requisitos

- Node.js compatível com os projetos;
- npm;
- Git;
- para a versão mobile: Expo Go compatível com o SDK do projeto ou um development build.

### 1. Instalar dependências

Em terminais separados:

```powershell
cd pim-4sm-panel\backend
npm install
```

```powershell
cd pim-4sm-panel\frontend\vite-project
npm install
```

```powershell
cd pim-4sm-panel\mobile
npm install
```

### 2. Configurar o backend web

Crie `pim-4sm-panel\backend\.env` com as variáveis necessárias:

```env
DATABASE_URL=mysql://usuario:senha@localhost:3306/academico_db
JWT_SECRET=uma-chave-secreta-de-desenvolvimento
PORT=3000
```

O `DATABASE_URL` é usado pela versão web conectada ao MySQL. O `JWT_SECRET` deve ser uma chave estável em ambientes persistentes.

### 3. Executar o backend

```powershell
cd pim-4sm-panel\backend
npm run dev
```

A API ficará disponível em `http://localhost:3000`.

### 4. Executar o site

Em outro terminal:

```powershell
cd pim-4sm-panel\frontend\vite-project
npm run dev
```

O Vite exibirá o endereço local, normalmente `http://localhost:5173`.

### 5. Executar o app Expo

```powershell
cd pim-4sm-panel\mobile
npx expo start
```

Para limpar o cache do Metro:

```powershell
npx expo start -c
```

O app mobile inicia com SQLite local e dados de demonstração. O backend não é necessário para o fluxo offline; a ação **Sincronizar Dados**, disponível no dashboard Admin, precisa alcançar o backend pela rede.

#### Sincronizar disciplinas do backend

Configure `pim-4sm-panel\mobile\.env` antes de iniciar o Expo ou gerar um build. Use o endereço do computador que executa o backend:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.2:3000/api
```

O `192.168.1.2` corresponde ao IPv4 LAN atual do computador de desenvolvimento e pode mudar; confira-o com `ipconfig` antes de gerar o APK. Para Android Emulator use `http://10.0.2.2:3000/api`; para um aparelho físico, use o IPv4 LAN do computador, mantenha ambos na mesma rede e permita acesso à porta `3000` no firewall. Se o backend estiver em Docker, publique a porta do host (`3000:3000`) além de iniciar o Fastify na interface `0.0.0.0`. O app permite tráfego HTTP para suportar esse servidor local; em produção, prefira HTTPS. A URL é incorporada ao bundle: alterá-la exige gerar e instalar um novo APK.

No dashboard do Administrador, **Sincronizar Dados** solicita as credenciais de uma conta do backend, autentica em `POST /api/auth/login` e usa o JWT recebido apenas durante a operação para consultar `GET /api/disciplinas`. Essa conta é independente do login local do SQLite; use as credenciais cadastradas no backend. Os IDs remotos são guardados separadamente dos IDs locais: na primeira sincronização, disciplinas locais com o mesmo nome são vinculadas aos IDs remotos, preservando relações existentes; novos registros recebem IDs locais. Sincronizações seguintes atualizam os registros vinculados dentro de uma transação SQLite. O fluxo não apaga disciplinas locais que não estejam na resposta remota nem modifica relações existentes, e não usa `INSERT OR REPLACE`, que apagaria/recriaria linhas e poderia disparar regras de chaves estrangeiras.

## Criar o aplicativo mobile

O projeto Expo pode ser executado de três formas: no Expo Go durante o desenvolvimento, como um APK de teste para instalação direta ou como um pacote de publicação para a Google Play Store.

### Desenvolvimento com Expo Go

O Expo Go é somente um cliente de desenvolvimento e precisa ser compatível com o SDK do projeto. O mobile está configurado atualmente para **Expo SDK 57**.

```powershell
cd pim-4sm-panel\mobile
npx expo start -c
```

Essa opção exige que o Expo Go usado no aparelho suporte SDK 57. Ela é útil para desenvolvimento local, mas não é a opção ideal para entregar o aplicativo a outras pessoas.

### Inspeção no navegador

Também é possível executar a versão Expo no navegador, sem gerar APK:

```powershell
cd pim-4sm-panel\mobile
npx expo start --web
```

Esse modo permite conferir rapidamente layout, textos, ícones, charts, modais e fluxos antes de gerar um aplicativo. O projeto inclui a configuração Metro necessária para o SQLite WebAssembly usado pelo `expo-sqlite` no SDK 57. Use uma única aba do projeto durante a inspeção, pois o SQLite WebAssembly pode bloquear o arquivo local quando várias abas tentam abrir o mesmo banco simultaneamente.

### APK de teste

O APK de teste é o formato recomendado para avaliação acadêmica. Ele contém o runtime Expo e os módulos nativos do projeto, portanto o testador não precisa instalar o repositório, Node.js, Expo CLI ou Expo Go.

#### Pré-requisitos do desenvolvedor

- uma conta Expo;
- acesso à internet;
- EAS CLI executado via `npx`;
- um identificador Android exclusivo para o aplicativo.

Configure o EAS uma vez:

```powershell
cd pim-4sm-panel\mobile
npx eas-cli login
npx eas-cli build:configure
```

Confirme no `app.json` um identificador exclusivo:

```json
{
  "expo": {
    "android": {
      "package": "com.exemplo.siscol"
    }
  }
}
```

Altere o valor de exemplo se ele já estiver sendo usado por outro aplicativo. O identificador deve permanecer estável depois da primeira distribuição.

Gere o APK:

```powershell
cd pim-4sm-panel\mobile
npx eas-cli build --platform android --profile preview
```

O EAS compila o aplicativo na nuvem e fornece um link para o artefato. O testador baixa o `.apk`, permite a instalação de fonte externa quando solicitado pelo Android, instala e abre o Siscol. Não são necessários comandos, cabo USB, computador ou ferramentas de desenvolvimento no aparelho.

O APK inicializa o SQLite local e os dados demo no primeiro lançamento. O fluxo mobile atual não depende do backend para essa demonstração offline.

### Development Build

Um development build é um aplicativo próprio do projeto para desenvolvimento contínuo. Ele é diferente do Expo Go porque contém o runtime e os módulos nativos definidos pelo Siscol.

```powershell
cd pim-4sm-panel\mobile
npx expo install expo-dev-client
npx eas-cli build:configure
npx eas-cli build --platform android --profile development
```

Depois de instalar o APK no aparelho, inicie o Metro:

```powershell
cd pim-4sm-panel\mobile
npx expo start --dev-client
```

Esse modo normalmente exige que o aparelho e o computador estejam na mesma rede. Use-o para desenvolvimento compartilhado; para uma entrega acadêmica simples, prefira o APK `preview`.

### Publicação na Google Play Store

A publicação exige uma conta Google Play Console, identificação exclusiva do aplicativo e assinatura Android. Para gerar o pacote da loja:

```powershell
cd pim-4sm-panel\mobile
npx eas-cli build --platform android --profile production
```

O perfil de produção gera um Android App Bundle (`.aab`), usado pela Play Store. O EAS pode gerenciar a chave de assinatura mediante confirmação, mas essa chave deve ser preservada com segurança e nunca ser commitada no repositório.

Um certificado de publicação não é necessário para gerar um APK `preview` para instalação manual. A exigência de assinatura de publicação, Play Console e gerenciamento de chave se aplica ao fluxo da loja.

### Perfis e auditoria do build

O `eas.json` controla os perfis de build. Uma configuração comum é:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

O processo auditável é:

```text
Código TypeScript/React Native
        ↓
app.json + package.json + package-lock.json
        ↓
eas.json e perfil escolhido
        ↓
EAS Build
        ↓
APK de teste ou AAB de publicação
```

Antes de gerar o artefato, valide o projeto:

```powershell
cd pim-4sm-panel\mobile
npm ci
npx tsc --noEmit
npx expo-doctor
npx expo config --type public
```

O repositório deve registrar alterações em `package.json`, `package-lock.json`, `app.json` e `eas.json`. Não devem ser commitados arquivos `.env`, tokens, credenciais ou chaves de assinatura.

## Contas de demonstração mobile

O banco local é criado e populado automaticamente no primeiro lançamento do app.

| Perfil | Usuário | Senha |
| --- | --- | --- |
| Administrador | `admin` | `Admin123!` |
| Professor | `prof.ana.silva` | `Professor123!` |
| Professor | `prof.carlos.rocha` | `Professor123!` |
| Professor | `prof.bruna.costa` | `Professor123!` |
| Aluna | `maria.souza` | `Aluno123!` |
| Aluno | `joao.pereira` | `Aluno123!` |
| Aluna | `lucia.almeida` | `Aluno123!` |
| Aluno | `pedro.martins` | `Aluno123!` |
| Aluna | `fernanda.costa` | `Aluno123!` |

O seed replica os dados demo do Electron: cinco alunos distribuídos nas turmas A e B, vínculos com disciplinas, as atividades `Revisão de Matemática` e `Primeiros passos com algoritmos`, questões de múltipla escolha e dissertativas e uma entrega pendente de João Pereira para o fluxo de correção. Para que os dashboards e charts sejam auditáveis logo no primeiro lançamento, há entregas concluídas com notas variadas em Matemática, Programação e História, incluindo Maria Souza, Pedro Martins e Fernanda Costa. A nota da entrega pendente permanece vazia até a correção da questão dissertativa.

## Testes e validação

### Backend

```powershell
cd pim-4sm-panel\backend
npm run build
```

### Frontend web

```powershell
cd pim-4sm-panel\frontend\vite-project
npm run build
npm run lint
```

### Mobile

```powershell
cd pim-4sm-panel\mobile
npx tsc --noEmit
npx expo-doctor
npx expo config --type public
```

## Sobre o Siscol

O **Siscol** é um sistema colaborativo acadêmico projetado para representar a rotina de uma instituição de ensino e seus diferentes perfis de acesso.

O painel organiza a relação entre:

- administradores;
- professores;
- alunos;
- disciplinas;
- turmas;
- atividades;
- questões;
- respostas;
- correções;
- métricas de desempenho.

O sistema possui três papéis principais:

### Administrador

O administrador gerencia a estrutura acadêmica:

- disciplinas;
- turmas;
- professores;
- alunos;
- contas de acesso;
- métricas gerais do sistema.

### Professor

O professor acessa sua disciplina e acompanha seus alunos:

- consulta a disciplina vinculada;
- visualiza alunos relacionados;
- cria atividades;
- adiciona questões de múltipla escolha ou dissertativas;
- acompanha avaliações pendentes;
- corrige respostas;
- consulta métricas de desempenho.

### Aluno

O aluno acompanha sua trajetória acadêmica:

- consulta o próprio perfil;
- visualiza suas disciplinas;
- acessa atividades;
- responde avaliações;
- acompanha submissões e resultados;
- visualiza métricas de desempenho.

## Arquitetura do projeto

```text
pim-4sm-panel/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── server.ts
│   ├── drizzle/
│   └── package.json
├── frontend/
│   └── vite-project/
│       ├── src/
│       │   ├── auth/
│       │   ├── components/
│       │   ├── lib/
│       │   ├── pages/
│       │   └── types/
│       └── package.json
├── mobile/
│   ├── src/
│   │   ├── api.ts
│   │   ├── db.ts
│   │   └── types.ts
│   ├── App.tsx
│   └── package.json
└── README.md
```

### Backend

O backend fornece a API HTTP e concentra as regras de negócio.

Responsabilidades principais:

- autenticação;
- autorização por papel;
- validação dos payloads;
- acesso ao banco;
- gerenciamento de entidades acadêmicas;
- atividades e submissões;
- correção de respostas;
- métricas;
- busca global.

O servidor usa Fastify e JWT. As rotas protegidas verificam o token antes de aplicar as permissões específicas de cada papel.

### Frontend web

O frontend web é uma SPA construída com React e Vite.

Ele inclui:

- React Router para navegação;
- TanStack Query para consultas e invalidação de dados;
- Axios para comunicação com a API;
- React Hook Form e Zod para formulários;
- Recharts e Chart.js para visualizações;
- Lucide React para ícones;
- CSS responsivo para desktop, tablet e mobile.

A versão web é o painel principal conectado ao backend MySQL.

### Mobile

O mobile é uma aplicação React Native executada com Expo SDK 57.

Ele foi separado do frontend web para permitir interfaces nativas e uma experiência independente da versão do navegador.

O app utiliza:

- Expo;
- React Native;
- TypeScript;
- `expo-sqlite`;
- `expo-secure-store`;
- `expo-status-bar`;
- SQLite local;
- seed automático de dados demo.

No modo atual, o mobile funciona offline no fluxo inicial. O banco `pim-demo.db` é criado no armazenamento do aplicativo, as tabelas são inicializadas e os dados de demonstração são inseridos na primeira execução.

## Stack técnica

### Web

- React;
- TypeScript;
- Vite;
- React Router;
- TanStack Query;
- Axios;
- React Hook Form;
- Zod;
- Recharts;
- Chart.js;
- Lucide React;
- CSS responsivo.

### Backend

- Node.js;
- TypeScript;
- Fastify;
- `@fastify/jwt`;
- `@fastify/cors`;
- Fastify Type Provider Zod;
- Zod;
- Drizzle ORM;
- MySQL;
- `mysql2`;
- `bcryptjs`.

### Mobile

- Expo SDK 57;
- React Native;
- TypeScript;
- `expo-sqlite`;
- `expo-secure-store`;
- `expo-status-bar`;
- SQLite local;
- Metro Bundler.

## Modelo acadêmico

O domínio foi estruturado com as seguintes entidades:

### Usuários

Representam as contas de autenticação do sistema:

- username;
- senha armazenada como hash;
- papel (`ADMIN`, `PROFESSOR` ou `ALUNO`).

### Disciplinas

Representam componentes curriculares e armazenam:

- nome;
- carga horária.

### Turmas

Representam grupos acadêmicos aos quais os alunos pertencem.

### Professores

Relacionam:

- nome do professor;
- conta de usuário;
- disciplina sob sua responsabilidade.

### Alunos

Relacionam:

- nome;
- situação de matrícula;
- turma;
- conta de usuário;
- disciplinas cursadas.

### Atividades

São avaliações criadas por professores e vinculadas a uma disciplina.

Uma atividade pode possuir questões:

- de múltipla escolha;
- dissertativas.

### Submissões e respostas

Registram:

- aluno responsável;
- atividade respondida;
- respostas fornecidas;
- situação da correção;
- nota total;
- resultado de cada questão.

## Disciplinas aproveitadas no PIM

O Siscol foi organizado para integrar conhecimentos de diferentes áreas do curso, transformando conceitos acadêmicos em um sistema completo.

### Engenharia de software e análise de sistemas

Aplicada na definição de:

- requisitos funcionais;
- perfis de usuário;
- casos de uso;
- separação entre frontend, backend e mobile;
- organização por serviços e componentes;
- evolução incremental do sistema.

### Programação web

Aplicada na construção:

- da SPA React;
- das rotas protegidas;
- dos formulários;
- da comunicação HTTP;
- do layout responsivo;
- das interfaces de administração, professor e aluno.

### Programação mobile

Aplicada na adaptação do sistema para React Native e Expo:

- componentes nativos;
- navegação e interação mobile;
- armazenamento local;
- execução offline;
- preparação para distribuição em APK;
- separação entre runtime de desenvolvimento e aplicativo instalável.

### Banco de dados

Aplicada na modelagem relacional:

- usuários e papéis;
- disciplinas;
- turmas;
- professores;
- alunos;
- relações aluno-disciplina;
- atividades;
- questões;
- submissões;
- respostas.

O projeto possui duas estratégias de persistência:

- MySQL com Drizzle ORM no backend web;
- SQLite local com `expo-sqlite` no aplicativo mobile demo.

### Segurança da informação

Aplicada por meio de:

- autenticação com JWT;
- senhas protegidas por hash no backend;
- autorização por papel;
- validação de entradas com Zod;
- armazenamento seguro da sessão mobile com `expo-secure-store`;
- separação entre configuração de desenvolvimento e dados da aplicação.

### Interação humano-computador

Aplicada em:

- responsividade;
- adaptação para telas pequenas;
- hierarquia visual;
- estados de carregamento;
- mensagens de erro;
- formulários orientados por perfil;
- componentes reutilizáveis.

### Gestão de projetos e trabalho colaborativo

Aplicada na divisão do sistema em:

- versão web;
- versão mobile;
- backend compartilhado;
- banco local para demonstração;
- documentação;
- validações independentes por ambiente.

## Dados locais do mobile

O banco local é inicializado em [mobile/src/db.ts](./mobile/src/db.ts).

Na primeira execução, são criados:

- usuários demo;
- três disciplinas;
- duas turmas;
- três professores;
- dois alunos;
- relações aluno-disciplina;
- atividades de exemplo.

As credenciais são armazenadas no banco apenas como hashes SHA-256 para a demonstração local. A sessão ativa é persistida separadamente com `expo-secure-store`.

Esse banco é intencionalmente independente do MySQL do backend. O objetivo é permitir que o APK seja testado sem servidor, banco remoto ou conexão de rede.

## Desenvolvimento mobile e Expo Go

O Expo Go é uma ferramenta de desenvolvimento. Ele precisa ter um SDK compatível com o SDK do projeto.

Neste repositório, a versão configurada é:

```text
Expo SDK 57
```

Para iniciar com Expo Go:

```powershell
cd pim-4sm-panel\mobile
npx expo start -c
```

O Expo Go não é necessário para o aplicativo final. Para distribuir uma versão instalável de teste, deve ser gerado um APK próprio, por exemplo com um perfil de preview do EAS. Nesse formato, os testadores instalam o aplicativo e não precisam do repositório, Node.js, Expo CLI ou Expo Go.

## Observações sobre o backend web

O backend web usa MySQL e precisa de um banco configurado para executar todos os fluxos online.

As migrações estão em `backend/drizzle/`. Os scripts disponíveis incluem:

```powershell
cd pim-4sm-panel\backend
npm run db:generate
npm run db:push
npm run db:seed
```

Consulte a configuração local antes de executar scripts destrutivos ou de seed em um banco compartilhado.

## Licença

Este projeto foi desenvolvido para fins acadêmicos no contexto do PIM. Consulte a política da instituição e os termos definidos pelo grupo antes de redistribuir o código ou os dados de demonstração.
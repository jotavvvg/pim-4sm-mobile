# Siscol

Sistema colaborativo acadêmico desenvolvido para o **PIM — Projeto Integrado Multidisciplinar**.

O projeto reúne uma versão web responsiva e uma versão mobile em Expo para apoiar o gerenciamento acadêmico de disciplinas, turmas, professores, alunos, atividades e avaliações.

## Início rápido

### Pré-requisitos

- Node.js compatível com os projetos;
- npm;
- Git;
- para a versão mobile: Expo Go compatível com o SDK do projeto ou um development build.

### 1. Instalar dependências

Em terminais separados:

```powershell
cd backend
npm install
```

```powershell
cd frontend\vite-project
npm install
```

```powershell
cd mobile
npm install
```

### 2. Configurar o backend web

Crie `backend\.env` com as variáveis necessárias:

```env
DATABASE_URL=mysql://usuario:senha@localhost:3306/academico_db
JWT_SECRET=uma-chave-secreta-de-desenvolvimento
PORT=3000
```

O `DATABASE_URL` é usado pela versão web conectada ao MySQL. O `JWT_SECRET` deve ser uma chave estável em ambientes persistentes.

### 3. Executar o backend

```powershell
cd backend
npm run dev
```

A API ficará disponível em `http://localhost:3000`.

### 4. Executar o site

Em outro terminal:

```powershell
cd frontend\vite-project
npm run dev
```

O Vite exibirá o endereço local, normalmente `http://localhost:5173`.

### 5. Executar o app Expo

```powershell
cd mobile
npx expo start
```

Para limpar o cache do Metro:

```powershell
npx expo start -c
```

O app mobile atual usa SQLite local e dados de demonstração. Portanto, o backend não é necessário para executar o fluxo offline inicial do mobile.

## Contas de demonstração mobile

O banco local é criado e populado automaticamente no primeiro lançamento do app.

| Perfil | Usuário | Senha |
| --- | --- | --- |
| Administrador | `admin` | `Admin123!` |
| Professor | `prof.ana.silva` | `Professor123!` |
| Professor | `prof.carlos.rocha` | `Professor123!` |
| Professor | `prof.bruna.costa` | `Professor123!` |
| Aluno | `aluno.joao` | `Aluno123!` |
| Aluna | `aluna.maria` | `Aluno123!` |

## Testes e validação

### Backend

```powershell
cd backend
npm run build
```

### Frontend web

```powershell
cd frontend\vite-project
npm run build
npm run lint
```

### Mobile

```powershell
cd mobile
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
cd mobile
npx expo start -c
```

O Expo Go não é necessário para o aplicativo final. Para distribuir uma versão instalável de teste, deve ser gerado um APK próprio, por exemplo com um perfil de preview do EAS. Nesse formato, os testadores instalam o aplicativo e não precisam do repositório, Node.js, Expo CLI ou Expo Go.

## Observações sobre o backend web

O backend web usa MySQL e precisa de um banco configurado para executar todos os fluxos online.

As migrações estão em `backend/drizzle/`. Os scripts disponíveis incluem:

```powershell
cd backend
npm run db:generate
npm run db:push
npm run db:seed
```

Consulte a configuração local antes de executar scripts destrutivos ou de seed em um banco compartilhado.

## Licença

Este projeto foi desenvolvido para fins acadêmicos no contexto do PIM. Consulte a política da instituição e os termos definidos pelo grupo antes de redistribuir o código ou os dados de demonstração.

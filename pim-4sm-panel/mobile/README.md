# PIM mobile

Parte mobile do Siscol, documentada com mais detalhes no [README principal](../README.md).

## Run

```powershell
npx expo start
```

The database is created and seeded on the first launch. No backend is required
for the current mobile demo.

## Demo accounts

| Role | Username | Password |
| --- | --- | --- |
| Administrador | `admin` | `Admin123!` |
| Professor | `prof.ana.silva` | `Professor123!` |
| Aluno | `aluno.joao` | `Aluno123!` |

The local database is stored by the app as `pim-demo.db`. It is initialized
from the schema and seed in `src/db.ts`.

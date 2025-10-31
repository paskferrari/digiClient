# RBAC Matrix

Ruoli: `ADMIN`, `MANAGER`, `OPERATOR`, `VIEWER`

Risorse: `organizations`, `memberships`, `companies`, `cases`, `documents`, `tasks`, `settings`, `audit`

Nota: RLS lato DB consente lettura a tutti i membri dell’organizzazione; i privilegi di scrittura seguono la logica sotto. Le azioni di dominio (approvare/assegnare, upload documenti) sono indicate separatamente.

## Privilegi CRUD per risorsa

| Resource       | ADMIN                    | MANAGER                  | OPERATOR                 | VIEWER          |
|----------------|--------------------------|--------------------------|--------------------------|-----------------|
| organizations  | read, create, update, delete | read                     | read                     | read            |
| memberships    | read, create, update, delete | read                     | read                     | read            |
| companies      | read, create, update, delete | read, create, update, delete | read, create, update, delete | read            |
| cases          | read, create, update, delete | read, create, update, delete | read, create, update, delete | read            |
| documents      | read, create, update, delete | read, create, update, delete | read, create, update, delete | read            |
| tasks          | read, create, update, delete | read, create, update, delete | read, create, update, delete | read            |
| settings       | read, create, update, delete | read                     | read                     | read            |
| audit          | read                      | read                      | -                        | -               |

## Azioni di dominio

- cases.approve: `MANAGER+`
- cases.assign: `MANAGER+`
- documents.approve/reject: `MANAGER+`
- documents.upload: `OPERATOR+`

## State Machine: caseStatus

Stati: `NEW`, `SCREENING`, `REJECTED`, `APPROVED`, `ASSIGNED`, `DOCS_REQUESTED`, `IN_PROGRESS`, `SUBMITTED`, `FUNDED`, `CLOSED_LOST`

Transizioni consentite:
- NEW → SCREENING
- SCREENING → REJECTED | APPROVED
- APPROVED → ASSIGNED
- ASSIGNED → DOCS_REQUESTED | IN_PROGRESS
- DOCS_REQUESTED ↔ IN_PROGRESS
- IN_PROGRESS → SUBMITTED
- SUBMITTED → FUNDED | CLOSED_LOST

Regole ruolo:
- `MANAGER+` può approvare (SCREENING → APPROVED/REJECTED) e assegnare (APPROVED → ASSIGNED). Può portare da `IN_PROGRESS` a `SUBMITTED` e finalizzare (`SUBMITTED` → `FUNDED`/`CLOSED_LOST`).
- `OPERATOR` può muoversi tra `DOCS_REQUESTED` e `IN_PROGRESS` e caricare documenti. Può partire da `ASSIGNED` verso `DOCS_REQUESTED`/`IN_PROGRESS`.
- `VIEWER` è read-only.

Helper TS disponibili: `canTransition(role, from, to)`, `assertTransition(role, from, to)` per uso lato API/UI (es. disabilitare bottoni).
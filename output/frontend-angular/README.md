# Wallet - Onboarding (frontend Angular 17)

Demo de onboarding guiado en tres pasos: celular + OTP, datos KYC `TEST` y resultado. Solo usa datos de prueba; no procesa pagos ni calcula MAU/CAC.

## Requisitos

- Node.js y npm (Angular 17; se probó con Node 26, que Angular 17 advierte como no soportado).
- Google Chrome (las pruebas usan `ChromeHeadless`).
- Backend Quarkus en `http://localhost:8080` para la demo completa (ver tareas 1.x de `openspec/changes/hu-01-onboarding-mvp/tasks.md`).

## Comandos

```bash
npm install
npm start          # http://localhost:4200, proxy /api -> http://localhost:8080 (proxy.conf.json)
npm run mock:backend   # stub local en :8080 si aún no hay backend Quarkus; KYC_SCENARIO=APPROVED|MANUAL_REVIEW|REJECTED|UNAVAILABLE
npm test           # Karma + ChromeHeadless, sin backend ni mock
npm run build      # build de producción en dist/
```

## Datos de prueba

| Dato | Valor |
|------|-------|
| Celular | 9 dígitos que empiecen con 9, p. ej. `900000000` (ficticio) |
| OTP | `123456` (fijo de demo; el backend lo valida, no se envía SMS) |
| Tipo de documento | `TEST` (fijo, solo lectura) |
| Documento | Debe empezar con `TEST-`, p. ej. `TEST-0001` |

El resultado KYC lo determina el escenario configurado en el backend (`APPROVED` por defecto). Con `MANUAL_REVIEW` el resultado queda `PENDING` y se muestran los botones **Aprobar (demo)** / **Rechazar (demo)** en la misma vista.

## Contrato esperado del backend (provisional)

El frontend solo llama al backend propio, nunca al mock KYC. Estos endpoints están **pendientes de confirmar con la tarea 1.5**:

| Método y ruta | Cuerpo | Respuesta |
|---------------|--------|-----------|
| `POST /api/onboarding/flows` | `{}` | `{ "flowId": string }` |
| `POST /api/onboarding/flows/{id}/otp` | `{ phone, code }` | 2xx; `422 { "code": "OTP_INVALID" }` |
| `POST /api/onboarding/flows/{id}/kyc` | `{ documentType: "TEST", document }` | `{ "status": "ACTIVE" \| "PENDING" \| "REJECTED" }`; `503 { "code": "KYC_UNAVAILABLE" }` (recuperable); `409 { "code": "SUBMISSION_UNKNOWN" }` (sin reintento) |
| `POST /api/onboarding/flows/{id}/decision` | `{ decision: "ACTIVE" \| "REJECTED" }` | `{ "status": "ACTIVE" \| "REJECTED" }` |

// Stub solo para ver la UI en local; no reemplaza al backend Quarkus (tareas 1.x).
// Uso: KYC_SCENARIO=APPROVED|MANUAL_REVIEW|REJECTED|UNAVAILABLE node dev-mock-backend.mjs
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8080);
const SCENARIO = process.env.KYC_SCENARIO ?? 'APPROVED';
const SCENARIO_STATUS = { APPROVED: 'ACTIVE', MANUAL_REVIEW: 'PENDING', REJECTED: 'REJECTED' };
const DEMO_OTP = '123456';
const flows = new Map();

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};

const readJson = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
  });

createServer(async (req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname.split('/').filter(Boolean);
  const [api, onboarding, flowsSeg, id, action] = route;
  if (req.method !== 'POST' || api !== 'api' || onboarding !== 'onboarding' || flowsSeg !== 'flows') {
    return send(res, 404, { code: 'NOT_FOUND' });
  }
  const body = await readJson(req);

  if (!id) {
    const flowId = randomUUID();
    flows.set(flowId, { otpVerified: false, status: 'STARTED' });
    return send(res, 201, { flowId });
  }

  const flow = flows.get(id);
  if (!flow) return send(res, 404, { code: 'FLOW_NOT_FOUND' });

  if (action === 'otp') {
    if (body.code !== DEMO_OTP) return send(res, 422, { code: 'OTP_INVALID' });
    flow.otpVerified = true;
    return send(res, 204);
  }

  if (action === 'kyc') {
    if (!flow.otpVerified) return send(res, 409, { code: 'OTP_REQUIRED' });
    if (body.documentType !== 'TEST' || !/^TEST-/.test(body.document ?? '')) {
      return send(res, 400, { code: 'INVALID_DOCUMENT' });
    }
    if (SCENARIO === 'UNAVAILABLE') return send(res, 503, { code: 'KYC_UNAVAILABLE' });
    flow.status = SCENARIO_STATUS[SCENARIO] ?? 'ACTIVE';
    return send(res, 200, { status: flow.status });
  }

  if (action === 'decision') {
    if (flow.status !== 'PENDING' || !['ACTIVE', 'REJECTED'].includes(body.decision)) {
      return send(res, 409, { code: 'INVALID_STATE' });
    }
    flow.status = body.decision;
    return send(res, 200, { status: flow.status });
  }

  return send(res, 404, { code: 'NOT_FOUND' });
}).listen(PORT, () => console.log(`Stub de backend en http://localhost:${PORT} (escenario ${SCENARIO})`));

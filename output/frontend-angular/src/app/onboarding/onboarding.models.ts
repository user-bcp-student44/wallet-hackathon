export type WalletStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';

export type OnboardingStage = 'otp' | 'kyc' | 'result';

export type ResultKind = WalletStatus | 'UNAVAILABLE' | 'UNKNOWN';

export type ManualDecision = 'ACTIVE' | 'REJECTED';

export interface StartFlowResponse {
  flowId: string;
}

export interface WalletStatusResponse {
  status: WalletStatus;
}

// Contrato provisional hasta que el backend (tarea 1.5) publique sus endpoints.
export type ApiErrorCode = 'OTP_INVALID' | 'KYC_UNAVAILABLE' | 'SUBMISSION_UNKNOWN' | 'UNEXPECTED';

export const KYC_DOCUMENT_TYPE = 'TEST';
export const DOCUMENT_PATTERN = /^TEST-[A-Za-z0-9-]+$/;
export const PHONE_PATTERN = /^9\d{8}$/;
export const OTP_PATTERN = /^\d{6}$/;
export const DEMO_OTP = '123456';

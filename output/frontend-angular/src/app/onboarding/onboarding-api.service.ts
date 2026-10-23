import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApiErrorCode,
  KYC_DOCUMENT_TYPE,
  ManualDecision,
  StartFlowResponse,
  WalletStatusResponse,
} from './onboarding.models';

const BASE_URL = '/api/onboarding/flows';

/** Cliente de los endpoints propios del backend; el frontend nunca llama al mock KYC. */
@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);

  startFlow(): Observable<StartFlowResponse> {
    return this.http.post<StartFlowResponse>(BASE_URL, {});
  }

  verifyOtp(flowId: string, phone: string, code: string): Observable<void> {
    return this.http.post<void>(`${BASE_URL}/${encodeURIComponent(flowId)}/otp`, { phone, code });
  }

  submitKyc(flowId: string, document: string): Observable<WalletStatusResponse> {
    return this.http.post<WalletStatusResponse>(`${BASE_URL}/${encodeURIComponent(flowId)}/kyc`, {
      documentType: KYC_DOCUMENT_TYPE,
      document,
    });
  }

  resolveManualReview(flowId: string, decision: ManualDecision): Observable<WalletStatusResponse> {
    return this.http.post<WalletStatusResponse>(
      `${BASE_URL}/${encodeURIComponent(flowId)}/decision`,
      { decision },
    );
  }
}

export function toApiErrorCode(error: unknown): ApiErrorCode {
  if (error instanceof HttpErrorResponse) {
    const code = (error.error as { code?: string } | null)?.code;
    if (code === 'OTP_INVALID' || code === 'KYC_UNAVAILABLE' || code === 'SUBMISSION_UNKNOWN') {
      return code;
    }
  }
  return 'UNEXPECTED';
}

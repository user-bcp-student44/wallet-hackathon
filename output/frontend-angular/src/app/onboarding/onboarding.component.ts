import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, firstValueFrom } from 'rxjs';
import { OnboardingApiService, toApiErrorCode } from './onboarding-api.service';
import {
  DEMO_OTP,
  DOCUMENT_PATTERN,
  KYC_DOCUMENT_TYPE,
  ManualDecision,
  OTP_PATTERN,
  OnboardingStage,
  PHONE_PATTERN,
  ResultKind,
  WalletStatusResponse,
} from './onboarding.models';

interface StepInfo {
  stage: OnboardingStage;
  label: string;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly steps: StepInfo[] = [
    { stage: 'otp', label: 'Celular' },
    { stage: 'kyc', label: 'Datos' },
    { stage: 'result', label: 'Resultado' },
  ];
  readonly demoOtp = DEMO_OTP;
  readonly documentType = KYC_DOCUMENT_TYPE;

  readonly stage = signal<OnboardingStage>('otp');
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  readonly result = signal<ResultKind | null>(null);
  readonly stepIndex = computed(() => this.steps.findIndex((s) => s.stage === this.stage()));

  readonly otpForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    code: ['', [Validators.required, Validators.pattern(OTP_PATTERN)]],
  });
  readonly kycForm = this.fb.group({
    document: ['', [Validators.required, Validators.pattern(DOCUMENT_PATTERN)]],
  });

  private flowId: string | null = null;

  ngOnInit(): void {
    void this.ensureFlow().catch(() => undefined);
  }

  async verifyOtp(): Promise<void> {
    if (this.busy()) return;
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.formError.set(null);
    try {
      const flowId = await this.ensureFlow();
      const { phone, code } = this.otpForm.getRawValue();
      await firstValueFrom(this.api.verifyOtp(flowId, phone, code));
      this.stage.set('kyc');
    } catch (error) {
      this.formError.set(
        toApiErrorCode(error) === 'OTP_INVALID'
          ? `El código no es correcto. En esta demo el código de prueba es ${DEMO_OTP}.`
          : 'No pudimos verificar tu celular. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  async submitKyc(): Promise<void> {
    if (this.busy()) return;
    if (this.kycForm.invalid) {
      this.kycForm.markAllAsTouched();
      return;
    }
    await this.runKyc();
  }

  async retryKyc(): Promise<void> {
    if (this.busy()) return;
    await this.runKyc();
  }

  async resolveManualReview(decision: ManualDecision): Promise<void> {
    if (this.busy() || !this.flowId) return;
    this.busy.set(true);
    this.formError.set(null);
    try {
      await this.applyStatus(this.api.resolveManualReview(this.flowId, decision));
    } catch {
      this.formError.set('No pudimos registrar la decisión. Inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  private async runKyc(): Promise<void> {
    this.busy.set(true);
    this.formError.set(null);
    try {
      const flowId = await this.ensureFlow();
      const { document } = this.kycForm.getRawValue();
      await this.applyStatus(this.api.submitKyc(flowId, document));
    } catch (error) {
      const code = toApiErrorCode(error);
      this.result.set(code === 'SUBMISSION_UNKNOWN' ? 'UNKNOWN' : 'UNAVAILABLE');
      this.stage.set('result');
    } finally {
      this.busy.set(false);
    }
  }

  private async applyStatus(request: Observable<WalletStatusResponse>): Promise<void> {
    const { status } = await firstValueFrom(request);
    this.result.set(status);
    this.stage.set('result');
  }

  private async ensureFlow(): Promise<string> {
    if (!this.flowId) {
      this.flowId = (await firstValueFrom(this.api.startFlow())).flowId;
    }
    return this.flowId;
  }
}

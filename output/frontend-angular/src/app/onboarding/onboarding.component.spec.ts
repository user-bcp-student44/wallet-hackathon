import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { OnboardingComponent } from './onboarding.component';

const FLOW_URL = '/api/onboarding/flows';
const OTP_URL = `${FLOW_URL}/flow-1/otp`;
const KYC_URL = `${FLOW_URL}/flow-1/kyc`;
const DECISION_URL = `${FLOW_URL}/flow-1/decision`;

describe('OnboardingComponent', () => {
  let fixture: ComponentFixture<OnboardingComponent>;
  let http: HttpTestingController;
  let root: HTMLElement;

  const settle = () => {
    flushMicrotasks();
    fixture.detectChanges();
  };

  const type = (selector: string, value: string) => {
    const input = root.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  const submit = (testId: string) => {
    root.querySelector(`[data-testid="${testId}"]`)!.dispatchEvent(new Event('submit'));
    settle();
  };

  const click = (text: string) => {
    const button = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text),
    );
    expect(button).withContext(`botón "${text}"`).toBeTruthy();
    button!.click();
    settle();
  };

  const text = () => root.textContent ?? '';

  const goToKyc = () => {
    type('#phone', '900000000');
    type('#code', '123456');
    submit('otp-form');
    http.expectOne(OTP_URL).flush(null);
    settle();
  };

  const submitKyc = () => {
    type('#document', 'TEST-0001');
    submit('kyc-form');
  };

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(OnboardingComponent);
    http = TestBed.inject(HttpTestingController);
    root = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne({ method: 'POST', url: FLOW_URL }).flush({ flowId: 'flow-1' });
    settle();
  }));

  afterEach(() => http.verify());

  describe('progreso y validaciones (2.2)', () => {
    it('muestra las tres etapas y marca la actual', () => {
      const items = root.querySelectorAll('.stepper li');
      expect(items.length).toBe(3);
      expect(items[0].getAttribute('aria-current')).toBe('step');
      expect(text()).toContain('Paso 1 de 3');
    });

    it('bloquea el avance con celular y código vacíos y explica cómo corregirlos', fakeAsync(() => {
      submit('otp-form');

      http.expectNone(OTP_URL);
      expect(text()).toContain('Ingresa tu celular de prueba de 9 dígitos.');
      expect(text()).toContain('Ingresa el código de 6 dígitos.');
      expect(text()).toContain('Paso 1 de 3');
    }));

    it('rechaza un celular inválido sin perder el código ya ingresado', fakeAsync(() => {
      type('#phone', '12345');
      type('#code', '123456');
      submit('otp-form');

      http.expectNone(OTP_URL);
      expect(text()).toContain('El celular debe tener 9 dígitos y empezar con 9.');
      expect(root.querySelector<HTMLInputElement>('#code')!.value).toBe('123456');
    }));

    it('avanza a datos KYC con el OTP aceptado y envía el celular y el código al backend', fakeAsync(() => {
      type('#phone', '900000000');
      type('#code', '123456');
      submit('otp-form');

      const req = http.expectOne(OTP_URL);
      expect(req.request.body).toEqual({ phone: '900000000', code: '123456' });
      req.flush(null);
      settle();

      expect(text()).toContain('Paso 2 de 3');
      expect(root.querySelector('[data-testid="kyc-form"]')).toBeTruthy();
    }));

    it('mantiene el paso y conserva el celular cuando el backend rechaza el OTP', fakeAsync(() => {
      type('#phone', '900000000');
      type('#code', '000000');
      submit('otp-form');
      http
        .expectOne(OTP_URL)
        .flush({ code: 'OTP_INVALID' }, { status: 422, statusText: 'Unprocessable' });
      settle();

      expect(text()).toContain('Paso 1 de 3');
      expect(root.querySelector('[data-testid="form-error"]')?.textContent).toContain('123456');
      expect(root.querySelector<HTMLInputElement>('#phone')!.value).toBe('900000000');
    }));

    it('exige un documento TEST- y no lo envía si el formato es inválido', fakeAsync(() => {
      goToKyc();

      type('#document', '12345678');
      submit('kyc-form');

      http.expectNone(KYC_URL);
      expect(text()).toContain('Usa un documento de prueba que empiece con TEST-');
      expect(root.querySelector<HTMLInputElement>('#docType')!.value).toBe('TEST');
    }));

    it('exige el documento cuando está vacío', fakeAsync(() => {
      goToKyc();
      submit('kyc-form');

      http.expectNone(KYC_URL);
      expect(text()).toContain('Ingresa el documento de prueba.');
    }));
  });

  describe('integración con el backend y estados (2.3)', () => {
    it('envía documentType TEST y muestra ACTIVE', fakeAsync(() => {
      goToKyc();
      submitKyc();

      const req = http.expectOne(KYC_URL);
      expect(req.request.body).toEqual({ documentType: 'TEST', document: 'TEST-0001' });
      req.flush({ status: 'ACTIVE' });
      settle();

      expect(text()).toContain('Paso 3 de 3');
      expect(text()).toContain('Tu wallet está activa');
    }));

    it('muestra PENDING sin presentar la wallet como activa', fakeAsync(() => {
      goToKyc();
      submitKyc();
      http.expectOne(KYC_URL).flush({ status: 'PENDING' });
      settle();

      expect(text()).toContain('en revisión');
      expect(text()).toContain('no está activa');
      expect(text()).not.toContain('Tu wallet está activa');
    }));

    it('muestra REJECTED', fakeAsync(() => {
      goToKyc();
      submitKyc();
      http.expectOne(KYC_URL).flush({ status: 'REJECTED' });
      settle();

      expect(text()).toContain('No pudimos activar tu wallet');
      expect(text()).not.toContain('Tu wallet está activa');
    }));

    it('trata KYC_UNAVAILABLE como error recuperable y permite reintentar', fakeAsync(() => {
      goToKyc();
      submitKyc();
      http
        .expectOne(KYC_URL)
        .flush({ code: 'KYC_UNAVAILABLE' }, { status: 503, statusText: 'Unavailable' });
      settle();

      expect(text()).toContain('No pudimos completar la verificación');
      expect(text()).not.toContain('Tu wallet está activa');

      click('Reintentar verificación');
      const retry = http.expectOne(KYC_URL);
      expect(retry.request.body.document).toBe('TEST-0001');
      retry.flush({ status: 'ACTIVE' });
      settle();

      expect(text()).toContain('Tu wallet está activa');
    }));

    it('no ofrece reintento cuando el resultado del envío es desconocido', fakeAsync(() => {
      goToKyc();
      submitKyc();
      http
        .expectOne(KYC_URL)
        .flush({ code: 'SUBMISSION_UNKNOWN' }, { status: 409, statusText: 'Conflict' });
      settle();

      expect(text()).toContain('No pudimos confirmar el envío');
      expect(text()).not.toContain('Reintentar');
      expect(text()).not.toContain('Tu wallet está activa');
    }));

    it('ignora un segundo envío mientras hay una solicitud en curso', fakeAsync(() => {
      goToKyc();
      submitKyc();
      submit('kyc-form');

      http.expectOne(KYC_URL).flush({ status: 'ACTIVE' });
      settle();
      http.expectNone(KYC_URL);
      expect(text()).toContain('Tu wallet está activa');
    }));

    it('informa un error de red al verificar el OTP sin avanzar', fakeAsync(() => {
      type('#phone', '900000000');
      type('#code', '123456');
      submit('otp-form');
      http.expectOne(OTP_URL).error(new ProgressEvent('error'));
      settle();

      expect(root.querySelector('[data-testid="form-error"]')?.textContent).toContain(
        'No pudimos verificar tu celular',
      );
      expect(text()).toContain('Paso 1 de 3');
    }));
  });

  describe('revisión manual en la misma vista (2.4)', () => {
    const toPending = () => {
      goToKyc();
      submitKyc();
      http.expectOne(KYC_URL).flush({ status: 'PENDING' });
      settle();
    };

    it('activa la wallet al aprobar desde la vista de resultado', fakeAsync(() => {
      toPending();
      click('Aprobar (demo)');

      const req = http.expectOne(DECISION_URL);
      expect(req.request.body).toEqual({ decision: 'ACTIVE' });
      req.flush({ status: 'ACTIVE' });
      settle();

      expect(text()).toContain('Tu wallet está activa');
      expect(text()).not.toContain('Aprobar (demo)');
    }));

    it('muestra el rechazo al rechazar desde la vista de resultado', fakeAsync(() => {
      toPending();
      click('Rechazar (demo)');

      const req = http.expectOne(DECISION_URL);
      expect(req.request.body).toEqual({ decision: 'REJECTED' });
      req.flush({ status: 'REJECTED' });
      settle();

      expect(text()).toContain('No pudimos activar tu wallet');
    }));

    it('mantiene PENDING si la decisión falla', fakeAsync(() => {
      toPending();
      click('Aprobar (demo)');
      http.expectOne(DECISION_URL).flush(null, { status: 500, statusText: 'Error' });
      settle();

      expect(text()).toContain('No pudimos registrar la decisión');
      expect(text()).toContain('no está activa');
    }));

    it('no abre una consola independiente: las acciones viven en la vista de resultado', fakeAsync(() => {
      toPending();

      const result = root.querySelector('[data-testid="result"]')!;
      expect(root.querySelectorAll('[data-testid="result"]').length).toBe(1);
      expect(result.querySelectorAll('button').length).toBe(2);
      expect(root.querySelectorAll('button').length).toBe(2);
    }));
  });
});

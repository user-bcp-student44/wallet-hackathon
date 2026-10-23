import { Component } from '@angular/core';
import { OnboardingComponent } from './onboarding/onboarding.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [OnboardingComponent],
  template: '<app-onboarding />',
})
export class AppComponent {}

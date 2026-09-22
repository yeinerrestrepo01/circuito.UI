import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, FormFieldComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  ingresar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.enviando.set(true);
    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/inventario';
          void this.router.navigateByUrl(returnUrl);
        },
        error: () => this.error.set('Correo o contraseña incorrectos.'),
      });
  }

  /** TEMPORAL: mientras no exista `POST /auth/login`, ver `AuthService.entrarModoDemo`. */
  entrarModoDemo(): void {
    this.auth.entrarModoDemo();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/inventario';
    void this.router.navigateByUrl(returnUrl);
  }
}

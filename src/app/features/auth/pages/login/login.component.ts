import { HttpErrorResponse } from '@angular/common/http';
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
        next: () => void this.router.navigateByUrl(this.destinoTrasIngresar()),
        error: (err: HttpErrorResponse) => this.error.set(err.error?.message ?? 'Correo o contraseña incorrectos.'),
      });
  }

  /** El superadmin no tiene nada que hacer en /inventario (no pertenece a ninguna empresa). */
  private destinoTrasIngresar(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl ?? (this.auth.esSuperadmin() ? '/admin' : '/inventario');
  }
}

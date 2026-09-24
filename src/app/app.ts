import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHostComponent } from './shared/components/toast-host/toast-host.component';
import { ConfirmDialogHostComponent } from './shared/components/confirm-dialog-host/confirm-dialog-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent, ConfirmDialogHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}

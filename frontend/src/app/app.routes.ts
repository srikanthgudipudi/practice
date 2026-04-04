import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then(m => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'transactions', pathMatch: 'full' },
      { path: 'transactions',      loadComponent: () => import('./features/transactions/list/transaction-list').then(m => m.TransactionList) },
      { path: 'transactions/new',  loadComponent: () => import('./features/transactions/form/transaction-form').then(m => m.TransactionForm) },
      { path: 'transactions/:id/edit', loadComponent: () => import('./features/transactions/form/transaction-form').then(m => m.TransactionForm) },
      { path: 'budgets',    canActivate: [adminGuard], loadComponent: () => import('./features/budgets/budgets').then(m => m.Budgets) },
      { path: 'categories', canActivate: [adminGuard], loadComponent: () => import('./features/categories/categories').then(m => m.Categories) },
      { path: 'recurring',  canActivate: [adminGuard], loadComponent: () => import('./features/recurring/recurring').then(m => m.Recurring) },
      { path: 'alerts',     canActivate: [adminGuard], loadComponent: () => import('./features/alerts/alerts').then(m => m.Alerts) },
    ],
  },
  { path: '**', redirectTo: '' },
];

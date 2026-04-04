import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';

interface NavItem { label: string; icon: string; route: string; adminOnly?: boolean; }

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatMenuModule,
    MatChipsModule, MatDividerModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  auth = inject(AuthService);

  navItems: NavItem[] = [
    { label: 'Transactions', icon: 'receipt_long', route: '/transactions' },
    { label: 'Budgets',      icon: 'account_balance_wallet', route: '/budgets', adminOnly: true },
    { label: 'Categories',   icon: 'category', route: '/categories', adminOnly: true },
    { label: 'Recurring',    icon: 'repeat', route: '/recurring', adminOnly: true },
    { label: 'Alerts',       icon: 'notifications', route: '/alerts', adminOnly: true },
  ];

  get visibleNav() {
    return this.navItems.filter(i => !i.adminOnly || this.auth.isAdmin());
  }

  switchRole() {
    const next = this.auth.isAdmin() ? 'USER' : 'ADMIN';
    this.auth.switchRole(next).subscribe();
  }

  logout() { this.auth.logout(); }
}

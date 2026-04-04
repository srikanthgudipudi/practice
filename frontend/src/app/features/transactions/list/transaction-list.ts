import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { CategoryService } from '../../../core/services/category.service';
import { Transaction, Category } from '../../../core/models';

@Component({
  selector: 'app-transaction-list',
  imports: [
    RouterLink, FormsModule, CurrencyPipe, DatePipe,
    MatTableModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatChipsModule, MatProgressSpinnerModule,
    MatPaginatorModule, MatCardModule, MatTooltipModule, TitleCasePipe,
  ],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.scss',
})
export class TransactionList implements OnInit {
  transactions: Transaction[] = [];
  categories: Category[] = [];
  total = 0;
  page = 0;
  limit = 20;
  loading = false;

  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();
  filterType = '';
  filterCategory = '';

  months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  displayedColumns = ['date', 'description', 'category', 'payment', 'amount', 'actions'];

  constructor(
    private txService: TransactionService,
    private catService: CategoryService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.catService.getAll().subscribe(c => this.categories = c);
    this.load();
  }

  load() {
    this.loading = true;
    this.txService.getAll({
      month: this.filterMonth, year: this.filterYear,
      type: this.filterType || undefined,
      category_id: this.filterCategory || undefined,
      page: this.page + 1, limit: this.limit,
    }).subscribe({
      next: res => { this.transactions = res.data; this.total = res.total; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex; this.limit = e.pageSize; this.load(); }
  onFilterChange() { this.page = 0; this.load(); }

  delete(tx: Transaction) {
    if (!confirm(`Delete this ${tx.type.toLowerCase()} of ${tx.amount}?`)) return;
    this.txService.delete(tx.id).subscribe({
      next: () => { this.snack.open('Deleted', '', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Error deleting transaction', '', { duration: 3000 }),
    });
  }
}

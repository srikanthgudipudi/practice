import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BudgetService } from '../../core/services/budget.service';
import { CategoryService } from '../../core/services/category.service';
import { BudgetSummary, Category } from '../../core/models';

@Component({
  selector: 'app-budgets',
  imports: [
    ReactiveFormsModule, FormsModule, CurrencyPipe, DecimalPipe,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressBarModule,
  ],
  templateUrl: './budgets.html',
  styleUrl: './budgets.scss',
})
export class Budgets implements OnInit {
  summary: BudgetSummary | null = null;
  categories: Category[] = [];
  filterMonth = new Date().getMonth() + 1;
  filterYear = new Date().getFullYear();
  months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
  years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  monthlyForm!: ReturnType<FormBuilder['group']>;
  categoryForm!: ReturnType<FormBuilder['group']>;

  constructor(private budgetService: BudgetService, private catService: CategoryService, private fb: FormBuilder, private snack: MatSnackBar) {
    this.monthlyForm = this.fb.group({ total_amount: [null as number | null, [Validators.required, Validators.min(1)]] });
    this.categoryForm = this.fb.group({ category_id: ['', Validators.required], amount: [null as number | null, [Validators.required, Validators.min(1)]] });
  }

  ngOnInit() {
    this.catService.getAll().subscribe(c => this.categories = c);
    this.load();
  }

  load() {
    this.budgetService.getSummary(this.filterMonth, this.filterYear).subscribe(s => {
      this.summary = s;
      this.monthlyForm.patchValue({ total_amount: s.total_budget || null });
    });
  }

  saveMonthly() {
    if (this.monthlyForm.invalid) return;
    this.budgetService.upsert({ month: this.filterMonth, year: this.filterYear, total_amount: this.monthlyForm.value.total_amount! })
      .subscribe({ next: () => { this.snack.open('Monthly budget saved', '', { duration: 2000 }); this.load(); } });
  }

  saveCategoryBudget() {
    if (this.categoryForm.invalid) return;
    this.budgetService.upsertCategory({ ...this.categoryForm.value as any, month: this.filterMonth, year: this.filterYear })
      .subscribe({ next: () => { this.snack.open('Category budget saved', '', { duration: 2000 }); this.categoryForm.reset(); this.load(); } });
  }

  deleteCategoryBudget(id: string) {
    this.budgetService.deleteCategory(id).subscribe({ next: () => { this.snack.open('Removed', '', { duration: 2000 }); this.load(); } });
  }

  pct(spent: number, budget: number) { return budget > 0 ? Math.min((spent / budget) * 100, 100) : 0; }
  pctColor(spent: number, budget: number) { const p = this.pct(spent, budget); return p >= 100 ? 'warn' : p >= 80 ? 'accent' : 'primary'; }
}

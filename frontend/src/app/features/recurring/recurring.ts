import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RecurringService } from '../../core/services/recurring.service';
import { CategoryService } from '../../core/services/category.service';
import { RecurringTransaction, Category, PaymentType, FrequencyType } from '../../core/models';

@Component({
  selector: 'app-recurring',
  imports: [
    ReactiveFormsModule, CurrencyPipe, DatePipe,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatChipsModule,
  ],
  templateUrl: './recurring.html',
  styleUrl: './recurring.scss',
})
export class Recurring implements OnInit {
  items: RecurringTransaction[] = [];
  categories: Category[] = [];
  showForm = false;
  editing: RecurringTransaction | null = null;
  displayedColumns = ['title', 'type', 'amount', 'frequency', 'next_due', 'status', 'actions'];
  paymentTypes: PaymentType[] = ['CASH','BANK_TRANSFER','CREDIT_CARD','DEBIT_CARD','UPI','CHEQUE','OTHER'];
  frequencies: FrequencyType[] = ['DAILY','WEEKLY','MONTHLY','YEARLY'];

  form!: ReturnType<FormBuilder['group']>;

  constructor(private svc: RecurringService, private catSvc: CategoryService, private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.group({
      title:        ['', Validators.required],
      type:         ['EXPENSE', Validators.required],
      amount:       [null as number | null, [Validators.required, Validators.min(0.01)]],
      category_id:  [''],
      payment_type: ['CASH' as PaymentType, Validators.required],
      frequency:    ['MONTHLY' as FrequencyType, Validators.required],
      start_date:   ['', Validators.required],
      end_date:     [''],
    });
  }

  ngOnInit() { this.catSvc.getAll().subscribe(c => this.categories = c); this.load(); }
  load() { this.svc.getAll().subscribe(r => this.items = r); }

  openNew() { this.editing = null; this.form.reset({ type: 'EXPENSE', payment_type: 'CASH', frequency: 'MONTHLY' }); this.showForm = true; }
  openEdit(r: RecurringTransaction) { this.editing = r; this.form.patchValue(r); this.showForm = true; }
  cancel() { this.showForm = false; }

  save() {
    if (this.form.invalid) return;
    const req = this.editing ? this.svc.update(this.editing.id, this.form.value as any) : this.svc.create(this.form.value as any);
    req.subscribe({ next: () => { this.snack.open('Saved', '', { duration: 2000 }); this.showForm = false; this.load(); } });
  }

  toggle(r: RecurringTransaction) {
    this.svc.update(r.id, { is_active: !r.is_active }).subscribe({ next: () => this.load() });
  }

  delete(r: RecurringTransaction) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    this.svc.delete(r.id).subscribe({ next: () => { this.snack.open('Deleted', '', { duration: 2000 }); this.load(); } });
  }
}

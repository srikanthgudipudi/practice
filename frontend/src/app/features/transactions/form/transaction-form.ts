import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TitleCasePipe } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { CategoryService } from '../../../core/services/category.service';
import { Category, PaymentType } from '../../../core/models';

@Component({
  selector: 'app-transaction-form',
  imports: [
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatSlideToggleModule, TitleCasePipe,
  ],
  templateUrl: './transaction-form.html',
  styleUrl: './transaction-form.scss',
})
export class TransactionForm implements OnInit {
  form!: ReturnType<FormBuilder['group']>;

  categories: Category[] = [];
  loading = false;
  saving = false;
  editId: string | null = null;
  receiptFile: File | null = null;
  receiptPreview: string | null = null;
  ocrLoading = false;

  paymentTypes: PaymentType[] = ['CASH','BANK_TRANSFER','CREDIT_CARD','DEBIT_CARD','UPI','CHEQUE','OTHER'];

  constructor(
    private fb: FormBuilder,
    private txService: TransactionService,
    private catService: CategoryService,
    private router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar,
  ) {
    this.form = this.fb.group({
      type:             ['EXPENSE', Validators.required],
      amount:           [null as number | null, [Validators.required, Validators.min(0.01)]],
      description:      [''],
      category_id:      [''],
      payment_type:     ['CASH' as PaymentType, Validators.required],
      payee_name:       [''],
      transaction_date: [new Date(), Validators.required],
      notes:            [''],
    });
  }

  ngOnInit() {
    this.catService.getAll().subscribe(c => this.categories = c);
    this.editId = this.route.snapshot.paramMap.get('id');
    if (this.editId) {
      this.loading = true;
      this.txService.getOne(this.editId).subscribe({
        next: tx => {
          this.form.patchValue({ ...tx, transaction_date: new Date(tx.transaction_date) });
          if (tx.receipt_url) this.receiptPreview = `http://localhost:3000${tx.receipt_url}`;
          this.loading = false;
        },
        error: () => { this.loading = false; this.router.navigate(['/transactions']); },
      });
    }
  }

  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.receiptFile = file;
    this.receiptPreview = URL.createObjectURL(file);
    this.runOcr(file);
  }

  runOcr(file: File) {
    this.ocrLoading = true;
    this.txService.processOcr(file).subscribe({
      next: res => {
        if (res.extracted.amount) this.form.patchValue({ amount: res.extracted.amount });
        this.ocrLoading = false;
        this.snack.open('Receipt scanned — please verify details', '', { duration: 3000 });
      },
      error: () => { this.ocrLoading = false; },
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const value = { ...this.form.value, transaction_date: (this.form.value.transaction_date as Date).toISOString().split('T')[0] } as any;

    const request = this.editId
      ? this.txService.update(this.editId, value)
      : this.txService.create(value);

    request.subscribe({
      next: tx => {
        if (this.receiptFile && tx.id) {
          this.txService.uploadReceipt(tx.id, this.receiptFile).subscribe();
        }
        this.snack.open(this.editId ? 'Updated!' : 'Saved!', '', { duration: 2000 });
        this.router.navigate(['/transactions']);
      },
      error: () => { this.snack.open('Error saving transaction', '', { duration: 3000 }); this.saving = false; },
    });
  }

  cancel() { this.router.navigate(['/transactions']); }
}

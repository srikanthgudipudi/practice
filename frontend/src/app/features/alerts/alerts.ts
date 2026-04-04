import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { AlertService } from '../../core/services/alert.service';
import { CategoryService } from '../../core/services/category.service';
import { AlertConfig, AlertType, Category } from '../../core/models';

@Component({
  selector: 'app-alerts',
  imports: [
    ReactiveFormsModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatChipsModule,
  ],
  templateUrl: './alerts.html',
  styleUrl: './alerts.scss',
})
export class Alerts implements OnInit {
  configs: AlertConfig[] = [];
  categories: Category[] = [];
  showForm = false;
  displayedColumns = ['type', 'threshold', 'category', 'active', 'actions'];
  alertTypes: AlertType[] = ['BUDGET_THRESHOLD', 'CATEGORY_THRESHOLD', 'LARGE_TRANSACTION'];
  form!: ReturnType<FormBuilder['group']>;

  constructor(private alertSvc: AlertService, private catSvc: CategoryService, private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.group({
      type:            ['BUDGET_THRESHOLD' as AlertType, Validators.required],
      threshold_value: [null as number | null, [Validators.required, Validators.min(0)]],
      category_id:     [''],
    });
  }

  ngOnInit() { this.catSvc.getAll().subscribe(c => this.categories = c); this.load(); }
  load() { this.alertSvc.getConfigs().subscribe(a => this.configs = a); }

  openNew() { this.form.reset({ type: 'BUDGET_THRESHOLD' }); this.showForm = true; }
  cancel() { this.showForm = false; }

  save() {
    if (this.form.invalid) return;
    this.alertSvc.create(this.form.value as any).subscribe({
      next: () => { this.snack.open('Alert created', '', { duration: 2000 }); this.showForm = false; this.load(); }
    });
  }

  toggle(a: AlertConfig) {
    this.alertSvc.update(a.id, { is_active: !a.is_active }).subscribe({ next: () => this.load() });
  }

  delete(a: AlertConfig) {
    if (!confirm('Delete this alert?')) return;
    this.alertSvc.delete(a.id).subscribe({ next: () => { this.snack.open('Deleted', '', { duration: 2000 }); this.load(); } });
  }

  typeLabel(t: AlertType) {
    return { BUDGET_THRESHOLD: 'Budget %', CATEGORY_THRESHOLD: 'Category %', LARGE_TRANSACTION: 'Large Tx Amount' }[t];
  }
}

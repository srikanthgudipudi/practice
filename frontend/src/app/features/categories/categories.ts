import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models';

@Component({
  selector: 'app-categories',
  imports: [
    ReactiveFormsModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatChipsModule,
  ],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories implements OnInit {
  categories: Category[] = [];
  displayedColumns = ['name', 'icon', 'default', 'actions'];
  showForm = false;
  editing: Category | null = null;
  form!: ReturnType<FormBuilder['group']>;

  constructor(private catService: CategoryService, private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.group({
      name:  ['', Validators.required],
      icon:  ['category'],
      color: ['#607D8B'],
    });
  }

  ngOnInit() { this.load(); }
  load() { this.catService.getAll().subscribe(c => this.categories = c); }

  openNew() { this.editing = null; this.form.reset({ icon: 'category', color: '#607D8B' }); this.showForm = true; }
  openEdit(c: Category) { this.editing = c; this.form.patchValue(c); this.showForm = true; }
  cancelForm() { this.showForm = false; }

  save() {
    if (this.form.invalid) return;
    const req = this.editing
      ? this.catService.update(this.editing.id, this.form.value as any)
      : this.catService.create(this.form.value as any);
    req.subscribe({
      next: () => { this.snack.open('Saved', '', { duration: 2000 }); this.showForm = false; this.load(); },
      error: () => this.snack.open('Error', '', { duration: 3000 })
    });
  }

  delete(c: Category) {
    if (c.is_default) { this.snack.open('Default categories cannot be deleted', '', { duration: 3000 }); return; }
    if (!confirm(`Delete "${c.name}"?`)) return;
    this.catService.delete(c.id).subscribe({ next: () => { this.snack.open('Deleted', '', { duration: 2000 }); this.load(); } });
  }
}

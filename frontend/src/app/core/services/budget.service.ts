import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Budget, BudgetSummary, CategoryBudget } from '../models';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private url = `${environment.apiUrl}/budgets`;

  constructor(private http: HttpClient) {}

  getSummary(month?: number, year?: number) {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    if (year) params = params.set('year', year);
    return this.http.get<BudgetSummary>(`${this.url}/summary`, { params });
  }

  upsert(data: { month: number; year: number; total_amount: number }) {
    return this.http.post<Budget>(this.url, data);
  }

  upsertCategory(data: { category_id: string; month: number; year: number; amount: number }) {
    return this.http.post<CategoryBudget>(`${this.url}/category`, data);
  }

  deleteCategory(id: string) {
    return this.http.delete<void>(`${this.url}/category/${id}`);
  }
}

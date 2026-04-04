import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Transaction, TransactionPage } from '../models';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private url = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  getAll(filters: { month?: number; year?: number; type?: string; category_id?: string; page?: number; limit?: number } = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params = params.set(k, v); });
    return this.http.get<TransactionPage>(this.url, { params });
  }

  getOne(id: string) {
    return this.http.get<Transaction>(`${this.url}/${id}`);
  }

  create(data: Partial<Transaction>) {
    return this.http.post<Transaction>(this.url, data);
  }

  update(id: string, data: Partial<Transaction>) {
    return this.http.put<Transaction>(`${this.url}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  uploadReceipt(id: string, file: File) {
    const fd = new FormData();
    fd.append('receipt', file);
    return this.http.post<{ receipt_url: string }>(`${this.url}/${id}/receipt`, fd);
  }

  processOcr(file: File) {
    const fd = new FormData();
    fd.append('receipt', file);
    return this.http.post<{ extracted: { amount: number | null; date: string | null }; raw_text: string }>(`${this.url}/ocr`, fd);
  }
}

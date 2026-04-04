import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RecurringTransaction } from '../models';

@Injectable({ providedIn: 'root' })
export class RecurringService {
  private url = `${environment.apiUrl}/recurring`;

  constructor(private http: HttpClient) {}

  getAll() { return this.http.get<RecurringTransaction[]>(this.url); }
  create(data: Partial<RecurringTransaction>) { return this.http.post<RecurringTransaction>(this.url, data); }
  update(id: string, data: Partial<RecurringTransaction>) { return this.http.put<RecurringTransaction>(`${this.url}/${id}`, data); }
  delete(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}

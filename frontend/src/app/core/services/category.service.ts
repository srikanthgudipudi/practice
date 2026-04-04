import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Category } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private url = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  getAll() { return this.http.get<Category[]>(this.url); }
  create(data: Partial<Category>) { return this.http.post<Category>(this.url, data); }
  update(id: string, data: Partial<Category>) { return this.http.put<Category>(`${this.url}/${id}`, data); }
  delete(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}

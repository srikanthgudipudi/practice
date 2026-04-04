import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AlertConfig } from '../models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private url = `${environment.apiUrl}/alerts`;

  constructor(private http: HttpClient) {}

  getConfigs() { return this.http.get<AlertConfig[]>(`${this.url}/config`); }
  getActive() { return this.http.get<{ type: string; message: string }[]>(`${this.url}/active`); }
  create(data: Partial<AlertConfig>) { return this.http.post<AlertConfig>(`${this.url}/config`, data); }
  update(id: string, data: Partial<AlertConfig>) { return this.http.put<AlertConfig>(`${this.url}/config/${id}`, data); }
  delete(id: string) { return this.http.delete<void>(`${this.url}/config/${id}`); }
}

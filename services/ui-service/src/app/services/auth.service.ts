import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = '/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  checkStatus(): Observable<{ authorized: boolean }> {
    return this.http.get<{ authorized: boolean }>(`${BASE}/auth/status`);
  }

  sendCode(phoneNumber: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${BASE}/auth/send-code`, { phoneNumber });
  }

  signIn(phoneNumber: string, code: string): Observable<any> {
    return this.http.post<any>(`${BASE}/auth/sign-in`, { phoneNumber, code });
  }

  submit2FA(password: string): Observable<any> {
    return this.http.post<any>(`${BASE}/auth/2fa`, { password });
  }

  download(url: string): Observable<any> {
    return this.http.post<any>(`${BASE}/download`, { url });
  }

  getGroups(limit = 10, offset = 0): Observable<{ groups: Group[]; total: number; offset: number; limit: number }> {
    return this.http.get<{ groups: Group[]; total: number; offset: number; limit: number }>(
      `${BASE}/groups?limit=${limit}&offset=${offset}`
    );
  }
  getGroupContent(groupId: string, type = 'all', limit = 10, offset = 0): Observable<{ items: ContentItem[]; total: number; offset: number; limit: number }> {
    return this.http.get<{ items: ContentItem[]; total: number; offset: number; limit: number }>(
      `${BASE}/groups/${groupId}/content?type=${type}&limit=${limit}&offset=${offset}`
    );
  }
}

export interface Group {
  id: string;
  name: string;
  type: 'group' | 'channel';
  memberCount: number | null;
  createdAt: string | null;
  scam: boolean;
  fake: boolean;
  restricted: boolean;
}

export interface ContentItem {
  id: string;
  type: 'video' | 'image' | 'pdf' | 'chat' | 'other';
  text: string;
  date: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
}

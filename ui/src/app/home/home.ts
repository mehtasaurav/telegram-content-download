import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, Group } from '../services/auth.service';

@Component({
  selector: 'app-home',
  imports: [DecimalPipe, DatePipe, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  groups = signal<Group[]>([]);
  loadingGroups = signal(false);
  totalGroups = signal(0);
  currentOffset = signal(0);
  downloadUrl = signal('');
  loading = signal(false);
  successMessage = signal('');
  error = signal('');
  readonly PAGE_SIZE = 10;

  get hasMore(): boolean { return this.currentOffset() + this.PAGE_SIZE < this.totalGroups(); }
  get hasPrev(): boolean { return this.currentOffset() > 0; }

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() { this.loadGroups(0); }

  loadGroups(offset: number) {
    this.loadingGroups.set(true);
    this.authService.getGroups(this.PAGE_SIZE, offset).subscribe({
      next: (res) => {
        this.groups.set(res.groups);
        this.totalGroups.set(res.total);
        this.currentOffset.set(offset);
        this.loadingGroups.set(false);
      },
      error: () => this.loadingGroups.set(false),
    });
  }

  nextPage() { this.loadGroups(this.currentOffset() + this.PAGE_SIZE); }
  prevPage() { this.loadGroups(this.currentOffset() - this.PAGE_SIZE); }

  goToGroup(id: string) { this.router.navigate(['/group', id]); }

  download() {
    if (!this.downloadUrl()) return;
    this.loading.set(true);
    this.error.set('');
    this.successMessage.set('');
    this.authService.download(this.downloadUrl()).subscribe({
      next: () => { this.successMessage.set('Download started!'); this.loading.set(false); },
      error: (err) => { this.error.set(err.error?.error || 'Download failed'); this.loading.set(false); },
    });
  }
}

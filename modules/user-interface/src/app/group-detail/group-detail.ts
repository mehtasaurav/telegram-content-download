import { Component, OnInit, input, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService, ContentItem } from '../services/auth.service';

type Tab = 'all' | 'videos' | 'images' | 'pdfs' | 'chat' | 'other';

const TAB_TYPE_MAP: Record<Tab, string> = {
  all: 'all', videos: 'video', images: 'image', pdfs: 'pdf', chat: 'chat', other: 'other',
};

@Component({
  selector: 'app-group-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './group-detail.html',
  styleUrl: './group-detail.css',
})
export class GroupDetailComponent implements OnInit {
  groupId = input<string>('');

  activeTab = signal<Tab>('all');
  items = signal<ContentItem[]>([]);
  total = signal(0);
  offset = signal(0);
  loading = signal(false);
  loadingMore = signal(false);
  selectedIds = signal<Set<string>>(new Set());
  readonly PAGE_SIZE = 10;

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'videos', label: 'Videos' },
    { key: 'images', label: 'Images' },
    { key: 'pdfs', label: 'PDFs' },
    { key: 'chat', label: 'Chat' },
    { key: 'other', label: 'Other' },
  ];

  get hasMore(): boolean { return this.offset() + this.PAGE_SIZE < this.total(); }

  allSelected = computed(() => {
    const ids = this.selectedIds();
    const items = this.items();
    return items.length > 0 && items.every(i => ids.has(String(i.id)));
  });

  someSelected = computed(() => {
    const ids = this.selectedIds();
    const items = this.items();
    return items.some(i => ids.has(String(i.id))) && !this.allSelected();
  });

  selectedCount = computed(() => this.selectedIds().size);

  constructor(private authService: AuthService) {}

  ngOnInit() { this.loadContent(0); }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    this.selectedIds.set(new Set());
    this.loadContent(0);
  }

  loadContent(off: number) {
    const isAppend = off > 0;
    if (isAppend) this.loadingMore.set(true);
    else this.loading.set(true);
    const type = TAB_TYPE_MAP[this.activeTab()];
    this.authService.getGroupContent(this.groupId(), type, this.PAGE_SIZE, off).subscribe({
      next: (res) => {
        this.items.set(isAppend ? [...this.items(), ...res.items] : res.items);
        this.total.set(res.total);
        this.offset.set(off);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: (err) => {
        console.error('[GroupDetail] Error:', err);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  showMore() { this.loadContent(this.offset() + this.PAGE_SIZE); }

  isSelected(id: string | number): boolean { return this.selectedIds().has(String(id)); }

  toggleItem(id: string | number) {
    const key = String(id);
    const set = new Set(this.selectedIds());
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this.selectedIds.set(set);
  }

  toggleAll() {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.items().map(i => String(i.id))));
    }
  }

  typeIcon(type: string): string {
    const icons: Record<string, string> = {
      video: '🎬', image: '🖼️', pdf: '📄', chat: '💬', other: '📎',
    };
    return icons[type] ?? '📎';
  }

  formatSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

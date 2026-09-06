import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { GroupDetailComponent } from './group-detail/group-detail';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'group/:groupId', component: GroupDetailComponent },
];

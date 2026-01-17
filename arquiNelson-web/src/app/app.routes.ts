import { Routes } from '@angular/router';
import { ProjectDetailComponent } from './components/project-detail/project-detail';
import { HomeComponent } from './components/home/home.component';
import { ProjectListComponent } from './components/project-list/project-list.component';
import { AdminLoginComponent } from './admin/admin-login/admin-login.component';
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { AdminContentComponent } from './admin/admin-content/admin-content.component';
import { AdminContentDetailComponent } from './admin/admin-content-detail/admin-content-detail.component';
import { AdminProjectsComponent } from './admin/admin-projects/admin-projects.component';
import { AdminProjectDetailComponent } from './admin/admin-project-detail/admin-project-detail.component';
import { AdminProjectCreateComponent } from './admin/admin-project-create/admin-project-create.component';
import { AdminPortfolioComponent } from './admin/admin-portfolio/admin-portfolio.component';
import { AdminQuotesComponent } from './admin/admin-quotes/admin-quotes.component';
import { AdminQuoteCreateComponent } from './admin/admin-quote-create/admin-quote-create.component';
import { AdminQuoteDetailComponent } from './admin/admin-quote-detail/admin-quote-detail.component';
import { AdminServicesComponent } from './admin/admin-services/admin-services.component';
import { AdminUsersComponent } from './admin/admin-users/admin-users.component';
import { adminAuthGuard } from './services/admin-guard';

export const routes: Routes = [
  { path: 'admin/login', component: AdminLoginComponent },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminAuthGuard],
    canActivateChild: [adminAuthGuard],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'content', component: AdminContentComponent },
      { path: 'content/:id', component: AdminContentDetailComponent },
      { path: 'projects', component: AdminProjectsComponent },
      { path: 'projects/new', component: AdminProjectCreateComponent },
      { path: 'projects/:id', component: AdminProjectDetailComponent },
      { path: 'portfolio', component: AdminPortfolioComponent },
      { path: 'quotes', component: AdminQuotesComponent },
      { path: 'quotes/new', component: AdminQuoteCreateComponent },
      { path: 'quotes/:id', component: AdminQuoteDetailComponent },
      { path: 'services', component: AdminServicesComponent },
      { path: 'users', component: AdminUsersComponent }
    ]
  },
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'projects', component: ProjectListComponent },
  { path: 'project/:id', component: ProjectDetailComponent },
  { path: '**', redirectTo: '' }
];

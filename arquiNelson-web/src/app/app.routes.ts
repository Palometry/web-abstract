import { Routes } from '@angular/router';
import { ProjectDetailComponent } from './components/project-detail/project-detail';
import { PortfolioDetailComponent } from './components/portfolio-detail/portfolio-detail.component';
import { HomeComponent } from './components/home/home.component';
import { ProjectListComponent } from './components/project-list/project-list.component';
import { AdminLoginComponent } from './admin/admin-login/admin-login.component';
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { AdminProjectsComponent } from './admin/admin-projects/admin-projects.component';
import { AdminProjectCreateComponent } from './admin/admin-project-create/admin-project-create.component';
import { AdminBlogComponent } from './admin/admin-blog/admin-blog.component';
import { AdminBlogDetailComponent } from './admin/admin-blog-detail/admin-blog-detail.component';
import { AdminQuotesComponent } from './admin/admin-quotes/admin-quotes.component';
import { AdminQuoteCreateComponent } from './admin/admin-quote-create/admin-quote-create.component';
import { AdminQuoteDetailComponent } from './admin/admin-quote-detail/admin-quote-detail.component';
import { AdminServicesComponent } from './admin/admin-services/admin-services.component';
import { AdminUsersComponent } from './admin/admin-users/admin-users.component';
import { adminAuthGuard } from './services/admin-guard';
import { BlogComponent } from './components/blog/blog.component';
import { BlogDetailComponent } from './components/blog-detail/blog-detail.component';
import { ServicesComponent } from './components/services/services.component';
import { ContactComponent } from './components/contact/contact.component';

export const routes: Routes = [
  { path: 'admin/login', component: AdminLoginComponent },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminAuthGuard],
    canActivateChild: [adminAuthGuard],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'projects', component: AdminProjectsComponent },
      { path: 'projects/new', component: AdminProjectCreateComponent },
      { path: 'projects/:id', component: AdminProjectCreateComponent },
      { path: 'blog', component: AdminBlogComponent },
      { path: 'blog/:id', component: AdminBlogDetailComponent },
      { path: 'quotes', component: AdminQuotesComponent },
      { path: 'quotes/new', component: AdminQuoteCreateComponent },
      { path: 'quotes/:id', component: AdminQuoteDetailComponent },
      { path: 'services', component: AdminServicesComponent },
      { path: 'users', component: AdminUsersComponent }
    ]
  },
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'about', redirectTo: 'blog', pathMatch: 'full' },
  { path: 'services', component: ServicesComponent, data: { standalonePage: true } },
  { path: 'contact', component: ContactComponent, data: { standalonePage: true } },
  { path: 'projects', component: ProjectListComponent },
  { path: 'project/:id', component: ProjectDetailComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'blog/:slug', component: BlogDetailComponent },
  { path: 'portfolio/:id', component: PortfolioDetailComponent },
  { path: '**', redirectTo: '' }
];

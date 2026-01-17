import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminDataService } from '../../services/admin-data';

@Component({
  selector: 'app-admin-project-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-project-create.component.html',
  styleUrls: ['./admin-project-create.component.scss']
})
export class AdminProjectCreateComponent {
  saving = false;
  error = '';

  draft = {
    name: '',
    clientName: '',
    address: '',
    description: '',
    status: 'draft',
    startDate: '',
    endDate: ''
  };

  constructor(private data: AdminDataService, private router: Router) {}

  async createProject() {
    const name = this.draft.name.trim();
    const clientName = this.draft.clientName.trim();
    const address = this.draft.address.trim();
    if (!name || !clientName || !address) {
      this.error = 'Nombre, cliente y direccion son obligatorios.';
      return;
    }
    this.saving = true;
    this.error = '';
    const result = await this.data.createProject({
      name,
      clientName,
      address,
      description: this.draft.description || null,
      status: this.draft.status,
      startDate: this.draft.startDate || null,
      endDate: this.draft.endDate || null
    });
    this.saving = false;
    if (!result.ok || !result.id) {
      this.error = result.error ?? 'No se pudo crear el proyecto.';
      return;
    }
    this.router.navigate(['/admin/projects', result.id]);
  }
}

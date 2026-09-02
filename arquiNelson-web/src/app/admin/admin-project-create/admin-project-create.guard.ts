import { CanDeactivateFn } from '@angular/router';
import { AdminProjectCreateComponent } from './admin-project-create.component';

export const pendingProjectChangesGuard: CanDeactivateFn<AdminProjectCreateComponent> = (
  component
) => component.canDeactivate();

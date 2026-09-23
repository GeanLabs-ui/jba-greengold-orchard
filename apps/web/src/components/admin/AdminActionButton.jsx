import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import './admin-action-button.css';

// A shared appearance for record actions, including links and menu items.
const AdminActionButton = React.forwardRef(function AdminActionButton({
  action = 'edit',
  label,
  as: Component = 'button',
  className = '',
  title,
  'aria-label': ariaLabel,
  ...props
}, ref) {
  const Icon = action === 'delete' ? Trash2 : Pencil;
  const accessibleLabel = ariaLabel || label || (action === 'delete' ? 'Delete' : 'Edit');
  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      {...props}
      ref={ref}
      className={`admin-action-icon ${className}`}
      data-admin-action={action}
      aria-label={accessibleLabel}
      title={title || accessibleLabel}
    >
      <Icon aria-hidden="true" />
    </Component>
  );
});

export default AdminActionButton;

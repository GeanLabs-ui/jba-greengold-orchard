import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AccountReviews() {
  return <Navigate replace to="/admin/inquiries?view=verification" />;
}

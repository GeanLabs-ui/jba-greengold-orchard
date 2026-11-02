import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import PageSkeleton from './PageSkeleton';

// Keep navigation and the surrounding workspace usable while a route chunk loads.
export default function RouteContent() {
  return <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>;
}

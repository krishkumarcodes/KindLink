'use client';

import React from 'react';
import { NotificationCenter, NotificationCenterProps } from '@/components/notifications/NotificationCenter';

export interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
  anchor?: 'bell' | 'dialog';
}

export function NotificationsModal({
  open,
  onClose,
  anchor = 'dialog',
}: NotificationsModalProps) {
  return <NotificationCenter open={open} onClose={onClose} anchor={anchor} />;
}

'use client';

import {
  EMPLOYEE_STATUS_LABELS,
  EmployeeStatus,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUS_LABELS,
  OrderPriority,
  OrderStatus,
  STEP_STATUS_LABELS,
  STOCK_STATUS_LABELS,
  StepStatus,
  StockStatus,
} from '@enshido/types';
import { Badge } from './ui';

const STATUS_TONE: Record<string, any> = {
  [OrderStatus.DRAFT]: 'slate',
  [OrderStatus.PENDING_CONFIRM]: 'slate',
  [OrderStatus.WAITING_PRODUCTION]: 'amber',
  [OrderStatus.IN_PRODUCTION]: 'blue',
  [OrderStatus.WAITING_QC]: 'purple',
  [OrderStatus.QC_FAILED]: 'red',
  [OrderStatus.NEEDS_REWORK]: 'red',
  [OrderStatus.PRODUCTION_DONE]: 'green',
  [OrderStatus.STOCKED]: 'green',
  [OrderStatus.DELIVERED]: 'green',
  [OrderStatus.COMPLETED]: 'green',
  [OrderStatus.CANCELLED]: 'slate',
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'slate'}>{ORDER_STATUS_LABELS[status as OrderStatus] ?? status}</Badge>;
}

const PRIORITY_TONE: Record<string, any> = {
  [OrderPriority.LOW]: 'slate',
  [OrderPriority.NORMAL]: 'blue',
  [OrderPriority.HIGH]: 'amber',
  [OrderPriority.URGENT]: 'red',
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge tone={PRIORITY_TONE[priority] ?? 'slate'}>
      {ORDER_PRIORITY_LABELS[priority as OrderPriority] ?? priority}
    </Badge>
  );
}

const STEP_TONE: Record<string, any> = {
  [StepStatus.NOT_STARTED]: 'slate',
  [StepStatus.ACCEPTED]: 'blue',
  [StepStatus.IN_PROGRESS]: 'blue',
  [StepStatus.DONE]: 'green',
  [StepStatus.ISSUE]: 'red',
  [StepStatus.NEEDS_REWORK]: 'red',
};

export function StepStatusBadge({ status }: { status: string }) {
  return <Badge tone={STEP_TONE[status] ?? 'slate'}>{STEP_STATUS_LABELS[status as StepStatus] ?? status}</Badge>;
}

const STOCK_TONE: Record<string, any> = {
  [StockStatus.NORMAL]: 'green',
  [StockStatus.LOW]: 'amber',
  [StockStatus.OUT]: 'red',
};

export function StockStatusBadge({ status }: { status: string }) {
  return <Badge tone={STOCK_TONE[status] ?? 'slate'}>{STOCK_STATUS_LABELS[status as StockStatus] ?? status}</Badge>;
}

const EMP_TONE: Record<string, any> = {
  [EmployeeStatus.ACTIVE]: 'green',
  [EmployeeStatus.ON_LEAVE]: 'amber',
  [EmployeeStatus.RESIGNED]: 'red',
};

export function EmployeeStatusBadge({ status }: { status: string }) {
  return <Badge tone={EMP_TONE[status] ?? 'slate'}>{EMPLOYEE_STATUS_LABELS[status as EmployeeStatus] ?? status}</Badge>;
}

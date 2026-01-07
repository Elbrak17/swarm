'use client';

import { JobStatus } from '@/lib/constants';

interface StatusFilterProps {
  value: JobStatus | null;
  onChange: (status: JobStatus | null) => void;
}

const statusOptions = [
  { value: null, label: 'All Status' },
  { value: JobStatus.OPEN, label: 'Open' },
  { value: JobStatus.ASSIGNED, label: 'Assigned' },
  { value: JobStatus.IN_PROGRESS, label: 'In Progress' },
  { value: JobStatus.COMPLETED, label: 'Completed' },
  { value: JobStatus.DISPUTED, label: 'Disputed' },
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Status:</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? (e.target.value as JobStatus) : null)}
        className="text-sm border rounded-md px-2 py-1 bg-background"
      >
        {statusOptions.map((option) => (
          <option key={option.label} value={option.value || ''}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

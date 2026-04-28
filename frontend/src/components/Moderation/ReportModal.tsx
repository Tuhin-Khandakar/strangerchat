'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const reasons = [
  'Inappropriate language or behavior',
  'Explicit content / CSAM',
  'Spam or advertising',
  'Harassment or bullying',
  'Underage (under 18)',
  'Other'
];

export function ReportModal({ isOpen, onClose, onSubmit }: ReportModalProps) {
  const [selected, setSelected] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Stranger" size="sm">
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          We take safety seriously. Please select a reason for reporting this user.
        </p>
        
        <div className="space-y-2">
          {reasons.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelected(reason)}
              className={`w-full text-left p-3 rounded-lg border transition-all text-sm font-medium ${
                selected === reason
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            fullWidth
            disabled={!selected}
            onClick={() => onSubmit(selected)}
          >
            Submit Report
          </Button>
        </div>
      </div>
    </Modal>
  );
}

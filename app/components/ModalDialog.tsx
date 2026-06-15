'use client';

import React from 'react';

interface ModalDialogProps {
  open: boolean;
  title?: string;
  message: string | React.ReactNode;
  promptValue?: string;
  promptPlaceholder?: string;
  onPromptChange?: (value: string) => void;
  primaryText: string;
  secondaryText?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  isDanger?: boolean;
  onClose?: () => void;
}

export function ModalDialog({
  open,
  title,
  message,
  promptValue,
  promptPlaceholder,
  onPromptChange,
  primaryText,
  secondaryText,
  onPrimary,
  onSecondary,
  isDanger = false,
  onClose,
}: ModalDialogProps) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: 24, position: 'relative' }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'transparent', color: '#8A8278', fontSize: 16, cursor: 'pointer' }}
            aria-label="閉じる"
          >
            ×
          </button>
        )}

        {title && <h2 style={{ margin: 0, marginBottom: 12, fontSize: 18, fontWeight: 800, color: '#2A2420' }}>{title}</h2>}
        <div style={{ fontSize: 14, lineHeight: 1.7, color: '#4B5563', whiteSpace: 'pre-wrap', marginBottom: promptValue !== undefined ? 16 : 24 }}>
          {message}
        </div>

        {promptValue !== undefined && onPromptChange && (
          <input
            type="text"
            value={promptValue}
            placeholder={promptPlaceholder}
            onChange={(e) => onPromptChange(e.target.value)}
            style={{ width: '100%', borderRadius: 14, border: '1px solid #E5E7EB', padding: '12px 14px', fontSize: 14, color: '#2A2420', marginBottom: 20, outline: 'none' }}
          />
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: secondaryText ? 'space-between' : 'flex-end', flexWrap: 'wrap' }}>
          {secondaryText && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              style={{ flex: 1, minWidth: 120, borderRadius: 16, border: '1px solid #E5E7EB', backgroundColor: '#F8FAFB', color: '#4B5563', fontWeight: 700, padding: '12px 14px', cursor: 'pointer' }}
            >
              {secondaryText}
            </button>
          )}
          <button
            type="button"
            onClick={onPrimary}
            style={{ flex: 1, minWidth: 120, borderRadius: 16, border: 'none', backgroundColor: isDanger ? '#D14343' : '#7CB88A', color: '#FFFFFF', fontWeight: 700, padding: '12px 14px', cursor: 'pointer' }}
          >
            {primaryText}
          </button>
        </div>
      </div>
    </div>
  );
}

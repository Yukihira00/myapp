'use client';

import { useRef, useState } from 'react';

export type AppModalType = 'alert' | 'confirm' | 'prompt';

export interface AppModalState {
  type: AppModalType;
  title?: string;
  message: string;
  primaryText: string;
  secondaryText?: string;
  isDanger?: boolean;
  promptValue?: string;
  promptPlaceholder?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export function useAppModal() {
  const [modal, setModal] = useState<AppModalState | null>(null);
  const promptValueRef = useRef<string>('');
  const promptResolverRef = useRef<((value: string | null) => void) | null>(null);

  const closeModal = () => {
    setModal(null);
    if (promptResolverRef.current) {
      promptResolverRef.current(null);
      promptResolverRef.current = null;
    }
  };

  const showAlert = (message: string, title?: string) =>
    new Promise<void>((resolve) => {
      setModal({
        type: 'alert',
        title,
        message,
        primaryText: 'OK',
        onPrimary: () => {
          setModal(null);
          resolve();
        },
      });
    });

  const showConfirm = (
    message: string,
    title = '確認',
    primaryText = 'はい',
    secondaryText = 'いいえ'
  ) =>
    new Promise<boolean>((resolve) => {
      setModal({
        type: 'confirm',
        title,
        message,
        primaryText,
        secondaryText,
        onPrimary: () => {
          setModal(null);
          resolve(true);
        },
        onSecondary: () => {
          setModal(null);
          resolve(false);
        },
      });
    });

  const showPrompt = (
    message: string,
    title = '入力',
    placeholder = '',
    initialValue = ''
  ) =>
    new Promise<string | null>((resolve) => {
      promptValueRef.current = initialValue;
      promptResolverRef.current = resolve;

      setModal({
        type: 'prompt',
        title,
        message,
        primaryText: '送信',
        secondaryText: 'キャンセル',
        promptValue: initialValue,
        promptPlaceholder: placeholder,
        onPrimary: () => {
          setModal(null);
          const value = promptValueRef.current ?? initialValue;
          promptResolverRef.current?.(value);
          promptResolverRef.current = null;
        },
        onSecondary: () => {
          setModal(null);
          promptResolverRef.current?.(null);
          promptResolverRef.current = null;
        },
      });
    });

  const handlePromptChange = (value: string) => {
    promptValueRef.current = value;
    setModal((prev) => (prev ? { ...prev, promptValue: value } : prev));
  };

  return { modal, showAlert, showConfirm, showPrompt, closeModal, handlePromptChange };
}

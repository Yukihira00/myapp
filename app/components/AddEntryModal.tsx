'use client';

interface MedicationMaster {
  id: string;
  name: string;
  default_amount: number;
}

interface AddEntryModalProps {
  onClose: () => void;
  logDateTime: string;
  onLogDateTimeChange: (value: string) => void;
  selectedScore: number | null;
  onSelectScore: (score: number) => void;
  medicationMaster: MedicationMaster[];
  selectedMedIds: string[];
  onToggleMedId: (id: string) => void;
  memo: string;
  onMemoChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function AddEntryModal({
  onClose,
  logDateTime,
  onLogDateTimeChange,
  selectedScore,
  onSelectScore,
  medicationMaster,
  selectedMedIds,
  onToggleMedId,
  memo,
  onMemoChange,
  onSubmit,
  isSubmitting,
}: AddEntryModalProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2A2420', margin: 0 }}>いまの気分は？</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8A8278', fontSize: 14, cursor: 'pointer' }}>キャンセル</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6B5840', marginBottom: 6, display: 'block' }}>記録日時</label>
          <input type="datetime-local" value={logDateTime} onChange={(e) => onLogDateTimeChange(e.target.value)} style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E7EB', padding: 10, fontSize: 13, outline: 'none', color: '#2A2420' }} required />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6B5840', marginBottom: 6, display: 'block' }}>感情スコア（必須）</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {[...Array(10)].map((_, i) => {
              const score = i + 1;
              const isScoreSelected = selectedScore === score;
              return (
                <button key={score} onClick={() => onSelectScore(score)} style={{ height: 40, borderRadius: 12, fontWeight: 'bold', fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: isScoreSelected ? '#7CB88A' : '#F3F4F6', color: isScoreSelected ? '#FFFFFF' : '#4B5563' }}>
                  {score}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6B5840', marginBottom: 6, display: 'block' }}>服薬チェック（任意）</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {medicationMaster.length === 0 ? (
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>常備薬の登録がありません。</span>
            ) : (
              medicationMaster.map((med) => {
                const isMedSelected = selectedMedIds.includes(med.id);
                return (
                  <button key={med.id} onClick={() => onToggleMedId(med.id)} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', backgroundColor: isMedSelected ? '#5A8EE3' : '#F3F4F6', color: isMedSelected ? '#FFFFFF' : '#4B5563' }}>
                    {med.name}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6B5840', marginBottom: 6, display: 'block' }}>メモ（任意）</label>
          <textarea value={memo} onChange={(e) => onMemoChange(e.target.value)} maxLength={500} placeholder="何があった？" style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E7EB', padding: 10, fontSize: 13, outline: 'none', resize: 'none', color: '#2A2420' }} rows={3} />
        </div>

        <button onClick={onSubmit} disabled={isSubmitting} style={{ width: '100%', padding: '12px 0', borderRadius: 12, backgroundColor: '#7CB88A', border: 'none', fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 10px rgba(124,184,138,0.3)' }}>
          {isSubmitting ? '同期中...' : '保存して同期'}
        </button>
      </div>
    </div>
  );
}
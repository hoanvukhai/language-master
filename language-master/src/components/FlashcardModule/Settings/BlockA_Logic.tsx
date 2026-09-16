// src/components/FlashcardModule/Settings/BlockA_Logic.tsx
import { useFlashcardSettings } from '../../../context/features/flashcard/useFlashcardSettings';
import { useSettings } from '../../../context/global/useSettings';
import type { FormType } from '../../../context/features/flashcard/FlashcardSettingsContext';
import { FORM_REGISTRY } from '../../../lib/formRegistry';
import type { FormDefinition } from '../../../lib/formRegistry';
import { Database, Target, Filter, Layers, CheckSquare, BookA } from 'lucide-react';
import type { WordType } from '../../../types';

const FORM_GROUPS = [
  {
    group: 'special',
    labelVi: '✨ Đặc biệt',
    labelEn: '✨ Special',
    color: 'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300',
  },
  {
    group: 'futsukei',
    labelVi: '📘 Thể Thông Thường',
    labelEn: '📘 Plain Forms',
    color: 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300',
  },
  {
    group: 'advanced',
    labelVi: '🚀 Thể Nâng Cao',
    labelEn: '🚀 Advanced Forms',
    color: 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-300',
  },
  {
    group: 'keigo',
    labelVi: '🎩 Thể Lịch Sự',
    labelEn: '🎩 Polite Forms',
    color: 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300',
  },
  {
    group: 'other',
    labelVi: '🔧 Thể Khác',
    labelEn: '🔧 Other',
    color: 'bg-gray-50 border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300',
  },
];

const WORD_TYPES: { id: WordType, labelVi: string, labelEn: string }[] = [
  { id: 'verb', labelVi: 'Động từ', labelEn: 'Verbs' },
  { id: 'adj_i', labelVi: 'Tính từ đuôi い', labelEn: 'i-Adjectives' },
  { id: 'adj_na', labelVi: 'Tính từ đuôi な', labelEn: 'na-Adjectives' },
  { id: 'noun', labelVi: 'Danh từ', labelEn: 'Nouns' },
];

export default function BlockA_Logic() {
  const { settings, updateSettings } = useFlashcardSettings();
  const { language } = useSettings();
  const limit = settings.limit || 'all';
  const levels = settings.levels?.length ? settings.levels : ['N5'];
  const wordTypes = settings.wordTypes || ['verb', 'adj_i', 'adj_na', 'noun'];
  const sourceForm = settings.sourceForm || 'jisho';
  const sourceForms = settings.sourceForms ?? [];
  const targetForms = settings.targetForms || ['te'];
  const playMode = settings.playMode || 'endless';
  const displayLogic = settings.displayLogic || 'mixed';

  const t = language === 'en'
    ? {
      scopeTitle: 'Study Scope',
      allCards: 'All cards',
      cardsUnit: ' cards',
      endlessTip: '*Endless mode browses infinitely through all cards at the selected level.',
      wordscopeTitle: 'Word Types',
      frontTitle: 'Front Side – Question (multi-select = random from list)',
      backTitle: 'Back Side – Answer',
      queryTitle: 'Card Logic',
      mixedTitle: 'Combined',
      mixedDesc: '1 card carries all forms. The back shows the full list.',
      focusedTitle: 'Split (Cross-multiply)',
      focusedDesc: 'Splits into multiple cards. Each card tests only 1 form.',
      randomFront: 'Random (from selected)',
    }
    : {
      scopeTitle: 'Phạm Vi Ôn Tập',
      allCards: 'Toàn bộ thẻ',
      cardsUnit: ' thẻ',
      endlessTip: '*Endless sẽ lướt vô tận qua toàn bộ kho từ của cấp độ đã chọn.',
      wordscopeTitle: 'Loại Từ Thể Hiện',
      frontTitle: 'Mặt Trước – Hỏi (chọn nhiều = random trong danh sách)',
      backTitle: 'Mặt Sau – Đáp Án',
      queryTitle: 'Kiểu Hỏi (Logic Thẻ)',
      mixedTitle: 'Tổng Hợp',
      mixedDesc: '1 thẻ gánh tất cả thể. Mặt sau hiện danh sách đầy đủ.',
      focusedTitle: 'Tách Lẻ (Nhân chéo)',
      focusedDesc: 'Xé nhỏ thành nhiều thẻ. Mỗi thẻ chỉ kiểm tra 1 thể.',
      randomFront: 'Random (trong danh sách chọn)',
    };

  const isWordTypeLocked = (type: WordType) => {
    if (!wordTypes.includes(type)) return false;
    if (wordTypes.length === 1) return true;
    const proposedWordTypes = wordTypes.filter(t => t !== type);
    return targetForms.some(fId => {
      if (fId === 'random') return false;
      const fDef = FORM_REGISTRY.find(f => f.id === fId);
      if (!fDef || !fDef.validTypes) return false;
      return !fDef.validTypes.some(vt => proposedWordTypes.includes(vt));
    });
  };

  const isWordTypeSupported = (type: WordType) => {
    if (targetForms.length === 0 || targetForms.includes('random')) return true;
    return targetForms.some(fId => {
      const fDef = FORM_REGISTRY.find(f => f.id === fId);
      if (!fDef || !fDef.validTypes) return true;
      return fDef.validTypes.includes(type);
    });
  };

  const isFormCompatible = (formId: string) => {
    if (formId === 'random') return true;
    const fDef = FORM_REGISTRY.find(f => f.id === formId);
    if (!fDef || !fDef.validTypes) return true;
    return fDef.validTypes.some(vt => wordTypes.includes(vt));
  };

  const toggleLevel = (lvl: string) => {
    if (levels.includes(lvl) && levels.length > 1) updateSettings({ levels: levels.filter(l => l !== lvl) });
    else if (!levels.includes(lvl)) updateSettings({ levels: [...levels, lvl] });
  };

  const toggleWordType = (type: WordType) => {
    if (wordTypes.includes(type)) {
      if (isWordTypeLocked(type)) return;
      updateSettings({ wordTypes: wordTypes.filter(t => t !== type) });
    } else {
      updateSettings({ wordTypes: [...wordTypes, type] });
    }
  };

  const toggleTargetForm = (form: FormType) => {
    if (form === 'random') {
      if (targetForms.includes('random')) updateSettings({ targetForms: [] }); // Or fallback to default?
      else updateSettings({ targetForms: ['random'] });
      return;
    }

    if (targetForms.includes('random')) {
      updateSettings({ targetForms: [form] });
      return;
    }

    if (targetForms.includes(form) && targetForms.length > 1) {
      updateSettings({ targetForms: targetForms.filter(f => f !== form) });
    } else if (!targetForms.includes(form)) {
      updateSettings({ targetForms: [...targetForms, form] });
    }
  };

  const toggleTargetGroup = (groupForms: FormDefinition[], isAllSelected: boolean) => {
    const ids = groupForms.map(f => f.id as FormType).filter(id => id !== 'random' && id !== sourceForm && isFormCompatible(id));
    if (isAllSelected) {
      // Don't unselect if doing so breaks limit > 0
      const remaining = targetForms.filter(f => !ids.includes(f));
      if (remaining.length === 0) return; // Prevent 0 target forms
      updateSettings({ targetForms: remaining });
    } else {
      const newTargets: FormType[] = targetForms.filter(f => f !== 'random'); // Wiping random if present
      ids.forEach(id => { if (!newTargets.includes(id)) newTargets.push(id); });
      updateSettings({ targetForms: newTargets });
    }
  };

  return (
    <div className="space-y-6 mb-6 pb-6 border-b border-gray-100 dark:border-slate-700">

      {/* 1. STUDY SCOPE */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Filter size={14} /> {t.scopeTitle}
        </h3>
        <div className="flex flex-wrap gap-3">
          {playMode === 'quiz' && (
            <select
              value={limit}
              onChange={(e) => updateSettings({ limit: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
              className="flex-1 min-w-[110px] bg-slate-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-lg p-2.5 outline-none font-medium text-sm"
            >
              <option value="all">{t.allCards}</option>
              <option value={10}>10{t.cardsUnit}</option>
              <option value={20}>20{t.cardsUnit}</option>
              <option value={50}>50{t.cardsUnit}</option>
            </select>
          )}
          <div className="flex gap-2">
            {['N5', 'N4', 'N3'].map(lvl => (
              <button
                key={lvl}
                onClick={() => toggleLevel(lvl)}
                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${levels.includes(lvl)
                  ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-600'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500'
                  }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
        {playMode === 'endless' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-2">{t.endlessTip}</p>
        )}
      </div>

      {/* 2. WORD TYPES */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookA size={14} /> {t.wordscopeTitle}
        </h3>
        <div className="flex flex-wrap gap-2">
          {WORD_TYPES.map(wType => {
            const isSupported = isWordTypeSupported(wType.id);
            const isSelected = wordTypes.includes(wType.id) && isSupported;
            const isLocked = isWordTypeLocked(wType.id);
            const isDisabled = !isSupported;

            return (
              <button
                key={wType.id}
                disabled={isDisabled || isLocked}
                onClick={() => toggleWordType(wType.id)}
                title={isDisabled ? (language === 'en' ? 'Not supported by selected target forms' : 'Không mượt tác với các thẻ đã chọn') : ''}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isDisabled
                    ? 'opacity-40 bg-gray-100 dark:bg-slate-800 cursor-not-allowed border-gray-200 dark:border-slate-700 dark:text-gray-400'
                    : isSelected
                      ? 'bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-600'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 hover:border-purple-300'
                  } ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
              >
                {isSelected && <CheckSquare size={12} className="opacity-70" />}
                {language === 'en' ? wType.labelEn : wType.labelVi}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FRONT SIDE – multi-select chip */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Database size={14} /> {t.frontTitle}
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => updateSettings({ sourceForms: FORM_REGISTRY.map(f => f.id) as any })}
              className="text-[10px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {language === 'en' ? 'Select All' : 'Chọn tất cả'}
            </button>
            <button 
              onClick={() => updateSettings({ sourceForms: ['dictionary'] as any })}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {language === 'en' ? 'Reset' : 'Mặc định'}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mb-2">
          {language === 'en'
            ? 'Check multiple to randomly pick 1 per card.'
            : 'Tích nhiều để mỗi thẻ random 1 thể từ danh sách.'}
        </p>
        {FORM_GROUPS.map(grp => {
          const formsInGroup = FORM_REGISTRY.filter(f => f.group === grp.group);
          if (formsInGroup.length === 0) return null;
          return (
            <div key={grp.group} className="mb-2">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mb-1">
                {language === 'en' ? grp.labelEn : grp.labelVi}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {formsInGroup.map(opt => {
                  // Multi-select mode: track via sourceForms
                  // If sourceForms is empty, sourceForm (legacy) is selected
                  const isInMulti = sourceForms.includes(opt.id as FormType);
                  const isLegacySelected = sourceForms.length === 0 && opt.id === sourceForm;
                  const isSelected = isInMulti || isLegacySelected;
                  return (
                    <button
                      key={`src-${opt.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const id = opt.id as FormType;
                        if (sourceForms.length === 0) {
                          // Chuyển từ legacy → multi: add cả 2 lên (trừ khi click chính sourceForm cũ)
                          if (id === sourceForm) {
                            // Bắt đầu multi với chỉ mình nó
                            updateSettings({ sourceForms: [id], sourceForm: id });
                          } else {
                            updateSettings({ sourceForms: [sourceForm as FormType, id], sourceForm: id });
                          }
                        } else if (isInMulti) {
                          const next = sourceForms.filter(f => f !== id);
                          if (next.length === 0) {
                            // Reset về single
                            updateSettings({ sourceForms: [], sourceForm: id });
                          } else {
                            updateSettings({ sourceForms: next, sourceForm: next[0] });
                          }
                        } else {
                          updateSettings({ sourceForms: [...sourceForms, id] });
                        }
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-emerald-300'
                      }`}
                    >
                      {language === 'en' ? opt.labelEn : opt.label}
                      {sourceForms.length > 1 && isInMulti && (
                        <span className="ml-1 text-[9px] opacity-60">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {sourceForms.length > 1 && (
          <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            ✨ {sourceForms.length} {language === 'en' ? 'forms selected – each card picks 1 randomly' : 'thể đang chọn – mỗi thẻ random 1 thể'}
          </p>
        )}
      </div>

      {/* 4. BACK SIDE */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target size={14} /> {t.backTitle}
        </h3>

        {FORM_GROUPS.map(grp => {
          const formsInGroup = FORM_REGISTRY.filter(f => f.group === grp.group);
          if (formsInGroup.length === 0) return null;

          const selectableForms = formsInGroup.filter(f => f.id !== 'random' && f.id !== sourceForm && isFormCompatible(f.id));
          const isAllSelected = selectableForms.length > 0 && selectableForms.every(f => targetForms.includes(f.id as FormType));
          const canSelectAll = selectableForms.length > 1;

          return (
            <div key={grp.group} className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {language === 'en' ? grp.labelEn : grp.labelVi}
                </p>
                {canSelectAll && (
                  <button
                    onClick={() => toggleTargetGroup(formsInGroup, isAllSelected)}
                    className="text-[10px] uppercase font-bold text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <CheckSquare size={10} />
                    {isAllSelected ? (language === 'en' ? 'Deselect All' : 'Bỏ chọn hết') : (language === 'en' ? 'Select All' : 'Chọn tất cả')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {formsInGroup.map(opt => {
                  const isSelected = targetForms.includes(opt.id as FormType);
                  const isCompatible = isFormCompatible(opt.id);
                  const isDisabled = (opt.id !== 'random' && opt.id === sourceForm) || !isCompatible;
                  return (
                    <button
                      key={`tgt-${opt.id}`}
                      disabled={isDisabled}
                      onClick={() => toggleTargetForm(opt.id as FormType)}
                      title={!isCompatible ? (language === 'en' ? 'Incompatible word types selected' : 'Loại từ hiện đại không hỗ trợ') : ''}
                      className={`p-2 rounded-lg text-xs font-medium border text-left transition-colors leading-tight ${isDisabled
                        ? 'opacity-40 bg-gray-100 dark:bg-slate-800 cursor-not-allowed border-gray-200 dark:border-slate-700 dark:text-white'
                        : isSelected
                          ? 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                        }`}
                    >
                      {language === 'en' ? opt.labelEn : opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. CARD LOGIC (only when >= 2 target forms) */}
      {targetForms.length > 1 && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers size={14} /> {t.queryTitle}
          </h3>
          <div className="space-y-2">
            {[
              { value: 'mixed', icon: '🗂️', title: t.mixedTitle, desc: t.mixedDesc },
              { value: 'focused', icon: '🔍', title: t.focusedTitle, desc: t.focusedDesc },
            ].map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${displayLogic === opt.value
                  ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-700'
                  : 'border-gray-200 dark:border-slate-700 hover:border-indigo-200'
                  }`}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  checked={displayLogic === opt.value}
                  onChange={() => updateSettings({ displayLogic: opt.value as 'focused' | 'mixed' })}
                />
                <div>
                  <p className={`font-bold text-sm ${displayLogic === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {opt.icon} {opt.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
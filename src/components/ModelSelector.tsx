import { useState } from 'react';
import { ChevronDown, Check, Sparkles, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export interface MiraModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
}

export const MIRA_MODELS: MiraModel[] = [
  {
    id: 'auto',
    name: 'auto',
    displayName: 'Mira ස්වයංක්‍රීය (Auto)',
    description: 'Llama 3.3 70B - හොඳම ආකෘතිය',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'gemini-2.0-flash',
    displayName: 'Mira වේග',
    description: 'Llama 3.3 70B - වේගවත් සහ කාර්යක්ෂම',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    displayName: 'Mira තේජස්',
    description: 'Llama 3.3 70B - වැඩි නිරවද්‍යතාවය',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'gemini-2.5-flash-lite',
    displayName: 'Mira ලඝු',
    description: 'Llama 3.1 8B - අතිශය වේගවත්',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'gemini-2.5-pro',
    displayName: 'Mira ප්‍රභූ',
    description: 'Llama 3.3 70B - උසස් ගුණත්වය',
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'gemini-2.0-flash-exp',
    displayName: 'Mira අත්හදා',
    description: 'Llama 3.3 70B - පර්යේෂණාත්මක',
  },
  {
    id: 'gemini-2.0-flash-thinking-exp',
    name: 'gemini-2.0-flash-thinking-exp',
    displayName: 'Mira චින්තන (Thinking)',
    description: 'DeepSeek R1 - ගැඹුරු චින්තනය',
  },
  {
    id: 'learnlm-2.0-flash-experimental',
    name: 'learnlm-2.0-flash-experimental',
    displayName: 'Mira ඉගෙනුම් (LearnLM)',
    description: 'Llama 3.1 70B - අධ්‍යාපනික',
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isPremium } = useAuth();

  const currentModel = MIRA_MODELS.find(m => m.id === selectedModel) || MIRA_MODELS[0];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-2 h-auto rounded-lg",
          "bg-[#161b22] hover:bg-[#21262d] border border-[#30363d]",
          "text-[#c9d1d9] hover:text-orange-400 transition-all",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Sparkles className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium">{currentModel.displayName}</span>
        <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
            <div className="py-1">
              {MIRA_MODELS.map((model) => {
                const isLocked = !isPremium && model.id !== 'auto';

                return (
                  <button
                    key={model.id}
                    disabled={isLocked}
                    onClick={() => {
                      if (!isLocked) {
                        onModelChange(model.id);
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 transition-all text-left",
                      isLocked
                        ? "opacity-50 cursor-not-allowed bg-black/20"
                        : "hover:bg-[#21262d]",
                      selectedModel === model.id
                        ? "bg-orange-500/10 text-orange-400"
                        : "text-[#c9d1d9]"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium block">{model.displayName}</span>
                        {isLocked && <Lock className="w-3 h-3 text-gray-500" />}
                      </div>
                      <span className="text-xs text-[#8b949e]">{model.description}</span>
                    </div>
                    {selectedModel === model.id && (
                      <Check className="w-4 h-4 text-orange-400" />
                    )}
                    {isLocked && <span className="text-[10px] text-orange-400 font-medium">Upgrade</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

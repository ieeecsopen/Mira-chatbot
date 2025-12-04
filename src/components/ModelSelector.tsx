import { useState } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export interface MiraModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
}

export const MIRA_MODELS: MiraModel[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'gemini-2.0-flash',
    displayName: 'Mira වේග',
    description: 'වේගවත් සහ කාර්යක්ෂම',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    displayName: 'Mira තේජස්',
    description: 'වැඩි නිරවද්‍යතාවය',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'gemini-2.5-flash-lite',
    displayName: 'Mira ලඝු',
    description: 'සැහැල්ලු',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'gemini-2.5-pro',
    displayName: 'Mira ප්‍රභූ',
    description: 'උසස් ගුණත්වය',
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'gemini-2.0-flash-exp',
    displayName: 'Mira අත්හදා',
    description: 'පර්යේෂණාත්මක',
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

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

          <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="py-1">
              {MIRA_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 transition-all",
                    "hover:bg-[#21262d] text-left",
                    selectedModel === model.id ? "bg-orange-500/10 text-orange-400" : "text-[#c9d1d9]"
                  )}
                >
                  <div>
                    <span className="text-sm font-medium block">{model.displayName}</span>
                    <span className="text-xs text-[#8b949e]">{model.description}</span>
                  </div>
                  {selectedModel === model.id && (
                    <Check className="w-4 h-4 text-orange-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
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
          "flex items-center gap-2 px-4 py-2 h-auto rounded-lg",
          "bg-black/50 hover:bg-black/70 border border-orange-500/20",
          "text-gray-400 hover:text-orange-400 transition-all",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Sparkles className="w-5 h-5 text-orange-500" />
        <span className="text-base font-medium">{currentModel.displayName}</span>
        <ChevronDown className={cn("w-4 h-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-black border border-orange-500/20 rounded-lg shadow-xl z-50 overflow-hidden">
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
                    "hover:bg-orange-500/10 text-left",
                    selectedModel === model.id ? "bg-orange-500/10 text-orange-400" : "text-gray-400"
                  )}
                >
                  <div>
                    <span className="text-base font-medium block">{model.displayName}</span>
                    <span className="text-sm text-gray-600">{model.description}</span>
                  </div>
                  {selectedModel === model.id && (
                    <Check className="w-5 h-5 text-orange-500" />
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

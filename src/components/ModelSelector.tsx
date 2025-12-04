import React, { useState } from 'react';
import { ChevronDown, Zap, Sparkles, Crown, FlaskConical, Check } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export interface MiraModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'fast' | 'balanced' | 'quality' | 'experimental';
  icon: React.ReactNode;
}

export const MIRA_MODELS: MiraModel[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'gemini-2.0-flash',
    displayName: 'Mira Flash',
    description: 'Fast and efficient for everyday tasks',
    category: 'balanced',
    icon: <Zap className="w-4 h-4" />
  },
  {
    id: 'gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    displayName: 'Mira Flash 2.5',
    description: 'Enhanced speed with better accuracy',
    category: 'balanced',
    icon: <Sparkles className="w-4 h-4" />
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'gemini-2.5-flash-lite',
    displayName: 'Mira Lite',
    description: 'Lightweight and quick responses',
    category: 'fast',
    icon: <Zap className="w-4 h-4" />
  },
  {
    id: 'gemini-2.5-pro',
    name: 'gemini-2.5-pro',
    displayName: 'Mira Pro',
    description: 'Best quality for complex tasks',
    category: 'quality',
    icon: <Crown className="w-4 h-4" />
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'gemini-2.0-flash-exp',
    displayName: 'Mira Experimental',
    description: 'Latest features and improvements',
    category: 'experimental',
    icon: <FlaskConical className="w-4 h-4" />
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fast': return 'text-green-400';
      case 'balanced': return 'text-blue-400';
      case 'quality': return 'text-purple-400';
      case 'experimental': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'fast': return 'bg-green-500/10';
      case 'balanced': return 'bg-blue-500/10';
      case 'quality': return 'bg-purple-500/10';
      case 'experimental': return 'bg-orange-500/10';
      default: return 'bg-gray-500/10';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-2 h-auto rounded-xl",
          "bg-white/5 hover:bg-white/10 border border-white/10",
          "text-gray-300 hover:text-white transition-all",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn("p-1 rounded-lg", getCategoryBg(currentModel.category), getCategoryColor(currentModel.category))}>
          {currentModel.icon}
        </span>
        <span className="text-sm font-medium">{currentModel.displayName}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wider">
                Select Model
              </div>
              
              {MIRA_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg transition-all",
                    "hover:bg-white/5 text-left",
                    selectedModel === model.id && "bg-orange-500/10"
                  )}
                >
                  <span className={cn(
                    "p-2 rounded-lg mt-0.5",
                    getCategoryBg(model.category),
                    getCategoryColor(model.category)
                  )}>
                    {model.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{model.displayName}</span>
                      {selectedModel === model.id && (
                        <Check className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                    <span className={cn(
                      "inline-block text-xs mt-1 px-2 py-0.5 rounded-full",
                      getCategoryBg(model.category),
                      getCategoryColor(model.category)
                    )}>
                      {model.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

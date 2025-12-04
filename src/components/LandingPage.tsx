import RuixenMoonChat from './ui/ruixen-moon-chat';

interface LandingPageProps {
    onStartChat: (message: string) => void;
    selectedModel: string;
    onModelChange: (modelId: string) => void;
}

export function LandingPage({ onStartChat, selectedModel, onModelChange }: LandingPageProps) {
    return (
        <RuixenMoonChat
            onStartChat={onStartChat}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
        />
    );
}

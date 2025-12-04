import React from 'react';
import { Settings, Sparkles, Mic, Globe, Image, Users, ChevronDown, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface LandingPageProps {
    onStartChat: (message: string) => void;
}

export function LandingPage({ onStartChat }: LandingPageProps) {
    const [inputValue, setInputValue] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onStartChat(inputValue);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background text-white overflow-hidden font-sans relative selection:bg-orange-500/30">
            {/* Subtle Background Gradients - Orange Theme */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none opacity-20" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-red-900/5 rounded-full blur-[100px] pointer-events-none opacity-20" />

            {/* Header */}
            <header className="flex items-center justify-between px-8 py-6 relative z-10">
                <div className="flex items-center">
                    <Sparkles className="w-10 h-10 text-orange-500" strokeWidth={1.5} />
                </div>
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5 text-gray-400 hover:text-white">
                        <Settings className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" className="text-base font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-full px-6">
                        Sign in
                    </Button>
                    <Button className="text-base font-medium bg-white text-black hover:bg-gray-100 rounded-full px-6 shadow-[0_0_20px_rgba(255,165,0,0.1)]">
                        Sign up
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-20 relative z-10">
                {/* Logo */}
                <div className="flex items-center gap-4 mb-16 relative group cursor-default">
                    <div className="absolute inset-0 bg-orange-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <Sparkles className="w-16 h-16 text-orange-500 relative z-10" strokeWidth={1.5} />
                    <h1 className="text-7xl font-bold tracking-tight relative z-10 bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">Mira</h1>
                </div>

                {/* Search Bar */}
                <div className="w-full max-w-3xl relative mb-12 group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors duration-300">
                            <Search className="w-6 h-6" />
                        </div>
                        <Input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="What do you want to know?"
                            className="w-full h-16 bg-[#09090b]/80 backdrop-blur-xl text-white text-xl placeholder-gray-500 rounded-2xl pl-16 pr-40 border-white/5 focus-visible:ring-orange-500/30 focus-visible:border-orange-500/30 transition-all duration-300 shadow-2xl"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                            <Button variant="ghost" size="sm" type="button" className="flex items-center gap-2 text-gray-500 hover:text-white hover:bg-white/5 h-10 px-3 rounded-xl">
                                <Sparkles className="w-4 h-4 text-orange-500" />
                                <span className="text-sm">Auto</span>
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button size="icon" type="button" className="bg-white/5 text-white/80 rounded-full hover:bg-white hover:text-black w-10 h-10 transition-all duration-300">
                                <Mic className="w-5 h-5" />
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Action Pills */}
                <div className="flex flex-wrap justify-center gap-4 mb-20">
                    {[
                        { icon: Globe, label: 'DeepSearch', color: 'text-blue-400' },
                        { icon: Image, label: 'Create Image', color: 'text-purple-400' },
                        { icon: Users, label: 'Pick Personas', color: 'text-green-400', hasDropdown: true },
                        { icon: Mic, label: 'Voice', color: 'text-red-400' }
                    ].map((action, index) => (
                        <Button
                            key={index}
                            variant="outline"
                            className="flex items-center gap-3 px-6 py-6 bg-[#111]/50 backdrop-blur-md hover:bg-[#222] rounded-full text-base text-gray-400 hover:text-white transition-all duration-200 border-white/5 hover:border-orange-500/20 group h-auto"
                        >
                            <action.icon className={`w-5 h-5 ${action.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                            {action.label}
                            {action.hasDropdown && <ChevronDown className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100" />}
                        </Button>
                    ))}
                </div>

                {/* Footer */}
                <div className="text-center text-gray-600 text-base">
                    <p>By messaging Mira, you agree to our <a href="#" className="underline hover:text-orange-500 transition-colors">Terms</a> and <a href="#" className="underline hover:text-orange-500 transition-colors">Privacy Policy</a>.</p>
                </div>
            </main>
        </div>
    );
}

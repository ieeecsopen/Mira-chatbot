import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface SplitPaneProps {
    children: [React.ReactNode, React.ReactNode];
    direction?: 'horizontal' | 'vertical';
    ratio: number; // 0-100
    onRatioChange: (ratio: number) => void;
    minRatio?: number;
    maxRatio?: number;
    className?: string;
}

export function SplitPane({
    children,
    direction = 'horizontal',
    ratio,
    onRatioChange,
    minRatio = 20,
    maxRatio = 80,
    className,
}: SplitPaneProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            let newRatio: number;

            if (direction === 'horizontal') {
                newRatio = ((e.clientX - rect.left) / rect.width) * 100;
            } else {
                newRatio = ((e.clientY - rect.top) / rect.height) * 100;
            }

            // Clamp to min/max
            newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));
            onRatioChange(newRatio);
        },
        [isDragging, direction, minRatio, maxRatio, onRatioChange]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDoubleClick = useCallback(() => {
        onRatioChange(50); // Reset to 50/50
    }, [onRatioChange]);

    // Global mouse event listeners
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            // Prevent text selection while dragging
            document.body.style.userSelect = 'none';
            document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp, direction]);

    const isHorizontal = direction === 'horizontal';

    return (
        <div
            ref={containerRef}
            className={cn(
                'flex h-full w-full overflow-hidden',
                isHorizontal ? 'flex-row' : 'flex-col',
                className
            )}
        >
            {/* First panel */}
            <div
                className="overflow-hidden"
                style={{
                    [isHorizontal ? 'width' : 'height']: `${ratio}%`,
                    flexShrink: 0,
                }}
            >
                {children[0]}
            </div>

            {/* Divider */}
            <div
                className={cn(
                    'group relative flex-shrink-0 transition-colors',
                    isHorizontal
                        ? 'w-1 cursor-col-resize hover:bg-blue-500/50'
                        : 'h-1 cursor-row-resize hover:bg-blue-500/50',
                    isDragging ? 'bg-blue-500' : 'bg-white/10'
                )}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                title="Drag to resize, double-click to reset"
            >
                {/* Drag handle indicator */}
                <div
                    className={cn(
                        'absolute opacity-0 group-hover:opacity-100 transition-opacity',
                        isHorizontal
                            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-blue-400'
                            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-8 rounded-full bg-blue-400'
                    )}
                />
            </div>

            {/* Second panel */}
            <div
                className="overflow-hidden flex-1"
                style={{
                    [isHorizontal ? 'width' : 'height']: `${100 - ratio}%`,
                }}
            >
                {children[1]}
            </div>
        </div>
    );
}

export default SplitPane;

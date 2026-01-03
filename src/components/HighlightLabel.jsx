import { memo, useMemo } from 'react';

/**
 * HighlightLabel - Highlights matching keywords in text
 */
function HighlightLabel({ className, keyword, children }) {
    const segments = useMemo(() => {
        if (!keyword?.trim() || !children) {
            return [{ text: children || '', isKeyword: false }];
        }

        try {
            const regex = new RegExp(keyword, 'ig');
            const text = String(children);
            const parts = [];
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                // Add text before match
                if (match.index > lastIndex) {
                    parts.push({
                        text: text.slice(lastIndex, match.index),
                        isKeyword: false,
                    });
                }
                // Add matched keyword
                parts.push({
                    text: match[0],
                    isKeyword: true,
                });
                lastIndex = match.index + match[0].length;
            }

            // Add remaining text
            if (lastIndex < text.length) {
                parts.push({
                    text: text.slice(lastIndex),
                    isKeyword: false,
                });
            }

            return parts.length > 0 ? parts : [{ text: children, isKeyword: false }];
        } catch {
            return [{ text: children || '', isKeyword: false }];
        }
    }, [keyword, children]);

    return (
        <div className={className}>
            {segments.map((segment, index) =>
                segment.isKeyword ? (
                    <span key={index} className="keyword">
                        {segment.text}
                    </span>
                ) : (
                    <span key={index}>{segment.text}</span>
                )
            )}
        </div>
    );
}

export default memo(HighlightLabel);

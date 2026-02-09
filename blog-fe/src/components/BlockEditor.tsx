import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import '../styles/BlockEditor.css';

export interface BlockEditorRef {
    insertImage: (url: string) => void;
    toggleBlockType: (type: BlockType) => void;
}

interface BlockEditorProps {
    initialContent: string;
    onChange: (content: string) => void;
}

export type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'bullet-list' | 'numbered-list' | 'image';

interface Block {
    id: string;
    type: BlockType;
    value: string; // Text content or Image URL
}

const IMG_REGEX = /(!\[.*?\]\(.*?\))/g;
const IMG_PARSE_REGEX = /!\[(.*?)\]\((.*?)\)/;

export const BlockEditor = forwardRef<BlockEditorRef, BlockEditorProps>(({ initialContent, onChange }, ref) => {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
    const [cursorPosition, setCursorPosition] = useState<number>(0);

    // Initialize blocks from markdown content
    useEffect(() => {
        if (!initialContent && blocks.length > 0) return;

        if (blocks.length === 0 && initialContent) {
            const parsed = parseMarkdown(initialContent);
            setBlocks(parsed);
        } else if (blocks.length === 0 && !initialContent) {
            setBlocks([{ id: generateId(), type: 'paragraph', value: '' }]);
        }
    }, [initialContent]);

    // Serialize changes
    useEffect(() => {
        if (blocks.length === 0) return;
        const markdown = blocks.map((b, index) => {
            switch (b.type) {
                case 'image': return `![image](${b.value})`;
                case 'h1': return `# ${b.value}`;
                case 'h2': return `## ${b.value}`;
                case 'h3': return `### ${b.value}`;
                case 'h4': return `#### ${b.value}`;
                case 'h5': return `##### ${b.value}`;
                case 'h6': return `###### ${b.value}`;
                case 'bullet-list': return `- ${b.value}`;
                case 'numbered-list': {
                    // Start calculating number properly for markdown
                    let count = 1;
                    for (let i = index - 1; i >= 0; i--) {
                        if (blocks[i].type === 'numbered-list') {
                            count++;
                        } else {
                            break;
                        }
                    }
                    return `${count}. ${b.value}`;
                }
                default: return b.value;
            }
        }).join('\n\n');
        onChange(markdown);
    }, [blocks, onChange]);

    useImperativeHandle(ref, () => ({
        insertImage: (url: string) => insertImageBlock(url),
        toggleBlockType: (type: BlockType) => {
            if (focusedBlockId) {
                updateBlockType(focusedBlockId, type);
            }
        }
    }));

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const parseMarkdown = (text: string): Block[] => {
        const parts = text.split(IMG_REGEX);
        const result: Block[] = [];
        parts.forEach(part => {
            if (!part) return;
            const imgMatch = part.match(IMG_PARSE_REGEX);
            if (imgMatch) {
                result.push({ id: generateId(), type: 'image', value: imgMatch[2] });
            } else {
                const lines = part.split('\n');
                lines.forEach(line => {
                    if (line.trim() === '') return;

                    let type: BlockType = 'paragraph';
                    let value = line;

                    if (line.startsWith('# ')) { type = 'h1'; value = line.substring(2); }
                    else if (line.startsWith('## ')) { type = 'h2'; value = line.substring(3); }
                    else if (line.startsWith('### ')) { type = 'h3'; value = line.substring(4); }
                    else if (line.startsWith('#### ')) { type = 'h4'; value = line.substring(5); }
                    else if (line.startsWith('##### ')) { type = 'h5'; value = line.substring(6); }
                    else if (line.startsWith('###### ')) { type = 'h6'; value = line.substring(7); }
                    else if (line.startsWith('- ') || line.startsWith('* ')) { type = 'bullet-list'; value = line.substring(2); }
                    else if (/^\d+\.\s/.test(line)) { type = 'numbered-list'; value = line.replace(/^\d+\.\s/, ''); }

                    result.push({ id: generateId(), type, value });
                });
            }
        });
        if (result.length === 0) result.push({ id: generateId(), type: 'paragraph', value: '' });
        return result;
    };

    const insertImageBlock = (url: string) => {
        const newBlock: Block = { id: generateId(), type: 'image', value: url };
        if (focusedBlockId) {
            const index = blocks.findIndex(b => b.id === focusedBlockId);
            if (index !== -1) {
                const newBlocks = [...blocks];
                newBlocks.splice(index + 1, 0, newBlock);
                newBlocks.splice(index + 2, 0, { id: generateId(), type: 'paragraph', value: '' });
                setBlocks(newBlocks);
                return;
            }
        }
        setBlocks(prev => [...prev, newBlock, { id: generateId(), type: 'paragraph', value: '' }]);
    };

    const updateBlock = (id: string, value: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, value } : b));
    };

    const updateBlockType = (id: string, type: BlockType) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, type } : b));
        // Keep focus
        setTimeout(() => document.getElementById(`block-${id}`)?.focus(), 0);
    };

    const removeBlock = (id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number, block: Block) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            // Logic for next block type
            let nextType: BlockType = 'paragraph';
            if (block.type === 'bullet-list') nextType = 'bullet-list';
            if (block.type === 'numbered-list') nextType = 'numbered-list';

            // If empty list item, break out of list
            if ((block.type === 'bullet-list' || block.type === 'numbered-list') && !block.value) {
                updateBlockType(block.id, 'paragraph');
                return;
            }

            const currentText = block.value;
            const before = currentText.substring(0, cursorPosition);
            const after = currentText.substring(cursorPosition);

            const newId = generateId();
            const newBlock: Block = { id: newId, type: nextType, value: after };

            setBlocks(prev => {
                const newBlocks = [...prev];
                newBlocks[index] = { ...block, value: before };
                newBlocks.splice(index + 1, 0, newBlock);
                return newBlocks;
            });

            setTimeout(() => {
                const el = document.getElementById(`block-${newId}`);
                if (el) el.focus();
            }, 0);
        } else if (e.key === 'Backspace') {
            if (cursorPosition === 0 && index > 0) {
                const prev = blocks[index - 1];
                if (prev.type !== 'image') {
                    e.preventDefault();
                    const currentText = block.value;
                    const prevText = prev.value;
                    const newCursorPos = prevText.length;

                    setBlocks(prevBlocks => {
                        const newBlocks = [...prevBlocks];
                        newBlocks[index - 1] = { ...prev, value: prevText + currentText };
                        newBlocks.splice(index, 1);
                        return newBlocks;
                    });

                    setTimeout(() => {
                        const el = document.getElementById(`block-${prev.id}`) as HTMLTextAreaElement;
                        if (el) {
                            el.focus();
                            el.setSelectionRange(newCursorPos, newCursorPos);
                        }
                    }, 0);
                }
            } else if (cursorPosition === 0 && (block.type === 'bullet-list' || block.type === 'numbered-list')) {
                // Backspace at start of list item -> convert to paragraph
                e.preventDefault();
                updateBlockType(block.id, 'paragraph');
            }
        }
    };

    const getPlaceholder = (type: BlockType, index: number, empty: boolean, isFocused: boolean) => {
        if (!empty) return "";
        if (index === 0 && blocks.length === 1) return "Start writing...";
        if (!isFocused) return "";
        if (type.startsWith('h')) return `Heading ${type.substring(1)}`;
        return "Type '/' for commands";
    }

    const getListNumber = (index: number) => {
        let count = 1;
        for (let i = index - 1; i >= 0; i--) {
            if (blocks[i].type === 'numbered-list') {
                count++;
            } else {
                break;
            }
        }
        return count;
    };

    return (
        <div className="block-editor">
            {blocks.map((block, index) => {
                if (block.type === 'image') {
                    return (
                        <div key={block.id} className="block-editor__block block-editor__image-container">
                            <img src={block.value} alt="Inserted content" className="block-editor__image" />
                            <button className="block-editor__image-remove" onClick={() => removeBlock(block.id)}>✕</button>
                        </div>
                    );
                }

                return (
                    <div key={block.id} className={`block-editor__block block-editor__block--${block.type}`}>
                        {block.type === 'bullet-list' && <span className="block-list-marker">•</span>}
                        {block.type === 'numbered-list' && (
                            <span className="block-list-marker">{getListNumber(index)}.</span>
                        )}

                        <TextareaAutosize
                            id={`block-${block.id}`}
                            value={block.value}
                            onChange={(val) => updateBlock(block.id, val)}
                            onKeyDown={(e) => handleKeyDown(e, index, block)}
                            onFocus={() => setFocusedBlockId(block.id)}
                            onSelect={(e: React.SyntheticEvent<HTMLTextAreaElement>) => setCursorPosition(e.currentTarget.selectionStart)}
                            placeholder={getPlaceholder(block.type, index, !block.value, focusedBlockId === block.id)}
                            className={`block-editor__input block-editor__input--${block.type}`}
                        />
                    </div>
                );
            })}

            <div
                className="block-editor__click-area"
                onClick={() => {
                    const last = blocks[blocks.length - 1];
                    if (last && last.type !== 'image') {
                        document.getElementById(`block-${last.id}`)?.focus();
                    } else {
                        const id = generateId();
                        setBlocks(prev => [...prev, { id, type: 'paragraph', value: '' }]);
                        setTimeout(() => document.getElementById(`block-${id}`)?.focus(), 0);
                    }
                }}
            />
        </div>
    );
});

interface TextareaProps {
    id: string;
    value: string;
    onChange: (val: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
    onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
    className: string;
}

const TextareaAutosize = ({ id, value, onChange, onKeyDown, onFocus, onSelect, placeholder, className }: TextareaProps) => {
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = ref.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={ref}
            id={id}
            className={className}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onSelect={onSelect}
            placeholder={placeholder}
            rows={1}
        />
    );
};

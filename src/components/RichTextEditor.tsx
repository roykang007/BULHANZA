import React, { useRef, useState, useEffect } from 'react';
import { 
  Type, CaseSensitive, Bold, Palette, Image as ImageIcon, 
  Upload, Link2, HelpCircle, Loader2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  onPaste?: (e: any) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onUploadImage?: (file: File) => Promise<string>;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onPaste,
  placeholder = '',
  rows = 10,
  className = '',
  onUploadImage
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastValueRef = useRef<string>(value);
  const isInitialMount = useRef(true);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePopover, setShowImagePopover] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  
  // Selection active style states
  const [selectionStyle, setSelectionStyle] = useState<{
    fontFamily: string;
    fontSize: string;
    color: string;
    bold: boolean;
    textAlign: string;
    text: string;
  } | null>(null);

  // Sync value from prop to editor HTML safely without resetting cursor
  useEffect(() => {
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      const shouldUpdate = 
        isInitialMount.current || 
        (value !== currentHTML && value !== lastValueRef.current);

      if (shouldUpdate) {
        editorRef.current.innerHTML = value;
        isInitialMount.current = false;
      }
    }
    lastValueRef.current = value;
  }, [value]);

  const updateSelectionStyle = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSelectionStyle(null);
      return;
    }
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      setSelectionStyle(null);
      return;
    }
    
    const text = selection.toString();
    if (!text.trim()) {
      setSelectionStyle(null);
      return;
    }
    
    let parentElement = range.commonAncestorContainer as HTMLElement;
    if (parentElement.nodeType === Node.TEXT_NODE) {
      parentElement = parentElement.parentElement as HTMLElement;
    }
    
    if (!parentElement || !editorRef.current || !editorRef.current.contains(parentElement)) {
      setSelectionStyle(null);
      return;
    }
    
    let fontFamily = 'Georgia, Batang, serif';
    let fontSize = '20px';
    let color = '#1C1A17';
    let bold = false;
    let textAlign = 'justify';
    
    let current: HTMLElement | null = parentElement;
    while (current && current !== editorRef.current) {
      if (current.style.fontFamily) {
        fontFamily = current.style.fontFamily;
      }
      if (current.style.fontSize) {
        fontSize = current.style.fontSize;
      }
      if (current.style.color) {
        color = current.style.color;
      }
      if (current.style.textAlign) {
        textAlign = current.style.textAlign;
      }
      if (current.tagName === 'STRONG' || current.tagName === 'B' || current.style.fontWeight === 'bold') {
        bold = true;
      }
      current = current.parentElement;
    }
    
    setSelectionStyle({
      fontFamily,
      fontSize,
      color,
      bold,
      textAlign,
      text
    });
  };

  const getFontLabel = (font: string) => {
    const f = font.toLowerCase();
    if (f.includes('georgia') || f.includes('batang') || (f.includes('serif') && !f.includes('sans') && !f.includes('playfair'))) return '바탕체 (Serif)';
    if (f.includes('inter') || f.includes('dotum') || (f.includes('sans-serif') && !f.includes('s-core'))) return '고딕체 (Sans)';
    if (f.includes('gungsuh')) return '궁서체 (Brush)';
    if (f.includes('jetbrains') || f.includes('mono')) return '코드체 (Mono)';
    if (f.includes('playfair')) return '우아함 (Playfair)';
    if (f.includes('s-core')) return '에스코어드림 (S-Core Dream)';
    return '바탕체 (Serif)';
  };

  const getSizeLabel = (size: string) => {
    if (size === '12px') return '아주 작게 (12px)';
    if (size === '14px') return '작게 (14px)';
    if (size === '16px') return '보통 (16px)';
    if (size === '18px') return '약간 크게 (18px)';
    if (size === '20px') return '크게 (20px)';
    if (size === '24px') return '매우 크게 (24px)';
    if (size === '32px') return '헤드라인 (32px)';
    return size || '크게 (20px)';
  };

  const getAlignLabel = (align: string) => {
    const a = align.toLowerCase();
    if (a.includes('left')) return '왼쪽 정렬 (Left)';
    if (a.includes('center')) return '가운데 정렬 (Center)';
    if (a.includes('right')) return '오른쪽 정렬 (Right)';
    if (a.includes('justify')) return '양끝 정렬 (Justify)';
    return '양끝 정렬 (Justify)';
  };

  const getColorLabel = (color: string) => {
    const c = color.toUpperCase();
    if (c.includes('#1C1A17') || c.includes('1C1A17')) return '기본 먹색 (Black)';
    if (c.includes('#6B7280') || c.includes('6B7280')) return '회색 (Gray)';
    if (c.includes('#DC2626') || c.includes('DC2626')) return '연홍/적색 (Red)';
    if (c.includes('#2563EB') || c.includes('2563EB')) return '푸른색 (Blue)';
    if (c.includes('#D97706') || c.includes('D97706')) return '황금/갈색 (Amber)';
    if (c.includes('#16A34A') || c.includes('16A34A')) return '풀잎색 (Green)';
    if (c.includes('#78350F') || c.includes('78350F')) return '짙은 갈색 (Brown)';
    if (c.includes('#FFFFFF') || c.includes('FFFFFF')) return '흰색 (White)';
    return color || '기본 먹색 (Black)';
  };

  const getFontValue = (font: string) => {
    const f = font.toLowerCase();
    if (f.includes('georgia') || f.includes('batang') || (f.includes('serif') && !f.includes('sans') && !f.includes('playfair'))) return 'Georgia, Batang, serif';
    if (f.includes('inter') || f.includes('dotum') || (f.includes('sans-serif') && !f.includes('s-core'))) return "'Inter', 'Dotum', sans-serif";
    if (f.includes('gungsuh')) return 'Gungsuh, cursive';
    if (f.includes('jetbrains') || f.includes('mono')) return "'JetBrains Mono', monospace";
    if (f.includes('playfair')) return "'Playfair Display', serif";
    if (f.includes('s-core')) return "'S-Core Dream', sans-serif";
    return '';
  };

  const getSizeValue = (size: string) => {
    const s = size.toLowerCase();
    if (s.includes('12px')) return '12px';
    if (s.includes('14px')) return '14px';
    if (s.includes('16px')) return '16px';
    if (s.includes('18px')) return '18px';
    if (s.includes('20px')) return '20px';
    if (s.includes('24px')) return '24px';
    if (s.includes('32px')) return '32px';
    return '';
  };

  const getColorValue = (color: string) => {
    const c = color.toUpperCase();
    if (c.includes('#1C1A17') || c.includes('1C1A17')) return '#1C1A17';
    if (c.includes('#6B7280') || c.includes('6B7280')) return '#6B7280';
    if (c.includes('#DC2626') || c.includes('DC2626')) return '#DC2626';
    if (c.includes('#2563EB') || c.includes('2563EB')) return '#2563EB';
    if (c.includes('#D97706') || c.includes('D97706')) return '#D97706';
    if (c.includes('#16A34A') || c.includes('16A34A')) return '#16A34A';
    if (c.includes('#78350F') || c.includes('78350F')) return '#78350F';
    if (c.includes('#FFFFFF') || c.includes('FFFFFF')) return '#FFFFFF';
    return '';
  };

  const applyInlineStyle = (styleProperty: 'fontFamily' | 'fontSize' | 'color', value: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
      // Insert placeholder
      const span = document.createElement('span');
      span.style[styleProperty] = value;
      span.textContent = '글자';
      range.insertNode(span);
      
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      const span = document.createElement('span');
      span.style[styleProperty] = value;
      
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        
        const newRange = document.createRange();
        newRange.selectNode(span);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e) {
        // Fallback using document.execCommand
        document.execCommand('styleWithCSS', false, 'true');
        if (styleProperty === 'color') {
          document.execCommand('foreColor', false, value);
        } else if (styleProperty === 'fontFamily') {
          document.execCommand('fontName', false, value);
        }
      }
    }
    
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
      updateSelectionStyle();
    }
  };

  const toggleBold = () => {
    document.execCommand('bold', false);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
      updateSelectionStyle();
    }
  };

  const applyBlockStyle = (styleProperty: 'textAlign', value: string) => {
    let command = 'justifyLeft';
    if (value === 'center') command = 'justifyCenter';
    if (value === 'right') command = 'justifyRight';
    if (value === 'justify') command = 'justifyFull';
    
    document.execCommand(command, false);
    
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
      updateSelectionStyle();
    }
  };

  const insertImage = (url: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      const imgHtml = `<img src="${url}" style="max-width: 100%; border-radius: 8px; display: block; margin: 16px auto;" alt="삽입된 이미지" />`;
      const finalHtml = value + imgHtml;
      lastValueRef.current = finalHtml;
      onChange(finalHtml);
      return;
    }
    
    const range = selection.getRangeAt(0);
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.display = 'block';
    img.style.margin = '16px auto';
    img.alt = '삽입된 이미지';
    
    range.insertNode(img);
    
    const newRange = document.createRange();
    newRange.setStartAfter(img);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!onUploadImage) {
      alert('이미지 업로드 기능이 제공되지 않았습니다.');
      return;
    }

    setIsUploading(true);
    setShowImagePopover(false);
    try {
      const url = await onUploadImage(file);
      insertImage(url);
    } catch (err: any) {
      alert('이미지 업로드 중 오류가 발생했습니다: ' + (err.message || err));
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = ''; 
    }
  };

  const handleInsertUrl = () => {
    if (!imageUrlInput.trim()) {
      alert('올바른 이미지 URL 주소를 입력해 주세요.');
      return;
    }
    insertImage(imageUrlInput.trim());
    setImageUrlInput('');
    setShowImagePopover(false);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (onPaste) {
      onPaste(e);
    }
    setTimeout(() => {
      handleInput();
    }, 50);
  };

  return (
    <div className={`flex flex-col border border-neutral-300 rounded-xl overflow-hidden bg-white ${className}`}>
      {/* Editor CSS for Placeholders */}
      <style>{`
        .wysiwyg-editor:empty::before {
          content: attr(data-placeholder);
          color: #a3a3a3;
          font-style: italic;
          cursor: text;
        }
      `}</style>

      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-neutral-50 border-b border-neutral-200">
        <div className="flex flex-wrap items-center gap-1.5">
          
          {/* Font selection */}
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded px-1.5 py-1">
            <Type size={13} className="text-neutral-500" />
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  applyInlineStyle('fontFamily', val);
                }
              }}
              value={selectionStyle ? getFontValue(selectionStyle.fontFamily) : ""}
              className="text-xs bg-transparent border-none outline-none cursor-pointer text-neutral-700 max-w-[85px] font-sans"
            >
              <option value="" disabled={!!selectionStyle}>글꼴 (Font)</option>
              <option value="Georgia, Batang, serif">바탕체 (Serif)</option>
              <option value="'Inter', 'Dotum', sans-serif">고딕체 (Sans)</option>
              <option value="Gungsuh, cursive">궁서체 (Brush)</option>
              <option value="'JetBrains Mono', monospace">코드체 (Mono)</option>
              <option value="'Playfair Display', serif">우아함 (Playfair)</option>
              <option value="'S-Core Dream', sans-serif">에스코어드림 (S-Core Dream)</option>
            </select>
          </div>

          {/* Size selection */}
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded px-1.5 py-1">
            <CaseSensitive size={13} className="text-neutral-500" />
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  applyInlineStyle('fontSize', val);
                }
              }}
              value={selectionStyle ? getSizeValue(selectionStyle.fontSize) : ""}
              className="text-xs bg-transparent border-none outline-none cursor-pointer text-neutral-700 max-w-[85px] font-sans"
            >
              <option value="" disabled={!!selectionStyle}>크기 (Size)</option>
              <option value="12px">아주 작게 (12px)</option>
              <option value="14px">작게 (14px)</option>
              <option value="16px">보통 (16px)</option>
              <option value="18px">약간 크게 (18px)</option>
              <option value="20px">크게 (20px)</option>
              <option value="24px">매우 크게 (24px)</option>
              <option value="32px">헤드라인 (32px)</option>
            </select>
          </div>

          {/* Color selection */}
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded px-1.5 py-1">
            <Palette size={13} className="text-neutral-500" />
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  applyInlineStyle('color', val);
                }
              }}
              value={selectionStyle ? getColorValue(selectionStyle.color) : ""}
              className="text-xs bg-transparent border-none outline-none cursor-pointer text-neutral-700 max-w-[85px] font-sans"
            >
              <option value="" disabled={!!selectionStyle}>색상 (Color)</option>
              <option value="#1C1A17">기본 먹색 (Black)</option>
              <option value="#6B7280">회색 (Gray)</option>
              <option value="#DC2626">연홍/적색 (Red)</option>
              <option value="#2563EB">푸른색 (Blue)</option>
              <option value="#D97706">황금/갈색 (Amber)</option>
              <option value="#16A34A">풀잎색 (Green)</option>
              <option value="#78350F">짙은 갈색 (Brown)</option>
              <option value="#FFFFFF">흰색 (White)</option>
            </select>
          </div>

          {/* Bold button */}
          <button
            type="button"
            onClick={toggleBold}
            className={`flex items-center justify-center p-1.5 border rounded transition-colors ${
              selectionStyle?.bold
                ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-sm'
                : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black'
            }`}
            title="글자 굵게 (Bold)"
          >
            <Bold size={13} />
          </button>

          {/* Alignment controls */}
          <div className="flex items-center gap-1 border-l border-neutral-200 pl-1.5">
            <button
              type="button"
              onClick={() => applyBlockStyle('textAlign', 'left')}
              className={`flex items-center justify-center p-1.5 border rounded transition-colors ${
                selectionStyle?.textAlign === 'left'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black'
              }`}
              title="왼쪽 정렬"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyBlockStyle('textAlign', 'center')}
              className={`flex items-center justify-center p-1.5 border rounded transition-colors ${
                selectionStyle?.textAlign === 'center'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black'
              }`}
              title="가운데 정렬"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyBlockStyle('textAlign', 'right')}
              className={`flex items-center justify-center p-1.5 border rounded transition-colors ${
                selectionStyle?.textAlign === 'right'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black'
              }`}
              title="오른쪽 정렬"
            >
              <AlignRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyBlockStyle('textAlign', 'justify')}
              className={`flex items-center justify-center p-1.5 border rounded transition-colors ${
                selectionStyle?.textAlign === 'justify'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black'
              }`}
              title="양끝 정렬"
            >
              <AlignJustify size={13} />
            </button>
          </div>

          {/* Image Insertion Popover Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowImagePopover(!showImagePopover)}
              className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-amber-900 hover:bg-amber-100 text-xs font-bold transition-colors"
              title="커서 위치에 이미지 넣기"
            >
              <ImageIcon size={13} />
              <span>이미지 삽입</span>
            </button>

            {showImagePopover && (
              <div className="absolute left-0 mt-1.5 z-30 bg-white border border-neutral-300 rounded-lg shadow-xl p-3 w-72 space-y-3">
                <div className="flex justify-between items-center pb-1.5 border-b border-neutral-100">
                  <span className="text-xs font-bold text-neutral-800">커서 위치에 이미지 추가</span>
                  <button 
                    type="button" 
                    onClick={() => setShowImagePopover(false)} 
                    className="text-neutral-400 hover:text-neutral-600 text-xs"
                  >
                    닫기
                  </button>
                </div>
                
                {/* File Upload Option */}
                {onUploadImage && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-500 font-bold block">1. 기기에서 파일 업로드</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-amber-300 hover:bg-amber-50/50 rounded-md text-xs text-amber-800 font-semibold transition-colors"
                    >
                      <Upload size={12} />
                      <span>파일 선택 및 업로드</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*,image/heic,image/heif,.heic,.heif"
                      className="hidden"
                    />
                  </div>
                )}

                {/* Direct Link Option */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-neutral-500 font-bold block">2. 이미지 직접 링크 주소</span>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-1 text-xs border border-neutral-300 rounded p-1 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleInsertUrl}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-black text-white text-xs font-bold rounded"
                    >
                      삽입
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Uploading indicator */}
          {isUploading && (
            <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold">
              <Loader2 size={12} className="animate-spin" />
              <span>이미지 삽입 중...</span>
            </div>
          )}
        </div>

        {/* Help button */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-600 transition-colors"
          title="도움말"
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {/* Help Overlay Panel */}
      {showHelp && (
        <div className="bg-amber-50/60 p-3 border-b border-neutral-200 text-xs text-neutral-700 leading-relaxed font-sans space-y-1">
          <p className="font-bold text-neutral-800">💡 리치 텍스트 기능 안내</p>
          <p>• 이제 <strong>완전한 실시간 시각 에디터(WYSIWYG)</strong> 방식으로 작동합니다! 태그 코드 대신, 적용된 서식이 화면에 즉시 보여집니다.</p>
          <p>• 서식을 적용할 <strong>텍스트를 드래그 선택</strong>한 뒤 글꼴, 크기, 색상, 정렬을 클릭하면 실시간으로 스타일이 바뀝니다.</p>
          <p>• 드래그 선택하지 않고 누르면 해당 서식을 가진 임시 글자가 생성되며 타자를 치시면 이어서 입력됩니다.</p>
          <p>• <strong>이미지 삽입</strong>을 누르면 글상자 내에 커서가 있던 위치에 즉시 이미지가 시각적으로 들어갑니다.</p>
        </div>
      )}

      {/* Selection Style Status Bar */}
      {selectionStyle && (
        <div className="bg-amber-50/60 border-b border-neutral-200 px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-sans transition-all duration-300 animate-fadeIn shadow-inner">
          <div className="flex items-center gap-2 text-neutral-700 min-w-0 flex-1">
            <span className="font-bold text-amber-900 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide shrink-0">선택 영역 서식</span>
            <span className="truncate italic text-neutral-600 max-w-[200px] font-serif">"{selectionStyle.text}"</span>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap text-neutral-800">
            {/* Font family status */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 font-medium">글꼴:</span>
              <span className="font-serif font-bold text-black border border-neutral-200 bg-white px-2 py-0.5 rounded shadow-sm text-[11px]">
                {getFontLabel(selectionStyle.fontFamily)}
              </span>
            </div>

            {/* Font size status */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 font-medium">크기:</span>
              <span className="font-sans font-bold text-black border border-neutral-200 bg-white px-2 py-0.5 rounded shadow-sm text-[11px]">
                {getSizeLabel(selectionStyle.fontSize)}
              </span>
            </div>

            {/* Color status */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-medium">색상:</span>
              <div className="flex items-center gap-1 bg-white border border-neutral-200 px-2 py-0.5 rounded shadow-sm">
                <span 
                  className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
                  style={{ backgroundColor: selectionStyle.color || '#1C1A17' }}
                />
                <span className="font-mono text-[10px] font-bold text-black">
                  {getColorLabel(selectionStyle.color)}
                </span>
              </div>
            </div>

            {/* Bold status */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 font-medium">굵기:</span>
              <span className={`font-sans font-bold px-2 py-0.5 rounded border shadow-sm text-[11px] ${
                selectionStyle.bold 
                  ? 'text-amber-800 bg-amber-100/50 border-amber-200' 
                  : 'text-neutral-500 bg-white border-neutral-200'
              }`}>
                {selectionStyle.bold ? '굵게 (Bold)' : '보통 (Regular)'}
              </span>
            </div>

            {/* Alignment status */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 font-medium">정렬:</span>
              <span className="font-sans font-bold text-black border border-neutral-200 bg-white px-2 py-0.5 rounded shadow-sm text-[11px]">
                {getAlignLabel(selectionStyle.textAlign)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* WYSIWYG ContentEditable editor */}
      <div
        ref={editorRef}
        contentEditable={true}
        data-placeholder={placeholder}
        onInput={handleInput}
        onPaste={handlePaste}
        onSelect={updateSelectionStyle}
        onKeyUp={updateSelectionStyle}
        onMouseUp={updateSelectionStyle}
        className="wysiwyg-editor w-full p-6 text-xl sm:text-2xl focus:outline-none bg-transparent whitespace-pre-wrap leading-relaxed font-serif min-h-[280px] max-h-[600px] overflow-y-auto"
      />
    </div>
  );
};

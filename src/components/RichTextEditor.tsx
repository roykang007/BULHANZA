import React, { useRef, useState } from 'react';
import { 
  Type, CaseSensitive, Bold, Palette, Image as ImageIcon, 
  Upload, Link2, HelpCircle, Loader2 
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePopover, setShowImagePopover] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const handleApplyStyle = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    // If nothing is selected, provide a placeholder
    const innerText = selectedText || '텍스트';
    const replacement = before + innerText + after;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    onChange(newValue);

    // Set cursor position back inside the tags
    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + before.length;
      const newCursorEnd = newCursorStart + innerText.length;
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 50);
  };

  const insertImage = (url: string) => {
    const imgHtml = `\n<img src="${url}" style="max-width: 100%; border-radius: 8px; display: block; margin: 16px auto; shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" alt="삽입된 이미지" />\n`;
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + imgHtml);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newValue = text.substring(0, start) + imgHtml + text.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + imgHtml.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
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
      if (e.target) e.target.value = ''; // Reset file input
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

  return (
    <div className={`flex flex-col border border-neutral-300 rounded-xl overflow-hidden bg-white ${className}`}>
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
                  handleApplyStyle(`<span style="font-family: ${val};">`, '</span>');
                  e.target.value = ''; // Reset select
                }
              }}
              defaultValue=""
              className="text-xs bg-transparent border-none outline-none cursor-pointer text-neutral-700 max-w-[85px] font-sans"
            >
              <option value="" disabled>글꼴 (Font)</option>
              <option value="Georgia, Batang, serif">바탕체 (Serif)</option>
              <option value="'Inter', 'Dotum', sans-serif">고딕체 (Sans)</option>
              <option value="Gungsuh, cursive">궁서체 (Brush)</option>
              <option value="'JetBrains Mono', monospace">코드체 (Mono)</option>
              <option value="'Playfair Display', serif">우아함 (Playfair)</option>
            </select>
          </div>

          {/* Size selection */}
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded px-1.5 py-1">
            <CaseSensitive size={13} className="text-neutral-500" />
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  handleApplyStyle(`<span style="font-size: ${val};">`, '</span>');
                  e.target.value = ''; // Reset select
                }
              }}
              defaultValue=""
              className="text-xs bg-transparent border-none outline-none cursor-pointer text-neutral-700 max-w-[85px] font-sans"
            >
              <option value="" disabled>크기 (Size)</option>
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
                  handleApplyStyle(`<span style="color: ${val};">`, '</span>');
                  e.target.value = ''; // Reset select
                }
              }}
              defaultValue=""
              className="text-xs bg-transparent border-none outline-none cursor-pointer text-neutral-700 max-w-[85px] font-sans"
            >
              <option value="" disabled>색상 (Color)</option>
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
            onClick={() => handleApplyStyle('<strong>', '</strong>')}
            className="flex items-center justify-center p-1.5 bg-white border border-neutral-200 rounded hover:bg-neutral-100 hover:text-black text-neutral-600 transition-colors"
            title="글자 굵게 (Bold)"
          >
            <Bold size={13} />
          </button>

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
          <p>• 본문에서 스타일을 적용할 <strong>텍스트를 드래그 선택</strong>한 뒤 글꼴, 크기, 색상, 굵기 단추를 누르면 자동으로 태그가 감싸집니다.</p>
          <p>• 드래그 선택하지 않고 누르면 임시로 <code>텍스트</code>가 입력되며, 텍스트가 블록 지정되므로 바로 타자를 치시면 적용됩니다.</p>
          <p>• <strong>이미지 삽입</strong>을 누르면 글상자 내에 <strong>커서가 있던 위치</strong>에 즉시 반응형 이미지가 삽입됩니다.</p>
        </div>
      )}

      {/* Textarea container */}
      <textarea
        ref={textareaRef}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        className="w-full p-4 text-base focus:outline-none bg-transparent whitespace-pre-wrap leading-relaxed font-sans min-h-[220px] resize-y"
      />
    </div>
  );
};

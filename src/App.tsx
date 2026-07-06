import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Plus, Trash2, Edit2, ArrowLeft, Newspaper, Image as ImageIcon, Check,
  Upload, ChevronLeft, ChevronRight, BookOpen, Settings, ChevronDown, Database,
  Activity, Key, RefreshCw, Sparkles, MessageSquare, Compass, Send, Calendar, Monitor,
  ArrowUpDown, List, PenTool
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { RichTextEditor } from './components/RichTextEditor';

// Firebase imports
import { db, auth, OperationType, handleFirestoreError } from './lib/firebase';
import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';

import { translations } from './lib/translations';
import { Language, Page, ArchiveItem, SiteSettings, Artist, Work } from './types';
import { FallingLeaves } from './components/FallingLeaves';
import { 
  DEFAULT_TEA_POEMS, DEFAULT_PHILOSOPHY_ITEMS, DEFAULT_JOURNEY_PHOTOS, DEFAULT_JOURNEY_PRESS,
  DEFAULT_MULPA_WRITINGS, DEFAULT_ARTISTS
} from './lib/seedDataToFirebase';

const cleanTextForSummary = (text: string): string => {
  if (!text) return '';
  // 1. Remove all HTML tags completely (like <strong>, <span>, etc.)
  let cleaned = text.replace(/<\/?[^>]+(>|$)/g, "");
  // 2. Remove Markdown image links: ![alt](url) -> Keep alt text or remove
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // 3. Remove Markdown standard links: [text](url) -> Keep text
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // 4. Remove Markdown headings (# Heading), blockquotes (> text), code blocks
  cleaned = cleaned.replace(/^\s*#+\s+/gm, "");
  cleaned = cleaned.replace(/^\s*>\s+/gm, "");
  // 5. Remove styling markers like **, *, _, ~, `, etc.
  cleaned = cleaned.replace(/[*_#`~]/g, "");
  // 6. Clean up multiple spaces and line breaks into a single space
  cleaned = cleaned.replace(/\s+/g, " ");
  return cleaned.trim();
};

const getDisplaySummary = (item: any, limit: number = 150): string => {
  if (item.summary && item.summary.trim()) {
    return cleanTextForSummary(item.summary);
  }
  const cleanedContent = cleanTextForSummary(item.content || '');
  if (cleanedContent.length <= limit) {
    return cleanedContent;
  }
  return cleanedContent.substring(0, limit) + '...';
};

const convertImageToJpg = async (file: File): Promise<File> => {
  const fileNameLower = file.name.toLowerCase();
  const fileTypeLower = file.type.toLowerCase();
  const isHeic = fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif') || fileTypeLower === 'image/heic' || fileTypeLower === 'image/heif';

  let currentFile = file;

  // 1. If it's HEIC, convert it using heic2any client-side first
  if (isHeic) {
    try {
      console.log('Converting HEIC/HEIF to JPEG...');
      const heic2anyModule = await import('heic2any');
      // heic2any default or direct module call
      const heicConverter = (heic2anyModule.default || heic2anyModule) as any;
      
      const converted = await heicConverter({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.85
      });
      
      const blob = Array.isArray(converted) ? converted[0] : converted;
      const newName = file.name.replace(/\.(heic|heif)$/i, '') + '.jpg';
      currentFile = new File([blob], newName, { type: 'image/jpeg' });
      console.log('HEIC conversion successful:', currentFile.name, currentFile.size);
    } catch (err) {
      console.error('HEIC client-side conversion failed, attempting raw canvas or fallback:', err);
    }
  }

  // 2. Normalise/compress all other images to high quality JPG to save bandwidth & guarantee compatibility
  try {
    return await new Promise<File>((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Downscale to reasonable dimensions if extremely large (e.g. max 2048px)
            const MAX_DIM = 2048;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(currentFile);
              return;
            }

            // Fill white background (useful for transparent PNGs converted to JPEG)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const newName = currentFile.name.replace(/\.[^.]+$/, '') + '.jpg';
                  const compressedFile = new File([blob], newName, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(compressedFile);
                } else {
                  resolve(currentFile);
                }
              },
              'image/jpeg',
              0.85
            );
          } catch (e) {
            console.warn('Canvas conversion error:', e);
            resolve(currentFile);
          }
        };
        img.onerror = () => {
          resolve(currentFile);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        resolve(currentFile);
      };
      reader.readAsDataURL(currentFile);
    });
  } catch (err) {
    console.warn('Error during image-to-JPG normalization:', err);
    return currentFile;
  }
};

const uploadImageFile = async (rawFile: File): Promise<string> => {
  // Convert & compress the uploaded file client-side to JPG (handling HEIC/HEIF and other formats)
  const file = await convertImageToJpg(rawFile);

  const formData = new FormData();
  formData.append('image', file);

  let apiError: any = null;

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data && data.url) {
          return data.url;
        }
      }
      throw new Error("Server returned success but response was not valid JSON or url was missing");
    } else {
      let errMsg = `Status ${response.status}`;
      try {
        const errData = await response.json();
        if (errData && errData.error) {
          errMsg = errData.error;
        }
      } catch (e) {
        try {
          const text = await response.text();
          if (text) errMsg = text.substring(0, 100);
        } catch (_) {}
      }
      throw new Error(errMsg);
    }
  } catch (err: any) {
    apiError = err;
    console.warn("Express backend upload failed/not available:", err);
  }

  // If the error was a real backend error (e.g., file too large, multer error),
  // and NOT a network/missing-endpoint error (like 404 or failed to fetch),
  // or an invalid JSON response error (which typically happens when a static server returns a 200 OK index.html instead of a 404),
  // we should throw it directly instead of hiding it behind PHP fallback!
  if (apiError) {
    const msg = apiError.message || String(apiError);
    const isNetworkOr404OrInvalidJson = 
      msg.includes("404") || 
      msg.includes("fetch") || 
      msg.includes("Network") || 
      msg.includes("Failed to fetch") ||
      msg.includes("not valid JSON");

    if (!isNetworkOr404OrInvalidJson) {
      throw apiError;
    }
  }

  // Fallback for Cafe24 / static PHP web hosting
  try {
    const phpResponse = await fetch('/upload.php', {
      method: 'POST',
      body: formData,
    });
    if (!phpResponse.ok) {
      throw new Error(`PHP server responded with status ${phpResponse.status}`);
    }
    const text = await phpResponse.text();
    const data = JSON.parse(text);
    if (data.url) {
      return data.url;
    } else {
      throw new Error(data.error || "Unknown error during PHP upload");
    }
  } catch (e: any) {
    console.error("PHP file upload fallback failed:", e);
    // Include both errors to help debugging
    const finalErrorMsg = apiError 
      ? `Backend Upload Error: ${apiError.message}. PHP Fallback Error: ${e.message || e}`
      : `Image upload failed. If hosted on Cafe24, ensure /upload.php is present. Error: ${e.message || e}`;
    throw new Error(finalErrorMsg);
  }
};

const formatMonthDay = (createdAt: any) => {
  if (!createdAt) return '—';
  try {
    let date: Date;
    if (typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000);
    } else {
      date = new Date(createdAt);
    }
    
    if (isNaN(date.getTime())) return '—';
    
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    return `${mm}/${dd}`;
  } catch (e) {
    return '—';
  }
};

const getTimestampMs = (item: any) => {
  if (!item || !item.created_at) return 0;
  try {
    if (typeof item.created_at.toDate === 'function') {
      return item.created_at.toDate().getTime();
    }
    if (item.created_at.seconds) {
      return item.created_at.seconds * 1000;
    }
    const t = new Date(item.created_at).getTime();
    return isNaN(t) ? 0 : t;
  } catch (e) {
    return 0;
  }
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  lang: Language;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, lang }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  const prevLabel = lang === 'KR' ? '이전' : lang === 'SC' ? '上一页' : 'Prev';
  const nextLabel = lang === 'KR' ? '다음' : lang === 'SC' ? '下一页' : 'Next';

  return (
    <div className="flex justify-center items-center space-x-2 mt-12 py-4 select-none">
      <button
        disabled={currentPage === 1}
        onClick={() => {
          onPageChange(currentPage - 1);
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }}
        className="px-3 py-1.5 rounded-lg border border-[#1C1A17]/10 hover:border-[#1C1A17]/40 hover:bg-neutral-50 text-xs font-serif font-bold text-black/60 hover:text-black disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
      >
        &larr; {prevLabel}
      </button>
      
      {pages.map((p) => {
        const isCurrent = p === currentPage;
        return (
          <button
            key={p}
            onClick={() => {
              onPageChange(p);
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
            className={`w-8 h-8 rounded-lg font-serif font-bold text-xs transition-all border ${
              isCurrent
                ? 'bg-[#1C1A17] text-[#FAF9F6] border-[#1C1A17] shadow-md scale-105'
                : 'bg-white text-black/70 border-[#1C1A17]/10 hover:border-[#1C1A17]/30 hover:bg-neutral-50'
            }`}
          >
            {p}
          </button>
        );
      })}

      <button
        disabled={currentPage === totalPages}
        onClick={() => {
          onPageChange(currentPage + 1);
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }}
        className="px-3 py-1.5 rounded-lg border border-[#1C1A17]/10 hover:border-[#1C1A17]/40 hover:bg-neutral-50 text-xs font-serif font-bold text-black/60 hover:text-black disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
      >
        {nextLabel} &rarr;
      </button>
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<Language>('KR');
  const [page, setPage] = useState<Page>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Core Firebase synced states
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artSubTab, setArtSubTab] = useState<'doctrine' | 'artists'>('doctrine');
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Admin authentication state
  const [isAuthAdmin, setIsAuthAdmin] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Reader / Interactive States
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [readingPoem, setReadingPoem] = useState<ArchiveItem | null>(null);
  const [readingMulpa, setReadingMulpa] = useState<ArchiveItem | null>(null);
  const [readingSuncha, setReadingSuncha] = useState<ArchiveItem | null>(null);
  const [readingPhilosophy, setReadingPhilosophy] = useState<ArchiveItem | null>(null);
  const [philosophyTab, setPhilosophyTab] = useState<'chapters' | 'essays'>('chapters');
  const [sunchaFilter, setSunchaFilter] = useState<'all' | 'suncha_seo' | 'suncha_hwa' | 'suncha_cha' | 'suncha_hyang'>('all');

  // Pagination States
  const [poetryPage, setPoetryPage] = useState(1);
  const [philosophyPage, setPhilosophyPage] = useState(1);
  const [sunchaPage, setSunchaPage] = useState(1);
  const [mulpaPage, setMulpaPage] = useState(1);
  const [artistsPage, setArtistsPage] = useState(1);
  const [journeyPage, setJourneyPage] = useState(1);

  // Reset all reading/detail states when the page or sub tab changes
  useEffect(() => {
    setReadingPoem(null);
    setReadingMulpa(null);
    setReadingSuncha(null);
    setReadingPhilosophy(null);
    setSelectedJourneyItem(null);
    setSunchaFilter('all');
    setPhilosophyTab('chapters');
  }, [page, artSubTab]);

  // User direct writing states (8888 passcode)
  const [isUserAuthorized, setIsUserAuthorized] = useState(localStorage.getItem('authorized_write') === 'true');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userPasscode, setUserPasscode] = useState('');
  const [onSuccessAuth, setOnSuccessAuth] = useState<(() => void) | null>(null);

  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [writeFormCategory, setWriteFormCategory] = useState('poetry');
  const [writeFormCollection, setWriteFormCollection] = useState('');
  const [writeFormTitle, setWriteFormTitle] = useState('');
  const [writeFormContent, setWriteFormContent] = useState('');
  const [writeFormSummary, setWriteFormSummary] = useState('');
  const [writeFormTopImg, setWriteFormTopImg] = useState('');
  const [writeFormMidImg, setWriteFormMidImg] = useState('');
  const [writeFormBotImg, setWriteFormBotImg] = useState('');
  const [writeFormLang, setWriteFormLang] = useState<Language>('KR');
  const [writeFormUploading, setWriteFormUploading] = useState({ top: false, mid: false, bot: false });

  const handleWriteClick = (targetCategory?: string, targetCollection?: string) => {
    const isAuthorized = localStorage.getItem('authorized_write') === 'true';
    const proceed = () => {
      setEditingPostId(null);
      setWriteFormCategory(targetCategory || 'poetry');
      setWriteFormCollection(targetCollection || t.poetryCollection.allCollections[0]);
      setWriteFormTitle('');
      setWriteFormContent('');
      setWriteFormSummary('');
      setWriteFormTopImg('');
      setWriteFormMidImg('');
      setWriteFormBotImg('');
      setWriteFormLang(lang);
      setIsWriteModalOpen(true);
    };

    if (isAuthorized) {
      proceed();
    } else {
      setOnSuccessAuth(() => proceed);
      setIsAuthModalOpen(true);
    }
  };

  const handleEditClick = (item: ArchiveItem) => {
    const isAuthorized = localStorage.getItem('authorized_write') === 'true';
    const proceed = () => {
      setEditingPostId(item.id);
      setWriteFormCategory(item.category || 'poetry');
      setWriteFormCollection(item.poetry_collection_name || '');
      setWriteFormTitle(item.title || '');
      setWriteFormContent(item.content || '');
      setWriteFormSummary(item.summary || '');
      setWriteFormTopImg(item.image_url || '');
      setWriteFormMidImg(item.image_mid_url || '');
      setWriteFormBotImg(item.image_bot_url || '');
      setWriteFormLang(item.language || lang);
      setIsWriteModalOpen(true);
    };

    if (isAuthorized) {
      proceed();
    } else {
      setOnSuccessAuth(() => proceed);
      setIsAuthModalOpen(true);
    }
  };

  const handleVerifyPasscode = () => {
    if (userPasscode === '8888') {
      localStorage.setItem('authorized_write', 'true');
      setIsUserAuthorized(true);
      setIsAuthModalOpen(false);
      setUserPasscode('');
      if (onSuccessAuth) {
        onSuccessAuth();
      }
    } else {
      alert('비밀번호가 일치하지 않습니다. (암호: 8888)');
    }
  };

  const handleTextAreaPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    setValue: (val: string) => void,
    currentValue: string
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain') || '';
    
    // Normalize CRLF (\r\n) and CR (\r) to LF (\n)
    let cleaned = pastedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Check if the pasted text has an empty line after almost every single line
    const lines = cleaned.split('\n');
    if (lines.length > 2) {
      let alternatingOddEmpty = true;
      let nonEmptyOddCount = 0;
      for (let i = 1; i < lines.length; i += 2) {
        if (lines[i].trim() !== '') {
          alternatingOddEmpty = false;
          break;
        } else {
          nonEmptyOddCount++;
        }
      }
      
      let alternatingEvenEmpty = true;
      let nonEmptyEvenCount = 0;
      for (let i = 0; i < lines.length; i += 2) {
        if (lines[i].trim() !== '') {
          alternatingEvenEmpty = false;
          break;
        } else {
          nonEmptyEvenCount++;
        }
      }
      
      if (alternatingOddEmpty && nonEmptyOddCount > 0) {
        cleaned = lines.filter((_, idx) => idx % 2 === 0).join('\n');
      } else if (alternatingEvenEmpty && nonEmptyEvenCount > 0) {
        cleaned = lines.filter((_, idx) => idx % 2 === 1).join('\n');
      } else {
        cleaned = cleaned.replace(/\n\s*\n/g, '\n');
      }
    } else {
      cleaned = cleaned.replace(/\n\s*\n/g, '\n');
    }
    
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = currentValue.substring(0, start) + cleaned + currentValue.substring(end);
    
    setValue(newValue);
    
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + cleaned.length;
    }, 0);
  };

  const handleSaveUserPost = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!writeFormTitle || !writeFormCategory) {
      alert('제목을 입력해 주세요.');
      return;
    }
    try {
      const payload: any = {
        title: writeFormTitle,
        content: writeFormContent,
        summary: writeFormSummary || '',
        image_url: writeFormTopImg || 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200',
        image_mid_url: writeFormMidImg || '',
        image_bot_url: writeFormBotImg || '',
        category: writeFormCategory,
        poetry_collection_name: writeFormCategory === 'poetry' ? writeFormCollection : null,
        language: writeFormLang,
      };

      if (editingPostId) {
        await updateDoc(doc(db, 'archive_items', editingPostId), payload);
        alert('성공적으로 게시글이 수정되었습니다!');
      } else {
        payload.created_at = new Date().toISOString();
        await addDoc(collection(db, 'archive_items'), payload);
        alert('성공적으로 게시글이 업로드되었습니다!');
      }
      
      setIsWriteModalOpen(false);
      setEditingPostId(null);
      await fetchData();
    } catch (err: any) {
      console.error("Direct write failed:", err);
      alert(`게시글 업로드/수정에 실패했습니다: ${err.message || err}`);
    }
  };

  const formatFullDate = (createdAt: any) => {
    if (!createdAt) return '—';
    try {
      let date: Date;
      if (typeof createdAt.toDate === 'function') {
        date = createdAt.toDate();
      } else if (createdAt.seconds) {
        date = new Date(createdAt.seconds * 1000);
      } else {
        date = new Date(createdAt);
      }
      
      if (isNaN(date.getTime())) return '—';
      
      const yyyy = date.getFullYear();
      const mm = (date.getMonth() + 1).toString().padStart(2, '0');
      const dd = date.getDate().toString().padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
      return '—';
    }
  };

  const renderContentWithImages = (content: string, midImg?: string, botImg?: string) => {
    const paragraphs = content.split('\n');
    const midPoint = Math.floor(paragraphs.length / 2);
    
    const firstHalf = paragraphs.slice(0, midPoint).join('\n');
    const secondHalf = paragraphs.slice(midPoint).join('\n');
    
    return (
      <div className="space-y-6">
        {/* Content first half */}
        <div className="markdown-body font-serif text-lg md:text-xl leading-relaxed text-[#1C1A17]/90 text-justify">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
            {firstHalf}
          </ReactMarkdown>
        </div>
        
        {/* Middle Image */}
        {midImg && (
          <div className="my-8 flex justify-center w-full">
            <img 
              src={midImg} 
              alt="Middle decoration" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[300px] sm:max-h-[400px] h-auto object-contain rounded-xl border border-[#1C1A17]/10 p-1 bg-white shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) parent.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Content second half */}
        {secondHalf && (
          <div className="markdown-body font-serif text-lg md:text-xl leading-relaxed text-[#1C1A17]/90 text-justify">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
              {secondHalf}
            </ReactMarkdown>
          </div>
        )}
        
        {/* Bottom Image */}
        {botImg && (
          <div className="mt-8 flex justify-center w-full">
            <img 
              src={botImg} 
              alt="Bottom decoration" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[300px] sm:max-h-[400px] h-auto object-contain rounded-xl border border-[#1C1A17]/10 p-1 bg-white shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) parent.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    );
  };
  const [breathingMode, setBreathingMode] = useState(false);
  const [breathingText, setBreathingText] = useState('Inhale');
  const [breathingProgress, setBreathingProgress] = useState(0);

  // Tea Timer states
  const [steepingActive, setSteepingActive] = useState(false);
  const [steepingTimeLeft, setSteepingTimeLeft] = useState(45);
  const [steepingProgress, setSteepingProgress] = useState(100);

  // Filter lists inside pages
  const [journeyFilter, setJourneyFilter] = useState<'all' | 'photo' | 'press'>('all');

  // Admin category filter and search parameters
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('all');
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');

  // Contact form state
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formSuccess, setFormSuccess] = useState(false);
  const [formSending, setFormSending] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Translations shortcut
  const t = translations[lang];

  // Load from Firebase on start
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'roykang007@gmail.com') {
        setIsAuthAdmin(true);
      } else {
        // Also check if local storage has a valid passcode session
        const sess = localStorage.getItem('BULHANZA_ADMIN_SESSION');
        if (sess === 'active') {
          setIsAuthAdmin(true);
        }
      }
    });
    return () => unsub();
  }, []);

  // Sync selectedBook to the first collection when language changes or poetryCollection page loads
  useEffect(() => {
    if (t.poetryCollection?.allCollections?.[0]) {
      setSelectedBook(t.poetryCollection.allCollections[0]);
    }
  }, [page, lang]);

  // Sync core collections
  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      // 1. Fetch site settings
      const settingsRef = doc(db, 'site_settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setSiteSettings(settingsSnap.data() as SiteSettings);
      } else {
        // Create initial placeholder if doesn't exist
        const initialSettings: SiteSettings = {
          id: 'global',
          logo_url: '/assets/logo_v2.svg',
          hero_bg_url: '/assets/mountains_v2.jpg',
          tea_detail_url: '/assets/bulhansuncha_v2.jpg',
          tea_slider_images: [
            'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200',
            'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200'
          ],
          tea_slider_speed: 4000,
          artists: [
            {
              name: "불한자 (弗寒子)",
              title: "심물철학자 및 물파예술가",
              bio: "불한자는 마음과 사물의 파동을 탐구하며, 이를 차(茶), 글(書), 그림(畵)으로 형상화하는 작업을 이어오고 있습니다.",
              image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop"
            }
          ]
        };
        await setDoc(settingsRef, initialSettings);
        setSiteSettings(initialSettings);
      }

      // 2. Fetch archive items
      const itemsRef = collection(db, 'archive_items');
      const querySnap = await getDocs(itemsRef);
      const items: ArchiveItem[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ArchiveItem);
      });
      setArchiveItems(items);

      // 3. Fetch artists
      const artistsRef = collection(db, 'artists');
      const artistsSnap = await getDocs(artistsRef);
      const artistList: Artist[] = [];
      artistsSnap.forEach((docSnap) => {
        artistList.push({ id: docSnap.id, ...docSnap.data() } as any);
      });
      setArtists(artistList);
    } catch (err) {
      console.error(err);
      setDbError('Firebase connection fallback. Showcasing beautiful local sandbox mode.');
      // Create local fallback dataset so application is perfectly functional
      setArchiveItems([
        ...DEFAULT_TEA_POEMS.map((p, i) => ({ ...p, id: `tea-${i}` })),
        ...DEFAULT_PHILOSOPHY_ITEMS.map((p, i) => ({ ...p, id: `phil-${i}` })),
        ...DEFAULT_JOURNEY_PHOTOS.map((p, i) => ({ ...p, id: `photo-${i}` })),
        ...DEFAULT_JOURNEY_PRESS.map((p, i) => ({ ...p, id: `press-${i}` })),
        ...DEFAULT_MULPA_WRITINGS.map((p, i) => ({ ...p, id: `mulpa-${i}` }))
      ]);
      setArtists(
        DEFAULT_ARTISTS.map((a, i) => ({ ...a, id: `artist-${i}` })) as any
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Steeping breathing guide clock loop
  useEffect(() => {
    let interval: any;
    if (steepingActive && steepingTimeLeft > 0) {
      interval = setInterval(() => {
        setSteepingTimeLeft(v => {
          const next = v - 1;
          setSteepingProgress((next / 45) * 100);
          return next;
        });
      }, 1000);
    } else if (steepingTimeLeft === 0) {
      setSteepingActive(false);
    }
    return () => clearInterval(interval);
  }, [steepingActive, steepingTimeLeft]);

  // Infinite Meditative Inhale/Exhale Breathing loop simulation
  useEffect(() => {
    let t: any;
    if (breathingMode) {
      let count = 0;
      t = setInterval(() => {
        count = (count + 1) % 4;
        if (count === 0) setBreathingText('Inhale');
        if (count === 1) setBreathingText('Hold');
        if (count === 2) setBreathingText('Exhale');
        if (count === 3) setBreathingText('Relax');
        setBreathingProgress((count + 1) * 25);
      }, 2500);
    } else {
      setBreathingProgress(0);
    }
    return () => clearInterval(t);
  }, [breathingMode]);

  // Form submit handler
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSending(true);
    setTimeout(() => {
      setFormSending(false);
      setFormSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setFormSuccess(false), 5000);
    }, 1200);
  };

  // 1-Click Database Restore to Firebase
  const handleFullRestore = async () => {
    setLoading(true);
    try {
      // Seed default items
      const allToSeed = [
        ...DEFAULT_TEA_POEMS,
        ...DEFAULT_PHILOSOPHY_ITEMS,
        ...DEFAULT_JOURNEY_PHOTOS,
        ...DEFAULT_JOURNEY_PRESS,
        ...DEFAULT_MULPA_WRITINGS
      ];

      for (const item of allToSeed) {
        await addDoc(collection(db, 'archive_items'), item);
      }

      for (const artist of DEFAULT_ARTISTS) {
        await addDoc(collection(db, 'artists'), artist);
      }

      alert('성공적으로 40여 종의 시문학, 철학 단상, 물파주의 기고문 및 대표 작가 아카이브를 Firebase로 완벽히 복원 및 안전 연동 완료하였습니다!');
      await fetchData();
    } catch (err) {
      alert('복원 진행 중 오류가 발생하였습니다. 데이터 스토어 혹은 Rules 권한을 점검해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Master login check
  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '2026' || passcode === 'secret24' || passcode === 'bulhanza') {
      localStorage.setItem('BULHANZA_ADMIN_SESSION', 'active');
      setIsAuthAdmin(true);
      setPasscodeError('');
    } else {
      setPasscodeError('인증번호번호가 올바르지 않습니다.');
    }
  };

  // Google social login
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      if (res.user?.email === 'roykang007@gmail.com') {
        setIsAuthAdmin(true);
      } else {
        alert('사전에 지정된 최고 관리자 메일 계정만 접근 승인됩니다.');
        await fbSignOut(auth);
      }
    } catch (err) {
      alert('Google 인증을 불러올 수 없거나 취소되었습니다.');
    }
  };

  const handleSignOut = async () => {
    await fbSignOut(auth);
    localStorage.removeItem('BULHANZA_ADMIN_SESSION');
    setIsAuthAdmin(false);
  };

  // Admin states for modal editors
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ArchiveItem> | null>(null);

  // Artist modal editor states
  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Partial<Artist> | null>(null);
  const [editingWorkIdx, setEditingWorkIdx] = useState<number | null>(null);

  // Activity Journey details popup modal state
  const [selectedJourneyItem, setSelectedJourneyItem] = useState<ArchiveItem | null>(null);

  // Suncha promo & reviews edit modal state
  const [isTeaPromoModalOpen, setIsTeaPromoModalOpen] = useState(false);
  const [tempTeaPromo, setTempTeaPromo] = useState<Partial<SiteSettings> | null>(null);

  // Lightbox / Image Popup states for artist masterpieces (작품도록)
  const [lightboxActive, setLightboxActive] = useState(false);
  const [lightboxWorks, setLightboxWorks] = useState<Work[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxArtistName, setLightboxArtistName] = useState('');

  // Sorting states for uploaded content lists
  const [philosophySortOrder, setPhilosophySortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');
  const [poetrySortOrder, setPoetrySortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('titleDesc');
  const [journeySortOrder, setJourneySortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');
  const [mulpaSortOrder, setMulpaSortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');
  const [teaSortOrder, setTeaSortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');
  const [adminSortOrder, setAdminSortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');

  // Language Dropdown open state for both desktop and mobile
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Reset pagination when filter/sort/language changes
  useEffect(() => {
    setPoetryPage(1);
  }, [selectedBook, poetrySortOrder, lang]);

  useEffect(() => {
    setPhilosophyPage(1);
  }, [philosophyTab, philosophySortOrder, lang]);

  useEffect(() => {
    setSunchaPage(1);
  }, [sunchaFilter, teaSortOrder, lang]);

  useEffect(() => {
    setMulpaPage(1);
  }, [mulpaSortOrder, lang]);

  useEffect(() => {
    setArtistsPage(1);
  }, [lang]);

  useEffect(() => {
    setJourneyPage(1);
  }, [journeyFilter, journeySortOrder, lang]);

  useEffect(() => {
    const handleOutsideClick = () => {
      setIsLangDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Lightbox keyboard navigation & overflow prevention
  useEffect(() => {
    if (!lightboxActive) return;
    
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxActive(false);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (lightboxWorks.length > 0 ? (prev - 1 + lightboxWorks.length) % lightboxWorks.length : 0));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (lightboxWorks.length > 0 ? (prev + 1) % lightboxWorks.length : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxActive, lightboxWorks.length]);

  // Save or Edit items
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.category) return;
    try {
      const payload = {
        title: editingItem.title,
        content: editingItem.content || '',
        summary: editingItem.summary || '',
        image_url: editingItem.image_url || 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200',
        category: editingItem.category,
        poetry_collection_name: editingItem.category === 'poetry' ? (editingItem.poetry_collection_name || null) : null,
        language: editingItem.language || lang,
        created_at: editingItem.created_at || new Date().toISOString()
      };

      if (editingItem.id) {
        await updateDoc(doc(db, 'archive_items', editingItem.id), payload);
      } else {
        await addDoc(collection(db, 'archive_items'), payload);
      }

      setIsEditModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      alert('저장 권한이 없거나 필수 속성이 누락되었습니다.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('정말로 이 영단 자료를 데이터베이스에서 영구 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'archive_items', id));
      await fetchData();
    } catch (err) {
      alert('삭제 권한이 없습니다.');
    }
  };

  // Save or Edit artists
  const handleSaveArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArtist?.name || !editingArtist?.language) return;
    try {
      const payload = {
        name: editingArtist.name,
        title: editingArtist.title || '',
        bio: editingArtist.bio || '',
        image: editingArtist.image || '',
        language: editingArtist.language || lang,
        works: editingArtist.works || []
      };

      if (editingArtist.id) {
        await updateDoc(doc(db, 'artists', editingArtist.id), payload);
      } else {
        await addDoc(collection(db, 'artists'), payload);
      }

      setIsArtistModalOpen(false);
      setEditingArtist(null);
      setEditingWorkIdx(null);
      await fetchData();
    } catch (err: any) {
      console.error("Save artist failed:", err);
      alert(`작가 저장에 실패했습니다. (에러: ${err?.message || err})\nRules 혹은 세션을 점검해 주세요.`);
    }
  };

  const handleDeleteArtist = async (id: string) => {
    if (!window.confirm('정말로 이 물파작가 레코드를 데이터베이스에서 영구 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'artists', id));
      await fetchData();
    } catch (err) {
      alert('삭제 실패: 권한을 확인하세요.');
    }
  };

  // Dynamic image loaders
  const finalLogo = !siteSettings?.logo_url || 
                    siteSettings.logo_url === '/assets/logo_v2.jpg' || 
                    siteSettings.logo_url === '/assets/logo_v2.svg'
    ? '/assets/logo.png'
    : siteSettings.logo_url;
  const finalHeroBg = loading 
    ? '' 
    : (siteSettings?.hero_bg_url || 'https://images.unsplash.com/photo-1490127252417-7c393f993ee4?auto=format&fit=crop&q=80&w=1920');

  // Helper to sort dynamic content lists by title/name
  const sortItems = (items: ArchiveItem[], order: 'default' | 'titleAsc' | 'titleDesc') => {
    if (order === 'default') return items;
    return [...items].sort((a, b) => {
      const titleA = a.title || '';
      const titleB = b.title || '';
      if (order === 'titleAsc') {
        return titleA.localeCompare(titleB, lang === 'KR' ? 'ko' : lang === 'SC' ? 'zh' : 'en');
      } else {
        return titleB.localeCompare(titleA, lang === 'KR' ? 'ko' : lang === 'SC' ? 'zh' : 'en');
      }
    });
  };

  // Admin filtered items
  const filteredItems = sortItems(
    [...archiveItems]
      .sort((a, b) => getTimestampMs(b) - getTimestampMs(a))
      .filter(item => {
        // 1. Category Filter
        if (adminCategoryFilter !== 'all' && item.category !== adminCategoryFilter) {
          return false;
        }
        // 2. Keyword Search
        if (adminSearchQuery.trim()) {
          const queryClean = adminSearchQuery.toLowerCase();
          return (
            (item.title && item.title.toLowerCase().includes(queryClean)) ||
            (item.content && item.content.toLowerCase().includes(queryClean)) ||
            (item.poetry_collection_name && item.poetry_collection_name.toLowerCase().includes(queryClean))
          );
        }
        return true;
      }),
    adminSortOrder
  );

  // Seoncha intro & reviews from archive items
  const teaIntros = sortItems(
    archiveItems.filter(item => item.category === 'suncha_intro' && (item.language === lang || (!item.language && lang === 'KR'))),
    teaSortOrder
  );
  const teaReviews = sortItems(
    archiveItems.filter(item => item.category === 'suncha_review' && (item.language === lang || (!item.language && lang === 'KR'))),
    teaSortOrder
  );

  const sunchaItems = archiveItems.filter(item => {
    const isSunchaCategory = ['suncha_seo', 'suncha_hwa', 'suncha_cha', 'suncha_hyang', 'suncha_intro', 'suncha_review'].includes(item.category);
    if (!isSunchaCategory) return false;
    
    // Language filter
    const matchesLang = item.language === lang || (!item.language && lang === 'KR');
    if (!matchesLang) return false;

    // Category filter
    if (sunchaFilter === 'all') {
      return true;
    } else if (sunchaFilter === 'suncha_cha') {
      return ['suncha_cha', 'suncha_intro', 'suncha_review'].includes(item.category);
    } else {
      return item.category === sunchaFilter;
    }
  });

  const sortedSunchaItems = sortItems(
    [...sunchaItems].sort((a, b) => getTimestampMs(b) - getTimestampMs(a)),
    teaSortOrder
  );

  const isHomeDarkHeader = false;

  const pageBackgrounds: Record<string, { url: string; opacity: string }> = {
    philosophy: {
      url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1920',
      opacity: 'opacity-[0.06]'
    },
    art: {
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1920',
      opacity: 'opacity-[0.05]'
    },
    poetryCollection: {
      url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=1920',
      opacity: 'opacity-[0.07]'
    },
    tea: {
      url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&q=80&w=1920',
      opacity: 'opacity-[0.05]'
    },
    journey: {
      url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=1920',
      opacity: 'opacity-[0.05]'
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FAF9F6] text-[#1C1A17] font-sans overflow-x-hidden selection:bg-[#E5DFD3] selection:text-[#1C1A17]">
      
      {/* Dynamic Emotional Backgrounds with smooth crossfade */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ minHeight: '100%' }}>
        {Object.entries(pageBackgrounds).map(([pKey, bg]) => {
          const isActive = page === pKey;
          return (
            <div
              key={pKey}
              className={`absolute inset-0 transition-all duration-[1500ms] ease-in-out ${
                isActive ? `${bg.opacity} scale-100 rotate-0` : 'opacity-0 scale-105 pointer-events-none'
              } transform`}
            >
              <img
                src={bg.url}
                alt=""
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
              />
              {/* Overlay fade layer matching background color */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#FAF9F6] via-transparent to-[#FAF9F6] opacity-85" />
            </div>
          );
        })}
      </div>
      
      {/* Dynamic Header */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b ${
        scrolled 
          ? 'bg-[#FAF9F6]/85 backdrop-blur-md py-4 border-[#1C1A17]/10' 
          : 'bg-transparent py-6 border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          
          {/* Logo Name */}
          <button 
            id="nav-logo"
            onClick={() => setPage('home')}
            className="group flex items-center gap-2 md:gap-3.5 text-left select-none shrink-0"
          >
            <div className="h-9 md:h-11 px-1.5 py-0.5 md:px-2 md:py-1 border border-[#1C1A17]/15 bg-white rounded flex items-center justify-center transition-transform hover:scale-[1.03] duration-300 shadow-sm shrink-0">
              <img 
                src={finalLogo} 
                alt="BULHANZA"
                referrerPolicy="no-referrer"
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className={`font-serif text-xs md:text-sm tracking-[0.15em] md:tracking-[0.25em] uppercase font-bold block leading-none mb-1 transition-colors duration-300 ${
                isHomeDarkHeader ? 'text-white' : 'text-[#1C1A17]'
              }`}>BULHANZA</span>
              <p className={`text-[7.5px] md:text-[8px] tracking-[0.2em] md:tracking-[0.3em] uppercase font-mono leading-none transition-colors duration-300 ${
                isHomeDarkHeader ? 'text-white/60' : 'opacity-45 text-[#1C1A17]'
              }`}>Mind-Matter Art</p>
            </div>
          </button>
 
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-[18px] tracking-[0.12em] font-extrabold">
            {(Object.keys(t.nav) as Page[]).filter(p => p !== 'contact').map((p) => (
              <button
                key={p}
                id={`nav-${p}`}
                onClick={() => setPage(p)}
                className={`relative py-1 transition-colors duration-300 ${
                  isHomeDarkHeader 
                    ? page === p ? 'text-white' : 'text-white/70 hover:text-white'
                    : page === p ? 'text-[#1C1A17]' : 'text-[#1C1A17]/70 hover:text-black'
                }`}
              >
                {t.nav[p]}
                {page === p && (
                  <motion.span 
                    layoutId="activeHeaderLine"
                    className={`absolute bottom-0 left-0 right-0 h-[2.5px] ${
                      isHomeDarkHeader ? 'bg-white' : 'bg-[#1C1A17]'
                    }`}
                  />
                )}
              </button>
            ))}
          </nav>
 
          {/* Language Toggle & Burger */}
          <div className="flex items-center gap-4">
            
            {/* Lang Dropdown Select */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setIsLangDropdownOpen(!isLangDropdownOpen);
              }}
              className={`relative group/lang font-bold text-[10px] tracking-widest border rounded-full px-3 py-1 flex items-center gap-1 transition-[colors,border,background-color] cursor-pointer select-none ${
                isHomeDarkHeader 
                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40' 
                  : 'bg-white border-[#1C1A17]/15 text-[#1C1A17] hover:border-[#1C1A17]/40'
              }`}
            >
              <span>Language</span>
              <ChevronDown size={11} className={isHomeDarkHeader ? 'opacity-75 text-white' : 'opacity-40 text-[#1C1A17]'} />
              
              <div className={`absolute right-0 top-full pt-1 min-w-[70px] z-[100] ${isLangDropdownOpen ? 'block' : 'hidden group-hover/lang:block'}`}>
                <div className="bg-[#FAF9F6] border border-[#1C1A17]/10 shadow-lg rounded-lg overflow-hidden flex flex-col font-mono text-black">
                  <button 
                    onClick={() => setLang('KR')}
                    className="px-3 py-2 text-left hover:bg-[#E5DFD3] transition-colors"
                  >
                    한국어
                  </button>
                  <button 
                    onClick={() => setLang('SC')}
                    className="px-3 py-2 text-left hover:bg-[#E5DFD3] transition-colors"
                  >
                    中文(简体)
                  </button>
                  <button 
                    onClick={() => setLang('EN')}
                    className="px-3 py-2 text-left hover:bg-[#E5DFD3] transition-colors"
                  >
                    ENGLISH
                  </button>
                </div>
              </div>
            </div>
 
            {/* Mobile Menu Icon */}
            <button 
              id="mobile-menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`lg:hidden p-1 transition-colors duration-300 ${
                isHomeDarkHeader ? 'text-white hover:text-white/80' : 'text-[#1C1A17] hover:opacity-75'
              }`}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full inset-x-0 bg-[#FAF9F6] border-b border-[#1C1A17]/10 py-8 px-10 flex flex-col gap-5 shadow-xl z-40 lg:hidden"
            >
              {(Object.keys(t.nav) as Page[]).filter(p => p !== 'contact').map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPage(p);
                    setIsMenuOpen(false);
                  }}
                  className={`text-left text-[20px] tracking-[0.15em] uppercase py-3 font-extrabold border-b border-[#1C1A17]/10 ${
                    page === p ? 'text-black font-black' : 'text-black/60'
                  }`}
                >
                  {t.nav[p]}
                </button>
              ))}

              {/* Dedicated Mobile Language Switcher block */}
              <div className="pt-4 flex flex-col gap-3">
                <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/45 font-bold uppercase">
                  {lang === 'KR' ? '언어 선택 (Language)' : lang === 'SC' ? '选择语言 (Language)' : 'Select Language'}
                </span>
                <div className="flex gap-2">
                  {(['KR', 'SC', 'EN'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setLang(l);
                        setIsMenuOpen(false);
                      }}
                      className={`px-4 py-2 text-xs font-bold tracking-widest rounded-full border transition-all ${
                        lang === l
                          ? 'bg-[#1C1A17] border-[#1C1A17] text-[#FAF9F6]'
                          : 'bg-white border-[#1C1A17]/15 text-[#1C1A17]'
                      }`}
                    >
                      {l === 'KR' ? '한국어' : l === 'SC' ? '中文(简体)' : 'ENGLISH'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Pages Switch */}
      <main className="pt-28 min-h-screen">
        <AnimatePresence mode="wait">
          
          {/* HOME PAGE */}
          {page === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full -mt-28"
            >
              {/* Immersive background image with advanced vignette and overlay filters */}
              <div className="absolute inset-0 z-0 overflow-hidden bg-[#FAF9F6]">
                {finalHeroBg && (
                  <img 
                    src={finalHeroBg} 
                    alt="Immersive Backdrop" 
                    className="w-full h-full object-cover scale-100 brightness-[0.95] contrast-[1.02] opacity-35 transition-transform duration-[4000ms] ease-out"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-[#FAF9F6]/80 via-transparent to-[#FAF9F6]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,249,246,0.8),transparent_95%)]" />
              </div>

              {/* Gentle Snowy Falling Leaves Overlay */}
              <FallingLeaves />

              <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-36 md:pt-44 pb-32 flex flex-col justify-between min-h-screen">
                
                {/* Hero Headline content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-8">
                  
                  {/* Left Column - Empty top space, with Sub-copies and actions aligned at the bottom */}
                  <div className="lg:col-span-7 flex flex-col justify-end min-h-[360px] space-y-8 text-left">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1C1A17]/10 bg-[#1C1A17]/5 self-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1C1A17] animate-pulse" />
                      <span className="text-[9px] tracking-[0.3em] uppercase text-[#1C1A17] font-mono font-bold">ESTABLISHED 1997</span>
                    </div>

                    <div className="space-y-6">
                      {/* Sub-copies placed and aligned at the bottom of the Hero section */}
                      <p className="text-base md:text-xl font-serif text-[#1C1A17]/85 leading-relaxed font-normal max-w-xl whitespace-pre-line">
                        {t.hero.subtitle}
                      </p>
                      
                      <div className="pt-2 flex flex-wrap gap-4">
                        <button 
                          id="hero-explore-btn"
                          onClick={() => setPage('philosophy')}
                          className="px-8 py-4 bg-[#1C1A17] text-white hover:bg-neutral-800 hover:scale-105 active:scale-95 text-[10px] tracking-[0.3em] uppercase transition-all flex items-center gap-3 rounded-full font-bold shadow-lg shadow-black/10"
                        >
                          <Compass size={14} /> {t.hero.cta}
                        </button>
                        <button 
                          id="hero-tea-btn"
                          onClick={() => setPage('tea')}
                          className="px-8 py-4 border border-[#1C1A17]/25 text-[#1C1A17] bg-transparent hover:bg-[#1C1A17] hover:text-white hover:scale-105 active:scale-95 text-[10px] tracking-[0.3em] uppercase transition-all rounded-full font-bold"
                        >
                          {translations[lang].nav.tea}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Premium Hanging Calligraphy Scroll Frame (세로형 액자) */}
                  <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-end py-6">
                    <div className="relative border-[10px] border-[#2C231E] bg-[#FCFAF2] p-4 md:p-6 shadow-2xl flex flex-col items-center justify-center rounded-sm max-w-xs w-64 md:w-72">
                      {/* Hanging Scroll string detail */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#2C231E]" />
                        <div className="w-0.5 h-6 bg-[#2C231E]" />
                      </div>
                      
                      {/* Inner Parchment Scroll */}
                      <div className="w-full aspect-[2/3.8] bg-white border border-[#2C231E]/10 p-4 md:p-6 flex flex-col justify-between shadow-inner relative overflow-hidden min-h-[380px]">
                        <img 
                          src="/assets/mainsub.jpg" 
                          alt="Calligraphy Scroll" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Wooden rollers detail at the bottom */}
                      <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-[105%] h-7 bg-[#2C231E] rounded-full shadow-md flex justify-between px-2">
                        <div className="w-3.5 h-full bg-[#1C1A17] rounded-full" />
                        <div className="w-3.5 h-full bg-[#1C1A17] rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Elegant Translucent Bento Blocks with Dark Borders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-16 border-t border-[#1C1A17]/10 mt-16">
                  
                  {/* Card 1 */}
                  <div 
                    onClick={() => setPage('philosophy')} 
                    className="group p-8 bg-white/60 backdrop-blur-md border border-[#1C1A17]/10 rounded-2xl hover:border-[#1C1A17]/35 hover:bg-white/90 hover:shadow-xl transition-all duration-300 cursor-pointer text-left space-y-5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1C1A17]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-12 h-12 rounded-xl bg-[#1C1A17]/5 border border-[#1C1A17]/10 flex items-center justify-center text-[#1C1A17] group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <Activity size={18} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-serif text-lg text-[#1C1A17] font-bold tracking-wide flex items-center gap-2">
                        {t.nav.philosophy}
                        <span className="text-[9px] font-mono text-[#1C1A17]/60 border border-[#1C1A17]/20 px-1.5 py-0.5 rounded uppercase">MIND</span>
                      </h3>
                      <p className="text-xs text-[#1C1A17]/70 leading-relaxed font-sans line-clamp-3">{t.philosophy.text}</p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono font-bold tracking-widest text-[#1C1A17]/40 group-hover:text-black transition-colors flex items-center gap-1.5">
                      EXPLORE DOCTRINE <span className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div 
                    onClick={() => setPage('art')} 
                    className="group p-8 bg-white/60 backdrop-blur-md border border-[#1C1A17]/10 rounded-2xl hover:border-[#1C1A17]/35 hover:bg-white/90 hover:shadow-xl transition-all duration-300 cursor-pointer text-left space-y-5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1C1A17]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-12 h-12 rounded-xl bg-[#1C1A17]/5 border border-[#1C1A17]/10 flex items-center justify-center text-[#1C1A17] group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <Sparkles size={18} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-serif text-lg text-[#1C1A17] font-bold tracking-wide flex items-center gap-2">
                        {t.nav.art}
                        <span className="text-[9px] font-mono text-[#1C1A17]/60 border border-[#1C1A17]/20 px-1.5 py-0.5 rounded uppercase">SPACE</span>
                      </h3>
                      <p className="text-xs text-[#1C1A17]/70 leading-relaxed font-sans line-clamp-3">{t.art.intro}</p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono font-bold tracking-widest text-[#1C1A17]/40 group-hover:text-black transition-colors flex items-center gap-1.5">
                      VIEW MASTERPIECES <span className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div 
                    onClick={() => setPage('tea')} 
                    className="group p-8 bg-white/60 backdrop-blur-md border border-[#1C1A17]/10 rounded-2xl hover:border-[#1C1A17]/35 hover:bg-white/90 hover:shadow-xl transition-all duration-300 cursor-pointer text-left space-y-5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1C1A17]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-12 h-12 rounded-xl bg-[#1C1A17]/5 border border-[#1C1A17]/10 flex items-center justify-center text-[#1C1A17] group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <BookOpen size={18} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-serif text-lg text-[#1C1A17] font-bold tracking-wide flex items-center gap-2">
                        {t.nav.tea}
                        <span className="text-[9px] font-mono text-[#1C1A17]/60 border border-[#1C1A17]/20 px-1.5 py-0.5 rounded uppercase">TEA</span>
                      </h3>
                      <p className="text-xs text-[#1C1A17]/70 leading-relaxed font-sans line-clamp-3">{t.tea.storyContent}</p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono font-bold tracking-widest text-[#1C1A17]/40 group-hover:text-black transition-colors flex items-center gap-1.5">
                      SUNCHATEA CEREMONY <span className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* PHILOSOPHY PAGE */}
          {page === 'philosophy' && (
            <motion.div 
              key="philosophy"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 pb-32 text-left"
            >
              {/* Header */}
              <div className="text-center mb-10 space-y-2">
                <span className="text-xs tracking-[0.3em] uppercase opacity-60 font-mono font-bold block">{t.philosophy.subtitle}</span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#1C1A17] font-bold tracking-tight">{t.philosophy.title}</h2>
                <div className="w-16 h-px bg-[#1C1A17]/25 mx-auto mt-4" />
              </div>

              {/* Sub-categories/Tabs at the top */}
              <div className="flex flex-wrap gap-2 md:gap-3 justify-center mb-12 bg-[#FAF9F6] p-3 rounded-2xl border border-[#1C1A17]/10 shadow-inner">
                <button
                  onClick={() => {
                    setPhilosophyTab('chapters');
                    setReadingPhilosophy(null);
                  }}
                  className={`text-sm sm:text-base md:text-lg font-serif font-bold py-2 px-5 rounded-xl transition-all duration-300 shadow-sm border ${
                    philosophyTab === 'chapters'
                      ? 'bg-[#1C1A17] text-[#FAF9F6] border-[#1C1A17]'
                      : 'bg-white text-black/70 border-[#1C1A17]/15 hover:border-[#1C1A17]/40 hover:bg-[#FAF9F6]'
                  }`}
                >
                  {lang === 'KR' ? '심물철학 강론 (Chapters)' : lang === 'SC' ? '心物哲学讲义' : 'Philosophy Chapters'}
                </button>
                <button
                  onClick={() => {
                    setPhilosophyTab('essays');
                    setReadingPhilosophy(null);
                  }}
                  className={`text-sm sm:text-base md:text-lg font-serif font-bold py-2 px-5 rounded-xl transition-all duration-300 shadow-sm border ${
                    philosophyTab === 'essays'
                      ? 'bg-[#1C1A17] text-[#FAF9F6] border-[#1C1A17]'
                      : 'bg-white text-black/70 border-[#1C1A17]/15 hover:border-[#1C1A17]/40 hover:bg-[#FAF9F6]'
                  }`}
                >
                  {lang === 'KR' ? '학술 단상 및 기록 (Essays)' : lang === 'SC' ? '学术随笔与感悟' : 'Writings & Essays'}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!readingPhilosophy ? (
                  <motion.div
                    key="philosophy-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-12"
                  >
                    {philosophyTab === 'chapters' ? (
                      /* CHAPTERS TAB */
                      <div className="space-y-12 animate-fadeIn">
                        {/* Elegant Atmospheric Philosophy Cover Banner */}
                        <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-12 relative border border-[#1C1A17]/10 shadow-lg group select-none">
                          <img 
                            src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1200" 
                            alt="Philosophy Banner" 
                            className="w-full h-full object-cover brightness-[0.85] contrast-[1.05] transition-transform duration-[4000ms] group-hover:scale-103"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                          <div className="absolute bottom-6 left-6 text-white text-left space-y-1">
                            <span className="text-[9px] tracking-[0.3em] font-mono text-white/70 uppercase block font-bold">Mind-Matter Philosophy</span>
                            <h3 className="font-serif text-lg md:text-2xl font-normal text-white drop-shadow-md">
                              {lang === 'KR' ? '심물지철 (心物之哲) ㆍ 우주와의 거룩한 교감' : lang === 'SC' ? '心物之哲 ㆍ 与宇宙的神圣交融' : 'Mind & Matter Philosophy'}
                            </h3>
                          </div>
                        </div>

                        {/* Beautiful drop cap layout */}
                        <div className="prose prose-stone max-w-none mb-12 justified-text">
                          <p className="drop-cap text-lg md:text-xl leading-[1.8] text-[#1C1A17] font-serif italic">
                            {t.philosophy.text}
                          </p>
                        </div>

                        {/* Chapters Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {t.philosophy.chapters.map((chap, idx) => {
                            const chapterImages = [
                              'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=600', // Wave
                              'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=600', // Forest
                              'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=600'  // Garden
                            ];
                            const imgUrl = chapterImages[idx] || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=600';
                            const displaySummary = getDisplaySummary({ content: chap.content }, 150);

                            const mockChapterPost = {
                              id: `static-chapter-${idx}`,
                              title: chap.title,
                              content: chap.content,
                              image_url: imgUrl,
                              created_at: '1997-01-01T00:00:00Z',
                              category: 'philosophy_static',
                              summary: lang === 'KR' ? '물파주의 심물철학 핵심 강론' : 'Core Doctrine of Mind-Matter Philosophy',
                            };

                            return (
                              <div
                                key={mockChapterPost.id}
                                onClick={() => setReadingPhilosophy(mockChapterPost as any)}
                                className="group bg-white border border-[#1C1A17]/10 p-6 rounded-2xl hover:shadow-2xl hover:border-[#1C1A17]/45 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:scale-[1.01]"
                              >
                                <div className="space-y-4">
                                  <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-gray-50 border border-[#1C1A17]/5 shadow-inner relative">
                                    <img 
                                      src={imgUrl} 
                                      alt={chap.title} 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute top-3 left-3 bg-[#1C1A17] text-white text-[9px] font-serif px-2.5 py-0.5 rounded font-bold uppercase tracking-widest">
                                      {lang === 'KR' ? `강론 제${idx + 1}장` : `Chapter ${idx + 1}`}
                                    </div>
                                  </div>

                                  <div className="space-y-2 text-left">
                                    <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 block uppercase font-bold">
                                      {lang === 'KR' ? '물파주의 사상 강론' : 'Mulpa Philosophy Doctrine'}
                                    </span>
                                    <h3 className="font-serif text-lg sm:text-xl font-bold text-black group-hover:text-amber-800 transition-colors truncate">
                                      {chap.title}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-[#1C1A17]/70 leading-relaxed font-serif line-clamp-3 h-14 overflow-hidden text-justify">
                                      {displaySummary}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-[#1C1A17]/5 flex justify-between items-center text-[9px] tracking-widest uppercase font-mono font-bold text-[#1C1A17]/40 group-hover:text-[#1C1A17] transition-colors">
                                  <span>VIEW CHAPTER</span>
                                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    {lang === 'KR' ? '강론 읽기' : 'Read Chapter'} <ChevronRight size={12} />
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* ESSAYS TAB */
                      <div className="space-y-8 animate-fadeIn">
                        {/* Header Controls for Essays */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#1C1A17]/15">
                          <div>
                            <h3 className="font-serif text-xl md:text-2xl font-bold text-black flex items-center gap-3">
                              {lang === 'KR' ? '학술 단상 및 집필 기록' : lang === 'SC' ? '学术感悟与执笔记录' : 'Academic Writings & Archive'}
                              <button
                                onClick={() => handleWriteClick('philosophy')}
                                className="px-3.5 py-1.5 bg-[#1C1A17] hover:bg-black text-white text-[10px] tracking-widest font-bold uppercase rounded flex items-center gap-1 transition-colors"
                              >
                                <PenTool size={11} />
                                {lang === 'KR' ? '새 글 작성' : 'Write'}
                              </button>
                            </h3>
                            <p className="text-xs text-black/50 mt-1 uppercase tracking-wider font-mono">
                              {lang === 'KR' ? '기록보관소의 심물철학 연구 단상 목록입니다' : 'Dynamic philosophical research notes'}
                            </p>
                          </div>

                          {/* Sort Controller */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold uppercase shrink-0">
                              {lang === 'KR' ? '정렬 방식' : 'Sort Order'}
                            </span>
                            <div className="flex gap-1 bg-white border border-[#1C1A17]/10 p-0.5 rounded-md inline-flex">
                              <button
                                onClick={() => setPhilosophySortOrder('default')}
                                className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold ${
                                  philosophySortOrder === 'default'
                                    ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                    : 'text-black/50 hover:bg-neutral-50'
                                }`}
                              >
                                {lang === 'KR' ? '최신순' : 'Latest'}
                              </button>
                              <button
                                onClick={() => setPhilosophySortOrder('titleDesc')}
                                className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                                  philosophySortOrder === 'titleDesc'
                                    ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                    : 'text-black/50 hover:bg-neutral-50'
                                }`}
                              >
                                ▼ {lang === 'KR' ? '내림차순' : 'Z-A'}
                              </button>
                              <button
                                onClick={() => setPhilosophySortOrder('titleAsc')}
                                className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                                  philosophySortOrder === 'titleAsc'
                                    ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                    : 'text-black/50 hover:bg-neutral-50'
                                }`}
                              >
                                ▲ {lang === 'KR' ? '오름차순' : 'A-Z'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {archiveItems.filter(item => item.category === 'philosophy' && (item.language === lang || !item.language)).length === 0 ? (
                          <div className="text-center py-24 bg-white border-2 border-dashed border-[#1C1A17]/10 rounded-2xl text-neutral-400 font-serif text-base italic">
                            {lang === 'KR' 
                              ? '등록된 심물철학 단상이 없습니다. 관리자 대시보드에서 새로운 글을 등록하실 수 있습니다.' 
                              : lang === 'SC'
                              ? '暂无已登记的心物哲学随笔。您可以在管理员控制台发布新文章。'
                              : 'No philosophy reflections found in this collection. Feel free to register one.'}
                          </div>
                        ) : (
                          <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                              {(() => {
                                const filteredPhilosophyEssays = sortItems(
                                  [...archiveItems]
                                    .filter(item => item.category === 'philosophy' && (item.language === lang || !item.language))
                                    .sort((a, b) => getTimestampMs(b) - getTimestampMs(a)),
                                  philosophySortOrder
                                );
                                const totalPhilosophyPages = Math.ceil(filteredPhilosophyEssays.length / 15);
                                const paginatedPhilosophyEssays = filteredPhilosophyEssays.slice((philosophyPage - 1) * 15, philosophyPage * 15);

                                return paginatedPhilosophyEssays.map((post) => {
                                  const displaySummary = getDisplaySummary(post, 150);
                                  return (
                                    <div 
                                      key={post.id} 
                                      onClick={() => setReadingPhilosophy(post)}
                                      className="group bg-white border border-[#1C1A17]/10 p-6 rounded-2xl hover:shadow-2xl hover:border-[#1C1A17]/35 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:scale-[1.01] text-left"
                                    >
                                      <div className="space-y-4">
                                        <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-gray-50 border border-[#1C1A17]/5 shadow-inner relative">
                                          <img 
                                            src={post.image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=600'} 
                                            alt={post.title} 
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              const parent = e.currentTarget.parentElement;
                                              if (parent) parent.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 uppercase font-bold">
                                            {formatFullDate(post.created_at)}
                                          </span>
                                          <h4 className="font-serif text-lg font-bold text-black group-hover:text-amber-800 transition-colors line-clamp-1">{post.title}</h4>
                                          <p className="text-xs sm:text-sm text-[#1C1A17]/70 leading-relaxed font-serif line-clamp-3 h-14 overflow-hidden text-justify">
                                            {displaySummary}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="pt-4 border-t border-[#1C1A17]/5 mt-6 flex justify-between items-center text-[9px] tracking-widest uppercase font-mono font-bold text-neutral-400 group-hover:text-black transition-all">
                                        <span>{lang === 'KR' ? '학술 단상' : 'Essay'}</span>
                                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                          {lang === 'KR' ? '자세히 보기' : 'Read details'} <ChevronRight size={12} />
                                        </span>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                            {(() => {
                              const filteredPhilosophyEssays = sortItems(
                                [...archiveItems]
                                  .filter(item => item.category === 'philosophy' && (item.language === lang || !item.language))
                                  .sort((a, b) => getTimestampMs(b) - getTimestampMs(a)),
                                philosophySortOrder
                              );
                              const totalPhilosophyPages = Math.ceil(filteredPhilosophyEssays.length / 15);
                              return (
                                <Pagination 
                                  currentPage={philosophyPage} 
                                  totalPages={totalPhilosophyPages} 
                                  onPageChange={setPhilosophyPage} 
                                  lang={lang} 
                                />
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* PHILOSOPHY DETAIL VIEW */
                  <motion.div 
                    key="philosophy-detail"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border border-[#1C1A17]/10 p-8 md:p-12 rounded-2xl shadow-lg space-y-8 text-left max-w-3xl mx-auto"
                  >
                    <div className="border-b border-[#1C1A17]/10 pb-6">
                      <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-black/40 block mb-1">
                        {readingPhilosophy.category === 'philosophy_static'
                          ? (lang === 'KR' ? '심물철학 강론' : 'Mind-Matter Philosophy Chapters')
                          : (lang === 'KR' ? '심물철학 학술 단상' : 'Mind-Matter Essays & Reflections')}
                      </span>
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold text-black">{readingPhilosophy.title}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-[10px] text-[#1C1A17]/60">
                          {formatFullDate(readingPhilosophy.created_at)}
                        </span>
                      </div>
                    </div>

                    {readingPhilosophy.summary && (
                      <p className="text-xs md:text-sm font-semibold text-[#1C1A17]/85 font-sans border-l-2 border-[#1C1A17]/30 pl-3 leading-relaxed">
                        {readingPhilosophy.summary}
                      </p>
                    )}

                    <div className="prose prose-stone max-w-none text-sm md:text-base leading-[1.8] text-[#1C1A17]/90 font-sans break-words bg-[#FAF9F6] border border-[#1C1A17]/5 p-6 rounded [&_p]:my-0 [&_p]:mb-5 last:[&_p]:mb-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                        {readingPhilosophy.content || ''}
                      </ReactMarkdown>

                      {readingPhilosophy.image_url && (
                        <div className="mt-8 flex justify-center w-full">
                          <img 
                            src={readingPhilosophy.image_url} 
                            alt={readingPhilosophy.title} 
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-[350px] md:max-h-[480px] h-auto object-contain rounded border border-[#1C1A17]/10 p-1.5 bg-white shadow-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) parent.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Detail bottom actions footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#1C1A17]/10">
                      <button
                        onClick={() => setReadingPhilosophy(null)}
                        className="px-5 py-2.5 border border-[#1C1A17]/20 text-[#1C1A17] hover:bg-neutral-50 rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <List size={14} />
                        {lang === 'KR' ? '목록으로' : 'Back to List'}
                      </button>

                      {/* Previous / Next buttons in the center */}
                      <div className="flex justify-center text-center flex-1 max-w-lg">
                        {(() => {
                          if (readingPhilosophy.category === 'philosophy_static') {
                            const currentChapterIdx = parseInt(readingPhilosophy.id.replace('static-chapter-', ''));
                            const chapterImages = [
                              'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=600',
                              'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=600',
                              'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=600'
                            ];
                            const nextChapterIdx = currentChapterIdx + 1;
                            const prevChapterIdx = currentChapterIdx - 1;

                            const prevChap = prevChapterIdx >= 0 ? t.philosophy.chapters[prevChapterIdx] : null;
                            const nextChap = nextChapterIdx < t.philosophy.chapters.length ? t.philosophy.chapters[nextChapterIdx] : null;

                            const prevMockPost = prevChap ? {
                              id: `static-chapter-${prevChapterIdx}`,
                              title: prevChap.title,
                              content: prevChap.content,
                              image_url: chapterImages[prevChapterIdx],
                              created_at: '1997-01-01T00:00:00Z',
                              category: 'philosophy_static',
                              summary: lang === 'KR' ? '물파주의 심물철학 핵심 강론' : 'Core Doctrine of Mind-Matter Philosophy',
                            } : null;

                            const nextMockPost = nextChap ? {
                              id: `static-chapter-${nextChapterIdx}`,
                              title: nextChap.title,
                              content: nextChap.content,
                              image_url: chapterImages[nextChapterIdx],
                              created_at: '1997-01-01T00:00:00Z',
                              category: 'philosophy_static',
                              summary: lang === 'KR' ? '물파주의 심물철학 핵심 강론' : 'Core Doctrine of Mind-Matter Philosophy',
                            } : null;

                            return (
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center w-full">
                                {prevMockPost ? (
                                  <button
                                    onClick={() => setReadingPhilosophy(prevMockPost as any)}
                                    className="group flex items-center gap-1.5 font-serif text-xs text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                                  >
                                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                    <span>{lang === 'KR' ? '이전장' : 'Prev Ch.'}</span>
                                    <span className="underline max-w-[120px] sm:max-w-[150px] truncate block font-normal text-black/70">
                                      {prevMockPost.title}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="font-serif text-[11px] italic text-neutral-400">
                                    {lang === 'KR' ? '첫 번째 장입니다' : 'First chapter'}
                                  </span>
                                )}

                                <span className="hidden sm:inline text-neutral-300">|</span>

                                {nextMockPost ? (
                                  <button
                                    onClick={() => setReadingPhilosophy(nextMockPost as any)}
                                    className="group flex items-center gap-1.5 font-serif text-xs text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                                  >
                                    <span>{lang === 'KR' ? '다음장' : 'Next Ch.'}</span>
                                    <ChevronRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                                    <span className="underline max-w-[120px] sm:max-w-[150px] truncate block font-normal text-black/70">
                                      {nextMockPost.title}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="font-serif text-[11px] italic text-neutral-400">
                                    {lang === 'KR' ? '마지막 장입니다' : 'End of chapters'}
                                  </span>
                                )}
                              </div>
                            );
                          } else {
                            const sortedPhilosophyPosts = sortItems(
                              [...archiveItems]
                                .filter(item => item.category === 'philosophy' && (item.language === lang || !item.language))
                                .sort((a, b) => getTimestampMs(b) - getTimestampMs(a)),
                              philosophySortOrder
                            );
                            const currentIdx = sortedPhilosophyPosts.findIndex(p => p.id === readingPhilosophy.id);
                            const nextPost = currentIdx !== -1 && currentIdx + 1 < sortedPhilosophyPosts.length 
                              ? sortedPhilosophyPosts[currentIdx + 1] 
                              : null;
                            const prevPost = currentIdx > 0 
                              ? sortedPhilosophyPosts[currentIdx - 1] 
                              : null;

                            return (
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center w-full">
                                {prevPost ? (
                                  <button
                                    onClick={() => setReadingPhilosophy(prevPost)}
                                    className="group flex items-center gap-1.5 font-serif text-xs text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                                  >
                                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                    <span>{lang === 'KR' ? '이전글' : 'Prev'}</span>
                                    <span className="underline max-w-[120px] sm:max-w-[150px] truncate block font-normal text-black/70">
                                      {prevPost.title}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="font-serif text-[11px] italic text-neutral-400">
                                    {lang === 'KR' ? '첫 번째 글입니다' : 'First post'}
                                  </span>
                                )}

                                <span className="hidden sm:inline text-neutral-300">|</span>

                                {nextPost ? (
                                  <button
                                    onClick={() => setReadingPhilosophy(nextPost)}
                                    className="group flex items-center gap-1.5 font-serif text-xs text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                                  >
                                    <span>{lang === 'KR' ? '다음글' : 'Next'}</span>
                                    <ChevronRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                                    <span className="underline max-w-[120px] sm:max-w-[150px] truncate block font-normal text-black/70">
                                      {nextPost.title}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="font-serif text-[11px] italic text-neutral-400">
                                    {lang === 'KR' ? '마지막 글입니다' : 'End of collection'}
                                  </span>
                                )}
                              </div>
                            );
                          }
                        })()}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {isUserAuthorized && readingPhilosophy.category !== 'philosophy_static' && (
                          <button
                            onClick={() => {
                              handleEditClick(readingPhilosophy);
                            }}
                            className="px-5 py-2.5 border border-amber-600 text-amber-700 hover:bg-amber-50 rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Edit2 size={14} />
                            {lang === 'KR' ? '수정' : 'Edit'}
                          </button>
                        )}
                        {readingPhilosophy.category !== 'philosophy_static' && (
                          <button
                            onClick={() => handleWriteClick('philosophy')}
                            className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <PenTool size={14} />
                            {lang === 'KR' ? '글쓰기' : 'Write'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ART / AESTHETICS PAGE (물파공간) */}
          {page === 'art' && (
            <motion.div 
              key="art"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-6xl mx-auto px-6 md:px-12 pb-32 text-left"
            >
              {/* Header section */}
              <div className="text-center mb-12 space-y-2">
                <span className="text-[10px] tracking-[0.4em] uppercase opacity-45 font-mono">{t.art.subtitle}</span>
                <h2 className="text-3xl md:text-5xl font-serif text-[#1C1A17] font-normal">{t.art.title}</h2>
                <div className="w-12 h-px bg-[#1C1A17]/25 mx-auto mt-6" />
              </div>

              {/* Elegant Atmospheric Art Cover Banner */}
              <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-12 relative border border-[#1C1A17]/10 shadow-lg group select-none">
                <img 
                  src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=1200" 
                  alt="Art Banner" 
                  className="w-full h-full object-cover brightness-[0.85] contrast-[1.05] transition-transform duration-[4000ms] group-hover:scale-103"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white text-left space-y-1">
                  <span className="text-[9px] tracking-[0.3em] font-mono text-white/70 uppercase block font-bold">Visualizing Resonance</span>
                  <h3 className="font-serif text-lg md:text-2xl font-normal text-white drop-shadow-md">
                    {lang === 'KR' ? '물파공간 (物波空間) ㆍ 우주적 파동의 흔적' : lang === 'SC' ? '物波空间 ㆍ 宇宙波动的轨迹' : 'Mulpa Art Resonance'}
                  </h3>
                </div>
              </div>

              {/* Sub-navigation tabs */}
              <div className="flex flex-wrap gap-2 md:gap-3 justify-center mb-12 bg-[#FAF9F6] p-3 rounded-2xl border border-[#1C1A17]/10 shadow-inner">
                <button 
                  onClick={() => setArtSubTab('doctrine')}
                  className={`text-sm sm:text-base md:text-lg font-serif font-bold py-2 px-4 md:px-5 rounded-xl transition-all duration-300 shadow-sm border ${
                    artSubTab === 'doctrine' 
                      ? 'bg-[#1C1A17] text-[#FAF9F6] border-[#1C1A17]' 
                      : 'bg-white text-black/70 border-[#1C1A17]/15 hover:border-[#1C1A17]/40 hover:bg-[#FAF9F6]'
                  }`}
                >
                  {lang === 'KR' ? '물파주의' : lang === 'SC' ? '物波主义' : 'Mulpaism'}
                </button>
                <button 
                  onClick={() => setArtSubTab('artists')}
                  className={`text-sm sm:text-base md:text-lg font-serif font-bold py-2 px-4 md:px-5 rounded-xl transition-all duration-300 shadow-sm border ${
                    artSubTab === 'artists' 
                      ? 'bg-[#1C1A17] text-[#FAF9F6] border-[#1C1A17]' 
                      : 'bg-white text-black/70 border-[#1C1A17]/15 hover:border-[#1C1A17]/40 hover:bg-[#FAF9F6]'
                  }`}
                >
                  {lang === 'KR' ? '물파작가' : lang === 'SC' ? '物波艺术家' : 'Mulpa Artists'}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {artSubTab === 'doctrine' ? (
                  <motion.div
                    key="doctrine-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-16"
                  >
                    {/* Manifesto info cards */}
                    <div className="bg-white border border-[#1C1A17]/10 p-8 md:p-12 shadow-xl rounded space-y-8 justified-text">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                          <h3 className="font-serif text-2xl font-bold uppercase tracking-wide text-black">{t.art.whyTitle}</h3>
                          <p className="text-xs leading-[1.8] text-[#1C1A17]/85 font-sans font-normal antialiased">
                            {t.art.whyContent}
                          </p>
                        </div>
                        <div className="space-y-6 bg-[#FAF9F6] border border-[#1C1A17]/5 p-6 rounded">
                          <h3 className="font-serif text-lg font-bold uppercase tracking-wide text-black">{t.art.mulpaismTitle}</h3>
                          <p className="text-[11px] leading-[1.8] text-[#1C1A17]/75 font-sans whitespace-pre-line">
                            {t.art.mulpaismDeclaration}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Mulpaism Writings/Essays */}
                    <div className="space-y-8">
                      <div className="border-b border-[#1C1A17]/10 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                          <h3 className="font-serif text-xl md:text-2xl font-semibold text-black">
                            {lang === 'KR' ? '물파주의 기고문 및 학술 고찰' : lang === 'SC' ? '物波主义论文与学术探讨' : 'Mulpa Doctrine Essays'}
                          </h3>
                          <p className="text-xs text-black/50 mt-1 uppercase tracking-wider font-mono">Dynamic academic collection</p>
                        </div>

                        {/* Sort Controller */}
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold uppercase shrink-0">
                            {lang === 'KR' ? '정렬 방식' : 'Sort Order'}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setMulpaSortOrder('default')}
                              className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold ${
                                mulpaSortOrder === 'default'
                                  ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                  : 'bg-white border border-[#1C1A17]/10 text-black/50 hover:bg-neutral-50'
                              }`}
                            >
                              {lang === 'KR' ? '기본순' : 'Default'}
                            </button>
                            <button
                              onClick={() => setMulpaSortOrder('titleAsc')}
                              className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                                mulpaSortOrder === 'titleAsc'
                                  ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                  : 'bg-white border border-[#1C1A17]/10 text-black/50 hover:bg-neutral-50'
                              }`}
                            >
                              ▲ A-Z
                            </button>
                            <button
                              onClick={() => setMulpaSortOrder('titleDesc')}
                              className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                                mulpaSortOrder === 'titleDesc'
                                  ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                  : 'bg-white border border-[#1C1A17]/10 text-black/50 hover:bg-neutral-50'
                              }`}
                            >
                              ▼ Z-A
                            </button>
                          </div>
                        </div>
                      </div>

                      {!readingMulpa ? (
                        archiveItems.filter(item => item.category === 'mulpa' && (item.language === lang || !item.language)).length === 0 ? (
                          <div className="text-center py-12 bg-[#FAF9F6] border border-dashed border-[#1C1A17]/15 rounded text-xs text-black/45 font-mono">
                            {lang === 'KR' ? '게재된 물파주의 글이 없습니다. 관리자 대시보드에서 등록해 주세요.' : 'No writings found in this collection. Please check manager.'}
                          </div>
                        ) : (
                          <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {(() => {
                                const filteredMulpaArticles = sortItems(
                                  archiveItems.filter(item => item.category === 'mulpa' && (item.language === lang || !item.language)),
                                  mulpaSortOrder
                                );
                                const totalMulpaPages = Math.ceil(filteredMulpaArticles.length / 10);
                                const paginatedMulpaArticles = filteredMulpaArticles.slice((mulpaPage - 1) * 10, mulpaPage * 10);

                                return paginatedMulpaArticles.map((article) => (
                                  <div 
                                    key={article.id} 
                                    onClick={() => setReadingMulpa(article)}
                                    className="group bg-white border border-[#1C1A17]/10 p-6 md:p-8 rounded hover:border-[#1C1A17]/40 transition-all duration-300 shadow-sm cursor-pointer hover:shadow-md flex flex-col justify-between"
                                  >
                                    <div className="space-y-4">
                                      <div className="flex justify-between items-start md:items-center gap-4 mb-2 border-b border-[#1C1A17]/5 pb-3">
                                        <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-black/40 block">ARTICLE & CONSCIOUSNESS</span>
                                        <span className="font-mono text-[9px] text-[#1C1A17]/60">
                                          {formatFullDate(article.created_at)}
                                        </span>
                                      </div>
                                      <h4 className="font-serif text-lg md:text-xl font-bold text-black group-hover:text-amber-800 transition-colors">{article.title}</h4>
                                      <p className="text-xs md:text-sm text-[#1C1A17]/75 font-sans leading-relaxed line-clamp-3 font-normal antialiased">
                                        {getDisplaySummary(article, 150)}
                                      </p>
                                    </div>
                                    <div className="mt-6 border-t border-[#1C1A17]/5 pt-4 flex justify-end items-center text-[10px] tracking-widest uppercase font-mono font-bold text-neutral-400 group-hover:text-black transition-colors">
                                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        {lang === 'KR' ? '읽기' : 'Read'} &rarr;
                                      </span>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                            {(() => {
                              const filteredMulpaArticles = sortItems(
                                archiveItems.filter(item => item.category === 'mulpa' && (item.language === lang || !item.language)),
                                mulpaSortOrder
                              );
                              const totalMulpaPages = Math.ceil(filteredMulpaArticles.length / 10);
                              return (
                                <Pagination 
                                  currentPage={mulpaPage} 
                                  totalPages={totalMulpaPages} 
                                  onPageChange={setMulpaPage} 
                                  lang={lang} 
                                />
                              );
                            })()}
                          </div>
                        )
                      ) : (
                        // Mulpa Detail View (본문)
                        <motion.div 
                          key="mulpa-detail"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white border border-[#1C1A17]/10 p-8 md:p-12 rounded-2xl shadow-lg space-y-8 text-left"
                        >
                          <div className="border-b border-[#1C1A17]/10 pb-6">
                            <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-black/40 block mb-1">ARTICLE & CONSCIOUSNESS</span>
                            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-black">{readingMulpa.title}</h3>
                            <span className="font-mono text-[10px] text-[#1C1A17]/60 block mt-2">
                              {formatFullDate(readingMulpa.created_at)}
                            </span>
                          </div>

                          {readingMulpa.summary && (
                            <p className="text-xs md:text-sm font-semibold text-[#1C1A17]/80 font-sans border-l-2 border-[#1C1A17]/30 pl-3 leading-relaxed">
                              {readingMulpa.summary}
                            </p>
                          )}

                          <div className="prose prose-stone max-w-none text-xs md:text-sm leading-[1.8] text-[#1C1A17]/90 font-sans break-words whitespace-pre-line bg-[#FAF9F6] border border-[#1C1A17]/5 p-6 rounded">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                              {readingMulpa.content}
                            </ReactMarkdown>

                            {readingMulpa.image_url && (
                              <div className="mt-8 flex justify-center w-full">
                                <img 
                                  src={readingMulpa.image_url} 
                                  alt={readingMulpa.title} 
                                  referrerPolicy="no-referrer"
                                  className="max-w-full max-h-[350px] md:max-h-[480px] h-auto object-contain rounded border border-[#1C1A17]/10 p-1.5 bg-white shadow-sm"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) parent.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Detail bottom actions footer */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#1C1A17]/10">
                            <button
                              onClick={() => setReadingMulpa(null)}
                              className="px-5 py-2.5 border border-[#1C1A17]/20 text-[#1C1A17] hover:bg-neutral-50 rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <List size={14} />
                              {lang === 'KR' ? '목록으로' : 'Back to List'}
                            </button>

                            {/* Previous / Next buttons in the center */}
                            <div className="flex justify-center text-center flex-1 max-w-lg">
                              {(() => {
                                const sortedMulpaPosts = sortItems(
                                  archiveItems.filter(item => item.category === 'mulpa' && (item.language === lang || !item.language)),
                                  mulpaSortOrder
                                );
                                const currentIdx = sortedMulpaPosts.findIndex(p => p.id === readingMulpa.id);
                                const nextMulpa = currentIdx !== -1 && currentIdx + 1 < sortedMulpaPosts.length 
                                  ? sortedMulpaPosts[currentIdx + 1] 
                                  : null;
                                const prevMulpa = currentIdx > 0 
                                  ? sortedMulpaPosts[currentIdx - 1] 
                                  : null;

                                return (
                                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center w-full">
                                    {prevMulpa ? (
                                      <button
                                        onClick={() => setReadingMulpa(prevMulpa)}
                                        className="group flex items-center gap-1.5 font-serif text-xs text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                                      >
                                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                        <span>{lang === 'KR' ? '이전글' : 'Prev'}</span>
                                        <span className="underline max-w-[120px] sm:max-w-[150px] truncate block font-normal text-black/70">
                                          {prevMulpa.title}
                                        </span>
                                      </button>
                                    ) : (
                                      <span className="font-serif text-[11px] italic text-neutral-400">
                                        {lang === 'KR' ? '첫 번째 글입니다' : 'First post'}
                                      </span>
                                    )}

                                    <span className="hidden sm:inline text-neutral-300">|</span>

                                    {nextMulpa ? (
                                      <button
                                        onClick={() => setReadingMulpa(nextMulpa)}
                                        className="group flex items-center gap-1.5 font-serif text-xs text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                                      >
                                        <span>{lang === 'KR' ? '다음글' : 'Next'}</span>
                                        <ChevronRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                                        <span className="underline max-w-[120px] sm:max-w-[150px] truncate block font-normal text-black/70">
                                          {nextMulpa.title}
                                        </span>
                                      </button>
                                    ) : (
                                      <span className="font-serif text-[11px] italic text-neutral-400">
                                        {lang === 'KR' ? '마지막 글입니다' : 'End of collection'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="flex gap-2 flex-wrap">
                              {isUserAuthorized && (
                                <button
                                  onClick={() => handleEditClick(readingMulpa)}
                                  className="px-5 py-2.5 border border-amber-600 text-amber-700 hover:bg-amber-50 rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                  <Edit2 size={14} />
                                  {lang === 'KR' ? '수정' : 'Edit'}
                                </button>
                              )}
                              <button
                                onClick={() => handleWriteClick('mulpa')}
                                className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                              >
                                <PenTool size={14} />
                                {lang === 'KR' ? '글쓰기' : 'Write'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Core Principles Section */}
                    <div className="space-y-12 pt-8">
                      <h3 className="text-center font-serif text-2xl tracking-wide uppercase font-semibold text-black mb-12">Core Design Principles</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {t.art.principles.map((pr, idx) => (
                          <div key={idx} className="bg-[#FAF9F6] p-8 border border-[#1C1A17]/10 rounded flex flex-col justify-between group hover:shadow-md transition-shadow">
                            <div className="space-y-4">
                              <span className="font-mono text-[10px] tracking-widest text-[#1C1A17]/45 block font-bold">{pr.title}</span>
                              <h4 className="font-serif text-base font-semibold text-black">{pr.subtitle}</h4>
                              <p className="text-[11px] leading-[1.7] text-[#1C1A17]/70 font-sans">{pr.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="artists-tab"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-16"
                  >
                    {/* Render list of representative artists */}
                    {artists.filter(a => a.language === lang || !a.language).length === 0 ? (
                      <div className="text-center py-20 bg-white border border-[#1C1A17]/10 rounded">
                        <span className="font-mono text-xs text-black/45 block mb-2">COLLECTION_ Artists_EMPTY</span>
                        <p className="text-sm font-serif italic text-black/60">
                          {lang === 'KR' ? '데이터베이스에 물파작가가 아직 비어 있습니다. 우측 상단 관리자 포털에서 작가를 추가해 주세요.' : 'No artist biographies found.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-12">
                        {/* 100+ Artists Adaptive Directory */}
                        <div className="bg-white border border-[#1C1A17]/10 p-6 md:p-8 rounded shadow-md space-y-4">
                          <div className="border-b border-[#1C1A17]/5 pb-3 flex justify-between items-baseline">
                            <h4 className="font-serif text-sm font-bold text-black uppercase tracking-wider">
                              {lang === 'KR' ? '물파작가 바로가기 일람 (가나다순)' : lang === 'SC' ? '物波艺术家快速导航' : 'Directory of Mulpa Artists'}
                            </h4>
                            <span className="font-mono text-[9px] text-[#1C1A17]/50 font-bold bg-neutral-100 px-2.5 py-1 rounded border border-black/5 uppercase">
                              {lang === 'KR' ? `총 ${artists.filter(a => a.language === lang || !a.language).length}명` : `Total: ${artists.filter(a => a.language === lang || !a.language).length}`}
                            </span>
                          </div>
                          
                          {/* Adaptive wrap designed for 100+ items. Wraps naturally with a maximum height scroll box. */}
                          <div className="flex flex-wrap gap-2 md:gap-2.5 justify-start max-h-[160px] overflow-y-auto pr-2 py-1 scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent">
                            {artists
                              .filter(a => a.language === lang || !a.language)
                              .sort((a, b) => a.name.localeCompare(b.name, lang === 'KR' ? 'ko' : lang === 'SC' ? 'zh' : 'en'))
                              .map((artist, aIdx) => (
                                <button
                                  key={aIdx}
                                  onClick={() => {
                                    const filteredList = artists
                                      .filter(a => a.language === lang || !a.language)
                                      .sort((a, b) => a.name.localeCompare(b.name, lang === 'KR' ? 'ko' : lang === 'SC' ? 'zh' : 'en'));
                                    
                                    const artistIndex = filteredList.findIndex(a => (a.id || a.name) === (artist.id || artist.name));
                                    if (artistIndex !== -1) {
                                      const targetPage = Math.floor(artistIndex / 5) + 1;
                                      setArtistsPage(targetPage);
                                      
                                      setTimeout(() => {
                                        const element = document.getElementById(`artist-profile-${artist.id || artist.name}`);
                                        if (element) {
                                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                      }, 100);
                                    }
                                  }}
                                  className="text-xs font-serif font-medium bg-[#FAF9F6] border border-[#1C1A17]/10 hover:border-[#1C1A17]/40 hover:bg-[#E5DFD3] text-[#1C1A17] py-1.5 px-3 md:px-4 rounded transition-all duration-300 shadow-sm hover:scale-[1.02] active:scale-95 whitespace-nowrap flex items-center gap-1.5"
                                >
                                  <span className="w-1 h-1 rounded-full bg-black/30" />
                                  {artist.name}
                                </button>
                              ))
                            }
                          </div>
                          
                          <p className="text-[10px] text-black/45 font-sans italic">
                            {lang === 'KR' ? '* 작가 이름을 선택하면 상세 프로필과 소장 작품 도록 공간으로 즉시 이동합니다.' : '* Click an artist to scroll directly to their detailed profile and masterpiece gallery.'}
                          </p>
                        </div>

                        {/* Flexible spacing adjusting gracefully */}
                        <div className="h-2 md:h-6" />

                        {/* Artists Details */}
                        <div className="space-y-24">
                          {(() => {
                            const filteredArtists = artists
                              .filter(a => a.language === lang || !a.language)
                              .sort((a, b) => a.name.localeCompare(b.name, lang === 'KR' ? 'ko' : lang === 'SC' ? 'zh' : 'en'));
                            const totalArtistsPages = Math.ceil(filteredArtists.length / 5);
                            const paginatedArtists = filteredArtists.slice((artistsPage - 1) * 5, artistsPage * 5);
                            return (
                              <>
                                {paginatedArtists.map((artist, idx) => (
                              <div 
                                key={idx} 
                                id={`artist-profile-${artist.id || artist.name}`}
                                className="bg-white border border-[#1C1A17]/10 p-8 md:p-12 shadow-xl rounded space-y-12 scroll-mt-28"
                              >
                              
                              {/* Artist Profile Row */}
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                                
                                {/* Photo column */}
                                <div className="lg:col-span-4 flex justify-center">
                                  <div className="aspect-[3/4] w-full max-w-[280px] border border-[#1C1A17]/15 p-2 bg-[#FAF9F6] shadow-md rounded relative group overflow-hidden">
                                    <img 
                                      src={artist.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop'} 
                                      alt={artist.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
                                    />
                                    <div className="absolute inset-0 border border-black/10 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Texts column */}
                                <div className="lg:col-span-8 space-y-6">
                                  <div>
                                    <span className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-45 col-span-2 block mb-1">REPRESENTATIVE_ARTIST</span>
                                    <h3 className="font-serif text-3xl font-bold text-black flex items-baseline gap-3">
                                      {artist.name}
                                    </h3>
                                    <p className="font-serif text-sm italic text-[#1C1A17]/65 mt-1">{artist.title}</p>
                                  </div>
                                  
                                  <div className="w-16 h-px bg-[#1C1A17]/20" />
                                  
                                  <p className="text-xs md:text-sm text-[#1C1A17]/80 leading-relaxed font-sans whitespace-pre-line antialiased font-normal">
                                    {artist.bio}
                                  </p>
                                </div>
                              </div>

                              {/* Masterpieces catalog */}
                              {artist.works && artist.works.length > 0 && (
                                <div className="space-y-8 pt-8 border-t border-[#1C1A17]/10">
                                  <div className="text-left">
                                    <span className="font-mono text-[8px] tracking-[0.25em] opacity-45 uppercase font-bold block mb-1">CATALOGUE OF MASTERPIECES</span>
                                    <h4 className="font-serif text-xl font-bold text-black">
                                      {lang === 'KR' ? `${artist.name} 주요 작품 도록` : lang === 'SC' ? `${artist.name} 代表作品手册` : `${artist.name} Major Masterpieces`}
                                    </h4>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {artist.works.map((work, wIdx) => (
                                      <div key={wIdx} className="bg-[#FAF9F6] border border-[#1C1A17]/10 p-6 rounded space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                        
                                        {/* Painting Frame */}
                                        <div 
                                          onClick={() => {
                                            setLightboxWorks(artist.works || []);
                                            setLightboxIndex(wIdx);
                                            setLightboxArtistName(artist.name);
                                            setLightboxActive(true);
                                          }}
                                          className="aspect-[4/3] w-full border border-black/10 bg-white p-1.5 shadow-sm overflow-hidden relative cursor-pointer group"
                                          title={lang === 'KR' ? '클릭하여 원본 이미지 연속 보기' : 'Click to view full image gallery'}
                                        >
                                          <img 
                                            src={work.image || 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200'} 
                                            alt={work.title} 
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                            {/* Minimalist expand badge */}
                                            <div className="bg-white/95 text-black px-3 py-1.5 rounded border border-black/10 text-[10px] uppercase font-mono tracking-widest opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg flex items-center gap-1.5 font-bold">
                                              <Sparkles size={11} className="text-amber-600 animate-pulse" />
                                              {lang === 'KR' ? '작품 크게보기' : 'View Masterpiece'}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Label Details */}
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-baseline border-b border-[#1C1A17]/10 pb-2">
                                            <h5 className="font-serif text-sm font-bold text-black">{work.title}</h5>
                                            {work.size && (
                                              <span className="font-mono text-[9px] text-[#1C1A17]/65 tracking-wide bg-white/70 px-2 py-0.5 border border-black/5 rounded">
                                                {work.size}
                                              </span>
                                            )}
                                          </div>
                                          
                                          {work.introduction && (
                                            <div className="space-y-1">
                                              <span className="font-mono text-[8px] opacity-45 col-span-2 uppercase font-bold text-black tracking-wide">INTRODUCTION</span>
                                              <p className="text-[10px] text-black/75 font-sans leading-relaxed">{work.introduction}</p>
                                            </div>
                                          )}
                                          
                                          {work.criticism && (
                                            <div className="space-y-1 pt-1 border-t border-[#1C1A17]/5">
                                              <span className="font-mono text-[8px] opacity-45 col-span-2 uppercase font-bold text-black tracking-wide">ART CRITICISM</span>
                                              <p className="text-[10px] text-[#1C1A17]/70 font-sans italic leading-relaxed">{work.criticism}</p>
                                            </div>
                                          )}
                                        </div>

                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          ))}
                          <Pagination 
                            currentPage={artistsPage} 
                            totalPages={totalArtistsPages} 
                            onPageChange={setArtistsPage} 
                            lang={lang} 
                          />
                          </>
                        );
                       })()}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* POETRY / STONE LIBRARY PAGE */}
          {page === 'poetryCollection' && (
            <motion.div 
              key="poetry"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 pb-32"
            >
              {/* Header */}
              <div className="text-center mb-10 space-y-2">
                <span className="text-xs tracking-[0.3em] uppercase opacity-60 font-mono font-bold block">{t.poetryCollection.subtitle}</span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#1C1A17] font-bold tracking-tight">{t.poetryCollection.title}</h2>
                <div className="w-16 h-px bg-[#1C1A17]/25 mx-auto mt-4" />
              </div>

              {/* Sub-categories/Book Tabs at the top */}
              <div className="flex flex-wrap gap-2 md:gap-3 justify-center mb-12 bg-[#FAF9F6] p-3 rounded-2xl border border-[#1C1A17]/10 shadow-inner">
                {t.poetryCollection.allCollections.map((name, i) => {
                  const isSelected = selectedBook === name;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedBook(name);
                        setReadingPoem(null); // return to lists when tab changed
                      }}
                      className={`text-sm sm:text-base md:text-lg font-serif font-bold py-2 px-4 md:px-5 rounded-xl transition-all duration-300 shadow-sm border ${
                        isSelected 
                          ? 'bg-[#1C1A17] text-[#FAF9F6] border-[#1C1A17]' 
                          : 'bg-white text-black/70 border-[#1C1A17]/15 hover:border-[#1C1A17]/40 hover:bg-[#FAF9F6]'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              {/* Reading room detail or lists */}
              <AnimatePresence mode="wait">
                {!readingPoem ? (
                  // Category List View (Newest first)
                  <motion.div
                    key="list-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8 text-left"
                  >
                    {/* Header bar with total and New Post button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1C1A17]/15">
                      <div className="flex items-center gap-3">
                        <span className="font-serif text-lg md:text-xl font-bold text-black">
                          {selectedBook} {lang === 'KR' ? '수록 목록' : 'Index'}
                        </span>
                        <span className="font-mono text-xs font-bold px-2.5 py-1 bg-[#1C1A17]/5 rounded-md border border-[#1C1A17]/10">
                          {archiveItems.filter(p => p.category === 'poetry' && p.poetry_collection_name === selectedBook && p.language === lang).length} Items
                        </span>
                      </div>
                    </div>

                    {/* Sorting Controller */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-[#1C1A17]/5">
                      <div className="text-xs font-serif italic text-neutral-400">
                        {lang === 'KR' ? '* 정렬 기준을 선택할 수 있습니다.' : '* You can choose the sort order.'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold uppercase shrink-0">
                          {lang === 'KR' ? '정렬 방식' : 'Sort Order'}
                        </span>
                        <div className="flex gap-1 bg-white border border-[#1C1A17]/10 p-0.5 rounded-md inline-flex">
                          <button
                            onClick={() => setPoetrySortOrder('default')}
                            className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold ${
                              poetrySortOrder === 'default'
                                ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                : 'text-black/50 hover:bg-neutral-50'
                            }`}
                          >
                            {lang === 'KR' ? '최신순' : 'Latest'}
                          </button>
                          <button
                            onClick={() => setPoetrySortOrder('titleDesc')}
                            className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                              poetrySortOrder === 'titleDesc'
                                ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                : 'text-black/50 hover:bg-neutral-50'
                            }`}
                          >
                            ▼ {lang === 'KR' ? '내림차순' : 'Z-A'}
                          </button>
                          <button
                            onClick={() => setPoetrySortOrder('titleAsc')}
                            className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                              poetrySortOrder === 'titleAsc'
                                ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                : 'text-black/50 hover:bg-neutral-50'
                            }`}
                          >
                            ▲ {lang === 'KR' ? '오름차순' : 'A-Z'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* The Grid of verses */}
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {(() => {
                          const filteredPoetry = sortItems(
                            [...archiveItems]
                              .filter(p => p.category === 'poetry' && p.poetry_collection_name === selectedBook && p.language === lang)
                              .sort((a, b) => getTimestampMs(b) - getTimestampMs(a)),
                            poetrySortOrder
                          );
                          const paginatedPoetry = filteredPoetry.slice((poetryPage - 1) * 15, poetryPage * 15);

                          return paginatedPoetry.map((item) => {
                            const displaySummary = getDisplaySummary(item, 150);
                            return (
                              <div
                                key={item.id}
                                onClick={() => setReadingPoem(item)}
                                className="group bg-white border border-[#1C1A17]/10 p-6 rounded-2xl hover:shadow-2xl hover:border-[#1C1A17]/45 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:scale-[1.01]"
                              >
                                <div className="space-y-4">
                                  {/* Top auto-scaled image (fixed size) */}
                                  <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-gray-50 border border-[#1C1A17]/5 shadow-inner relative">
                                    <img 
                                      src={item.image_url || 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200'} 
                                      alt={item.title} 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) parent.style.display = 'none';
                                      }}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 block uppercase font-bold">
                                      {formatFullDate(item.created_at)}
                                    </span>
                                    <div className="flex items-center justify-between gap-2">
                                      <h3 className="font-serif text-lg sm:text-xl font-bold text-black group-hover:text-amber-800 transition-colors truncate">
                                        {item.title}
                                      </h3>
                                    </div>
                                    <p className="text-xs sm:text-sm text-[#1C1A17]/70 leading-relaxed font-serif line-clamp-3 h-14 overflow-hidden text-justify">
                                      {displaySummary}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {(() => {
                        const filteredPoetry = sortItems(
                          [...archiveItems]
                            .filter(p => p.category === 'poetry' && p.poetry_collection_name === selectedBook && p.language === lang)
                            .sort((a, b) => getTimestampMs(b) - getTimestampMs(a)),
                          poetrySortOrder
                        );
                        const totalPoetryPages = Math.ceil(filteredPoetry.length / 15);
                        return (
                          <Pagination 
                            currentPage={poetryPage} 
                            totalPages={totalPoetryPages} 
                            onPageChange={setPoetryPage} 
                            lang={lang} 
                          />
                        );
                      })()}
                    </div>

                    {archiveItems.filter(p => p.category === 'poetry' && p.poetry_collection_name === selectedBook && p.language === lang).length === 0 && (
                      <div className="text-center py-24 bg-white border-2 border-dashed border-[#1C1A17]/10 rounded-2xl text-neutral-400 font-serif text-base italic">
                        {t.poetryCollection.emptyNotice}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  // Detail Reading View
                  (() => {
                    const sortedBookPoems = archiveItems
                      .filter(p => p.category === 'poetry' && p.poetry_collection_name === selectedBook && p.language === lang)
                      .sort((a, b) => getTimestampMs(b) - getTimestampMs(a));
                    
                    const currentIdx = sortedBookPoems.findIndex(p => p.id === readingPoem.id);
                    const nextPoem = currentIdx !== -1 && currentIdx + 1 < sortedBookPoems.length 
                      ? sortedBookPoems[currentIdx + 1] 
                      : null;
                    const prevPoem = currentIdx > 0 
                      ? sortedBookPoems[currentIdx - 1] 
                      : null;

                    return (
                      <motion.div
                        key="detail-view"
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.99 }}
                        className="space-y-10 text-left"
                      >
                        {/* Detail Card */}
                        <div className="bg-white border border-[#1C1A17]/10 p-8 md:p-14 rounded-3xl shadow-xl relative overflow-hidden">
                          {/* Image placed prominently at the top */}
                          {readingPoem.image_url && (
                            <div className="w-full max-h-[450px] overflow-hidden rounded-2xl border border-[#1C1A17]/10 shadow-md mb-8">
                              <img 
                                src={readingPoem.image_url} 
                                alt={readingPoem.title} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) parent.style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1A17]/10 pb-6">
                              <div>
                                <span className="font-mono text-xs tracking-widest text-neutral-400 font-bold uppercase block mb-1">
                                  {selectedBook} ㆍ {formatFullDate(readingPoem.created_at)}
                                </span>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 truncate">
                                    {readingPoem.title}
                                  </h3>
                                </div>
                              </div>

                              {/* Meditative Breath Aid */}
                              <button
                                onClick={() => setBreathingMode(!breathingMode)}
                                className={`px-5 py-2.5 rounded-full border text-xs tracking-widest uppercase font-mono font-bold transition-all flex items-center gap-2 ${
                                  breathingMode 
                                    ? 'bg-black border-black text-white shadow-md' 
                                    : 'bg-transparent border-[#1C1A17]/10 text-black hover:border-[#1C1A17]'
                                }`}
                              >
                                <Activity size={12} className={breathingMode ? 'animate-pulse' : ''} />
                                {breathingMode ? `Breathing: ${breathingText}` : 'Meditative Breath Help'}
                              </button>
                            </div>

                            {/* Meditative progress line */}
                            {breathingMode && (
                              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full bg-black"
                                  animate={{ width: `${breathingProgress}%` }}
                                  transition={{ duration: 2.2 }}
                                />
                              </div>
                            )}

                            {/* Core poem content rendered beautifully */}
                            <div className="py-6 max-w-3xl mx-auto">
                              {renderContentWithImages(readingPoem.content, readingPoem.image_mid_url, readingPoem.image_bot_url)}
                            </div>
                          </div>

                          <div className="border-t border-[#1C1A17]/5 pt-6 mt-10 flex justify-between items-center text-xs font-mono font-bold text-neutral-300">
                            <span>LASOK COLLECTION ARCHIVE</span>
                            <span>M-M HARMONY</span>
                          </div>
                        </div>

                        {/* Navigation & Actions Footer Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 pt-4">
                          
                          {/* Bottom-Left: 목록 (Back to List) */}
                          <div className="flex justify-start">
                            <button
                              onClick={() => setReadingPoem(null)}
                              className="px-6 py-3 border-2 border-black/10 text-neutral-800 hover:bg-white hover:border-black/30 transition-all rounded-xl font-serif text-base font-bold flex items-center gap-2 shadow-sm"
                            >
                              <List size={18} />
                              {lang === 'KR' ? '목록으로' : 'Back to List'}
                            </button>
                          </div>

                          {/* Center: Previous / Next Post display with arrow and title */}
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                            {prevPoem ? (
                              <button
                                onClick={() => setReadingPoem(prevPoem)}
                                className="group flex items-center gap-1.5 font-serif text-sm text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                              >
                                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                <span>{lang === 'KR' ? '이전글' : 'Prev'}</span>
                                <span className="underline max-w-[100px] sm:max-w-[130px] truncate block font-normal text-black/70">
                                  {prevPoem.title}
                                </span>
                              </button>
                            ) : (
                              <span className="font-serif text-xs italic text-neutral-400">
                                {lang === 'KR' ? '첫 번째 글입니다' : 'First post'}
                              </span>
                            )}

                            <span className="hidden sm:inline text-neutral-300">|</span>

                            {nextPoem ? (
                              <button
                                onClick={() => setReadingPoem(nextPoem)}
                                className="group flex items-center gap-1.5 font-serif text-sm text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                              >
                                <span>{lang === 'KR' ? '다음글' : 'Next'}</span>
                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                <span className="underline max-w-[100px] sm:max-w-[130px] truncate block font-normal text-black/70">
                                  {nextPoem.title}
                                </span>
                              </button>
                            ) : (
                              <span className="font-serif text-xs italic text-neutral-400">
                                {lang === 'KR' ? '마지막 글입니다' : 'Last post'}
                              </span>
                            )}
                          </div>

                          {/* Bottom-Right: 수정 및 글쓰기 */}
                          <div className="flex justify-end gap-2.5 flex-wrap">
                            {isUserAuthorized && (
                              <button
                                onClick={() => handleEditClick(readingPoem)}
                                className="px-6 py-3 border-2 border-amber-600 text-amber-700 hover:bg-amber-50 hover:border-amber-700 transition-all rounded-xl font-serif text-base font-bold flex items-center gap-2 shadow-sm"
                              >
                                <Edit2 size={18} />
                                {lang === 'KR' ? '수정' : 'Edit'}
                              </button>
                            )}
                            <button
                              onClick={() => handleWriteClick('poetry', selectedBook || undefined)}
                              className="px-6 py-3 border-2 border-[#1C1A17] text-neutral-950 hover:bg-white transition-all rounded-xl font-serif text-base font-bold flex items-center gap-2 shadow-sm"
                            >
                              <PenTool size={18} />
                              {lang === 'KR' ? '글쓰기' : 'Write'}
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    );
                  })()
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* TEA meditatiora / ZEN TEA */}
          {page === 'tea' && (
            <motion.div 
              key="tea"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-5xl mx-auto px-6 md:px-12 pb-32 text-left"
            >
              <div className="text-center mb-16 space-y-2">
                <span className="text-[10px] tracking-[0.4em] uppercase opacity-45 font-mono">{t.tea.subtitle}</span>
                <h2 className="text-3xl md:text-5xl font-serif text-[#1C1A17] font-normal">{t.tea.title}</h2>
                <div className="w-12 h-px bg-[#1C1A17]/25 mx-auto mt-6" />
              </div>

              {/* Elegant Atmospheric Tea Cover Banner */}
              <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-16 relative border border-[#1C1A17]/10 shadow-lg group select-none">
                <img 
                  src="/assets/chafrontback.jpg" 
                  alt="Tea Banner" 
                  className="w-full h-full object-cover brightness-[0.85] contrast-[1.05] transition-transform duration-[4000ms] group-hover:scale-103"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white text-left space-y-1">
                  <span className="text-[9px] tracking-[0.3em] font-mono text-white/70 uppercase block font-bold">The Way of Calligraphy, Art, and SunCha</span>
                  <h3 className="font-serif text-lg md:text-2xl font-normal text-white drop-shadow-md">
                    {lang === 'KR' ? '서화차향 (書畵茶香) ㆍ 글씨와 그림, 그리고 한 잔의 차에 담긴 풍류' : lang === 'SC' ? '書畵茶香 ㆍ 笔墨丹青与一盏香茗中的风雅' : 'SunCha ㆍ Calligraphy, Painting, and a Cup of Tea'}
                  </h3>
                </div>
              </div>

              {/* Category Buttons Grid */}
              <div className="mb-12 mt-12">
                <div className="text-center mb-8 space-y-3">
                  <h3 className="text-2xl md:text-3xl font-serif text-[#1C1A17] font-semibold tracking-wider">BULHAN SUNCHA</h3>
                  <p className="text-xs md:text-sm font-serif tracking-[0.2em] uppercase opacity-60">서(書) | 화(畵) | 차(茶) | 향(香)</p>
                  <div className="w-12 h-px bg-[#1C1A17]/20 mx-auto mt-4" />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Category 서 */}
                  <div 
                    onClick={() => {
                      setSunchaFilter(sunchaFilter === 'suncha_seo' ? 'all' : 'suncha_seo');
                      setReadingSuncha(null);
                    }}
                    className={`group cursor-pointer flex flex-col items-center space-y-2 transition-all duration-300 ${
                      sunchaFilter === 'suncha_seo' 
                        ? 'scale-[1.06] z-10' 
                        : sunchaFilter !== 'all' 
                          ? 'opacity-40 scale-[0.95] grayscale hover:opacity-80 hover:grayscale-0' 
                          : 'hover:scale-[1.02]'
                    }`}
                  >
                    <span className={`font-serif text-lg font-bold transition-all duration-300 relative pb-1 ${
                      sunchaFilter === 'suncha_seo' ? 'text-amber-900 font-extrabold scale-105' : 'text-black group-hover:text-amber-800'
                    }`}>
                      서(書) <span className="text-[10px] font-mono font-normal opacity-55">Calligraphy</span>
                      {sunchaFilter === 'suncha_seo' && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-800 rounded-full" />
                      )}
                    </span>
                    <div className={`aspect-square w-full rounded-xl overflow-hidden border transition-all duration-300 relative ${
                      sunchaFilter === 'suncha_seo' 
                        ? 'border-amber-800 ring-4 ring-amber-800/40 shadow-xl' 
                        : 'border-[#1C1A17]/10 group-hover:border-[#1C1A17]/30 shadow-sm'
                    }`}>
                      <img 
                        src="/assets/suntea01.jpg" 
                        alt="Calligraphy" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      {sunchaFilter === 'suncha_seo' ? (
                        <div className="absolute top-2 right-2 bg-amber-800 text-white text-[9px] font-serif px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-md z-10">
                          선택됨
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/45 transition-opacity duration-300 flex items-center justify-center opacity-20 group-hover:opacity-10">
                          <span className="text-white text-[10px] font-serif tracking-widest font-semibold uppercase">VIEW</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category 화 */}
                  <div 
                    onClick={() => {
                      setSunchaFilter(sunchaFilter === 'suncha_hwa' ? 'all' : 'suncha_hwa');
                      setReadingSuncha(null);
                    }}
                    className={`group cursor-pointer flex flex-col items-center space-y-2 transition-all duration-300 ${
                      sunchaFilter === 'suncha_hwa' 
                        ? 'scale-[1.06] z-10' 
                        : sunchaFilter !== 'all' 
                          ? 'opacity-40 scale-[0.95] grayscale hover:opacity-80 hover:grayscale-0' 
                          : 'hover:scale-[1.02]'
                    }`}
                  >
                    <span className={`font-serif text-lg font-bold transition-all duration-300 relative pb-1 ${
                      sunchaFilter === 'suncha_hwa' ? 'text-amber-900 font-extrabold scale-105' : 'text-black group-hover:text-amber-800'
                    }`}>
                      화(畵) <span className="text-[10px] font-mono font-normal opacity-55">Painting</span>
                      {sunchaFilter === 'suncha_hwa' && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-800 rounded-full" />
                      )}
                    </span>
                    <div className={`aspect-square w-full rounded-xl overflow-hidden border transition-all duration-300 relative ${
                      sunchaFilter === 'suncha_hwa' 
                        ? 'border-amber-800 ring-4 ring-amber-800/40 shadow-xl' 
                        : 'border-[#1C1A17]/10 group-hover:border-[#1C1A17]/30 shadow-sm'
                    }`}>
                      <img 
                        src="/assets/suntea02.jpg" 
                        alt="Painting" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      {sunchaFilter === 'suncha_hwa' ? (
                        <div className="absolute top-2 right-2 bg-amber-800 text-white text-[9px] font-serif px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-md z-10">
                          선택됨
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/45 transition-opacity duration-300 flex items-center justify-center opacity-20 group-hover:opacity-10">
                          <span className="text-white text-[10px] font-serif tracking-widest font-semibold uppercase">VIEW</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category 차 */}
                  <div 
                    onClick={() => {
                      setSunchaFilter(sunchaFilter === 'suncha_cha' ? 'all' : 'suncha_cha');
                      setReadingSuncha(null);
                    }}
                    className={`group cursor-pointer flex flex-col items-center space-y-2 transition-all duration-300 ${
                      sunchaFilter === 'suncha_cha' 
                        ? 'scale-[1.06] z-10' 
                        : sunchaFilter !== 'all' 
                          ? 'opacity-40 scale-[0.95] grayscale hover:opacity-80 hover:grayscale-0' 
                          : 'hover:scale-[1.02]'
                    }`}
                  >
                    <span className={`font-serif text-lg font-bold transition-all duration-300 relative pb-1 ${
                      sunchaFilter === 'suncha_cha' ? 'text-amber-900 font-extrabold scale-105' : 'text-black group-hover:text-amber-800'
                    }`}>
                      차(茶) <span className="text-[10px] font-mono font-normal opacity-55">Tea</span>
                      {sunchaFilter === 'suncha_cha' && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-800 rounded-full" />
                      )}
                    </span>
                    <div className={`aspect-square w-full rounded-xl overflow-hidden border transition-all duration-300 relative ${
                      sunchaFilter === 'suncha_cha' 
                        ? 'border-amber-800 ring-4 ring-amber-800/40 shadow-xl' 
                        : 'border-[#1C1A17]/10 group-hover:border-[#1C1A17]/30 shadow-sm'
                    }`}>
                      <img 
                        src="/assets/suntea03.jpg" 
                        alt="Tea" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      {sunchaFilter === 'suncha_cha' ? (
                        <div className="absolute top-2 right-2 bg-amber-800 text-white text-[9px] font-serif px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-md z-10">
                          선택됨
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/45 transition-opacity duration-300 flex items-center justify-center opacity-20 group-hover:opacity-10">
                          <span className="text-white text-[10px] font-serif tracking-widest font-semibold uppercase">VIEW</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category 향 */}
                  <div 
                    onClick={() => {
                      setSunchaFilter(sunchaFilter === 'suncha_hyang' ? 'all' : 'suncha_hyang');
                      setReadingSuncha(null);
                    }}
                    className={`group cursor-pointer flex flex-col items-center space-y-2 transition-all duration-300 ${
                      sunchaFilter === 'suncha_hyang' 
                        ? 'scale-[1.06] z-10' 
                        : sunchaFilter !== 'all' 
                          ? 'opacity-40 scale-[0.95] grayscale hover:opacity-80 hover:grayscale-0' 
                          : 'hover:scale-[1.02]'
                    }`}
                  >
                    <span className={`font-serif text-lg font-bold transition-all duration-300 relative pb-1 ${
                      sunchaFilter === 'suncha_hyang' ? 'text-amber-900 font-extrabold scale-105' : 'text-black group-hover:text-amber-800'
                    }`}>
                      향(香) <span className="text-[10px] font-mono font-normal opacity-55">Incense</span>
                      {sunchaFilter === 'suncha_hyang' && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-800 rounded-full" />
                      )}
                    </span>
                    <div className={`aspect-square w-full rounded-xl overflow-hidden border transition-all duration-300 relative ${
                      sunchaFilter === 'suncha_hyang' 
                        ? 'border-amber-800 ring-4 ring-amber-800/40 shadow-xl' 
                        : 'border-[#1C1A17]/10 group-hover:border-[#1C1A17]/30 shadow-sm'
                    }`}>
                      <img 
                        src="/assets/suntea04.jpg" 
                        alt="Incense" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      {sunchaFilter === 'suncha_hyang' ? (
                        <div className="absolute top-2 right-2 bg-amber-800 text-white text-[9px] font-serif px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-md z-10">
                          선택됨
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/45 transition-opacity duration-300 flex items-center justify-center opacity-20 group-hover:opacity-10">
                          <span className="text-white text-[10px] font-serif tracking-widest font-semibold uppercase">VIEW</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {!readingSuncha ? (
                /* Suncha List view */
                <div className="space-y-6 pt-6 border-t border-[#1C1A17]/10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-lg font-bold text-[#1C1A17]">
                        {sunchaFilter === 'all' && (lang === 'KR' ? '서화차향 전체 목록' : 'Seoncha Archive (All)')}
                        {sunchaFilter === 'suncha_seo' && (lang === 'KR' ? '서(書) 글씨 작품 목록' : 'Calligraphy Archive')}
                        {sunchaFilter === 'suncha_hwa' && (lang === 'KR' ? '화(畵) 그림 작품 목록' : 'Painting Archive')}
                        {sunchaFilter === 'suncha_cha' && (lang === 'KR' ? '차(茶) 명차 아카이브' : 'Tea Archive')}
                        {sunchaFilter === 'suncha_hyang' && (lang === 'KR' ? '향(香) 명향 아카이브' : 'Incense Archive')}
                      </span>
                      <span className="font-mono text-xs font-bold text-black/40 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                        {sortedSunchaItems.length}
                      </span>
                    </div>

                    {/* Sort controller & write button */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1 bg-white border border-[#1C1A17]/10 p-0.5 rounded-sm inline-flex">
                        <button
                          onClick={() => setTeaSortOrder('default')}
                          className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold ${
                            teaSortOrder === 'default'
                              ? 'bg-[#1C1A17] text-[#FAF9F6]'
                              : 'text-black/50 hover:bg-neutral-50'
                          }`}
                        >
                          {lang === 'KR' ? '최신순' : 'Latest'}
                        </button>
                        <button
                          onClick={() => setTeaSortOrder('titleDesc')}
                          className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                            teaSortOrder === 'titleDesc'
                              ? 'bg-[#1C1A17] text-[#FAF9F6]'
                              : 'text-black/50 hover:bg-neutral-50'
                          }`}
                        >
                          ▼ {lang === 'KR' ? '내림차순' : 'Z-A'}
                        </button>
                        <button
                          onClick={() => setTeaSortOrder('titleAsc')}
                          className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                            teaSortOrder === 'titleAsc'
                              ? 'bg-[#1C1A17] text-[#FAF9F6]'
                              : 'text-black/50 hover:bg-neutral-50'
                          }`}
                        >
                          ▲ {lang === 'KR' ? '오름차순' : 'A-Z'}
                        </button>
                      </div>

                      <button
                        onClick={() => handleWriteClick(sunchaFilter === 'all' ? 'suncha_cha' : sunchaFilter)}
                        className="px-3.5 py-1.5 bg-[#1C1A17] hover:bg-black text-white text-[10px] tracking-widest font-bold uppercase rounded flex items-center gap-1 transition-colors"
                      >
                        <Plus size={12} />
                        {lang === 'KR' ? '글쓰기' : 'Write'}
                      </button>
                    </div>
                  </div>

                  {sortedSunchaItems.length === 0 ? (
                    <div className="bg-[#FAF9F6] border border-[#1C1A17]/5 rounded-2xl py-24 text-center">
                      <p className="text-sm font-serif text-[#1C1A17]/50">
                        {lang === 'KR' ? '등록된 작품이 없습니다.' : 'No items registered in this category.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {(() => {
                          const paginatedSunchaItems = sortedSunchaItems.slice((sunchaPage - 1) * 15, sunchaPage * 15);
                          return paginatedSunchaItems.map((item) => {
                            const displaySummary = getDisplaySummary(item, 150);
                            const categoryLabel = 
                              item.category === 'suncha_seo' ? '서(書)' :
                              item.category === 'suncha_hwa' ? '화(畵)' :
                              item.category === 'suncha_cha' || item.category === 'suncha_intro' || item.category === 'suncha_review' ? '차(茶)' :
                              item.category === 'suncha_hyang' ? '향(香)' : '';

                            return (
                              <div
                                key={item.id}
                                onClick={() => setReadingSuncha(item)}
                                className="group bg-white border border-[#1C1A17]/10 p-6 rounded-2xl hover:shadow-2xl hover:border-[#1C1A17]/45 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:scale-[1.01]"
                              >
                                <div className="space-y-4">
                                  {/* Top image */}
                                  <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-gray-50 border border-[#1C1A17]/5 shadow-inner relative">
                                    <img 
                                      src={item.image_url || 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200'} 
                                      alt={item.title} 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) parent.style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute top-3 left-3 bg-[#1C1A17] text-white text-[9px] font-serif px-2.5 py-0.5 rounded font-bold uppercase tracking-widest">
                                      {categoryLabel}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 block uppercase font-bold">
                                      {formatFullDate(item.created_at)}
                                    </span>
                                    <h3 className="font-serif text-lg font-bold text-black group-hover:text-amber-800 transition-colors line-clamp-1">
                                      {item.title}
                                    </h3>
                                    <p className="text-xs text-[#1C1A17]/70 leading-relaxed font-serif line-clamp-3 h-14 overflow-hidden text-justify">
                                      {displaySummary}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-[#1C1A17]/5 flex justify-between items-center text-[9px] tracking-widest uppercase font-mono font-bold text-[#1C1A17]/40 group-hover:text-[#1C1A17] transition-colors">
                                  <span>VIEW WORKS</span>
                                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    {lang === 'KR' ? '자세히 보기' : 'Read details'} <ChevronRight size={12} />
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {(() => {
                        const totalSunchaPages = Math.ceil(sortedSunchaItems.length / 15);
                        return (
                          <Pagination 
                            currentPage={sunchaPage} 
                            totalPages={totalSunchaPages} 
                            onPageChange={setSunchaPage} 
                            lang={lang} 
                          />
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                /* Suncha Detail View */
                <motion.div 
                  key="suncha-detail"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#1C1A17]/10 p-8 md:p-12 rounded-2xl shadow-lg space-y-8 text-left max-w-3xl mx-auto mt-6"
                >
                  <div className="border-b border-[#1C1A17]/10 pb-6">
                    <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-black/40 block mb-1">
                      {readingSuncha.category === 'suncha_seo' ? '서(書) Calligraphy' :
                       readingSuncha.category === 'suncha_hwa' ? '화(畵) Painting' :
                       readingSuncha.category === 'suncha_cha' || readingSuncha.category === 'suncha_intro' || readingSuncha.category === 'suncha_review' ? '차(茶) Tea' :
                       readingSuncha.category === 'suncha_hyang' ? '향(香) Incense' : ''}
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-black">{readingSuncha.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-mono text-[10px] text-[#1C1A17]/60">
                        {formatFullDate(readingSuncha.created_at)}
                      </span>
                      {readingSuncha.category_tag && (
                        <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/50 bg-neutral-100 border border-black/5 px-2 py-0.5 rounded uppercase">
                          {readingSuncha.category_tag}
                        </span>
                      )}
                    </div>
                  </div>

                  {readingSuncha.summary && (
                    <p className="text-xs md:text-sm font-semibold text-[#1C1A17]/80 font-sans border-l-2 border-[#1C1A17]/30 pl-3 leading-relaxed">
                      {readingSuncha.summary}
                    </p>
                  )}

                  <div className="prose prose-stone max-w-none text-sm md:text-base leading-[1.8] text-[#1C1A17]/90 font-sans break-words bg-[#FAF9F6] border border-[#1C1A17]/5 p-6 rounded [&_p]:my-0 [&_p]:mb-5 last:[&_p]:mb-0">
                    {/* 상(Top) Image */}
                    {readingSuncha.image_url && (
                      <div className="mb-6 flex justify-center w-full">
                        <img 
                          src={readingSuncha.image_url} 
                          alt="Top decoration" 
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-[350px] md:max-h-[480px] h-auto object-contain rounded border border-[#1C1A17]/10 p-1.5 bg-white shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) parent.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Content (with optional middle split) */}
                    {(() => {
                      const content = readingSuncha.content || '';
                      if (readingSuncha.image_mid_url) {
                        const paragraphs = content.split('\n');
                        const midPoint = Math.floor(paragraphs.length / 2);
                        const firstHalf = paragraphs.slice(0, midPoint).join('\n');
                        const secondHalf = paragraphs.slice(midPoint).join('\n');
                        return (
                          <div className="space-y-6">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                              {firstHalf}
                            </ReactMarkdown>
                            <div className="my-6 flex justify-center w-full">
                              <img 
                                src={readingSuncha.image_mid_url} 
                                alt="Middle decoration" 
                                referrerPolicy="no-referrer"
                                className="max-w-full max-h-[350px] md:max-h-[480px] h-auto object-contain rounded border border-[#1C1A17]/10 p-1.5 bg-white shadow-sm"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) parent.style.display = 'none';
                                }}
                              />
                            </div>
                            {secondHalf && (
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                                {secondHalf}
                              </ReactMarkdown>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                            {content}
                          </ReactMarkdown>
                        );
                      }
                    })()}

                    {/* 하(Bottom) Image */}
                    {readingSuncha.image_bot_url && (
                      <div className="mt-6 flex justify-center w-full">
                        <img 
                          src={readingSuncha.image_bot_url} 
                          alt="Bottom decoration" 
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-[350px] md:max-h-[480px] h-auto object-contain rounded border border-[#1C1A17]/10 p-1.5 bg-white shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) parent.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                   {/* Detail bottom actions footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#1C1A17]/10">
                    <button
                      onClick={() => setReadingSuncha(null)}
                      className="px-5 py-2.5 border border-[#1C1A17]/20 text-[#1C1A17] hover:bg-neutral-50 rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <List size={14} />
                      {lang === 'KR' ? '목록으로' : 'Back to List'}
                    </button>

                    {/* Previous / Next buttons in the center */}
                    <div className="flex justify-center text-center flex-1 max-w-lg">
                      {(() => {
                        const relatedItems = sortItems(
                          archiveItems.filter(item => {
                            const isSunchaCategory = ['suncha_seo', 'suncha_hwa', 'suncha_cha', 'suncha_hyang', 'suncha_intro', 'suncha_review'].includes(item.category);
                            if (!isSunchaCategory) return false;
                            const matchesLang = item.language === lang || (!item.language && lang === 'KR');
                            if (!matchesLang) return false;
                            
                            // Match the current filter group
                            if (sunchaFilter === 'all') {
                              return true;
                            } else if (sunchaFilter === 'suncha_cha') {
                              return ['suncha_cha', 'suncha_intro', 'suncha_review'].includes(item.category);
                            } else {
                              return item.category === sunchaFilter;
                            }
                          }),
                          teaSortOrder
                        );
                        const currentIdx = relatedItems.findIndex(p => p.id === readingSuncha.id);
                        const nextSuncha = currentIdx !== -1 && currentIdx + 1 < relatedItems.length 
                          ? relatedItems[currentIdx + 1] 
                          : null;
                        const prevSuncha = currentIdx > 0 
                          ? relatedItems[currentIdx - 1] 
                          : null;

                        return (
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center w-full">
                            {prevSuncha ? (
                              <button
                                onClick={() => setReadingSuncha(prevSuncha)}
                                className="group flex items-center gap-1.5 font-serif text-xs text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                              >
                                <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                <span>{lang === 'KR' ? '이전글' : 'Prev'}</span>
                                <span className="underline max-w-[120px] sm:max-w-[150px] truncate block font-normal text-black/70">
                                  {prevSuncha.title}
                                </span>
                              </button>
                            ) : (
                              <span className="font-serif text-[11px] italic text-neutral-400">
                                {lang === 'KR' ? '첫 번째 글입니다' : 'First post'}
                              </span>
                            )}

                            <span className="hidden sm:inline text-neutral-300">|</span>

                            {nextSuncha ? (
                              <button
                                onClick={() => setReadingSuncha(nextSuncha)}
                                className="group flex items-center gap-1.5 font-serif text-xs text-amber-800 hover:text-amber-950 font-bold transition-all p-1.5 rounded-lg hover:bg-neutral-50"
                              >
                                <span>{lang === 'KR' ? '다음글' : 'Next'}</span>
                                <ChevronRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                                <span className="underline max-w-[120px] sm:max-w-[150px] truncate block font-normal text-black/70">
                                  {nextSuncha.title}
                                </span>
                              </button>
                            ) : (
                              <span className="font-serif text-[11px] italic text-neutral-400">
                                {lang === 'KR' ? '마지막 글입니다' : 'End of collection'}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {isUserAuthorized && (
                        <button
                          onClick={() => handleEditClick(readingSuncha)}
                          className="px-5 py-2.5 border border-amber-600 text-amber-700 hover:bg-amber-50 rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Edit2 size={14} />
                          {lang === 'KR' ? '수정' : 'Edit'}
                        </button>
                      )}
                      <button
                        onClick={() => handleWriteClick(readingSuncha.category)}
                        className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <PenTool size={14} />
                        {lang === 'KR' ? '글쓰기' : 'Write'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* JOURNEY & CHRONICLE PAGE */}
          {page === 'journey' && (
            <motion.div 
              key="journey"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-5xl mx-auto px-6 md:px-12 pb-32 text-left"
            >
              <div className="text-center mb-16 space-y-2">
                <span className="text-[10px] tracking-[0.4em] uppercase opacity-45 font-mono">{t.journey.subtitle}</span>
                <h2 className="text-3xl md:text-5xl font-serif text-[#1C1A17] font-normal">{t.journey.title}</h2>
                <div className="w-12 h-px bg-[#1C1A17]/25 mx-auto mt-6" />
              </div>

              {!selectedJourneyItem ? (
                // Journey List View
                <div className="space-y-12 animate-fadeIn">
                  {/* Elegant Atmospheric Journey Cover Banner */}
                  <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-12 relative border border-[#1C1A17]/10 shadow-lg group select-none">
                    <img 
                      src="https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=1200" 
                      alt="Journey Banner" 
                      className="w-full h-full object-cover brightness-[0.85] contrast-[1.05] transition-transform duration-[4000ms] group-hover:scale-103"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                    <div className="absolute bottom-6 left-6 text-white text-left space-y-1">
                      <span className="text-[9px] tracking-[0.3em] font-mono text-white/70 uppercase block font-bold">The Path of True Aesthetics</span>
                      <h3 className="font-serif text-lg md:text-2xl font-normal text-white drop-shadow-md">
                        {lang === 'KR' ? '활동여정 (活動旅程) ㆍ 어제와 오늘을 잇는 발자취' : lang === 'SC' ? '活动旅程 ㆍ 连结过去与现在的足迹' : 'The Path of True Aesthetics'}
                      </h3>
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16 pb-6 border-b border-[#1C1A17]/10">
                    <div className="flex flex-wrap gap-4 text-[10px] tracking-widest uppercase font-mono font-bold">
                      <button 
                        onClick={() => setJourneyFilter('all')}
                        className={`px-6 py-2 rounded-full border transition-all ${
                          journeyFilter === 'all' 
                            ? 'bg-black text-white border-black' 
                            : 'bg-transparent border-[#1C1A17]/10 text-black hover:border-black/30'
                        }`}
                      >
                        All Archive
                      </button>
                      <button 
                        onClick={() => setJourneyFilter('photo')}
                        className={`px-6 py-2 rounded-full border transition-all ${
                          journeyFilter === 'photo' 
                            ? 'bg-black text-white border-black' 
                            : 'bg-transparent border-[#1C1A17]/10 text-black hover:border-black/30'
                        }`}
                      >
                        Performances / Photos
                      </button>
                      <button 
                        onClick={() => setJourneyFilter('press')}
                        className={`px-6 py-2 rounded-full border transition-all ${
                          journeyFilter === 'press' 
                            ? 'bg-black text-white border-black' 
                            : 'bg-transparent border-[#1C1A17]/10 text-black hover:border-black/30'
                        }`}
                      >
                        Press Coverage / Publications
                      </button>
                    </div>

                    {/* Sort Controller */}
                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                      <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold uppercase">
                        {lang === 'KR' ? '정렬 방식' : 'Sort Order'}
                      </span>
                      <div className="flex gap-1 bg-white border border-[#1C1A17]/10 p-0.5 rounded-sm inline-flex">
                        <button
                          onClick={() => setJourneySortOrder('default')}
                          className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold ${
                            journeySortOrder === 'default'
                              ? 'bg-[#1C1A17] text-[#FAF9F6]'
                              : 'text-black/50 hover:bg-neutral-50'
                          }`}
                        >
                          {lang === 'KR' ? '기본순' : 'Default'}
                        </button>
                        <button
                          onClick={() => setJourneySortOrder('titleAsc')}
                          className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                            journeySortOrder === 'titleAsc'
                              ? 'bg-[#1C1A17] text-[#FAF9F6]'
                              : 'text-black/50 hover:bg-neutral-50'
                          }`}
                        >
                          ▲ A-Z
                        </button>
                        <button
                          onClick={() => setJourneySortOrder('titleDesc')}
                          className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                            journeySortOrder === 'titleDesc'
                              ? 'bg-[#1C1A17] text-[#FAF9F6]'
                              : 'text-black/50 hover:bg-neutral-50'
                          }`}
                        >
                          ▼ Z-A
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Grid layout */}
                  <div className="space-y-12">
                    {JSON.stringify(journeyFilter) !== '"all"' && (
                      <p className="font-mono text-[9px] tracking-widest uppercase opacity-45 mb-4 font-bold">
                        Filtered view: {journeyFilter.toUpperCase()} logs
                      </p>
                    )}

                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {(() => {
                          const filteredJourney = sortItems(
                            archiveItems.filter(item => {
                              if (item.language !== lang) return false;
                              if (journeyFilter === 'photo') return item.category === 'journey';
                              if (journeyFilter === 'press') return item.category === 'press';
                              return (item.category === 'journey' || item.category === 'press');
                            }),
                            journeySortOrder
                          );
                          const paginatedJourney = filteredJourney.slice((journeyPage - 1) * 10, journeyPage * 10);

                          return paginatedJourney.map((item) => (
                            <div 
                              key={item.id}
                              onClick={() => setSelectedJourneyItem(item)}
                              className="group bg-white border border-[#1C1A17]/10 p-6 rounded hover:shadow-2xl hover:border-[#1C1A17]/35 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:scale-[1.01]"
                            >
                              <div className="space-y-4 text-left">
                                <div className="aspect-[16/10] overflow-hidden rounded bg-gray-50 border border-[#1C1A17]/5 relative">
                                  <img 
                                    src={item.image_url} 
                                    alt={item.title} 
                                    className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) parent.style.display = 'none';
                                    }}
                                  />
                                  {/* Hover Overlay indicator */}
                                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[10px] tracking-widest font-mono text-white bg-black/75 px-3 py-1.5 rounded uppercase font-bold shadow-md">
                                      {lang === 'KR' ? '자세히 보기' : 'Read details'} &rarr;
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex gap-2 items-center">
                                    <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold uppercase">
                                      {item.category === 'journey' ? 'Activity Performance' : 'Press Editorial'}
                                    </span>
                                    {item.category_tag && (
                                      <span className="font-mono text-[8px] tracking-widest text-black/55 bg-neutral-100 px-1.5 py-0.5 rounded border border-black/5 uppercase">
                                        {item.category_tag}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-serif text-base md:text-lg font-bold text-black group-hover:text-black/80 transition-colors leading-snug">{item.title}</h4>
                                  <p className="text-xs text-black/60 leading-relaxed font-sans font-normal antialiased line-clamp-3">
                                    {getDisplaySummary(item, 150)}
                                  </p>
                                </div>
                              </div>

                              {/* Expandable details button at bottom */}
                              <div className="pt-4 border-t border-[#1C1A17]/5 mt-6 flex justify-between items-center text-[9px] tracking-widest uppercase font-mono font-bold text-neutral-400 group-hover:text-black transition-all">
                                <span>{item.category === 'journey' ? 'Perform Log' : 'Editorial'}</span>
                                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                  {lang === 'KR' ? '자세히 보기' : 'View details'} &rarr;
                                </span>
                              </div>
                            </div>
                          ));
                        })()}

                        {archiveItems.filter(item => {
                          if (item.language !== lang) return false;
                          if (journeyFilter === 'photo') return item.category === 'journey';
                          if (journeyFilter === 'press') return item.category === 'press';
                          return (item.category === 'journey' || item.category === 'press');
                        }).length === 0 && (
                          <div className="md:col-span-2 text-center py-24 border border-dashed border-[#1C1A17]/10 p-12 bg-white rounded flex flex-col items-center justify-center">
                            <ImageIcon className="opacity-20 mb-4" size={40} />
                            <p className="font-serif text-sm italic text-[#1C1A17]/55">
                              {journeyFilter === 'photo' ? t.journey.emptyPhotos : t.journey.emptyPress}
                            </p>
                          </div>
                        )}
                      </div>
                      {(() => {
                        const filteredJourney = sortItems(
                          archiveItems.filter(item => {
                            if (item.language !== lang) return false;
                            if (journeyFilter === 'photo') return item.category === 'journey';
                            if (journeyFilter === 'press') return item.category === 'press';
                            return (item.category === 'journey' || item.category === 'press');
                          }),
                          journeySortOrder
                        );
                        const totalJourneyPages = Math.ceil(filteredJourney.length / 10);
                        return (
                          <Pagination 
                            currentPage={journeyPage} 
                            totalPages={totalJourneyPages} 
                            onPageChange={setJourneyPage} 
                            lang={lang} 
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                // Journey Detail View (본문)
                <motion.div 
                  key="journey-detail"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#1C1A17]/10 p-8 md:p-12 rounded-2xl shadow-lg space-y-8 text-left max-w-3xl mx-auto"
                >
                  <div className="border-b border-[#1C1A17]/10 pb-6">
                    <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-black/40 block mb-1">
                      {selectedJourneyItem.category === 'journey' 
                        ? (lang === 'KR' ? '활동여정 기록 아카이브' : 'Activity Performance') 
                        : (lang === 'KR' ? '언론보도 및 보도기사' : 'Press Coverage')
                      }
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-black">{selectedJourneyItem.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-mono text-[10px] text-[#1C1A17]/60">
                        {formatFullDate(selectedJourneyItem.created_at)}
                      </span>
                      {selectedJourneyItem.category_tag && (
                        <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/50 bg-neutral-100 border border-black/5 px-2 py-0.5 rounded uppercase">
                          {selectedJourneyItem.category_tag}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedJourneyItem.summary && (
                    <p className="text-xs md:text-sm font-semibold text-[#1C1A17]/85 font-sans border-l-2 border-[#1C1A17]/30 pl-3 leading-relaxed">
                      {selectedJourneyItem.summary}
                    </p>
                  )}

                  <div className="prose prose-stone max-w-none text-sm md:text-base leading-[1.8] text-[#1C1A17]/90 font-sans break-words bg-[#FAF9F6] border border-[#1C1A17]/5 p-6 rounded [&_p]:my-0 [&_p]:mb-5 last:[&_p]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                      {selectedJourneyItem.content || ''}
                    </ReactMarkdown>

                    {selectedJourneyItem.image_url && (
                      <div className="mt-8 flex justify-center w-full">
                        <img 
                          src={selectedJourneyItem.image_url} 
                          alt={selectedJourneyItem.title} 
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-[350px] md:max-h-[480px] h-auto object-contain rounded border border-[#1C1A17]/10 p-1.5 bg-white shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) parent.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Detail bottom actions footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#1C1A17]/10">
                    <button
                      onClick={() => setSelectedJourneyItem(null)}
                      className="px-5 py-2.5 border border-[#1C1A17]/20 text-[#1C1A17] hover:bg-neutral-50 rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <List size={14} />
                      {lang === 'KR' ? '목록으로' : 'Back to List'}
                    </button>

                    <div className="flex gap-2 flex-wrap">
                      {isUserAuthorized && (
                        <button
                          onClick={() => handleEditClick(selectedJourneyItem)}
                          className="px-5 py-2.5 border border-amber-600 text-amber-700 hover:bg-amber-50 rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Edit2 size={14} />
                          {lang === 'KR' ? '수정' : 'Edit'}
                        </button>
                      )}
                      <button
                        onClick={() => handleWriteClick(selectedJourneyItem.category || 'journey')}
                        className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-serif text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <PenTool size={14} />
                        {lang === 'KR' ? '글쓰기' : 'Write'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}

          {/* ADMIN LOGIN & SYSTEM CABINET PAGE */}
          {page === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-6 md:px-12 pb-32"
            >
              <div className="text-center mb-16 space-y-2 text-[#1C1A17]">
                <span className="text-[10px] tracking-[0.4em] uppercase opacity-45 font-mono">{t.admin.subtitle}</span>
                <h2 className="text-3xl md:text-5xl font-serif font-normal">{t.admin.title}</h2>
                <div className="w-12 h-px bg-[#1C1A17]/25 mx-auto mt-6" />
              </div>

              {!isAuthAdmin ? (
                
                // Secure Admin Gate Layout
                <div className="max-w-md mx-auto bg-white border border-[#1C1A17]/10 p-8 shadow-2xl rounded space-y-8 text-left">
                  <div className="space-y-1 text-center">
                    <Key className="mx-auto text-black opacity-30" size={32} />
                    <h3 className="font-serif text-lg font-bold">Cabinet security lock</h3>
                    <p className="text-[10px] tracking-wide text-[#1C1A17]/50 uppercase font-mono">Authentication required</p>
                  </div>

                  <form onSubmit={handlePasscodeLogin} className="space-y-4">
                    <div>
                      <label className="font-mono text-[9px] tracking-widest uppercase font-bold block mb-2">{t.admin.passLogin}</label>
                      <input 
                        type="password" 
                        required
                        placeholder="Master pass: 2026"
                        value={passcode}
                        onChange={e => setPasscode(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#1C1A17]/15 rounded p-3 text-xs font-mono text-[#1C1A17] focus:outline-none focus:border-black"
                      />
                      {passcodeError && <p className="text-[10px] text-red-500 font-bold font-sans mt-2">{passcodeError}</p>}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#1C1A17] text-white hover:bg-black text-[10px] tracking-[0.25em] uppercase transition-all rounded font-bold"
                    >
                      Authenticate credentials
                    </button>
                  </form>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-[#1C1A17]/10"></div>
                    <span className="flex-shrink mx-4 text-[9px] tracking-widest text-[#1C1A17]/40 uppercase font-mono">or OAuth</span>
                    <div className="flex-grow border-t border-[#1C1A17]/10"></div>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3 border border-[#1C1A17]/15 text-[#1C1A17] hover:bg-[#FAF9F6] text-[10px] tracking-[0.25em] uppercase transition-all rounded flex items-center justify-center gap-2 font-bold"
                  >
                    Google authorization
                  </button>
                </div>

              ) : (

                // REBUILT: Highly Organized, Systematic and Professional admin board!
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                  
                  {/* Left Controls/Overview Sidebar */}
                  <div className="lg:col-span-3 space-y-6">
                    
                    {/* Admin Status Header */}
                    <div className="bg-[#1C1A17] text-white p-6 rounded space-y-4 shadow-lg text-left">
                      <div>
                        <span className="font-mono text-[8px] tracking-[0.3em] opacity-50 block uppercase">SYSTEM CABINET</span>
                        <h3 className="font-serif text-lg font-bold text-white">Administrator</h3>
                        <p className="text-[10px] font-mono text-green-400 font-semibold mt-1">● Master Terminal Connected</p>
                      </div>
                      <button 
                        onClick={handleSignOut}
                        className="w-full py-2 bg-white/15 hover:bg-white/20 text-white text-[9px] tracking-widest uppercase rounded font-mono transition-colors"
                      >
                        {t.admin.signOut}
                      </button>
                    </div>

                    {/* Visual KPIs block */}
                    <div className="bg-white border border-[#1C1A17]/10 p-6 rounded space-y-4">
                      <h4 className="font-serif text-sm font-semibold tracking-wide uppercase border-b border-[#1C1A17]/5 pb-2 text-black">
                        System Metrics
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#FAF9F6] p-3 text-left rounded">
                          <span className="font-mono text-[9px] tracking-[0.1em] opacity-45 col-span-2 uppercase">TOTAL POEMS</span>
                          <p className="font-serif text-2xl font-bold mt-1">{archiveItems.filter(p => p.category === 'poetry').length}</p>
                        </div>
                        <div className="bg-[#FAF9F6] p-3 text-left rounded">
                          <span className="font-mono text-[9px] tracking-[0.1em] opacity-45 col-span-2 uppercase">JOURNEY</span>
                          <p className="font-serif text-2xl font-bold mt-1">{archiveItems.filter(p => p.category === 'journey' || p.category === 'press').length}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-sans text-green-600 font-semibold mt-2">
                        <Activity size={12} className="animate-pulse" />
                        <span>{t.admin.activeSync}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Systematic Grid panel workspace */}
                  <div className="lg:col-span-9 space-y-8">
                    
                    {/* SQL Blueprint Copy & One-Click System restore */}
                    <div className="bg-white border border-[#1C1A17]/10 p-8 rounded shadow-sm space-y-6">
                      <div className="border-b border-[#1C1A17]/10 pb-4">
                        <h4 className="font-serif text-xl font-bold text-black flex items-center gap-2">
                          🌀 아카이브 시스템 구축 & 초기 오리지널 주입 복구 (Sync Panel)
                        </h4>
                        <p className="text-xs text-black/60 font-sans mt-1">
                          Firebase 데이터베이스를 새로 구성하셨거나, 연동된 실시간 테이블이 비어 있을 때 오리지널 <strong>동양 미학 사발, 가야금 가락 및 40여 종의 시문학 원본</strong>을 일치시켜 동기화합니다.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={handleFullRestore}
                          disabled={loading}
                          className="flex-1 bg-black text-white hover:bg-[#322F2A] py-4 text-[10px] tracking-[0.25em] uppercase font-bold transition-all rounded shadow-md flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                          {loading ? '동기화 데이터 주입 전송 중...' : '🔥 실시간 원본 전체 데이터 일괄 동기화 (Run System Restore)'}
                        </button>
                      </div>
                    </div>

                    {/* Items table manager interface */}
                    <div className="bg-white border border-[#1C1A17]/10 p-8 rounded shadow-sm space-y-6">
                      <div className="flex flex-wrap justify-between items-center gap-4">
                        <div>
                          <h3 className="font-serif text-xl font-bold text-black">전체 데이터 보관함 관리 (Records Container)</h3>
                          <p className="text-xs text-black/55">수정하거나 신규 서시 문학/미디어 자료를 Firestore에 바로 생성합니다.</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingItem({
                              title: '',
                              content: '### 대명칭\n\n내용작성',
                              summary: '',
                              image_url: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200',
                              category: 'poetry',
                              poetry_collection_name: t.poetryCollection.allCollections[0],
                              language: lang,
                              created_at: new Date().toISOString()
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="px-4 py-2 border border-[#1C1A17] hover:bg-black hover:text-white transition-colors text-[10px] tracking-widest font-bold uppercase rounded"
                        >
                          + 신규 데이터 추가 (Create Unit)
                        </button>
                      </div>

                      {/* Search and Filters Bar */}
                      <div className="bg-[#FAF9F6] border border-[#1C1A17]/10 p-5 rounded flex flex-col md:flex-row gap-4 items-center justify-between text-xs">
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                          <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <span className="font-mono text-[9px] tracking-widest font-bold uppercase text-black/50">📁 카테고리별 검색 (Filter Category)</span>
                            <select
                              value={adminCategoryFilter}
                              onChange={e => setAdminCategoryFilter(e.target.value)}
                              className="bg-white border border-[#1C1A17]/15 rounded p-2 text-xs font-mono text-[#1C1A17] focus:outline-none focus:border-black min-w-[200px] h-9"
                            >
                              <option value="all">ALL CATEGORIES (전체 보기)</option>
                              <option value="poetry">Poetry (시집 수록전)</option>
                              <option value="philosophy">Philosophy (심물철학 단상)</option>
                              <option value="journey">Journey (활동 여정기록)</option>
                              <option value="press">Press (언론 보도기사)</option>
                              <option value="mulpa">Mulpaism (물파주의 기고글)</option>
                              <option value="suncha_seo">서화차향 - 서(書) (Calligraphy)</option>
                              <option value="suncha_hwa">서화차향 - 화(畵) (Painting)</option>
                              <option value="suncha_cha">서화차향 - 차(茶) (Tea)</option>
                              <option value="suncha_hyang">서화차향 - 향(香) (Incense)</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <span className="font-mono text-[9px] tracking-widest font-bold uppercase text-black/50">🔍 명칭 키워드 검색 (Search Name)</span>
                            <input
                              type="text"
                              value={adminSearchQuery}
                              onChange={e => setAdminSearchQuery(e.target.value)}
                              placeholder="제목 키워드 입력..."
                              className="bg-white border border-[#1C1A17]/15 rounded px-3 py-2 text-xs font-sans text-black placeholder-black/30 focus:outline-none focus:border-black min-w-[220px] h-9"
                            />
                          </div>

                          <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <span className="font-mono text-[9px] tracking-widest font-bold uppercase text-black/50">⇅ 정렬 방식 (Sort Order)</span>
                            <select
                              value={adminSortOrder}
                              onChange={e => setAdminSortOrder(e.target.value as any)}
                              className="bg-white border border-[#1C1A17]/15 rounded p-2 text-xs font-mono text-[#1C1A17] focus:outline-none focus:border-black min-w-[160px] h-9"
                            >
                              <option value="default">등록순 (Default)</option>
                              <option value="titleAsc">이름 오름차순 (A-Z ▲)</option>
                              <option value="titleDesc">이름 내림차순 (Z-A ▼)</option>
                            </select>
                          </div>
                        </div>

                        <div className="font-mono text-[10px] text-[#1C1A17]/60 bg-white border border-[#1C1A17]/10 px-3 py-2 rounded self-end md:self-auto shrink-0 shadow-sm">
                          Total Filtered: <strong className="text-black">{filteredItems.length}</strong> / {archiveItems.length} units
                        </div>
                      </div>

                      {/* Main Records dynamic table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#1C1A17]/10 font-bold bg-[#FAF9F6]">
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase">Language</th>
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase">Category</th>
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase">Title</th>
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase">Collection / Scope</th>
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase">Saved Date (월/일)</th>
                              <th className="p-3 text-right font-mono text-[9px] tracking-widest uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1C1A17]/5 font-sans">
                            {filteredItems.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50/50">
                                <td className="p-3">
                                  <span className="font-mono font-bold uppercase px-2 py-1 bg-gray-100 rounded text-[9px]">
                                    {item.language || 'KR'}
                                  </span>
                                </td>
                                <td className="p-3 text-[#1C1A17]/70 font-semibold text-[11px] uppercase tracking-wider">
                                  {item.category === 'poetry' ? 'Poetry' :
                                   item.category === 'philosophy' ? 'Philosophy' :
                                   item.category === 'journey' ? 'Journey' :
                                   item.category === 'press' ? 'Press' :
                                   item.category === 'mulpa' ? 'Mulpaism' :
                                   item.category === 'suncha_seo' ? '서화차향 - 서(書)' :
                                   item.category === 'suncha_hwa' ? '서화차향 - 화(畵)' :
                                   item.category === 'suncha_cha' ? '서화차향 - 차(茶)' :
                                   item.category === 'suncha_hyang' ? '서화차향 - 향(香)' :
                                   item.category === 'suncha_intro' ? '서화차향 - 차(茶) (Old)' :
                                   item.category === 'suncha_review' ? '서화차향 - 차(茶) (Old)' :
                                   item.category}
                                </td>
                                <td className="p-3 font-medium text-black max-w-xs truncate font-serif">
                                  {item.title}
                                </td>
                                <td className="p-3 text-[#1C1A17]/60 text-[11px] truncate max-w-xs font-serif">
                                  {item.poetry_collection_name || 'N/A (Unbound / Timeline)'}
                                </td>
                                <td className="p-3 text-[#1C1A17]/70 font-mono text-[11px] whitespace-nowrap">
                                  {formatMonthDay(item.created_at)}
                                </td>
                                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                                  <button
                                    onClick={() => {
                                      setEditingItem(item);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="p-1.5 hover:text-blue-600 transition-colors inline-block"
                                    title="Edit record"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-1.5 hover:text-red-600 transition-colors inline-block"
                                    title="Delete record"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {filteredItems.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center py-12 text-black/40 italic font-mono uppercase tracking-wider">
                                  {archiveItems.length === 0
                                    ? "No database records resolved. Please click restoration sync button above."
                                    : "No matching records found for the selected category/keyword filter."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 물파작가 및 대표작품 아카이브 관리 (Artists & Masterpieces Cabinet) */}
                    <div className="bg-white border border-[#1C1A17]/10 p-8 rounded shadow-sm space-y-6">
                      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-[#1C1A17]/10 pb-4">
                        <div>
                          <h3 className="font-serif text-xl font-bold text-black flex items-center gap-2">
                            🧑‍🎨 대표 물파작가 및 도록 관리 (Artists & Works Cabinet)
                          </h3>
                          <p className="text-xs text-black/55 mt-0.5">물파공간에 전시되는 물파작가들과 그들의 대표 심물적 수묵/서화 도록을 원스톱 관리합니다.</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingArtist({
                              name: '',
                              title: '',
                              bio: '',
                              image: '/images/lasok_profile.jpg',
                              language: lang,
                              works: []
                            });
                            setEditingWorkIdx(null);
                            setIsArtistModalOpen(true);
                          }}
                          className="px-4 py-2 border border-black bg-black text-white hover:bg-[#322F2A] transition-colors text-[10px] tracking-widest font-bold uppercase rounded"
                        >
                          + 신규 작가 등록 (Register Artist)
                        </button>
                      </div>

                      {/* Info Tips for images storing location on Café24 hosting server */}
                      <div className="bg-[#FAF9F6] border border-[#1C1A17]/10 p-4 rounded text-xs leading-relaxed text-[#1C1A17]/80">
                        <strong>💡 호스팅 이미지 서버 최적화 지침 (Cafe24 Server Image Storage Rules):</strong>
                        <p className="mt-1">
                          호스팅 서버의 DB 용량을 초과하지 않도록 이미지는 수묵화 업로드 등 Cafe24 호스팅의 <code>/images/</code> 폴더로 FTP 직접 업로드한 뒤, 
                          텍스트 경로에 <code>/images/파일명.jpg</code> 형태로 안전하게 지정하는 방식을 아주 강력히 지향하고 권장합니다.
                        </p>
                      </div>

                      {/* Artists Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#1C1A17]/10 font-bold bg-[#FAF9F6]">
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase">Language</th>
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase">Photo</th>
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase">Artist Name</th>
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase">Representative Title</th>
                              <th className="p-3 font-mono text-[9px] tracking-widest uppercase text-center">Masterpieces</th>
                              <th className="p-3 text-right font-mono text-[9px] tracking-widest uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1C1A17]/5 font-sans">
                            {artists.map((artist) => (
                              <tr key={artist.id} className="hover:bg-gray-50/50">
                                <td className="p-3">
                                  <span className="font-mono font-bold uppercase px-2 py-1 bg-amber-50 border border-amber-200/50 rounded text-[9px] text-amber-800">
                                    {artist.language || 'KR'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="w-8 h-8 rounded border border-black/10 overflow-hidden bg-gray-100">
                                    <img 
                                      src={artist.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100'} 
                                      alt={artist.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover" 
                                    />
                                  </div>
                                </td>
                                <td className="p-3 font-semibold text-black font-serif">
                                  {artist.name}
                                </td>
                                <td className="p-3 text-[#1C1A17]/70 font-sans">
                                  {artist.title}
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-black text-[11px]">
                                  {artist.works ? artist.works.length : 0} Pieces
                                </td>
                                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                                  <button
                                    onClick={() => {
                                      setEditingArtist(artist);
                                      setEditingWorkIdx(null);
                                      setIsArtistModalOpen(true);
                                    }}
                                    className="p-1.5 hover:text-blue-600 transition-colors inline-block"
                                    title="Edit artist bio and works"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteArtist(artist.id!)}
                                    className="p-1.5 hover:text-red-600 transition-colors inline-block"
                                    title="Delete artist"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {artists.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center py-12 text-black/40 italic font-mono uppercase tracking-wider">
                                  등록된 물파작가가 아직 비어 있습니다. 우측 상단의 "신규 작가 등록"을 눌러 전시를 시작해 보세요.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Site assets parameters configuration */}
                    <div className="bg-white border border-[#1C1A17]/10 p-8 rounded shadow-sm space-y-6">
                      <div className="border-b border-[#1C1A17]/5 pb-4">
                        <h3 className="font-serif text-lg font-bold text-black flex items-center gap-2">
                          <Settings size={18} /> 글로벌 웹 호스팅 자산 커스텀 매니저
                        </h3>
                        <p className="text-xs text-[#1C1A17]/60 font-sans mt-0.5">서버의 주요 디자인 자산(로고, 배경, 대표 다도 이미지)을 PC 내부 파일에서 직접 선택하여 교체 저장합니다.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        
                        {/* 1. Global Logo */}
                        <div className="space-y-2">
                          <label className="font-mono text-[9px] tracking-widest font-bold uppercase block text-[#1C1A17]/70">
                            GLOBAL LOGO IMAGE (글로벌 고해상도 로고)
                          </label>
                          <div className="border border-[#1C1A17]/15 rounded p-4 bg-[#FAF9F6] flex flex-col items-center justify-center space-y-3 relative overflow-hidden group">
                            {siteSettings?.logo_url ? (
                              <div className="w-16 h-16 border border-black/10 rounded overflow-hidden bg-white shadow-sm flex items-center justify-center">
                                <img src={siteSettings.logo_url} alt="Logo Preview" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 border border-dashed border-black/20 rounded flex items-center justify-center text-black/30 text-xs">
                                No Image
                              </div>
                            )}
                            <div className="relative w-full text-center">
                              <input 
                                type="file" 
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const container = e.target.closest('.rounded') as HTMLDivElement;
                                    if (container) container.style.opacity = '0.5';
                                    const url = await uploadImageFile(file);
                                    const updated = { ...siteSettings, logo_url: url } as SiteSettings;
                                    setSiteSettings(updated);
                                    await setDoc(doc(db, 'site_settings', 'global'), updated);
                                    if (container) container.style.opacity = '1';
                                  } catch (err: any) {
                                    alert('로고 이미지 업로드에 실패했습니다: ' + (err?.message || err));
                                  }
                                }}
                              />
                              <button type="button" className="w-full py-1.5 border border-[#1C1A17]/15 hover:bg-neutral-100 text-black text-[10px] uppercase tracking-wider font-bold rounded bg-white transition-all shadow-sm">
                                📁 파일 선택 및 저장
                              </button>
                            </div>
                            <span className="text-[9px] text-[#1C1A17]/50 font-mono break-all text-center">
                              {siteSettings?.logo_url ? siteSettings.logo_url.substring(siteSettings.logo_url.lastIndexOf('/') + 1) : '지정된 이미지 없음'}
                            </span>
                          </div>
                        </div>

                        {/* 2. Hero BG */}
                        <div className="space-y-2">
                          <label className="font-mono text-[9px] tracking-widest font-bold uppercase block text-[#1C1A17]/70">
                            HERO COVER HOME BG (메인 히어로 홈 배경)
                          </label>
                          <div className="border border-[#1C1A17]/15 rounded p-4 bg-[#FAF9F6] flex flex-col items-center justify-center space-y-3 relative overflow-hidden group">
                            {siteSettings?.hero_bg_url ? (
                              <div className="w-full h-16 border border-black/10 rounded overflow-hidden bg-white shadow-sm">
                                <img src={siteSettings.hero_bg_url} alt="Hero BG Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-full h-16 border border-dashed border-black/20 rounded flex items-center justify-center text-black/30 text-xs">
                                No Image
                              </div>
                            )}
                            <div className="relative w-full text-center">
                              <input 
                                type="file" 
                                accept="image/*,image/heic,image/heif,.heic,.heif"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const container = e.target.closest('.rounded') as HTMLDivElement;
                                    if (container) container.style.opacity = '0.5';
                                    const url = await uploadImageFile(file);
                                    const updated = { ...siteSettings, hero_bg_url: url } as SiteSettings;
                                    setSiteSettings(updated);
                                    await setDoc(doc(db, 'site_settings', 'global'), updated);
                                    if (container) container.style.opacity = '1';
                                  } catch (err: any) {
                                    alert('메인 히어로 이미지 업로드에 실패했습니다: ' + (err?.message || err));
                                  }
                                }}
                              />
                              <button type="button" className="w-full py-1.5 border border-[#1C1A17]/15 hover:bg-neutral-100 text-black text-[10px] uppercase tracking-wider font-bold rounded bg-white transition-all shadow-sm">
                                📁 파일 선택 및 저장
                              </button>
                            </div>
                            <span className="text-[9px] text-[#1C1A17]/50 font-mono break-all text-center">
                              {siteSettings?.hero_bg_url ? siteSettings.hero_bg_url.substring(siteSettings.hero_bg_url.lastIndexOf('/') + 1) : '지정된 이미지 없음'}
                            </span>
                          </div>
                        </div>

                        {/* 3. Zen Tea Cover */}
                        <div className="space-y-2">
                          <label className="font-mono text-[9px] tracking-widest font-bold uppercase block text-[#1C1A17]/70">
                            ZEN TEA COVER IMAGE (대표 다도 다기 이미지)
                          </label>
                          <div className="border border-[#1C1A17]/15 rounded p-4 bg-[#FAF9F6] flex flex-col items-center justify-center space-y-3 relative overflow-hidden group">
                            {siteSettings?.tea_detail_url ? (
                              <div className="w-full h-16 border border-black/10 rounded overflow-hidden bg-white shadow-sm">
                                <img src={siteSettings.tea_detail_url} alt="Tea Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-full h-16 border border-dashed border-black/20 rounded flex items-center justify-center text-black/30 text-xs">
                                No Image
                              </div>
                            )}
                            <div className="relative w-full text-center">
                              <input 
                                type="file" 
                                accept="image/*,image/heic,image/heif,.heic,.heif"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const container = e.target.closest('.rounded') as HTMLDivElement;
                                    if (container) container.style.opacity = '0.5';
                                    const url = await uploadImageFile(file);
                                    const updated = { ...siteSettings, tea_detail_url: url } as SiteSettings;
                                    setSiteSettings(updated);
                                    await setDoc(doc(db, 'site_settings', 'global'), updated);
                                    if (container) container.style.opacity = '1';
                                  } catch (err: any) {
                                    alert('다기 이미지 업로드에 실패했습니다: ' + (err?.message || err));
                                  }
                                }}
                              />
                              <button type="button" className="w-full py-1.5 border border-[#1C1A17]/15 hover:bg-neutral-100 text-black text-[10px] uppercase tracking-wider font-bold rounded bg-white transition-all shadow-sm">
                                📁 파일 선택 및 저장
                              </button>
                            </div>
                            <span className="text-[9px] text-[#1C1A17]/50 font-mono break-all text-center">
                              {siteSettings?.tea_detail_url ? siteSettings.tea_detail_url.substring(siteSettings.tea_detail_url.lastIndexOf('/') + 1) : '지정된 이미지 없음'}
                            </span>
                          </div>
                        </div>



                      </div>
                    </div>

                  </div>

                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#1C1A17]/10 py-16 bg-[#FAF9F6] text-left">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <span className="font-serif text-sm tracking-[0.25em] font-bold text-black uppercase">BULHANZA</span>
            <p className="text-[11px] leading-relaxed text-[#1C1A17]/55 uppercase font-mono tracking-wider">
              ESTABLISHED IN 1997 AS THE ORIGINAL CORE OF EASTERN MIND-MATTER WAVE AESTHETICS COOPERATIVE. HIGHLY TAILORED ARCHIVE.
            </p>
          </div>
          <div className="space-y-4 text-left">
            <h4 className="font-serif text-xs font-bold uppercase tracking-widest text-[#1C1A17]">Navigation</h4>
            <div className="flex flex-col gap-2 text-[10px] font-mono tracking-widest uppercase col-span-1">
              <button onClick={() => setPage('home')} className="text-left hover:text-black opacity-60 hover:opacity-100 transition-opacity bg-transparent">HOME</button>
              <button onClick={() => setPage('philosophy')} className="text-left hover:text-black opacity-60 hover:opacity-100 transition-opacity bg-transparent">PHILOSOPHY</button>
              <button onClick={() => setPage('art')} className="text-left hover:text-black opacity-60 hover:opacity-100 transition-opacity bg-transparent">AESTHETICS</button>
            </div>
          </div>
          <div className="space-y-4 text-left">
            <h4 className="font-serif text-xs font-bold uppercase tracking-widest text-[#1C1A17]">Contact Desk</h4>
            <div className="text-[10px] font-mono tracking-wider space-y-1 text-black/60">
              <p>EMAIL: cocogame@kakao.com</p>
              <p>PHONE: +82-2-588-4670</p>
              <p>SEOUL, MAIN HEADQUARTERS</p>
              
              <button 
                onClick={() => setIsContactModalOpen(true)} 
                className="mt-4 text-[#1C1A17] hover:text-black font-extrabold uppercase tracking-widest text-left block group"
              >
                <span className="text-[#1C1A17] hover:text-black transition-colors">[ SEND MESSAGE : 메시지 보내기 ]</span>
                <span className="block h-[1.5px] w-0 group-hover:w-full bg-[#1C1A17] transition-all duration-300 mt-0.5"></span>
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8 border-t border-[#1C1A17]/5 mt-12 flex justify-between items-center text-[9px] font-mono text-black/40">
          <span>&copy; {new Date().getFullYear()} BULHANZA. ALL RIGHTS REGISTERED.</span>
          <span>BULHANZA DIGITAL ARCHIVE SYSTEM</span>
        </div>
      </footer>

      {/* MODAL EDITING MODAL CLIENT */}
      <AnimatePresence>
        {isEditModalOpen && editingItem && (
          <div className="fixed inset-0 bg-[#1C1A17]/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FAF9F6] border border-[#1C1A17]/15 rounded shadow-2xl overflow-hidden w-full max-w-3xl max-h-[85vh] flex flex-col"
            >
              <div className="p-6 bg-white border-b border-[#1C1A17]/10 flex justify-between items-center text-left">
                <div>
                  <h3 className="font-serif text-lg font-bold text-black">
                    {editingItem.id ? '기존 아카이브 레코드 편집 (Modify Entry)' : '새로운 아카이브 레코드 생성 (Create Entry)'}
                  </h3>
                  <p className="text-[10px] text-black/50 font-sans tracking-wide uppercase mt-0.5">Firestore container write action</p>
                </div>
                <button 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="p-1 hover:opacity-75"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto space-y-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">LANGUAGE</label>
                    <select
                      value={editingItem.language || 'KR'}
                      onChange={e => setEditingItem({ ...editingItem, language: e.target.value as Language })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] font-mono focus:outline-none"
                    >
                      <option value="KR">한국어 (KR)</option>
                      <option value="SC">简体中文 (SC)</option>
                      <option value="EN">English (EN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">CATEGORY</label>
                    <select
                      value={editingItem.category || 'poetry'}
                      onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] font-mono focus:outline-none"
                    >
                      <option value="poetry">Poetry (시집 수록전)</option>
                      <option value="philosophy">Philosophy (심물철학 단상)</option>
                      <option value="journey">Journey (활동 여정기록)</option>
                      <option value="press">Press (언론 보도기사)</option>
                      <option value="mulpa">Mulpaism (물파주의 기고글)</option>
                      <option value="suncha_seo">서화차향 - 서(書) (Calligraphy)</option>
                      <option value="suncha_hwa">서화차향 - 화(畵) (Painting)</option>
                      <option value="suncha_cha">서화차향 - 차(茶) (Tea)</option>
                      <option value="suncha_hyang">서화차향 - 향(香) (Incense)</option>
                    </select>
                  </div>

                  {editingItem.category === 'poetry' && (
                    <div className="md:col-span-2">
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">BELONGS TO POETRY BOOK COLLECTION</label>
                      <select
                        value={editingItem.poetry_collection_name || ''}
                        onChange={e => setEditingItem({ ...editingItem, poetry_collection_name: e.target.value })}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] font-serif focus:outline-none"
                      >
                        {t.poetryCollection.allCollections.map((colName, idx) => (
                          <option key={idx} value={colName}>{colName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">RECORD TITLE (제목)</label>
                    <input 
                      type="text" 
                      required
                      value={editingItem.title || ''}
                      onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">SUMMARY OVERVIEW (요약 / 설명)</label>
                    <input 
                      type="text" 
                      value={editingItem.summary || ''}
                      onChange={e => setEditingItem({ ...editingItem, summary: e.target.value })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">IMAGE ASSET (대표 이미지파일 업로드 또는 직접 경로 입력)</label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Left: upload box */}
                      <div className="md:col-span-2 border border-dashed border-[#1C1A17]/25 hover:border-[#1C1A17]/50 rounded p-4 text-center bg-white cursor-pointer relative transition-colors">
                        <input 
                          type="file" 
                          accept="image/*,image/heic,image/heif,.heic,.heif"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const btn = e.target.parentElement;
                              if (btn) btn.style.opacity = '0.5';
                              const url = await uploadImageFile(file);
                              setEditingItem({ ...editingItem, image_url: url });
                              if (btn) btn.style.opacity = '1';
                            } catch (err) {
                              alert('이미지 업로드에 실패하였습니다: ' + err);
                            }
                          }}
                        />
                        <div className="space-y-1">
                          <span className="text-xs text-[#1C1A17]/80 block font-semibold">📁 클릭 또는 드래그하여 로컬 이미지 선택</span>
                          <span className="text-[10px] text-black/40 block font-mono">Max size 20MB (.jpg, .png, .webp, .gif)</span>
                        </div>
                      </div>

                      {/* Right: preview if exists */}
                      <div className="border border-[#1C1A17]/10 aspect-[16/10] bg-[#FAF9F6] rounded flex items-center justify-center p-2 relative overflow-hidden">
                        {editingItem.image_url ? (
                          <img 
                            src={editingItem.image_url} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[10px] text-black/35 font-mono">No Image</span>
                        )}
                      </div>
                    </div>

                    {/* Manual path editor overlay */}
                    <input 
                      type="text" 
                      placeholder="FTP 직접 업로드한 이미지인 경우 /images/ 또는 /이미지저장/ 경로명을 직접 입력해도 됩니다."
                      value={editingItem.image_url || ''}
                      onChange={e => setEditingItem({ ...editingItem, image_url: e.target.value })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs font-mono text-[#1C1A17] focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">MARKDOWN MAIN STORY / CONTENT (시구 / 상세 내용)</label>
                    <RichTextEditor 
                      value={editingItem.content || ''}
                      onChange={val => setEditingItem({ ...editingItem, content: val })}
                      onPaste={(e) => handleTextAreaPaste(e, (val) => setEditingItem({ ...editingItem, content: val }), editingItem.content || '')}
                      placeholder="Markdown 및 리치 텍스트 서식 지정이 지원됩니다."
                      rows={8}
                      onUploadImage={uploadImageFile}
                    />
                  </div>
                </div>

                <div className="border-t border-[#1C1A17]/5 pt-6 flex justify-end gap-3 font-mono">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingItem(null);
                    }}
                    className="px-6 py-2 border border-[#1C1A17]/10 hover:bg-gray-100 text-[10px] tracking-widest uppercase transition-colors rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-black text-white hover:bg-gray-950 text-[10px] tracking-widest uppercase transition-colors rounded font-bold"
                  >
                    Save Unit to Firebase
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isArtistModalOpen && editingArtist && (
          <div className="fixed inset-0 bg-[#1C1A17]/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FAF9F6] border border-[#1C1A17]/15 rounded shadow-2xl overflow-hidden w-full max-w-3xl max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 bg-white border-b border-[#1C1A17]/10 flex justify-between items-center text-left">
                <div>
                  <h3 className="font-serif text-lg font-bold text-black">
                    {editingArtist.id ? '기존 미술작가 정보 및 도록 편집' : '새로운 미술작가 정보 등록'}
                  </h3>
                  <p className="text-[10px] text-black/50 font-sans tracking-wide uppercase mt-0.5">Firestore Artists Collection editor</p>
                </div>
                <button 
                  onClick={() => {
                    setIsArtistModalOpen(false);
                    setEditingArtist(null);
                  }}
                  className="p-1 hover:opacity-75"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form content */}
              <form onSubmit={handleSaveArtist} className="p-6 overflow-y-auto space-y-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Language Selector */}
                  <div>
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">LANGUAGE</label>
                    <select
                      value={editingArtist.language || 'KR'}
                      onChange={e => setEditingArtist({ ...editingArtist, language: e.target.value as Language })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] font-mono focus:outline-none"
                    >
                      <option value="KR">한국어 (KR)</option>
                      <option value="SC">简体中文 (SC)</option>
                      <option value="EN">English (EN)</option>
                    </select>
                  </div>

                  {/* Profile image URL */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">ARTIST PHOTO (작가 사진 업로드 또는 경로 입력)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Left: upload box */}
                      <div className="md:col-span-2 border border-dashed border-[#1C1A17]/25 hover:border-[#1C1A17]/50 rounded p-4 text-center bg-white cursor-pointer relative transition-colors">
                        <input 
                          type="file" 
                          accept="image/*,image/heic,image/heif,.heic,.heif"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const btn = e.target.parentElement;
                              if (btn) btn.style.opacity = '0.5';
                              const url = await uploadImageFile(file);
                              setEditingArtist({ ...editingArtist, image: url });
                              if (btn) btn.style.opacity = '1';
                            } catch (err) {
                              alert('이미지 업로드에 실패하였습니다: ' + err);
                            }
                          }}
                        />
                        <div className="space-y-1">
                          <span className="text-xs text-[#1C1A17]/80 block font-semibold">📁 클릭 또는 드래그하여 작가 사진 선택</span>
                          <span className="text-[10px] text-black/40 block font-mono">Max size 20MB (.jpg, .png, .webp)</span>
                        </div>
                      </div>

                      {/* Right: preview if exists */}
                      <div className="border border-[#1C1A17]/10 aspect-[3/4] max-h-[120px] bg-[#FAF9F6] rounded flex items-center justify-center p-1.5 relative overflow-hidden mx-auto">
                        {editingArtist.image ? (
                          <img 
                            src={editingArtist.image} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded grayscale" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[10px] text-black/35 font-mono">No Image</span>
                        )}
                      </div>
                    </div>

                    <input 
                      type="text" 
                      required
                      placeholder="e.g. /images/lasok_profile.jpg 또는 업로드된 /이미지저장/ 이미지 경로"
                      value={editingArtist.image || ''}
                      onChange={e => setEditingArtist({ ...editingArtist, image: e.target.value })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] font-mono focus:outline-none"
                    />
                  </div>

                  {/* Name field */}
                  <div className="md:col-span-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">ARTIST NAME (작가명)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 라석 선사 (羅石)"
                      value={editingArtist.name || ''}
                      onChange={e => setEditingArtist({ ...editingArtist, name: e.target.value })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] focus:outline-none"
                    />
                  </div>

                  {/* Title field */}
                  <div className="md:col-span-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">REPRESENTATIVE PROFESSIONAL TITLE (대표 직함)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 물파공간 창시자 및 심물서화가"
                      value={editingArtist.title || ''}
                      onChange={e => setEditingArtist({ ...editingArtist, title: e.target.value })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] focus:outline-none"
                    />
                  </div>

                  {/* Biography field */}
                  <div className="md:col-span-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">BIOGRAPHY (상세 예술가 평론 및 일대기 소개)</label>
                    <textarea 
                      rows={4}
                      value={editingArtist.bio || ''}
                      onChange={e => setEditingArtist({ ...editingArtist, bio: e.target.value })}
                      onPaste={(e) => handleTextAreaPaste(e, (val) => setEditingArtist({ ...editingArtist, bio: val }), editingArtist.bio || '')}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] focus:outline-none"
                      placeholder="세밀하고 깊이있는 일대기를 문맥에 맞춰 기술합니다."
                    />
                  </div>
                </div>

                {/* Sub masterpieces management */}
                <div className="border-t border-[#1C1A17]/10 pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-serif text-sm font-bold text-black uppercase tracking-wide">🎨 작가 대표 미술작품 도록 관리</h4>
                    <span className="font-mono text-[9.5px] bg-[#FAF9F6] border border-[#1C1A17]/10 px-2 py-0.5 rounded text-black/50">
                      {editingArtist.works ? editingArtist.works.length : 0} Pieces Listed
                    </span>
                  </div>

                  {/* Sub-form to prepend new masterpieces */}
                  <div className="bg-[#FAF9F6] border border-[#1C1A17]/10 p-4 rounded space-y-3 text-xs">
                    <span className="font-bold block text-black">
                      {editingWorkIdx === null
                        ? '신규 작품 일품 추가 (Add New Piece to Gallery)'
                        : `선택한 작품 정보 수정 (Editing Selected Masterpiece #${editingWorkIdx + 1})`}
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input 
                        type="text"
                        id="new-work-title"
                        placeholder="작품명 (Title) e.g. 심물지파 (心物之波)"
                        className="bg-white border border-[#1C1A17]/15 rounded p-2 focus:outline-none"
                      />
                      <input 
                        type="text"
                        id="new-work-size"
                        placeholder="작품 규격 (Size) e.g. 70 x 120 cm"
                        className="bg-white border border-[#1C1A17]/15 rounded p-2 focus:outline-none"
                      />
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                        <div className="md:col-span-2">
                          <input 
                            type="text"
                            id="new-work-image"
                            placeholder="작품 이미지 경로 (Image) e.g. /images/work1.jpg"
                            className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 focus:outline-none font-mono text-xs"
                          />
                        </div>
                        <div className="relative border border-dashed border-[#1C1A17]/30 hover:border-[#1C1A17]/60 rounded py-1.5 px-2 text-center bg-white cursor-pointer transition-colors text-[11px] font-sans">
                          <input 
                            type="file" 
                            accept="image/*,image/heic,image/heif,.heic,.heif"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const container = e.target.parentElement;
                                if (container) container.style.opacity = '0.5';
                                const url = await uploadImageFile(file);
                                const imgInput = document.getElementById('new-work-image') as HTMLInputElement;
                                if (imgInput) {
                                  imgInput.value = url;
                                }
                                if (container) container.style.opacity = '1';
                              } catch (err) {
                                alert('이미지 업로드에 실패하였습니다: ' + err);
                              }
                            }}
                          />
                          <span className="text-[#1C1A17] font-semibold">📁 작품 파일 업로드 (Upload)</span>
                        </div>
                      </div>
                      <textarea 
                        rows={2}
                        id="new-work-intro"
                        placeholder="작품 해설 및 소개 (Introduction)"
                        className="bg-white border border-[#1C1A17]/15 rounded p-2 focus:outline-none md:col-span-2"
                      />
                      <textarea 
                        rows={2}
                        id="new-work-critic"
                        placeholder="예술작 비평 (Art Criticism)"
                        className="bg-white border border-[#1C1A17]/15 rounded p-2 focus:outline-none md:col-span-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const titleEl = document.getElementById('new-work-title') as HTMLInputElement;
                          const sizeEl = document.getElementById('new-work-size') as HTMLInputElement;
                          const imgEl = document.getElementById('new-work-image') as HTMLInputElement;
                          const introEl = document.getElementById('new-work-intro') as HTMLTextAreaElement;
                          const criticEl = document.getElementById('new-work-critic') as HTMLTextAreaElement;

                          if (!titleEl.value || !imgEl.value) {
                            alert('작품명과 작품 이미지 주소는 필수입니다.');
                            return;
                          }

                          const newWork: Work = {
                            title: titleEl.value,
                            size: sizeEl.value,
                            image: imgEl.value,
                            introduction: introEl.value || '',
                            criticism: criticEl.value || ''
                          };

                          const currentWorks = editingArtist.works ? [...editingArtist.works] : [];
                          if (editingWorkIdx === null) {
                            setEditingArtist({
                              ...editingArtist,
                              works: [...currentWorks, newWork]
                            });
                          } else {
                            currentWorks[editingWorkIdx] = newWork;
                            setEditingArtist({
                              ...editingArtist,
                              works: currentWorks
                            });
                            setEditingWorkIdx(null);
                          }

                          // Clear fields
                          titleEl.value = '';
                          sizeEl.value = '';
                          imgEl.value = '';
                          introEl.value = '';
                          criticEl.value = '';
                        }}
                        className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-[9px] uppercase tracking-widest rounded"
                      >
                        {editingWorkIdx === null 
                          ? '+ 목록에 이 작품 도록 삽입 (Insert Masterpiece to Active List)'
                          : '✓ 선택한 도록 작품정보 수정 적용 (Apply Changes to Masterpiece)'}
                      </button>
                      {editingWorkIdx !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            const titleEl = document.getElementById('new-work-title') as HTMLInputElement;
                            const sizeEl = document.getElementById('new-work-size') as HTMLInputElement;
                            const imgEl = document.getElementById('new-work-image') as HTMLInputElement;
                            const introEl = document.getElementById('new-work-intro') as HTMLTextAreaElement;
                            const criticEl = document.getElementById('new-work-critic') as HTMLTextAreaElement;

                            if (titleEl) titleEl.value = '';
                            if (sizeEl) sizeEl.value = '';
                            if (imgEl) imgEl.value = '';
                            if (introEl) introEl.value = '';
                            if (criticEl) criticEl.value = '';

                            setEditingWorkIdx(null);
                          }}
                          className="px-4 py-2 border border-[#1C1A17]/15 hover:bg-neutral-100 text-[#1C1A17] font-semibold text-[9px] uppercase tracking-widest rounded transition-colors"
                        >
                          수정 취소 (Cancel)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of current added works with delete action */}
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                    {editingArtist.works && editingArtist.works.map((work, wIdx) => (
                      <div 
                        key={wIdx} 
                        className={`p-3 rounded flex items-center justify-between text-xs gap-4 transition-colors ${
                          editingWorkIdx === wIdx 
                            ? 'bg-amber-50/75 border border-amber-300' 
                            : 'bg-white border border-[#1C1A17]/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border border-black/10 rounded overflow-hidden bg-gray-50 flex-shrink-0">
                            <img src={work.image} alt={work.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-black font-serif flex items-center gap-1.5">
                              {work.title}
                              {editingWorkIdx === wIdx && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded">Editing</span>
                              )}
                            </p>
                            <p className="text-[10px] text-[#1C1A17]/60 font-mono">{work.size || 'Unspecified size'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const titleEl = document.getElementById('new-work-title') as HTMLInputElement;
                              const sizeEl = document.getElementById('new-work-size') as HTMLInputElement;
                              const imgEl = document.getElementById('new-work-image') as HTMLInputElement;
                              const introEl = document.getElementById('new-work-intro') as HTMLTextAreaElement;
                              const criticEl = document.getElementById('new-work-critic') as HTMLTextAreaElement;

                              if (titleEl) titleEl.value = work.title || '';
                              if (sizeEl) sizeEl.value = work.size || '';
                              if (imgEl) imgEl.value = work.image || '';
                              if (introEl) introEl.value = work.introduction || '';
                              if (criticEl) criticEl.value = work.criticism || '';

                              setEditingWorkIdx(wIdx);
                            }}
                            className={`p-1 hover:text-blue-600 transition-colors ${editingWorkIdx === wIdx ? 'text-blue-600' : ''}`}
                            title="Edit this work's details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedWorks = [...editingArtist.works!];
                              updatedWorks.splice(wIdx, 1);
                              setEditingArtist({ ...editingArtist, works: updatedWorks });
                              if (editingWorkIdx === wIdx) {
                                setEditingWorkIdx(null);
                                const titleEl = document.getElementById('new-work-title') as HTMLInputElement;
                                const sizeEl = document.getElementById('new-work-size') as HTMLInputElement;
                                const imgEl = document.getElementById('new-work-image') as HTMLInputElement;
                                const introEl = document.getElementById('new-work-intro') as HTMLTextAreaElement;
                                const criticEl = document.getElementById('new-work-critic') as HTMLTextAreaElement;
                                if (titleEl) titleEl.value = '';
                                if (sizeEl) sizeEl.value = '';
                                if (imgEl) imgEl.value = '';
                                if (introEl) introEl.value = '';
                                if (criticEl) criticEl.value = '';
                              } else if (editingWorkIdx !== null && editingWorkIdx > wIdx) {
                                setEditingWorkIdx(editingWorkIdx - 1);
                              }
                            }}
                            className="p-1 hover:text-red-600 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!editingArtist.works || editingArtist.works.length === 0) && (
                      <p className="text-center py-4 text-[10px] text-black/45 italic">
                        추가된 대표 도고 작품이 없습니다. 상위 양식에서 대표 수묵화를 기입하세요.
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit actions */}
                <div className="border-t border-[#1C1A17]/10 pt-6 flex justify-end gap-3 font-mono">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsArtistModalOpen(false);
                      setEditingArtist(null);
                    }}
                    className="px-6 py-2 border border-[#1C1A17]/10 hover:bg-gray-100 text-[10px] tracking-widest uppercase transition-colors rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-black text-white hover:bg-gray-950 text-[10px] tracking-widest uppercase transition-colors rounded font-bold"
                  >
                    Save Artist to Firebase
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isContactModalOpen && (
          <div className="fixed inset-0 bg-[#1C1A17]/60 backdrop-blur-md z-[255] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FAF9F6] border border-[#1C1A17]/15 rounded shadow-2xl overflow-hidden w-full max-w-md flex flex-col relative"
            >
              {/* Header */}
              <div className="p-6 bg-white border-b border-[#1C1A17]/10 flex justify-between items-center text-left">
                <div>
                  <span className="text-[9px] tracking-[0.3em] font-mono text-[#1C1A17]/50 block uppercase font-bold">{t.contact?.subtitle || "CONTACT DESK"}</span>
                  <h3 className="font-serif text-lg font-bold text-black mt-0.5">
                    {t.contact?.title || "메시지 보내기"}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsContactModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 bg-white space-y-4 text-left">
                <p className="text-xs text-[#1C1A17]/75 font-sans leading-relaxed">
                  {t.contact?.collaboration || "전시 협업, 물파 禪 문학 기고, 기타 선다회 참여를 원하시는 경우 아래 문의 메시지를 남겨 주십시오."}
                </p>

                <AnimatePresence mode="wait">
                  {formSuccess ? (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-green-50 border border-green-200 p-6 text-center text-green-800 rounded font-sans text-xs flex flex-col items-center justify-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                        <Check size={16} />
                      </div>
                      <p className="font-bold">{t.contact?.success || "메시지가 성공적으로 전송되었습니다!"}</p>
                    </motion.div>
                  ) : (
                    <motion.form 
                      key="form"
                      onSubmit={(e) => {
                        handleContactSubmit(e);
                        // Slowly close after successful submit
                        setTimeout(() => {
                          setIsContactModalOpen(false);
                        }, 2500);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="font-mono text-[9px] tracking-widest text-[#1C1A17]/65 uppercase font-bold block mb-1.5">{t.contact?.name || "NAME"}</label>
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                          className="w-full bg-[#FAF9F6] border border-[#1C1A17]/15 rounded p-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17]/50"
                          placeholder="성명 (Name)"
                        />
                      </div>

                      <div>
                        <label className="font-mono text-[9px] tracking-widest text-[#1C1A17]/65 uppercase font-bold block mb-1.5">{t.contact?.email || "EMAIL"}</label>
                        <input 
                          type="email" 
                          required
                          value={formData.email}
                          onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                          className="w-full bg-[#FAF9F6] border border-[#1C1A17]/15 rounded p-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17]/50"
                          placeholder="이메일 주소 (Email)"
                        />
                      </div>

                      <div>
                        <label className="font-mono text-[9px] tracking-widest text-[#1C1A17]/65 uppercase font-bold block mb-1.5">{t.contact?.message || "MESSAGE"}</label>
                        <textarea 
                          rows={4}
                          required
                          value={formData.message}
                          onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                          className="w-full bg-[#FAF9F6] border border-[#1C1A17]/15 rounded p-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17]/50 resize-none animate-none"
                          placeholder="문의 하실 상세 내용 (Your inquiry...)"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={formSending}
                          className="w-full py-3 bg-[#1C1A17] hover:bg-black text-white font-semibold text-[10px] tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2 rounded shadow cursor-pointer"
                        >
                          <Send size={12} /> {formSending ? (t.contact?.sending || "SENDING...") : (t.contact?.send || "MESSAGE SEND")}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}

        {/* LIGHTBOX FOR ARTIST MASTERPIECES */}
        {lightboxActive && lightboxWorks.length > 0 && (
          <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-md z-[300] flex flex-col justify-between items-center p-4 md:p-8">
            {/* Top Toolbar */}
            <div className="w-full flex justify-between items-center border-b border-white/10 pb-4 max-w-7xl mx-auto z-[310] select-none text-left">
              <div>
                <span className="font-mono text-[8px] tracking-[0.3em] text-white/50 uppercase block mb-0.5">representative works • {lightboxArtistName}</span>
                <h4 className="font-serif text-base font-bold text-white uppercase tracking-wide">
                  {lightboxWorks[lightboxIndex]?.title}
                </h4>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-1 rounded">
                  {lightboxIndex + 1} / {lightboxWorks.length}
                </span>
                <button 
                  onClick={() => setLightboxActive(false)}
                  className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all"
                  title="Close light box (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Visual Centerpiece Area */}
            <div className="flex-grow w-full max-w-6xl mx-auto flex items-center justify-center relative my-4">
              {/* Prev Button */}
              <button 
                onClick={() => setLightboxIndex((prev) => (lightboxWorks.length > 0 ? (prev - 1 + lightboxWorks.length) % lightboxWorks.length : 0))}
                className="absolute left-0 md:left-4 p-3 rounded-full bg-black/60 border border-white/10 text-white hover:bg-neutral-800 active:scale-95 transition-all z-[320] shadow-2xl"
                title="Previous image"
              >
                <ChevronLeft size={24} />
              </button>

              {/* Artwork Image Frame */}
              <motion.div 
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className="max-h-[60vh] max-w-[85%] md:max-w-[70%] border border-white/15 bg-neutral-900 p-2 md:p-3 shadow-2xl flex items-center justify-center relative rounded overflow-hidden select-none"
              >
                <img 
                  src={lightboxWorks[lightboxIndex]?.image || 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200'} 
                  alt={lightboxWorks[lightboxIndex]?.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[56vh] w-auto object-contain select-none shadow-inner"
                />
              </motion.div>

              {/* Next Button */}
              <button 
                onClick={() => setLightboxIndex((prev) => (lightboxWorks.length > 0 ? (prev + 1) % lightboxWorks.length : 0))}
                className="absolute right-0 md:right-4 p-3 rounded-full bg-black/60 border border-white/10 text-white hover:bg-neutral-800 active:scale-95 transition-all z-[320] shadow-2xl"
                title="Next image"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Bottom Metadata Panel / Curator Label */}
            <div className="w-full max-w-4xl mx-auto bg-neutral-900/60 border border-white/10 p-5 md:p-6 rounded-lg text-left shadow-2xl select-none overflow-y-auto max-h-[22vh]">
              <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 pb-3 mb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-sm font-bold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                    {lightboxArtistName}
                  </span>
                  <h5 className="font-serif text-base font-bold text-[#E5E5E5]">
                    {lightboxWorks[lightboxIndex]?.title}
                  </h5>
                </div>
                {lightboxWorks[lightboxIndex]?.size && (
                  <span className="font-mono text-xs text-white/70 bg-white/10 px-2.5 py-0.5 border border-white/10 rounded animate-none">
                    {lightboxWorks[lightboxIndex]?.size}
                  </span>
                )}
              </div>

              <div className="space-y-4 text-xs select-text">
                {lightboxWorks[lightboxIndex]?.introduction && (
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] text-white/40 tracking-wider font-bold block uppercase">{lang === 'KR' ? '작품 및 제작 의도 소개' : 'Introduction'}</span>
                    <p className="text-[11px] md:text-xs text-white/80 font-sans leading-relaxed">
                      {lightboxWorks[lightboxIndex]?.introduction}
                    </p>
                  </div>
                )}
                {lightboxWorks[lightboxIndex]?.criticism && (
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="font-mono text-[9px] text-white/40 tracking-wider font-bold block uppercase">{lang === 'KR' ? '평론 및 학술적 평가' : 'Art Criticism'}</span>
                    <p className="text-[11px] md:text-xs text-[#CCCCCC] font-sans italic leading-relaxed">
                      {lightboxWorks[lightboxIndex]?.criticism}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Suncha promo & reviews edit modal */}
        {isTeaPromoModalOpen && tempTeaPromo && (
          <div className="fixed inset-0 bg-[#1C1A17]/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FAF9F6] border border-[#1C1A17]/15 rounded shadow-2xl overflow-hidden w-full max-w-3xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 bg-white border-b border-[#1C1A17]/10 flex justify-between items-center text-left">
                <div>
                  <h3 className="font-serif text-lg font-bold text-black">
                    불한선차 특별 홍보 및 음용후기 편집
                  </h3>
                  <p className="text-[10px] text-black/50 font-sans tracking-wide uppercase mt-0.5">Edit Seoncha Promotion & Reviews</p>
                </div>
                <button 
                  onClick={() => {
                    setIsTeaPromoModalOpen(false);
                    setTempTeaPromo(null);
                  }}
                  className="text-black/40 hover:text-black hover:bg-neutral-100 p-2 rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 text-left">
                {/* 1. 불한선차소개 (Suncha Promo) */}
                <div className="space-y-4 border-b border-black/5 pb-6">
                  <h4 className="font-serif text-base font-bold text-[#1C1A17] flex items-center gap-2">
                    <Sparkles size={16} /> 1. 불한선차소개 관리 (Introduction Promo)
                  </h4>

                  {/* Suncha Promo Image */}
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block text-[#1C1A17]/70">
                      PROMOTIONAL IMAGE (소개 대표 이미지)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 border border-dashed border-[#1C1A17]/25 hover:border-[#1C1A17]/50 rounded p-4 text-center bg-white cursor-pointer relative transition-colors">
                        <input 
                          type="file" 
                          accept="image/*,image/heic,image/heif,.heic,.heif"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const btn = e.target.parentElement;
                              if (btn) btn.style.opacity = '0.5';
                              const url = await uploadImageFile(file);
                              setTempTeaPromo(p => p ? { ...p, suncha_intro_image: url } : null);
                              if (btn) btn.style.opacity = '1';
                            } catch (err: any) {
                              alert('이미지 업로드에 실패했습니다: ' + err);
                            }
                          }}
                        />
                        <div className="space-y-1">
                          <span className="text-xs text-[#1C1A17]/80 block font-semibold">📁 클릭 또는 드래그하여 새 이미지 업로드</span>
                          <span className="text-[9px] text-[#1C1A17]/40 block font-mono">Max size 20MB (.jpg, .png, .webp)</span>
                        </div>
                      </div>
                      <div className="border border-[#1C1A17]/10 aspect-[16/10] bg-[#FAF9F6] rounded flex items-center justify-center p-2 relative overflow-hidden">
                        {tempTeaPromo.suncha_intro_image ? (
                          <img src={tempTeaPromo.suncha_intro_image} alt="Promo Preview" className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[10px] text-black/35 font-mono">No Image</span>
                        )}
                      </div>
                    </div>
                    {/* Manual input URL */}
                    <input 
                      type="text" 
                      placeholder="직접 이미지 URL 입력"
                      value={tempTeaPromo.suncha_intro_image || ''}
                      onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_intro_image: e.target.value } : null)}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs font-mono text-[#1C1A17] focus:outline-none"
                    />
                  </div>

                  {/* Suncha Promo Text Localized */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">PROMOTIONAL TEXT - KOREAN (한국어 소개 문구)</label>
                      <textarea 
                        rows={3}
                        value={tempTeaPromo.suncha_intro_text_kr || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_intro_text_kr: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="한국어 불한선차 소개글을 채워주세요."
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">PROMOTIONAL TEXT - CHINESE (중국어 소개 문구)</label>
                      <textarea 
                        rows={3}
                        value={tempTeaPromo.suncha_intro_text_sc || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_intro_text_sc: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="중국어 불한선차 소개글을 채워주세요. (미입력 시 한국어가 대체 노출됩니다.)"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">PROMOTIONAL TEXT - ENGLISH (영어 소개 문구)</label>
                      <textarea 
                        rows={3}
                        value={tempTeaPromo.suncha_intro_text_en || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_intro_text_en: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="영어 불한선차 소개글을 채워주세요. (미입력 시 한국어가 대체 노출됩니다.)"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. 음용후기 (Drinking Review) */}
                <div className="space-y-4">
                  <h4 className="font-serif text-base font-bold text-[#1C1A17] flex items-center gap-2">
                    <MessageSquare size={16} /> 2. 대표 음용후기 관리 (Customer Review)
                  </h4>

                  {/* Suncha Review Image */}
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block text-[#1C1A17]/70">
                      REVIEW IMAGE (후기 대표 이미지)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 border border-dashed border-[#1C1A17]/25 hover:border-[#1C1A17]/50 rounded p-4 text-center bg-white cursor-pointer relative transition-colors">
                        <input 
                          type="file" 
                          accept="image/*,image/heic,image/heif,.heic,.heif"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const btn = e.target.parentElement;
                              if (btn) btn.style.opacity = '0.5';
                              const url = await uploadImageFile(file);
                              setTempTeaPromo(p => p ? { ...p, suncha_review_image: url } : null);
                              if (btn) btn.style.opacity = '1';
                            } catch (err: any) {
                              alert('이미지 업로드에 실패했습니다: ' + err);
                            }
                          }}
                        />
                        <div className="space-y-1">
                          <span className="text-xs text-[#1C1A17]/80 block font-semibold">📁 클릭 또는 드래그하여 새 이미지 업로드</span>
                          <span className="text-[9px] text-[#1C1A17]/40 block font-mono">Max size 20MB (.jpg, .png, .webp)</span>
                        </div>
                      </div>
                      <div className="border border-[#1C1A17]/10 aspect-[16/10] bg-[#FAF9F6] rounded flex items-center justify-center p-2 relative overflow-hidden">
                        {tempTeaPromo.suncha_review_image ? (
                          <img src={tempTeaPromo.suncha_review_image} alt="Review Preview" className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[10px] text-black/35 font-mono">No Image</span>
                        )}
                      </div>
                    </div>
                    {/* Manual input URL */}
                    <input 
                      type="text" 
                      placeholder="직접 이미지 URL 입력"
                      value={tempTeaPromo.suncha_review_image || ''}
                      onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_review_image: e.target.value } : null)}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs font-mono text-[#1C1A17] focus:outline-none"
                    />
                  </div>

                  {/* Suncha Review Text Localized */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">REVIEW TEXT - KOREAN (한국어 음용후기 글)</label>
                      <textarea 
                        rows={3}
                        value={tempTeaPromo.suncha_review_text_kr || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_review_text_kr: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="한국어 음용후기를 채워주세요."
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">REVIEW TEXT - CHINESE (중국어 음용후기 글)</label>
                      <textarea 
                        rows={3}
                        value={tempTeaPromo.suncha_review_text_sc || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_review_text_sc: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="중국어 음용후기를 채워주세요. (미입력 시 한국어가 대체 노출됩니다.)"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">REVIEW TEXT - ENGLISH (영어 음용후기 글)</label>
                      <textarea 
                        rows={3}
                        value={tempTeaPromo.suncha_review_text_en || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_review_text_en: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="영어 음용후기를 채워주세요. (미입력 시 한국어가 대체 노출됩니다.)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-[#1C1A17]/10 flex justify-end gap-3 font-mono">
                <button 
                  onClick={() => {
                    setIsTeaPromoModalOpen(false);
                    setTempTeaPromo(null);
                  }}
                  className="px-6 py-2 border border-[#1C1A17]/10 hover:bg-neutral-100 text-[10px] tracking-widest uppercase transition-colors rounded"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!tempTeaPromo) return;
                    try {
                      await setDoc(doc(db, 'site_settings', 'global'), tempTeaPromo);
                      setSiteSettings(tempTeaPromo as SiteSettings);
                      setIsTeaPromoModalOpen(false);
                      setTempTeaPromo(null);
                    } catch (err: any) {
                      alert('저장에 실패하였습니다: ' + err.message);
                    }
                  }}
                  className="px-6 py-2 bg-black text-white hover:bg-[#1C1A17] text-[10px] tracking-widest uppercase transition-colors rounded font-bold"
                >
                  Save to Firebase
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Direct Writing Passcode Authorization Modal (8888) */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-black p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6"
            >
              <div className="space-y-2 text-center">
                <Key className="mx-auto text-amber-700 animate-bounce" size={40} />
                <h3 className="font-serif text-2xl font-bold text-black">
                  {lang === 'KR' ? '작성자 인증' : lang === 'SC' ? '作者认证' : 'Author Verification'}
                </h3>
                <p className="text-xs text-neutral-500 font-sans">
                  {lang === 'KR' 
                    ? '시연 및 원활한 업로드를 위해 지정된 비밀번호를 입력해 주세요.' 
                    : lang === 'SC' 
                    ? '请输入指定的密码以进行文章上传。' 
                    : 'Please enter the writer password to upload.'}
                </p>
              </div>

              <div className="space-y-4 text-left">
                <input
                  type="password"
                  placeholder="암호 입력 (8888)"
                  value={userPasscode}
                  onChange={(e) => setUserPasscode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyPasscode();
                  }}
                  className="w-full text-center tracking-widest text-lg font-bold border-2 border-neutral-300 focus:border-black rounded-lg p-3 bg-neutral-50 focus:outline-none"
                  autoFocus
                />
                
                <p className="text-[11px] text-amber-800 font-mono bg-amber-50 p-2.5 rounded border border-amber-200">
                  💡 {lang === 'KR' 
                    ? '최초 1회 인증 완료 시 이 기기에서 계속 글쓰기가 가능합니다.' 
                    : lang === 'SC' 
                    ? '首次认证成功后，此设备将自动保持授权状态。' 
                    : 'Once verified, this device will remain authorized.'}
                </p>
              </div>

              <div className="flex gap-3 font-serif">
                <button
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    setUserPasscode('');
                  }}
                  className="flex-1 py-3 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-base font-bold rounded-lg transition-colors"
                >
                  {lang === 'KR' ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={handleVerifyPasscode}
                  className="flex-1 py-3 bg-black hover:bg-neutral-800 text-white text-base font-bold rounded-lg transition-all"
                >
                  {lang === 'KR' ? '확인' : 'Verify'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Direct Writing Form Modal */}
        {isWriteModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[240] flex items-center justify-center p-4">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-[#FAF9F6] border-2 border-[#1C1A17] rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 bg-white border-b-2 border-[#1C1A17] flex justify-between items-center text-left">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-black flex items-center gap-2">
                    <PenTool className="text-black" size={24} />
                    {lang === 'KR' ? '새 글 작성하기' : lang === 'SC' ? '发布新文章' : 'Create New Post'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-sans mt-0.5">
                    {lang === 'KR' ? '카테고리별 아카이브에 글을 즉시 게시합니다.' : 'Post content directly to active archives.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsWriteModalOpen(false)}
                  className="text-black/50 hover:text-black hover:bg-neutral-100 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveUserPost} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                {/* Language Select */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-serif text-sm font-bold text-black block mb-1.5">글 언어 (Language)</label>
                    <select
                      value={writeFormLang}
                      onChange={(e) => setWriteFormLang(e.target.value as any)}
                      className="w-full bg-white border border-neutral-300 focus:border-black rounded-lg p-2.5 text-base font-medium focus:outline-none"
                    >
                      <option value="KR">한국어 (KR)</option>
                      <option value="SC">中文(简体) (SC)</option>
                      <option value="EN">English (EN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-serif text-sm font-bold text-black block mb-1.5">카테고리 지정 (Category)</label>
                    <select
                      value={writeFormCategory}
                      onChange={(e) => setWriteFormCategory(e.target.value)}
                      className="w-full bg-white border border-neutral-300 focus:border-black rounded-lg p-2.5 text-base font-medium focus:outline-none"
                    >
                      <option value="poetry">라석시집 (Poetry Book)</option>
                      <option value="philosophy">심물철학 에세이 (Philosophy Essay)</option>
                      <option value="suncha_seo">서화차향 - 서(書) (Calligraphy)</option>
                      <option value="suncha_hwa">서화차향 - 화(畵) (Painting)</option>
                      <option value="suncha_cha">서화차향 - 차(茶) (Tea)</option>
                      <option value="suncha_hyang">서화차향 - 향(香) (Incense)</option>
                      <option value="journey">활동여정 사진 (Media Photos)</option>
                      <option value="press">활동여정 언론보도 (Media Press)</option>
                    </select>
                  </div>
                </div>

                {/* Poetry Collection Select (Only shown if poetry is selected) */}
                {writeFormCategory === 'poetry' && (
                  <div>
                    <label className="font-serif text-sm font-bold text-black block mb-1.5">시집 선택 (Poetry Collection Book)</label>
                    <select
                      value={writeFormCollection}
                      onChange={(e) => setWriteFormCollection(e.target.value)}
                      className="w-full bg-white border border-neutral-300 focus:border-black rounded-lg p-2.5 text-base font-medium focus:outline-none"
                    >
                      {translations[writeFormLang].poetryCollection.allCollections.map((bookName, idx) => (
                        <option key={idx} value={bookName}>{bookName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="font-serif text-sm font-bold text-black block mb-1.5">제목 (Title)</label>
                  <input
                    type="text"
                    required
                    placeholder="글 제목을 입력하세요."
                    value={writeFormTitle}
                    onChange={(e) => setWriteFormTitle(e.target.value)}
                    className="w-full bg-white border border-neutral-300 focus:border-black rounded-lg p-2.5 text-base focus:outline-none"
                  />
                </div>

                {/* Summary / Subtext */}
                <div>
                  <label className="font-serif text-sm font-bold text-black block mb-1.5">요약문 / 서브 텍스트 (Summary)</label>
                  <input
                    type="text"
                    placeholder="목록에서 미리 보여줄 간단한 요약 한 줄"
                    value={writeFormSummary}
                    onChange={(e) => setWriteFormSummary(e.target.value)}
                    className="w-full bg-white border border-neutral-300 focus:border-black rounded-lg p-2.5 text-base focus:outline-none"
                  />
                </div>

                {/* Core content with Rich Editor features (font, size, weight, color, cursor image insert) */}
                <div>
                  <label className="font-serif text-sm font-bold text-black block mb-1.5">
                    본문 내용 (Content) - 리치 텍스트 &amp; Markdown 지원
                  </label>
                  <RichTextEditor
                    value={writeFormContent}
                    onChange={setWriteFormContent}
                    onPaste={(e) => handleTextAreaPaste(e, setWriteFormContent, writeFormContent)}
                    placeholder="본문 글을 입력하세요. 상단 도구 모음을 이용해 폰트 지정, 글자 크기, 색상, 굵기 및 커서 위치 이미지 삽입을 하실 수 있습니다. (개행 시 본문이 상, 중, 하 이미지 배치를 위해 자동 배분될 수 있습니다.)"
                    rows={12}
                    onUploadImage={uploadImageFile}
                  />
                </div>

                {/* Multi-Image Insertion (Top, Middle, Bottom) */}
                <div className="space-y-4 border-t border-neutral-200 pt-4">
                  <h4 className="font-serif text-base font-bold text-black flex items-center gap-1.5">
                    <ImageIcon size={18} />
                    반응형 이미지 삽입 (최대 3개 배치: 상단, 중단, 하단)
                  </h4>

                  <div className="grid grid-cols-1 gap-4 text-left">
                    {/* Top image */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-sm font-bold text-neutral-800">1. 상단 대표 이미지 (목록에도 표시됨)</span>
                        {writeFormUploading.top && <span className="text-xs text-amber-600 font-bold animate-pulse">업로드 중...</span>}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="이미지 URL 주소"
                          value={writeFormTopImg}
                          onChange={(e) => setWriteFormTopImg(e.target.value)}
                          className="flex-1 bg-neutral-50 border border-neutral-300 rounded-lg p-2 text-xs font-mono focus:outline-none"
                        />
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,image/heic,image/heif,.heic,.heif"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setWriteFormUploading(p => ({ ...p, top: true }));
                              try {
                                const url = await uploadImageFile(file);
                                setWriteFormTopImg(url);
                              } catch (err) {
                                alert('이미지 업로드 실패: ' + err);
                              } finally {
                                setWriteFormUploading(p => ({ ...p, top: false }));
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <button type="button" className="px-4 py-2 bg-neutral-800 hover:bg-black text-white text-xs font-bold rounded-lg whitespace-nowrap">
                            파일 찾기
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Middle image */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-sm font-bold text-neutral-800">2. 중간 이미지 (본문 1/2 지점 배치)</span>
                        {writeFormUploading.mid && <span className="text-xs text-amber-600 font-bold animate-pulse">업로드 중...</span>}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="이미지 URL 주소"
                          value={writeFormMidImg}
                          onChange={(e) => setWriteFormMidImg(e.target.value)}
                          className="flex-1 bg-neutral-50 border border-neutral-300 rounded-lg p-2 text-xs font-mono focus:outline-none"
                        />
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,image/heic,image/heif,.heic,.heif"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setWriteFormUploading(p => ({ ...p, mid: true }));
                              try {
                                const url = await uploadImageFile(file);
                                setWriteFormMidImg(url);
                              } catch (err) {
                                alert('이미지 업로드 실패: ' + err);
                              } finally {
                                setWriteFormUploading(p => ({ ...p, mid: false }));
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <button type="button" className="px-4 py-2 bg-neutral-800 hover:bg-black text-white text-xs font-bold rounded-lg whitespace-nowrap">
                            파일 찾기
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom image */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-sm font-bold text-neutral-800">3. 하단 이미지 (본문 맨 아래 배치)</span>
                        {writeFormUploading.bot && <span className="text-xs text-amber-600 font-bold animate-pulse">업로드 중...</span>}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="이미지 URL 주소"
                          value={writeFormBotImg}
                          onChange={(e) => setWriteFormBotImg(e.target.value)}
                          className="flex-1 bg-neutral-50 border border-neutral-300 rounded-lg p-2 text-xs font-mono focus:outline-none"
                        />
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,image/heic,image/heif,.heic,.heif"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setWriteFormUploading(p => ({ ...p, bot: true }));
                              try {
                                const url = await uploadImageFile(file);
                                setWriteFormBotImg(url);
                              } catch (err) {
                                alert('이미지 업로드 실패: ' + err);
                              } finally {
                                setWriteFormUploading(p => ({ ...p, bot: false }));
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <button type="button" className="px-4 py-2 bg-neutral-800 hover:bg-black text-white text-xs font-bold rounded-lg whitespace-nowrap">
                            파일 찾기
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>

              <div className="p-6 bg-white border-t-2 border-[#1C1A17] flex justify-end gap-3 font-serif">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-6 py-2.5 border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-base font-bold rounded-lg transition-colors"
                >
                  {lang === 'KR' ? '취소' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserPost}
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white text-base font-bold rounded-lg transition-all shadow-md"
                >
                  {lang === 'KR' ? '저장 및 발행하기' : 'Save & Publish'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* End of Direct Writing Modals */}
        
        {/* End of original promo settings modal */}
        
        {isTeaPromoModalOpen && tempTeaPromo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#1C1A17]/20 rounded shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              {/* Existing Header */}
              <div className="p-6 border-b border-[#1C1A17]/10 flex justify-between items-center bg-neutral-50">
                <h3 className="font-serif text-lg font-bold text-black flex items-center gap-2">
                  <Settings size={18} /> Manage Suncha Meditative Steeping Setup
                </h3>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6 text-left">
                {/* Promo item controls */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">PROMOTION TEXT (메인 프로모션 문구)</label>
                      <input 
                        type="text" 
                        value={tempTeaPromo.suncha_promo_title || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_promo_title: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="불한선차 특별 찻자리 한정판매 등"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">PROMOTION PRICE (판매 가격 표시)</label>
                      <input 
                        type="text" 
                        value={tempTeaPromo.suncha_promo_price || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_promo_price: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="₩120,000"
                      />
                    </div>
                  </div>

                  {/* Suncha Review Image */}
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] tracking-widest font-bold uppercase block">PROMO TEA REVIEW IMAGE (시음 후기 대표 이미지)</label>
                    <div className="flex items-center gap-4">
                      {/* Image Preview */}
                      <div className="w-16 h-16 rounded border border-[#1C1A17]/10 overflow-hidden shrink-0 flex items-center justify-center bg-[#FAF9F6]">
                        {tempTeaPromo.suncha_review_image ? (
                          <img src={tempTeaPromo.suncha_review_image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[10px] text-black/35 font-mono">No Image</span>
                        )}
                      </div>
                    </div>
                    {/* Manual input URL */}
                    <input 
                      type="text" 
                      placeholder="직접 이미지 URL 입력"
                      value={tempTeaPromo.suncha_review_image || ''}
                      onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_review_image: e.target.value } : null)}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-2 text-xs font-mono text-[#1C1A17] focus:outline-none"
                    />
                  </div>

                  {/* Suncha Review Text Localized */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">REVIEW TEXT - KOREAN (한국어 음용후기 글)</label>
                      <textarea 
                        rows={3}
                        value={tempTeaPromo.suncha_review_text_kr || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_review_text_kr: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="한국어 음용후기를 채워주세요."
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">REVIEW TEXT - CHINESE (중국어 음용후기 글)</label>
                      <textarea 
                        rows={3}
                        value={tempTeaPromo.suncha_review_text_sc || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_review_text_sc: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="중국어 음용후기를 채워주세요. (미입력 시 한국어가 대체 노출됩니다.)"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">REVIEW TEXT - ENGLISH (영어 음용후기 글)</label>
                      <textarea 
                        rows={3}
                        value={tempTeaPromo.suncha_review_text_en || ''}
                        onChange={e => setTempTeaPromo(p => p ? { ...p, suncha_review_text_en: e.target.value } : null)}
                        className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs text-[#1C1A17] focus:outline-none"
                        placeholder="영어 음용후기를 채워주세요. (미입력 시 한국어가 대체 노출됩니다.)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-[#1C1A17]/10 flex justify-end gap-3 font-mono">
                <button 
                  onClick={() => {
                    setIsTeaPromoModalOpen(false);
                    setTempTeaPromo(null);
                  }}
                  className="px-6 py-2 border border-[#1C1A17]/10 hover:bg-neutral-100 text-[10px] tracking-widest uppercase transition-colors rounded"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!tempTeaPromo) return;
                    try {
                      await setDoc(doc(db, 'site_settings', 'global'), tempTeaPromo);
                      setSiteSettings(tempTeaPromo as SiteSettings);
                      setIsTeaPromoModalOpen(false);
                      setTempTeaPromo(null);
                    } catch (err: any) {
                      alert('저장에 실패하였습니다: ' + err.message);
                    }
                  }}
                  className="px-6 py-2 bg-black text-white hover:bg-[#1C1A17] text-[10px] tracking-widest uppercase transition-colors rounded font-bold"
                >
                  Save to Firebase
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Plus, Trash2, Edit2, ArrowLeft, Newspaper, Image as ImageIcon, Check,
  Upload, ChevronLeft, ChevronRight, BookOpen, Settings, ChevronDown, Database,
  Activity, Key, RefreshCw, Sparkles, MessageSquare, Compass, Send, Calendar, Monitor
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

// Firebase imports
import { db, auth, OperationType, handleFirestoreError } from './lib/firebase';
import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';

import { translations } from './lib/translations';
import { Language, Page, ArchiveItem, SiteSettings, Artist, Work } from './types';
import { 
  DEFAULT_TEA_POEMS, DEFAULT_PHILOSOPHY_ITEMS, DEFAULT_JOURNEY_PHOTOS, DEFAULT_JOURNEY_PRESS,
  DEFAULT_MULPA_WRITINGS, DEFAULT_ARTISTS
} from './lib/seedDataToFirebase';

const uploadImageFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

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
    }
  } catch (err) {
    console.warn("Express backend upload not available, attempting PHP fallback:", err);
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
    throw new Error(`Image upload failed. If hosted on Cafe24, ensure /upload.php is present and folder permissions are correct. Error: ${e.message || e}`);
  }
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
  const [breathingMode, setBreathingMode] = useState(false);
  const [breathingText, setBreathingText] = useState('Inhale');
  const [breathingProgress, setBreathingProgress] = useState(0);

  // Tea Timer states
  const [steepingActive, setSteepingActive] = useState(false);
  const [steepingTimeLeft, setSteepingTimeLeft] = useState(45);
  const [steepingProgress, setSteepingProgress] = useState(100);

  // Filter lists inside pages
  const [journeyFilter, setJourneyFilter] = useState<'all' | 'photo' | 'press'>('all');

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
          logo_url: '/assets/logo_v2.jpg',
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

  // Lightbox / Image Popup states for artist masterpieces (작품도록)
  const [lightboxActive, setLightboxActive] = useState(false);
  const [lightboxWorks, setLightboxWorks] = useState<Work[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxArtistName, setLightboxArtistName] = useState('');

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
        poetry_collection_name: editingItem.poetry_collection_name || null,
        language: editingItem.language || lang
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
  const finalLogo = siteSettings?.logo_url || '/assets/logo_v2.jpg';
  const finalHeroBg = siteSettings?.hero_bg_url || 'https://images.unsplash.com/photo-1490127252417-7c393f993ee4?auto=format&fit=crop&q=80&w=1920';

  return (
    <div className="relative min-h-screen bg-[#FAF9F6] text-[#1C1A17] font-sans overflow-x-hidden selection:bg-[#E5DFD3] selection:text-[#1C1A17]">
      
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
            className="group flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-[#1C1A17]/15 bg-white flex items-center justify-center transition-transform group-hover:rotate-180 duration-700">
              <span className="font-serif text-[10px] tracking-widest font-black text-[#1C1A17]">物</span>
            </div>
            <div>
              <span className="font-serif text-sm tracking-[0.2em] uppercase font-bold text-[#1C1A17]">BULHANZA</span>
              <p className="text-[8px] tracking-[0.3em] uppercase opacity-45 font-mono">Mind-Matter Art</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-[18px] tracking-[0.12em] font-extrabold">
            {(Object.keys(t.nav) as Page[]).filter(p => p !== 'contact').map((p) => (
              <button
                key={p}
                id={`nav-${p}`}
                onClick={() => setPage(p)}
                className={`relative py-1 transition-colors duration-300 hover:text-black ${
                  page === p ? 'text-[#1C1A17]' : 'text-[#1C1A17]/70'
                }`}
              >
                {t.nav[p]}
                {page === p && (
                  <motion.span 
                    layoutId="activeHeaderLine"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1C1A17]"
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Language Toggle & Burger */}
          <div className="flex items-center gap-4">
            
            {/* Lang Dropdown Select */}
            <div className="relative group/lang font-bold text-[10px] tracking-widest border border-[#1C1A17]/15 rounded-full px-3 py-1 flex items-center gap-1 bg-white hover:border-[#1C1A17]/40 transition-[colors,border]">
              <span className="text-[#1C1A17]">{lang === 'SC' ? '简体' : lang === 'KR' ? '언어' : 'EN'}</span>
              <ChevronDown size={11} className="opacity-40" />
              
              <div className="absolute right-0 top-full pt-1 hidden group-hover/lang:block min-w-[70px] z-[100]">
                <div className="bg-[#FAF9F6] border border-[#1C1A17]/10 shadow-lg rounded-lg overflow-hidden flex flex-col font-mono">
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
                    简体
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
              className="lg:hidden p-1 text-[#1C1A17] hover:opacity-75"
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
              className="relative max-w-7xl mx-auto px-6 md:px-12 pb-32"
            >
              
              {/* Overlapping Immersive Hero */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[75vh] py-12">
                <div className="lg:col-span-6 space-y-8 z-10 text-left">
                  <span className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-mono block">ESTABLISHED 1997</span>
                  <h1 className="text-4xl md:text-6xl font-serif leading-[1.2] tracking-wide text-[#1C1A17] whitespace-pre-line">
                    {t.hero.title}
                  </h1>
                  <p className="text-sm md:text-base font-sans text-[#1C1A17]/70 leading-relaxed font-normal max-w-md">
                    {t.hero.subtitle}
                  </p>
                  
                  <div className="pt-4 flex flex-wrap gap-4">
                    <button 
                      id="hero-explore-btn"
                      onClick={() => setPage('philosophy')}
                      className="px-8 py-4 bg-[#1C1A17] text-white hover:bg-[#322F2A] hover:shadow-lg text-[10px] tracking-[0.3em] uppercase transition-all flex items-center gap-3 rounded-sm font-semibold"
                    >
                      <Compass size={14} /> {t.hero.cta}
                    </button>
                    <button 
                      id="hero-tea-btn"
                      onClick={() => setPage('tea')}
                      className="px-8 py-4 border border-[#1C1A17] text-[#1C1A17] hover:bg-[#1C1A17]/5 text-[10px] tracking-[0.3em] uppercase transition-all rounded-sm font-semibold"
                    >
                      {translations[lang].nav.tea}
                    </button>
                  </div>
                </div>

                {/* Hero Minimalist Art Frame */}
                <div className="lg:col-span-6 relative aspect-[4/3] lg:aspect-[1.1] w-full rounded overflow-hidden shadow-2xl border border-[#1C1A17]/10 bg-black group">
                  <div className="absolute inset-0 bg-[#322F2A]/20 z-10 mix-blend-multiply group-hover:opacity-40 transition-opacity duration-750" />
                  <motion.img 
                    initial={{ scale: 1.15 }}
                    animate={{ scale: 1.05 }}
                    transition={{ duration: 1.5 }}
                    src={finalHeroBg} 
                    alt="Scenic Mountain Peaks" 
                    className="w-full h-full object-cover grayscale opacity-90 brightness-95"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Absolute subtle wave simulation card */}
                  <div className="absolute bottom-6 right-6 bg-[#FAF9F6] p-6 max-w-xs text-left shadow-lg border border-[#1C1A17]/10 z-20 hover:scale-105 transition-transform">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#1C1A17] animate-ping" />
                      <span className="font-mono text-[8px] tracking-widest uppercase opacity-60">Rhythm of Mind</span>
                    </div>
                    <p className="font-serif text-[11px] leading-relaxed italic text-[#1C1A17]">
                      "Every particle of matter oscillates with intention. When it captures human emotion, it transforms into high art."
                    </p>
                  </div>
                </div>
              </div>

              {/* Three Bento Cards Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-24 border-t border-[#1C1A17]/10">
                
                <div onClick={() => setPage('philosophy')} className="group p-8 bg-[#FAF9F6] border border-[#1C1A17]/10 rounded hover:border-[#1C1A17] hover:bg-white transition-all cursor-pointer text-left space-y-4">
                  <div className="w-10 h-10 rounded-full bg-[#E5DFD3] flex items-center justify-center text-[#1C1A17] group-hover:scale-110 transition-transform">
                    <Activity size={16} />
                  </div>
                  <h3 className="font-serif text-lg text-black font-semibold uppercase tracking-wide">{t.nav.philosophy}</h3>
                  <p className="text-xs text-[#1C1A17]/60 leading-relaxed font-sans">{t.philosophy.text}</p>
                </div>

                <div onClick={() => setPage('art')} className="group p-8 bg-[#FAF9F6] border border-[#1C1A17]/10 rounded hover:border-[#1C1A17] hover:bg-white transition-all cursor-pointer text-left space-y-4">
                  <div className="w-10 h-10 rounded-full bg-[#E5DFD3] flex items-center justify-center text-[#1C1A17] group-hover:scale-110 transition-transform">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="font-serif text-lg text-black font-semibold uppercase tracking-wide">{t.nav.art}</h3>
                  <p className="text-xs text-[#1C1A17]/60 leading-relaxed font-sans">{t.art.intro}</p>
                </div>

                <div onClick={() => setPage('tea')} className="group p-8 bg-[#FAF9F6] border border-[#1C1A17]/10 rounded hover:border-[#1C1A17] hover:bg-white transition-all cursor-pointer text-left space-y-4">
                  <div className="w-10 h-10 rounded-full bg-[#E5DFD3] flex items-center justify-center text-[#1C1A17] group-hover:scale-110 transition-transform">
                    <BookOpen size={16} />
                  </div>
                  <h3 className="font-serif text-lg text-black font-semibold uppercase tracking-wide">{t.nav.tea}</h3>
                  <p className="text-xs text-[#1C1A17]/60 leading-relaxed font-sans">{t.tea.storyContent.substring(0, 70)}...</p>
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
              className="max-w-4xl mx-auto px-6 md:px-12 pb-32 text-left"
            >
              <div className="text-center mb-16 space-y-2">
                <span className="text-[10px] tracking-[0.4em] uppercase opacity-45 font-mono">{t.philosophy.subtitle}</span>
                <h2 className="text-3xl md:text-5xl font-serif text-[#1C1A17] font-normal">{t.philosophy.title}</h2>
                <div className="w-12 h-px bg-[#1C1A17]/25 mx-auto mt-6" />
              </div>

              {/* Beautiful drop cap layout */}
              <div className="prose prose-stone max-w-none mb-16 justified-text">
                <p className="drop-cap text-lg md:text-xl leading-[1.8] text-[#1C1A17] font-serif italic mb-8">
                  {t.philosophy.text}
                </p>
              </div>

              {/* Chapters Accordeon */}
              <div className="space-y-6 mt-12">
                {t.philosophy.chapters.map((chap, idx) => (
                  <div key={idx} className="border-b border-[#1C1A17]/15 pb-6">
                    <h4 className="font-serif text-lg md:text-xl font-bold text-black mb-3">
                      {chap.title}
                    </h4>
                    <p className="text-xs md:text-sm text-[#1C1A17]/70 leading-relaxed font-sans font-normal antialiased whitespace-pre-line">
                      {chap.content}
                    </p>
                  </div>
                ))}
              </div>

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

              {/* Sub-navigation tabs */}
              <div className="flex justify-center gap-4 mb-16 text-[10px] tracking-widest uppercase font-mono font-bold">
                <button 
                  onClick={() => setArtSubTab('doctrine')}
                  className={`px-6 py-2.5 rounded-full border transition-all ${
                    artSubTab === 'doctrine' 
                      ? 'bg-black text-white border-black shadow-lg shadow-black/10'
                      : 'border-[#1C1A17]/15 text-[#1C1A17]/60 hover:border-[#1C1A17]/40'
                  }`}
                >
                  {lang === 'KR' ? '물파주의 선언 & 에세이' : lang === 'SC' ? '物波主义宣言 &' : 'Mulpa Doctrine'}
                </button>
                <button 
                  onClick={() => setArtSubTab('artists')}
                  className={`px-6 py-2.5 rounded-full border transition-all ${
                    artSubTab === 'artists' 
                      ? 'bg-black text-white border-black shadow-lg shadow-black/10'
                      : 'border-[#1C1A17]/15 text-[#1C1A17]/60 hover:border-[#1C1A17]/40'
                  }`}
                >
                  {lang === 'KR' ? '대표 물파작가' : lang === 'SC' ? '代表物波艺术家' : 'Mulpa Artists'}
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
                      <div className="border-b border-[#1C1A17]/10 pb-4">
                        <h3 className="font-serif text-xl md:text-2xl font-semibold text-black">
                          {lang === 'KR' ? '물파주의 기고문 및 학술 고찰' : lang === 'SC' ? '物波主义论文与学术探讨' : 'Mulpa Doctrine Essays'}
                        </h3>
                        <p className="text-xs text-black/50 mt-1 uppercase tracking-wider font-mono">Dynamic academic collection</p>
                      </div>

                      {archiveItems.filter(item => item.category === 'mulpa' && (item.language === lang || !item.language)).length === 0 ? (
                        <div className="text-center py-12 bg-[#FAF9F6] border border-dashed border-[#1C1A17]/15 rounded text-xs text-black/45 font-mono">
                          {lang === 'KR' ? '게재된 물파주의 글이 없습니다. 관리자 대시보드에서 등록해 주세요.' : 'No writings found in this collection. Please check manager.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6">
                          {archiveItems
                            .filter(item => item.category === 'mulpa' && (item.language === lang || !item.language))
                            .map((article) => (
                              <div 
                                key={article.id} 
                                className="bg-white border border-[#1C1A17]/10 p-6 md:p-8 rounded hover:border-[#1C1A17]/40 transition-all duration-300 shadow-sm"
                              >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-[#1C1A17]/5 pb-4">
                                  <div>
                                    <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-black/40 block mb-1">ARTICLE & CONSCIOUSNESS</span>
                                    <h4 className="font-serif text-lg md:text-xl font-bold text-black">{article.title}</h4>
                                  </div>
                                  <span className="font-mono text-[10px] bg-[#FAF9F6] border border-[#1C1A17]/10 px-3 py-1 rounded text-[#1C1A17]/60">
                                    {article.created_at ? 'Synced' : 'Original Archive'}
                                  </span>
                                </div>
                                
                                <p className="text-xs md:text-sm text-[#1C1A17]/75 font-sans leading-relaxed mb-6 font-normal antialiased">
                                  {article.summary}
                                </p>

                                <div className="prose prose-stone max-w-none text-xs leading-[1.8] text-[#1C1A17]/90 font-sans break-words whitespace-pre-line bg-[#FAF9F6] border border-[#1C1A17]/5 p-6 rounded">
                                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                    {article.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ))}
                        </div>
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
                      <div className="space-y-24">
                        {artists
                          .filter(a => a.language === lang || !a.language)
                          .map((artist, idx) => (
                            <div key={idx} className="bg-white border border-[#1C1A17]/10 p-8 md:p-12 shadow-xl rounded space-y-12">
                              
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
              className="max-w-6xl mx-auto px-6 md:px-12 pb-32"
            >
              <div className="text-center mb-16 space-y-2">
                <span className="text-[10px] tracking-[0.4em] uppercase opacity-45 font-mono">{t.poetryCollection.subtitle}</span>
                <h2 className="text-3xl md:text-5xl font-serif text-[#1C1A17] font-normal">{t.poetryCollection.title}</h2>
                <div className="w-12 h-px bg-[#1C1A17]/25 mx-auto mt-6" />
              </div>

              <AnimatePresence mode="wait">
                {!selectedBook ? (
                  
                  // Library lists selection
                  <motion.div 
                    key="books"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 gap-4 py-4 text-left"
                  >
                    {t.poetryCollection.allCollections.map((name, i) => {
                      const bookPoems = archiveItems.filter(p => p.poetry_collection_name === name && p.language === lang);
                      return (
                        <div 
                          key={i}
                          onClick={() => {
                            setSelectedBook(name);
                            if (bookPoems.length > 0) setReadingPoem(bookPoems[0]);
                          }}
                          className="group bg-white p-6 md:p-8 border border-[#1C1A17]/10 rounded hover:border-[#1C1A17]/40 shadow-sm hover:shadow-xl hover:bg-[#FAF9F6]/50 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-full border border-[#1C1A17]/10 bg-[#FAF9F6] flex items-center justify-center font-serif text-base text-[#1C1A17]/50 group-hover:bg-[#1C1A17] group-hover:text-white transition-colors duration-300 shrink-0">
                              {i + 1}
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-serif text-xl md:text-22px font-bold leading-normal text-black group-hover:text-[#1C1A17] transition-colors">
                                {name}
                              </h3>
                              <p className="text-[11px] text-black/40 font-serif tracking-wider">석하(石下) 서시 및 철학 컬렉션</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            <span className="font-mono text-xs tracking-widest text-[#1C1A17]/75 bg-[#E5DFD3]/40 group-hover:bg-[#E5DFD3] px-3.5 py-1.5 rounded-sm font-bold uppercase transition-colors">
                              {bookPoems.length} Items Archived
                            </span>
                            <BookOpen className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#1C1A17]" size={20} />
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>

                ) : (

                  // Book detail reading room
                  <motion.div 
                    key="reading-room"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-12 text-left"
                  >
                    <div className="flex items-center justify-between border-b border-[#1C1A17]/10 pb-4">
                      <button 
                        onClick={() => {
                          setSelectedBook(null);
                          setReadingPoem(null);
                        }}
                        className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase font-bold text-black/60 hover:text-black transition-colors"
                      >
                        <ArrowLeft size={14} /> Back to Library
                      </button>
                      <span className="font-serif text-sm italic text-black/60">{selectedBook}</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                      
                      {/* Left: Poem indexes */}
                      <div className="lg:col-span-4 space-y-3 max-h-[500px] overflow-y-auto pr-4">
                        {archiveItems
                          .filter(p => p.poetry_collection_name === selectedBook && p.language === lang)
                          .map((item, idx) => (
                            <button
                              key={item.id}
                              onClick={() => setReadingPoem(item)}
                              className={`w-full text-left p-4 border rounded transition-colors flex items-center justify-between group ${
                                readingPoem?.id === item.id 
                                  ? 'bg-[#1C1A17] border-[#1C1A17] text-white' 
                                  : 'bg-white border-[#1C1A17]/10 text-black hover:bg-gray-50'
                              }`}
                            >
                              <div className="truncate">
                                <span className={`font-mono text-[8px] tracking-widest block mb-1 uppercase ${readingPoem?.id === item.id ? 'text-white/50' : 'text-black/40'}`}>
                                  ENTRY {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                <h4 className="font-serif text-sm font-semibold truncate">{item.title}</h4>
                              </div>
                              <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ))}

                        {archiveItems.filter(p => p.poetry_collection_name === selectedBook && p.language === lang).length === 0 && (
                          <div className="text-center py-12 p-6 bg-white border border-dashed border-[#1C1A17]/15 rounded text-black/40 text-xs italic font-serif">
                            {t.poetryCollection.emptyNotice}
                          </div>
                        )}
                      </div>

                      {/* Right: Immersive Reading Slate */}
                      <div className="lg:col-span-8">
                        {readingPoem ? (
                          <div className="bg-white border border-[#1C1A17]/10 p-8 md:p-12 rounded shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[460px]">
                            <div className="space-y-8 z-10">
                              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1C1A17]/5 pb-6">
                                <div>
                                  <span className="font-mono text-[8px] tracking-[0.3em] opacity-45 uppercase block mb-1">SELECTED VERSE</span>
                                  <h3 className="font-serif text-2xl md:text-3xl font-bold tracking-wide text-black">{readingPoem.title}</h3>
                                </div>

                                {/* Floating Breathing Assistant */}
                                <button
                                  onClick={() => setBreathingMode(!breathingMode)}
                                  className={`px-4 py-2 rounded-full border text-[9px] tracking-widest uppercase font-mono font-bold transition-all flex items-center gap-2 ${
                                    breathingMode 
                                      ? 'bg-black border-black text-white' 
                                      : 'bg-transparent border-[#1C1A17]/10 text-black hover:border-[#1C1A17]'
                                  }`}
                                >
                                  <Activity size={10} className={breathingMode ? 'animate-pulse' : ''} />
                                  {breathingMode ? `Breathing: ${breathingText}` : 'Meditative Breath Help'}
                                </button>
                              </div>

                              {/* Progress bar if breathing aid active */}
                              {breathingMode && (
                                <div className="w-full h-1 bg-gray-100 rounded overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-black"
                                    animate={{ width: `${breathingProgress}%` }}
                                    transition={{ duration: 2.2 }}
                                  />
                                </div>
                              )}

                              {/* Core Poem Content formatted like genuine parchment paper */}
                              <div className="markdown-body font-serif text-sm md:text-base leading-normal text-black/90 justified-text whitespace-pre-wrap py-4 max-w-xl">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                  {readingPoem.content}
                                </ReactMarkdown>
                              </div>
                            </div>

                            <div className="border-t border-[#1C1A17]/5 pt-6 mt-8 flex justify-between items-center z-10">
                              <span className="font-mono text-[8px] tracking-widest opacity-45 uppercase font-bold">LASOK SHI-ZEON</span>
                              <span className="font-serif text-[11px] italic opacity-40">M-M Harmony</span>
                            </div>

                            {/* Faded water mark decoration */}
                            <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden opacity-[0.02] pointer-events-none select-none z-0">
                              <p className="font-serif text-[120px] leading-none select-all select-none">物</p>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full min-h-[400px] border border-dashed border-[#1C1A17]/15 rounded flex flex-col items-center justify-center p-12 text-center bg-[#FAF9F6]">
                            <BookOpen className="opacity-15 mb-4 text-[#1C1A17]" size={40} />
                            <p className="font-serif text-sm italic text-[#1C1A17]/50 max-w-xs">{t.poetryCollection.emptyNotice}</p>
                          </div>
                        )}
                      </div>

                    </div>
                  </motion.div>
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

              {/* 불한선차 이미지 삽입: 섹션 가로폭의 2/3 크기 */}
              <div className="w-full flex justify-center mb-16">
                <div className="w-full md:w-2/3 aspect-[16/9] md:aspect-[21/10] overflow-hidden rounded border border-[#1C1A17]/10 bg-[#FAF9F6] shadow-sm select-none group">
                  <img 
                    src="/assets/tea_image.jpg" 
                    alt="불한선차 (Bulhan Seoncha)"
                    className="w-full h-full object-cover opacity-95 transition-transform duration-700 group-hover:scale-103"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.includes('tea_image.jpg')) {
                        target.src = '/assets/9791173790355.jpg';
                      } else if (target.src.includes('9791173790355.jpg')) {
                        target.src = siteSettings?.tea_detail_url || '/assets/bulhansuncha_v2.jpg';
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                {/* Steeping Ritual Card */}
                <div className="lg:col-span-5 bg-white border border-[#1C1A17]/10 rounded shadow-xl p-8 space-y-8">
                  <div className="text-center pb-6 border-b border-[#1C1A17]/5">
                    <span className="font-mono text-[9px] tracking-[0.25em] opacity-45 uppercase font-bold">TEA RITUAL CORNER</span>
                    <h3 className="font-serif text-lg font-bold text-black mt-1">Meditative Steeping Helper</h3>
                  </div>

                  {/* Circular clock layout */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="72" cy="72" r="64" stroke="#F0EDE6" strokeWidth="4" fill="transparent" />
                        <motion.circle 
                          cx="72" 
                          cy="72" 
                          r="64" 
                          stroke="#1C1A17" 
                          strokeWidth="4" 
                          fill="transparent"
                          strokeDasharray="402"
                          strokeDashoffset={402 - (402 * steepingProgress) / 100}
                          transition={{ ease: 'linear' }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="font-mono text-3xl font-semibold text-black">{steepingTimeLeft}</span>
                        <span className="font-mono text-[8px] tracking-[0.1em] text-black/50 uppercase mt-0.5">SECONDS</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => {
                        if (steepingActive) {
                          setSteepingActive(false);
                        } else {
                          setSteepingTimeLeft(45);
                          setSteepingActive(true);
                        }
                      }}
                      className="w-full py-3 bg-[#1C1A17] text-white hover:bg-black text-[10px] tracking-[0.3em] uppercase transition-all rounded font-bold"
                    >
                      {steepingActive ? "Pause Ritual Brew" : "Begin tea steeping ritual (45s)"}
                    </button>
                    
                    <button 
                      onClick={() => {
                        setSteepingActive(false);
                        setSteepingTimeLeft(45);
                        setSteepingProgress(100);
                      }}
                      className="text-center text-[9px] tracking-widest uppercase text-black/40 hover:text-black mt-3 transition-colors underline bg-transparent"
                    >
                      Restore to Default
                    </button>
                  </div>
                </div>

                {/* Scent notes & story details */}
                <div className="lg:col-span-7 space-y-8">
                  <div className="space-y-3">
                    <h3 className="font-serif text-2xl md:text-3xl font-semibold text-black leading-snug">{t.tea.storyTitle}</h3>
                    <p className="text-xs leading-[1.8] text-[#1C1A17]/80 font-sans font-normal whitespace-pre-line antialiased">
                      {t.tea.storyContent}
                    </p>
                  </div>

                  {/* Scent profile visual box */}
                  <div className="p-6 bg-[#FAF9F6] border border-[#1C1A17]/10 rounded flex justify-between gap-6 items-center">
                    <div>
                      <span className="font-mono text-[8px] opacity-45 tracking-widest uppercase block mb-1">SCENT CATEGORY</span>
                      <h4 className="font-serif text-base font-semibold text-[#1C1A17]">{t.tea.scentNotes}</h4>
                      <p className="text-[11px] text-[#1C1A17]/65 mt-1 font-sans">{t.tea.scentDescription}</p>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-[#1C1A17]/10">
                      <Compass className="opacity-40" size={18} />
                    </div>
                  </div>

                  {/* Brewing step lists */}
                  <div className="space-y-4">
                    <h4 className="font-serif text-sm font-semibold text-black uppercase tracking-widest">{t.tea.brewingTitle}</h4>
                    <div className="space-y-3">
                      {t.tea.brewingSteps.map((stp, idx) => (
                        <div key={idx} className="flex gap-4 items-start text-xs text-[#1C1A17]/80">
                          <span className="font-mono font-bold opacity-30 mt-0.5">{(idx+1).toString().padStart(2, '0')}.</span>
                          <p className="leading-relaxed font-sans">{stp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

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

              {/* Filter tabs */}
              <div className="flex justify-center gap-4 mb-16 text-[10px] tracking-widest uppercase font-mono font-bold">
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

              {/* Timeline layouts */}
              <div className="space-y-12">
                
                {/* Journey visual logs */}
                {JSON.stringify(journeyFilter) !== '"all"' && (
                  <p className="font-mono text-[9px] tracking-widest uppercase opacity-45 mb-4 font-bold">
                    Filtered view: {journeyFilter.toUpperCase()} logs
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {archiveItems
                    .filter(item => {
                      if (item.language !== lang) return false;
                      if (journeyFilter === 'photo') return item.category === 'journey';
                      if (journeyFilter === 'press') return item.category === 'press';
                      return (item.category === 'journey' || item.category === 'press');
                    })
                    .map((item) => (
                      <div 
                        key={item.id}
                        className="bg-white border border-[#1C1A17]/10 p-6 rounded hover:shadow-2xl hover:border-[#1C1A17]/25 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-4 text-left">
                          <div className="aspect-[16/10] overflow-hidden rounded bg-gray-50 border border-[#1C1A17]/5">
                            <img 
                              src={item.image_url} 
                              alt={item.title} 
                              className="w-full h-full object-cover opacity-90 transition-transform group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold block uppercase">
                              {item.category === 'journey' ? 'Activity Performance' : 'Press Editorial'}
                            </span>
                            <h4 className="font-serif text-lg font-bold text-black">{item.title}</h4>
                            <p className="text-xs text-black/60 leading-relaxed font-sans font-normal antialiased">
                              {item.summary}
                            </p>
                          </div>
                        </div>

                        {/* Expandable inline drawer content log */}
                        <div className="pt-6 border-t border-[#1C1A17]/5 mt-6">
                          <div className="markdown-body font-sans text-[11px] leading-relaxed text-[#1C1A17]/75">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                              {item.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                  ))}

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

              </div>

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
                              language: lang
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="px-4 py-2 border border-[#1C1A17] hover:bg-black hover:text-white transition-colors text-[10px] tracking-widest font-bold uppercase rounded"
                        >
                          + 신규 데이터 추가 (Create Unit)
                        </button>
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
                              <th className="p-3 text-right font-mono text-[9px] tracking-widest uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1C1A17]/5 font-sans">
                            {archiveItems.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50/50">
                                <td className="p-3">
                                  <span className="font-mono font-bold uppercase px-2 py-1 bg-gray-100 rounded text-[9px]">
                                    {item.language || 'KR'}
                                  </span>
                                </td>
                                <td className="p-3 text-[#1C1A17]/70 font-semibold text-[11px] uppercase tracking-wider">
                                  {item.category}
                                </td>
                                <td className="p-3 font-medium text-black max-w-xs truncate font-serif">
                                  {item.title}
                                </td>
                                <td className="p-3 text-[#1C1A17]/60 text-[11px] truncate max-w-xs font-serif">
                                  {item.poetry_collection_name || 'N/A (Unbound / Timeline)'}
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
                            {archiveItems.length === 0 && (
                              <tr>
                                <td colSpan={5} className="text-center py-12 text-black/40 italic font-mono uppercase tracking-wider">
                                  No database records resolved. Please click restoration sync button above.
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
                        <p className="text-xs text-[#1C1A17]/60 font-sans mt-0.5">로고 이미지, 메인 히어로 배경의 CDN 연동 주소를 오탈자 없이 교체 수정한 뒤 즉시 디텍션합니다.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">GLOBAL LOGO IMAGE URL</label>
                          <input 
                            type="text" 
                            value={siteSettings?.logo_url || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              const updated = { ...siteSettings, logo_url: val } as SiteSettings;
                              setSiteSettings(updated);
                              await setDoc(doc(db, 'site_settings', 'global'), updated);
                            }}
                            className="w-full bg-[#FAF9F6] border border-[#1C1A17]/15 rounded p-3 text-xs font-mono text-[#1C1A17] focus:outline-none focus:border-black"
                            placeholder="url pointing to web images..."
                          />
                        </div>

                        <div>
                          <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">HERO COVER HOME BG URL</label>
                          <input 
                            type="text" 
                            value={siteSettings?.hero_bg_url || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              const updated = { ...siteSettings, hero_bg_url: val } as SiteSettings;
                              setSiteSettings(updated);
                              await setDoc(doc(db, 'site_settings', 'global'), updated);
                            }}
                            className="w-full bg-[#FAF9F6] border border-[#1C1A17]/15 rounded p-3 text-xs font-mono text-[#1C1A17] focus:outline-none focus:border-black"
                            placeholder="url pointing to hero image background..."
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="font-mono text-[9px] tracking-widest font-bold uppercase block mb-1">ZEN TEA COVER IMAGE URL</label>
                          <input 
                            type="text" 
                            value={siteSettings?.tea_detail_url || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              const updated = { ...siteSettings, tea_detail_url: val } as SiteSettings;
                              setSiteSettings(updated);
                              await setDoc(doc(db, 'site_settings', 'global'), updated);
                            }}
                            className="w-full bg-[#FAF9F6] border border-[#1C1A17]/15 rounded p-3 text-xs font-mono text-[#1C1A17] focus:outline-none focus:border-black"
                            placeholder="url pointing to tea image..."
                          />
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
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-8">
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
              <p>EMAIL: info@bulhanza.com</p>
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
          <div className="space-y-4 text-left">
            <h4 className="font-serif text-xs font-bold uppercase tracking-widest text-[#1C1A17]">Cafe24 Web Hosting</h4>
            <div className="text-[10px] font-mono tracking-wider space-y-1 text-black/60">
              <p className="text-[10px] leading-relaxed text-[#1C1A17]/55 font-sans">
                This client application is fully optimized for Cafe24 static file server deployment. Fully standalone Firebase client syncing.
              </p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8 border-t border-[#1C1A17]/5 mt-12 flex justify-between items-center text-[9px] font-mono text-black/40">
          <span>&copy; {new Date().getFullYear()} BULHANZA. ALL RIGHTS REGISTERED.</span>
          <span>Made for Cafe24 Hosting and VS Code Compiler</span>
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
                          accept="image/*"
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
                    <textarea 
                      rows={6}
                      value={editingItem.content || ''}
                      onChange={e => setEditingItem({ ...editingItem, content: e.target.value })}
                      className="w-full bg-white border border-[#1C1A17]/15 rounded p-3 text-xs font-mono text-[#1C1A17] focus:outline-none"
                      placeholder="Markdown 및 띄어쓰기 한 줄 개행 등이 완벽 지원됩니다."
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
                          accept="image/*"
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
                    <span className="font-bold block text-black">신규 작품 일품 추가 (Add New Piece to Gallery)</span>
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
                            accept="image/*"
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
                        setEditingArtist({
                          ...editingArtist,
                          works: [...currentWorks, newWork]
                        });

                        // Clear fields
                        titleEl.value = '';
                        sizeEl.value = '';
                        imgEl.value = '';
                        introEl.value = '';
                        criticEl.value = '';
                      }}
                      className="w-full py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-[9px] uppercase tracking-widest rounded"
                    >
                      + 목록에 이 작품 도록 삽입 (Insert Masterpiece to Active List)
                    </button>
                  </div>

                  {/* List of current added works with delete action */}
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                    {editingArtist.works && editingArtist.works.map((work, wIdx) => (
                      <div key={wIdx} className="bg-white border border-[#1C1A17]/10 p-3 rounded flex items-center justify-between text-xs gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border border-black/10 rounded overflow-hidden">
                            <img src={work.image} alt={work.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-black font-serif">{work.title}</p>
                            <p className="text-[10px] text-[#1C1A17]/60 font-mono">{work.size || 'Unspecified size'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedWorks = [...editingArtist.works!];
                            updatedWorks.splice(wIdx, 1);
                            setEditingArtist({ ...editingArtist, works: updatedWorks });
                          }}
                          className="p-1 hover:text-red-600"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
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
      </AnimatePresence>

    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Plus, Trash2, Edit2, ArrowLeft, Newspaper, Image as ImageIcon, Check,
  Upload, ChevronLeft, ChevronRight, BookOpen, Settings, ChevronDown, Database,
  Activity, Key, RefreshCw, Sparkles, MessageSquare, Compass, Send, Calendar, Monitor,
  ArrowUpDown
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
  const [poetrySortOrder, setPoetrySortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');
  const [journeySortOrder, setJourneySortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');
  const [mulpaSortOrder, setMulpaSortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');
  const [teaSortOrder, setTeaSortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');
  const [adminSortOrder, setAdminSortOrder] = useState<'default' | 'titleAsc' | 'titleDesc'>('default');

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
  const finalHeroBg = siteSettings?.hero_bg_url || 'https://images.unsplash.com/photo-1490127252417-7c393f993ee4?auto=format&fit=crop&q=80&w=1920';

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

  const isHomeDarkHeader = page === 'home' && !scrolled;

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
            <div className={`relative group/lang font-bold text-[10px] tracking-widest border rounded-full px-3 py-1 flex items-center gap-1 transition-[colors,border,background-color] ${
              isHomeDarkHeader 
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40' 
                : 'bg-white border-[#1C1A17]/15 text-[#1C1A17] hover:border-[#1C1A17]/40'
            }`}>
              <span>{lang === 'SC' ? '简体' : lang === 'KR' ? '언어' : 'EN'}</span>
              <ChevronDown size={11} className={isHomeDarkHeader ? 'opacity-75 text-white' : 'opacity-40 text-[#1C1A17]'} />
              
              <div className="absolute right-0 top-full pt-1 hidden group-hover/lang:block min-w-[70px] z-[100]">
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
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img 
                  src={finalHeroBg} 
                  alt="Immersive Backdrop" 
                  className="w-full h-full object-cover scale-105 brightness-[0.25] contrast-[1.05] transition-transform duration-[4000ms] ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/90" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,249,246,0.07),transparent_85%)]" />
              </div>

              <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-36 md:pt-44 pb-32 flex flex-col justify-between min-h-screen">
                
                {/* Hero Headline content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-8">
                  <div className="lg:col-span-7 space-y-8 text-left">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E5DFD3] animate-pulse" />
                      <span className="text-[9px] tracking-[0.3em] uppercase text-[#E5DFD3] font-mono font-bold">ESTABLISHED 1997</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif leading-[1.15] tracking-wide text-white whitespace-pre-line drop-shadow-md">
                      {t.hero.title}
                    </h1>

                    <p className="text-sm md:text-lg font-sans text-white/80 leading-relaxed font-normal max-w-xl drop-shadow-sm">
                      {t.hero.subtitle}
                    </p>
                    
                    <div className="pt-4 flex flex-wrap gap-4">
                      <button 
                        id="hero-explore-btn"
                        onClick={() => setPage('philosophy')}
                        className="px-8 py-4 bg-white text-[#1C1A17] hover:bg-[#FAF9F6] hover:scale-105 active:scale-95 text-[10px] tracking-[0.3em] uppercase transition-all flex items-center gap-3 rounded-full font-bold shadow-lg shadow-white/5"
                      >
                        <Compass size={14} /> {t.hero.cta}
                      </button>
                      <button 
                        id="hero-tea-btn"
                        onClick={() => setPage('tea')}
                        className="px-8 py-4 border border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white hover:text-black hover:border-white hover:scale-105 active:scale-95 text-[10px] tracking-[0.3em] uppercase transition-all rounded-full font-bold"
                      >
                        {translations[lang].nav.tea}
                      </button>
                    </div>
                  </div>

                  {/* Aesthetic Floating Parchment style quotation block */}
                  <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-end">
                    <div className="bg-white/5 backdrop-blur-md p-8 md:p-10 max-w-sm text-left shadow-2xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/30 transition-colors duration-500">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-xl pointer-events-none" />
                      
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span className="font-mono text-[9px] tracking-widest uppercase text-white/60 font-bold">Rhythm of Mind & Matter</span>
                      </div>
                      
                      <p className="font-serif text-[12px] md:text-sm leading-relaxed italic text-white/90">
                        {lang === 'KR' 
                          ? '"모든 존재의 미세한 파동이 사람의 심적 감응과 만날 때, 보이지 않는 영성이 거룩한 예술로 피어납니다."' 
                          : lang === 'SC'
                          ? '"当物质的微细波动与人的心灵感应相遇时，无形的灵性便绽放出神圣的艺术。"'
                          : '"When the micro-oscillations of matter meet human conscious sensory vibration, invisible spirituality blossoms into genuine sacred art."'}
                      </p>

                      <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
                        <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden flex items-center justify-center bg-white/5 text-white/70">
                          <Activity size={12} className="animate-pulse" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">MULPA DOCTRINE</p>
                          <p className="text-[8px] text-white/40 font-mono">21st Century New Aesthetics</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glassmorphic bento blocks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-16 border-t border-white/10 mt-16">
                  
                  {/* Card 1 */}
                  <div 
                    onClick={() => setPage('philosophy')} 
                    className="group p-8 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl hover:border-white/45 hover:bg-white/[0.08] transition-all cursor-pointer text-left space-y-5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <Activity size={18} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-serif text-lg text-white font-bold tracking-wide flex items-center gap-2">
                        {t.nav.philosophy}
                        <span className="text-[9px] font-mono text-[#E5DFD3] border border-[#E5DFD3]/30 px-1.5 py-0.5 rounded uppercase">MIND</span>
                      </h3>
                      <p className="text-xs text-white/70 leading-relaxed font-sans line-clamp-3">{t.philosophy.text}</p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono font-bold tracking-widest text-white/40 group-hover:text-white transition-colors flex items-center gap-1.5">
                      EXPLORE DOCTRINE <span className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div 
                    onClick={() => setPage('art')} 
                    className="group p-8 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl hover:border-white/45 hover:bg-white/[0.08] transition-all cursor-pointer text-left space-y-5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <Sparkles size={18} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-serif text-lg text-white font-bold tracking-wide flex items-center gap-2">
                        {t.nav.art}
                        <span className="text-[9px] font-mono text-[#E5DFD3] border border-[#E5DFD3]/30 px-1.5 py-0.5 rounded uppercase">SPACE</span>
                      </h3>
                      <p className="text-xs text-white/70 leading-relaxed font-sans line-clamp-3">{t.art.intro}</p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono font-bold tracking-widest text-white/40 group-hover:text-white transition-colors flex items-center gap-1.5">
                      VIEW MASTERPIECES <span className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div 
                    onClick={() => setPage('tea')} 
                    className="group p-8 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl hover:border-white/45 hover:bg-white/[0.08] transition-all cursor-pointer text-left space-y-5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      <BookOpen size={18} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-serif text-lg text-white font-bold tracking-wide flex items-center gap-2">
                        {t.nav.tea}
                        <span className="text-[9px] font-mono text-[#E5DFD3] border border-[#E5DFD3]/30 px-1.5 py-0.5 rounded uppercase">TEA</span>
                      </h3>
                      <p className="text-xs text-white/70 leading-relaxed font-sans line-clamp-3">{t.tea.storyContent}</p>
                    </div>
                    <div className="pt-2 text-[9px] font-mono font-bold tracking-widest text-white/40 group-hover:text-white transition-colors flex items-center gap-1.5">
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
              className="max-w-4xl mx-auto px-6 md:px-12 pb-32 text-left"
            >
              <div className="text-center mb-16 space-y-2">
                <span className="text-[10px] tracking-[0.4em] uppercase opacity-45 font-mono">{t.philosophy.subtitle}</span>
                <h2 className="text-3xl md:text-5xl font-serif text-[#1C1A17] font-normal">{t.philosophy.title}</h2>
                <div className="w-12 h-px bg-[#1C1A17]/25 mx-auto mt-6" />
              </div>

              {/* Elegant Atmospheric Philosophy Cover Banner */}
              <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-16 relative border border-[#1C1A17]/10 shadow-lg group select-none">
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

              {/* Dynamic Philosophy Writings Section */}
              <div className="mt-20 pt-16 border-t border-[#1C1A17]/15">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                  <div>
                    <span className="text-[10px] tracking-[0.3em] font-mono text-black/45 uppercase block mb-2 font-bold">
                      {lang === 'KR' ? '심물철학 에세이 & 단상' : lang === 'SC' ? '心物哲学随笔与感悟' : 'Mind-Matter Essays & Reflections'}
                    </span>
                    <h3 className="font-serif text-2xl md:text-3xl text-black font-normal">
                      {lang === 'KR' ? '학술 단상 및 집필 기록' : lang === 'SC' ? '学术感悟与执笔记录' : 'Academic Writings & Archive'}
                    </h3>
                    <p className="text-xs text-black/50 mt-1 uppercase tracking-wider font-mono">
                      {lang === 'KR' ? '관리자 대시보드에서 등록된 심물철학 단상 목록입니다' : lang === 'SC' ? '管理员控制台注册的心物哲学随笔列表' : 'Dynamic collection of philosophical thoughts from manager'}
                    </p>
                  </div>

                  {/* Sort Controller */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold uppercase shrink-0">
                      {lang === 'KR' ? '정렬 방식' : 'Sort Order'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPhilosophySortOrder('default')}
                        className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold ${
                          philosophySortOrder === 'default'
                            ? 'bg-[#1C1A17] text-[#FAF9F6]'
                            : 'bg-white border border-[#1C1A17]/10 text-black/50 hover:bg-neutral-50'
                        }`}
                      >
                        {lang === 'KR' ? '최신순' : 'Latest'}
                      </button>
                      <button
                        onClick={() => setPhilosophySortOrder('titleAsc')}
                        className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                          philosophySortOrder === 'titleAsc'
                            ? 'bg-[#1C1A17] text-[#FAF9F6]'
                            : 'bg-white border border-[#1C1A17]/10 text-black/50 hover:bg-neutral-50'
                        }`}
                      >
                        ▲ A-Z
                      </button>
                      <button
                        onClick={() => setPhilosophySortOrder('titleDesc')}
                        className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                          philosophySortOrder === 'titleDesc'
                            ? 'bg-[#1C1A17] text-[#FAF9F6]'
                            : 'bg-white border border-[#1C1A17]/10 text-black/50 hover:bg-neutral-50'
                        }`}
                      >
                        ▼ Z-A
                      </button>
                    </div>
                  </div>
                </div>

                {archiveItems.filter(item => item.category === 'philosophy' && (item.language === lang || !item.language)).length === 0 ? (
                  <div className="text-center py-16 bg-white/40 border border-dashed border-[#1C1A17]/15 rounded-xl text-xs text-black/45 font-mono">
                    {lang === 'KR' 
                      ? '등록된 심물철학 단상이 없습니다. 관리자 대시보드에서 새로운 글을 등록하실 수 있습니다.' 
                      : lang === 'SC'
                      ? '暂无已登记的心物哲学随笔。您可以在管理员控制台发布新文章。'
                      : 'No philosophy reflections found in this collection. Feel free to register one in the admin dashboard.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8">
                    {sortItems(
                      archiveItems.filter(item => item.category === 'philosophy' && (item.language === lang || !item.language)),
                      philosophySortOrder
                    ).map((post) => (
                      <div 
                        key={post.id} 
                        className="bg-white border border-[#1C1A17]/10 p-6 md:p-8 rounded-xl hover:border-[#1C1A17]/30 hover:shadow-md transition-all duration-300 relative overflow-hidden group text-left"
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-[#1C1A17]/5 pb-4">
                          <div>
                            <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-black/40 block mb-1">
                              {lang === 'KR' ? '심물철학 단상' : lang === 'SC' ? '心物哲学感悟' : 'Mind-Matter Essay'}
                            </span>
                            <h4 className="font-serif text-lg md:text-xl font-bold text-black group-hover:text-[#1C1A17] transition-colors">{post.title}</h4>
                          </div>
                          <span className="font-mono text-[10px] bg-[#FAF9F6] border border-[#1C1A17]/10 px-3 py-1 rounded-full text-[#1C1A17]/60">
                            {post.created_at ? (lang === 'KR' ? '동기화 완료' : lang === 'SC' ? '已同步' : 'Synced') : 'Archive'}
                          </span>
                        </div>
                        
                        {post.summary && (
                          <p className="text-xs md:text-sm text-[#1C1A17]/75 font-sans leading-relaxed mb-6 font-normal antialiased border-l-2 border-[#1C1A17]/15 pl-4 italic">
                            {post.summary}
                          </p>
                        )}

                        <div className="prose prose-stone max-w-none text-xs md:text-sm leading-[1.8] text-[#1C1A17]/90 font-sans break-words whitespace-pre-line bg-[#FAF9F6]/50 border border-[#1C1A17]/5 p-6 rounded-lg">
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                            {post.content}
                          </ReactMarkdown>

                          {post.image_url && (
                            <div className="mt-8 flex justify-center w-full">
                              <img 
                                src={post.image_url} 
                                alt={post.title} 
                                referrerPolicy="no-referrer"
                                className="max-w-full max-h-[350px] md:max-h-[480px] h-auto object-contain rounded-lg border border-[#1C1A17]/10 p-1.5 bg-white shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

                      {archiveItems.filter(item => item.category === 'mulpa' && (item.language === lang || !item.language)).length === 0 ? (
                        <div className="text-center py-12 bg-[#FAF9F6] border border-dashed border-[#1C1A17]/15 rounded text-xs text-black/45 font-mono">
                          {lang === 'KR' ? '게재된 물파주의 글이 없습니다. 관리자 대시보드에서 등록해 주세요.' : 'No writings found in this collection. Please check manager.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6">
                          {sortItems(
                            archiveItems.filter(item => item.category === 'mulpa' && (item.language === lang || !item.language)),
                            mulpaSortOrder
                          ).map((article) => (
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

                                  {/* Center-aligned flexible sized image display if present */}
                                  {article.image_url && (
                                    <div className="mt-8 flex justify-center w-full">
                                      <img 
                                        src={article.image_url} 
                                        alt={article.title} 
                                        referrerPolicy="no-referrer"
                                        className="max-w-full max-h-[350px] md:max-h-[480px] h-auto object-contain rounded border border-[#1C1A17]/10 p-1.5 bg-white shadow-sm"
                                      />
                                    </div>
                                  )}
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
                                    const element = document.getElementById(`artist-profile-${artist.id || artist.name}`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                          {artists
                            .filter(a => a.language === lang || !a.language)
                            .map((artist, idx) => (
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
              className="max-w-6xl mx-auto px-6 md:px-12 pb-32"
            >
              <div className="text-center mb-16 space-y-2">
                <span className="text-[10px] tracking-[0.4em] uppercase opacity-45 font-mono">{t.poetryCollection.subtitle}</span>
                <h2 className="text-3xl md:text-5xl font-serif text-[#1C1A17] font-normal">{t.poetryCollection.title}</h2>
                <div className="w-12 h-px bg-[#1C1A17]/25 mx-auto mt-6" />
              </div>

              {/* Elegant Atmospheric Poetry Cover Banner */}
              <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-12 relative border border-[#1C1A17]/10 shadow-lg group select-none">
                <img 
                  src="https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=1200" 
                  alt="Poetry Banner" 
                  className="w-full h-full object-cover brightness-[0.85] contrast-[1.05] transition-transform duration-[4000ms] group-hover:scale-103"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white text-left space-y-1">
                  <span className="text-[9px] tracking-[0.3em] font-mono text-white/70 uppercase block font-bold">Poetic Musings of Stone & Mist</span>
                  <h3 className="font-serif text-lg md:text-2xl font-normal text-white drop-shadow-md">
                    {lang === 'KR' ? '석하서시 (石下逝詩) ㆍ 영혼을 새기는 먹빛의 고백' : lang === 'SC' ? '石下逝诗 ㆍ 雕刻灵魂的墨色告白' : 'Seokha Stone Poetry Collection'}
                  </h3>
                </div>
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
                      const bookPoems = archiveItems.filter(p => p.category === 'poetry' && p.poetry_collection_name === name && p.language === lang);
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
                      <div className="lg:col-span-4 space-y-3">
                        {/* Sort Controller */}
                        <div className="flex items-center justify-between border-b border-[#1C1A17]/5 pb-2.5 mb-2">
                          <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold uppercase">
                            {lang === 'KR' ? '정렬 방식' : 'Sort Order'}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setPoetrySortOrder('default')}
                              className={`text-[9px] font-mono tracking-wider px-2 py-0.5 rounded transition-all font-bold ${
                                poetrySortOrder === 'default'
                                  ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                  : 'bg-neutral-100 hover:bg-neutral-200 text-black/50'
                              }`}
                            >
                              {lang === 'KR' ? '기본순' : 'Default'}
                            </button>
                            <button
                              onClick={() => setPoetrySortOrder('titleAsc')}
                              className={`text-[9px] font-mono tracking-wider px-2 py-0.5 rounded transition-all font-bold flex items-center gap-0.5 ${
                                poetrySortOrder === 'titleAsc'
                                  ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                  : 'bg-neutral-100 hover:bg-neutral-200 text-black/50'
                              }`}
                            >
                              ▲ A-Z
                            </button>
                            <button
                              onClick={() => setPoetrySortOrder('titleDesc')}
                              className={`text-[9px] font-mono tracking-wider px-2 py-0.5 rounded transition-all font-bold flex items-center gap-0.5 ${
                                poetrySortOrder === 'titleDesc'
                                  ? 'bg-[#1C1A17] text-[#FAF9F6]'
                                  : 'bg-neutral-100 hover:bg-neutral-200 text-black/50'
                              }`}
                            >
                              ▼ Z-A
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-4">
                          {sortItems(
                            archiveItems.filter(p => p.category === 'poetry' && p.poetry_collection_name === selectedBook && p.language === lang),
                            poetrySortOrder
                          ).map((item, idx) => (
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

                          {archiveItems.filter(p => p.category === 'poetry' && p.poetry_collection_name === selectedBook && p.language === lang).length === 0 && (
                            <div className="text-center py-12 p-6 bg-white border border-dashed border-[#1C1A17]/15 rounded text-black/40 text-xs italic font-serif">
                              {t.poetryCollection.emptyNotice}
                            </div>
                          )}
                        </div>
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

                                {/* Responsive centered image display */}
                                {readingPoem.image_url && (
                                  <div className="mt-8 flex justify-center w-full">
                                    <img 
                                      src={readingPoem.image_url} 
                                      alt={readingPoem.title} 
                                      referrerPolicy="no-referrer"
                                      className="max-w-full max-h-[350px] md:max-h-[480px] h-auto object-contain rounded border border-[#1C1A17]/10 p-1.5 bg-white shadow-sm"
                                    />
                                  </div>
                                )}
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

              {/* Elegant Atmospheric Tea Cover Banner */}
              <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-16 relative border border-[#1C1A17]/10 shadow-lg group select-none">
                <img 
                  src="https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&q=80&w=1200" 
                  alt="Tea Banner" 
                  className="w-full h-full object-cover brightness-[0.85] contrast-[1.05] transition-transform duration-[4000ms] group-hover:scale-103"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white text-left space-y-1">
                  <span className="text-[9px] tracking-[0.3em] font-mono text-white/70 uppercase block font-bold">The Quiet Way of Seon Tea</span>
                  <h3 className="font-serif text-lg md:text-2xl font-normal text-white drop-shadow-md">
                    {lang === 'KR' ? '선다원 (禪茶苑) ㆍ 은은한 찻잔에 고이는 참선' : lang === 'SC' ? '禅茶苑 ㆍ 静谧茶盏中凝聚的坐禅' : 'Zen Tea Meditation Ceremony'}
                  </h3>
                </div>
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

              {/* ----------------- Suncha Promotion & Review Sections ----------------- */}
              <div className="mt-20 pt-16 border-t border-[#1C1A17]/10 space-y-16">
                
                {/* Title */}
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] tracking-[0.4em] uppercase opacity-45 font-mono">
                      {lang === 'KR' ? '불한선차 기획특별전' : lang === 'SC' ? '佛汉禅茶策划特别展' : 'Seoncha Curated Promotion'}
                    </span>
                    <h3 className="font-serif text-2xl md:text-3xl text-[#1C1A17] font-normal leading-snug">
                      {lang === 'KR' ? '불한선차 소개 및 생생한 리뷰' : lang === 'SC' ? '佛汉禅茶介绍与茶友评价' : 'Suncha Introduction & Guest Reviews'}
                    </h3>
                    <div className="w-12 h-px bg-[#1C1A17]/20 mx-auto mt-6" />
                  </div>

                  {/* Sort Controller */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold uppercase">
                      {lang === 'KR' ? '정렬 방식' : 'Sort Order'}
                    </span>
                    <div className="flex gap-1 bg-white border border-[#1C1A17]/10 p-0.5 rounded-sm inline-flex">
                      <button
                        onClick={() => setTeaSortOrder('default')}
                        className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold ${
                          teaSortOrder === 'default'
                            ? 'bg-[#1C1A17] text-[#FAF9F6]'
                            : 'text-black/50 hover:bg-neutral-50'
                        }`}
                      >
                        {lang === 'KR' ? '기본순' : 'Default'}
                      </button>
                      <button
                        onClick={() => setTeaSortOrder('titleAsc')}
                        className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                          teaSortOrder === 'titleAsc'
                            ? 'bg-[#1C1A17] text-[#FAF9F6]'
                            : 'text-black/50 hover:bg-neutral-50'
                        }`}
                      >
                        ▲ A-Z
                      </button>
                      <button
                        onClick={() => setTeaSortOrder('titleDesc')}
                        className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded transition-all font-bold flex items-center gap-0.5 ${
                          teaSortOrder === 'titleDesc'
                            ? 'bg-[#1C1A17] text-[#FAF9F6]'
                            : 'text-black/50 hover:bg-neutral-50'
                        }`}
                      >
                        ▼ Z-A
                      </button>
                    </div>
                  </div>
                </div>

                {/* Suncha Promo Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-start">
                  
                  {/* Left Column: 불한선차소개 */}
                  <div className="space-y-8">
                    <h4 className="font-serif text-xs tracking-widest uppercase text-black/55 bg-neutral-100 p-2.5 rounded border border-black/5 block font-bold text-center">
                      🍃 {lang === 'KR' ? '불한선차소개 아카이브' : lang === 'SC' ? '佛汉禅茶介绍' : 'Seoncha Introduction'}
                    </h4>

                    {teaIntros.length === 0 ? (
                      /* Default Fallback Card */
                      <div className="bg-white border border-[#1C1A17]/10 p-6 md:p-8 rounded hover:shadow-xl transition-all duration-300 relative flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-[#1C1A17]/5 pb-3">
                            <span className="font-serif text-base md:text-lg font-bold text-black tracking-wide">
                              {lang === 'KR' ? '불한선차소개' : lang === 'SC' ? '佛汉禅茶介绍' : 'Seoncha Introduction'}
                            </span>
                          </div>

                          {/* Info Promo Image */}
                          <div className="aspect-[16/10] w-full overflow-hidden rounded bg-gray-50 border border-[#1C1A17]/5 shadow-sm relative group">
                            <img 
                              src={siteSettings?.suncha_intro_image || '/assets/bulhansuncha_v2.jpg'} 
                              alt="Seoncha Intro" 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>

                          {/* Content Text block and fallbacks */}
                          <p className="text-xs md:text-sm text-[#1C1A17]/80 leading-relaxed font-sans font-normal text-justify whitespace-pre-wrap">
                            {lang === 'KR' 
                              ? (siteSettings?.suncha_intro_text_kr || '불한선차(佛漢禪茶)는 깊은 산사의 무구한 기운과 선차 명인의 정밀한 정성을 거쳐 고온 가마에서 아홉 번 덖고 발효 시켜 흙내음และ 부드러운 우디향의 정수를 완성한 특별한 전통 수제 명차입니다.')
                              : lang === 'SC' 
                              ? (siteSettings?.suncha_intro_text_sc || siteSettings?.suncha_intro_text_kr || '佛汉禅茶(佛漢禪茶)是历经深山古刹的无垢灵气与禅茶名师的九蒸九晒发酵，在高温釜中多次揉捻烘焙而成的高端传统手工名茶。其茶汤通透，入口温润开胃。')
                              : (siteSettings?.suncha_intro_text_en || siteSettings?.suncha_intro_text_kr || 'Bulhan Suncha is a premium, handcrafted traditional meditation tea cultivated deep within pristine mountain hermitages. Roasted multiple times in high-temperature kilns, it delivers a smooth body and rich earthy wood notes.')
                            }
                          </p>
                        </div>

                        <div className="mt-8 border-t border-[#1C1A17]/5 pt-4 flex justify-between items-center">
                          <span className="font-mono text-[8px] tracking-widest opacity-45 uppercase font-bold">HERITAGE SEONCHA BRAND</span>
                          <span className="font-serif text-[10px] italic opacity-40">Zen Steeping Experience</span>
                        </div>
                      </div>
                    ) : (
                      /* Dynamic List Cards */
                      <div className="space-y-6">
                        {teaIntros.map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => setSelectedJourneyItem(item)}
                            className="group bg-white border border-[#1C1A17]/10 p-6 md:p-8 rounded hover:shadow-2xl hover:border-[#1C1A17]/30 transition-all duration-300 relative flex flex-col justify-between cursor-pointer hover:scale-[1.01]"
                          >
                            <div className="space-y-5">
                              <div className="flex justify-between items-center border-b border-[#1C1A17]/5 pb-3">
                                <span className="font-serif text-base md:text-lg font-bold text-black tracking-wide group-hover:text-black/80 transition-colors">
                                  {item.title}
                                </span>
                                {item.category_tag && (
                                  <span className="font-mono text-[8px] tracking-widest text-[#1C1A17]/50 bg-neutral-100 border border-black/5 px-2 py-0.5 rounded uppercase">
                                    {item.category_tag}
                                  </span>
                                )}
                              </div>

                              {item.image_url && (
                                <div className="aspect-[16/10] w-full overflow-hidden rounded bg-gray-50 border border-[#1C1A17]/5 shadow-sm relative">
                                  <img 
                                    src={item.image_url} 
                                    alt={item.title} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[10px] tracking-[0.2em] font-mono text-white bg-black/75 px-3 py-1.5 rounded uppercase font-bold shadow-md">
                                      {lang === 'KR' ? '자세히 보기' : 'Read details'} &rarr;
                                    </span>
                                  </div>
                                </div>
                              )}

                              <p className="text-xs md:text-sm text-[#1C1A17]/85 leading-relaxed font-sans font-normal text-justify line-clamp-3">
                                {item.summary || item.content}
                              </p>
                            </div>

                            <div className="mt-8 border-t border-[#1C1A17]/5 pt-4 flex justify-between items-center text-[9px] tracking-widest uppercase font-mono font-bold text-neutral-400 group-hover:text-black transition-colors">
                              <span>HERITAGE ARCHIVE</span>
                              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                {lang === 'KR' ? '자세히 보기' : 'View details'} &rarr;
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: 음용후기 */}
                  <div className="space-y-8">
                    <h4 className="font-serif text-xs tracking-widest uppercase text-black/55 bg-neutral-100 p-2.5 rounded border border-black/5 block font-bold text-center">
                      💬 {lang === 'KR' ? '다우들의 음용후기 리뷰' : lang === 'SC' ? '茶友品茗感受' : 'Guest Reviews'}
                    </h4>

                    {teaReviews.length === 0 ? (
                      /* Default Fallback Card */
                      <div className="bg-white border border-[#1C1A17]/10 p-6 md:p-8 rounded hover:shadow-xl transition-all duration-300 relative flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-[#1C1A17]/5 pb-3">
                            <span className="font-serif text-base md:text-lg font-bold text-black tracking-wide">
                              {lang === 'KR' ? '음용후기 (茶友 리뷰)' : lang === 'SC' ? '茶友品茗感受' : 'Guest Reviews & Experiences'}
                            </span>
                          </div>

                          {/* Review Image */}
                          <div className="aspect-[16/10] w-full overflow-hidden rounded bg-gray-50 border border-[#1C1A17]/5 shadow-sm relative group">
                            <img 
                              src={siteSettings?.suncha_review_image || 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200'} 
                              alt="Seoncha Review" 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>

                          {/* Content Review with fallback quotation */}
                          <div className="relative">
                            <span className="font-serif text-3xl text-black/10 absolute -left-2 -top-4 select-none pr-3 block">“</span>
                            <p className="text-xs md:text-sm text-[#1C1A17]/85 font-sans leading-relaxed italic text-justify pl-4 whitespace-pre-wrap">
                              {lang === 'KR'
                                ? (siteSettings?.suncha_review_text_kr || '따스한 찻사발을 쥐며 흘러나오는 은은한 차 기운을 들이마시니 머리까지 청명해지고 복잡했던 상념들이 맑게 가라앉는 신비로운 영적 몰입감을 느꼈습니다. 매일 참선 다도의 훌륭한 길잡이가 되고 있습니다.')
                                : lang === 'SC'
                                ? (siteSettings?.suncha_review_text_sc || siteSettings?.suncha_review_text_kr || '凝神端起温暖的茶盏，清新幽雅的茶香沁人心脾，瞬间感觉灵台一片清明，往日的嘈杂压力在大脑中消解无踪。非常适合日常冥想时饮用。')
                                : (siteSettings?.suncha_review_text_en || siteSettings?.suncha_review_text_kr || 'Holding the warm tea bowl, the serene aroma centers my mind instantly. Deep thoughts settle into tranquil clarity, making it an indispensable partner for my daily early-morning meditation practice.')
                              }
                            </p>
                          </div>
                        </div>

                        <div className="mt-8 border-t border-[#1C1A17]/5 pt-4 flex justify-between items-center">
                          <span className="font-mono text-[8px] tracking-widest opacity-45 uppercase font-bold">GUEST RETROSPECTIVES</span>
                          <span className="font-serif text-[10px] italic opacity-40">M-M Harmony Co.</span>
                        </div>
                      </div>
                    ) : (
                      /* Dynamic List Cards */
                      <div className="space-y-6">
                        {teaReviews.map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => setSelectedJourneyItem(item)}
                            className="group bg-white border border-[#1C1A17]/10 p-6 md:p-8 rounded hover:shadow-2xl hover:border-[#1C1A17]/30 transition-all duration-300 relative flex flex-col justify-between cursor-pointer hover:scale-[1.01]"
                          >
                            <div className="space-y-5">
                              <div className="flex justify-between items-center border-b border-[#1C1A17]/5 pb-3">
                                <span className="font-serif text-base md:text-lg font-bold text-black tracking-wide group-hover:text-black/80 transition-colors">
                                  {item.title}
                                </span>
                                {item.category_tag && (
                                  <span className="font-mono text-[8px] tracking-widest text-[#1C1A17]/50 bg-neutral-100 border border-black/5 px-2 py-0.5 rounded uppercase">
                                    {item.category_tag}
                                  </span>
                                )}
                              </div>

                              {item.image_url && (
                                <div className="aspect-[16/10] w-full overflow-hidden rounded bg-gray-50 border border-[#1C1A17]/5 shadow-sm relative">
                                  <img 
                                    src={item.image_url} 
                                    alt={item.title} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[10px] tracking-[0.2em] font-mono text-white bg-black/75 px-3 py-1.5 rounded uppercase font-bold shadow-md">
                                      {lang === 'KR' ? '자세히 보기' : 'Read details'} &rarr;
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="relative">
                                <span className="font-serif text-3xl text-black/10 absolute -left-2 -top-4 select-none pr-3 block">“</span>
                                <p className="text-xs md:text-sm text-[#1C1A17]/85 font-sans leading-relaxed italic text-justify pl-4 line-clamp-3">
                                  {item.summary || item.content}
                                </p>
                              </div>
                            </div>

                            <div className="mt-8 border-t border-[#1C1A17]/5 pt-4 flex justify-between items-center text-[9px] tracking-widest uppercase font-mono font-bold text-neutral-400 group-hover:text-black transition-colors">
                              <span>GUEST REVIEW</span>
                              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                {lang === 'KR' ? '자세히 보기' : 'View details'} &rarr;
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

              {/* Timeline layouts */}
              <div className="space-y-12">
                
                {/* Journey visual logs */}
                {JSON.stringify(journeyFilter) !== '"all"' && (
                  <p className="font-mono text-[9px] tracking-widest uppercase opacity-45 mb-4 font-bold">
                    Filtered view: {journeyFilter.toUpperCase()} logs
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {sortItems(
                    archiveItems.filter(item => {
                      if (item.language !== lang) return false;
                      if (journeyFilter === 'photo') return item.category === 'journey';
                      if (journeyFilter === 'press') return item.category === 'press';
                      return (item.category === 'journey' || item.category === 'press');
                    }),
                    journeySortOrder
                  ).map((item) => (
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
                              {item.summary}
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
                              <option value="suncha_intro">Seoncha Intro (불한선차소개)</option>
                              <option value="suncha_review">Seoncha Review (음용후기)</option>
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
                                   item.category === 'suncha_intro' ? 'Seoncha Intro' :
                                   item.category === 'suncha_review' ? 'Seoncha Review' :
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
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
                                accept="image/*"
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
                                accept="image/*"
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
                      <option value="suncha_intro">Seoncha Intro (불한선차소개)</option>
                      <option value="suncha_review">Seoncha Review (음용후기)</option>
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

        {/* 1. Activity Journey details popup modal */}
        {selectedJourneyItem && (
          <div className="fixed inset-0 bg-[#1C1A17]/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#1C1A17]/15 rounded shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-left relative z-[260]"
            >
              <div className="p-5 bg-[#FAF9F6] border-b border-[#1C1A17]/10 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/40 font-bold uppercase py-0.5 px-2 bg-[#E5DFD3]/40 rounded">
                      {selectedJourneyItem.category === 'journey' ? 'Activity Performance' : 'Press Editorial'}
                    </span>
                    {selectedJourneyItem.category_tag && (
                      <span className="font-mono text-[9px] tracking-widest text-[#1C1A17]/60 font-bold uppercase py-0.5 px-2 bg-neutral-100 rounded border border-black/5">
                        {selectedJourneyItem.category_tag}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg md:text-xl font-bold text-black mt-2 leading-snug">
                    {selectedJourneyItem.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedJourneyItem(null)}
                  className="text-black/40 hover:text-black hover:bg-neutral-100 p-1.5 rounded transition-colors mt-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {selectedJourneyItem.image_url && (
                  <div className="w-full flex justify-center bg-gray-50 rounded border border-[#1C1A17]/5 p-2 overflow-hidden max-h-[60vh]">
                    <img 
                      src={selectedJourneyItem.image_url} 
                      alt={selectedJourneyItem.title} 
                      referrerPolicy="no-referrer"
                      className="max-h-[50vh] w-auto h-auto object-contain rounded shadow-sm"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  {selectedJourneyItem.summary && (
                    <p className="text-xs md:text-sm font-semibold text-[#1C1A17]/85 font-sans border-l-2 border-[#1C1A17]/30 pl-3 leading-relaxed">
                      {selectedJourneyItem.summary}
                    </p>
                  )}
                  <div className="prose prose-stone max-w-none text-xs md:text-sm text-[#1C1A17]/85 font-sans leading-relaxed whitespace-pre-wrap markdown-body pt-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                      {selectedJourneyItem.content || ''}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#FAF9F6] border-t border-[#1C1A17]/5 flex justify-end font-mono">
                <button 
                  onClick={() => setSelectedJourneyItem(null)}
                  className="px-6 py-2 bg-[#1C1A17] text-white hover:bg-black text-[10px] tracking-widest uppercase transition-colors rounded font-bold"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
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
                          accept="image/*"
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
                          accept="image/*"
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
      </AnimatePresence>

    </div>
  );
}

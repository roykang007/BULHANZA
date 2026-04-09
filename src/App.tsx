import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Globe, ChevronDown, Plus, Trash2, Edit2, ArrowLeft, Newspaper, Image as ImageIcon, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { supabase } from './lib/supabase';
import bulhansunchaImg from './assets/bulhansuncha.jpg';
import mountainsImg from './assets/mountains.jpg';

type Language = 'KR' | 'TC' | 'EN';
type Page = 'home' | 'tea' | 'archive' | 'contact' | 'philosophy' | 'admin';
type Category = 'poetry' | 'calligraphy' | 'painting' | 'carving';

interface ArchiveItem {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: Category;
  image_url: string;
  created_at: string;
}

interface Content {
  hero: { title: string; subtitle: string };
  philosophy: { title: string; text: string };
  philosophyDetail: {
    title: string;
    subtitle: string;
    intro: string;
    sections: {
      title: string;
      content: string;
    }[];
  };
  art: { title: string; text: string };
  tea: { title: string; text: string };
  teaDetail: {
    headline: string;
    core: string;
    experience: string;
    closing: string;
    final: string;
  };
  archive: {
    title: string;
    poetry: string;
    calligraphy: string;
    painting: string;
    carving: string;
  };
  contact: {
    title: string;
    collaboration: string;
    email: string;
    message: string;
    send: string;
  };
  about: { title: string; text: string };
  footer: string;
  nav: {
    about: string;
    philosophy: string;
    art: string;
    tea: string;
    archive: string;
    contact: string;
  };
}

const translations: Record<Language, Content> = {
  KR: {
    hero: {
      title: "심물지철(心物之哲) 여영사진(如映寫眞)",
      subtitle: "심물의 이치는 비춤과 같다 / 차는 그 빛이 머무는 자리다"
    },
    philosophy: {
      title: "心物哲學",
      text: "심물은 둘이 아니다. 보이는 것과 보이지 않는 것은 서로를 낳고, 그 사이에서 세계가 드러난다. 알고자 하면 멀어지고 고요하면 드러난다."
    },
    philosophyDetail: {
      title: "심물철학(心物哲學)과 물파미학(物波美學)",
      subtitle: "심물지파(心物之波)와 21세기 예술철학",
      intro: "예술은 인간이 세계와 만나는 가장 깊은 형식 가운데 하나이다. 인간은 사물을 보고, 소리를 듣고, 만물을 만지며 살아가지만, 단순한 감각적 접촉만으로 세계를 온전히 산다고 할 수는 없다. 우리는 언제나 보이는 것 너머를 함께 느낀다.\n\n심물철학은 마음과 사물을 둘로 갈라 놓지 않는다. 마음은 홀로 세계를 만들지 못하며, 사물도 홀로 의미를 갖지 못한다. 존재는 언제나 마음과 사물이 만나고 비추고 스며드는 관계 속에서만 현실성을 가진다.",
      sections: [
        {
          title: "제1장 왜 지금 새로운 미학이 필요한가",
          content: "새로운 미학이 필요하다고 할 때, 그것은 새로운 양식이나 새로운 기법을 하나 더 보태야 한다는 뜻이 아니다. 오늘의 예술은 이미 충분히 새롭다. 문제는 새로움이 부족한 데 있지 않고, 그 새로움을 떠받치는 근본 원리가 점점 약해지고 있다는 데 있다.\n\n현대 예술은 감각, 내면, 형식, 개념을 각각 깊이 있게 탐구하였으나, 그것들을 하나의 살아 있는 구조로 통합하는 원리를 충분히 마련하지는 못하였다. 그 결과 예술은 풍부해졌으나 동시에 파편화되었다."
        },
        {
          title: "제2장 심물철학과 물파미학의 근본 관계",
          content: "심물철학의 핵심은 단순하다. 마음과 사물은 둘로 갈라져 각각 독립적으로 존재하는 것이 아니라, 서로를 통해서만 현실성을 가진다는 것이다. 마음만으로는 세계가 없다. 마음이 아무리 풍부하더라도 그것이 만날 사물과 형상과 장이 없다면 스스로를 드러낼 길이 없다.\n\n예술은 마음과 사물 가운데 어느 하나의 독점물이 아니다. 창작은 마음이 사물을 통과하며 형상을 얻는 과정이며, 감상은 사물이 담고 있는 형상이 다시 마음을 움직이며 새로운 의미와 여운을 낳는 과정이다."
        },
        {
          title: "제3장 심물지파(心物之波)란 무엇인가",
          content: "물파미학의 중심 개념은 심물지파(心物之波), 곧 마음과 사물의 파동이다. 여기서 말하는 파동은 단순한 물리적 진동이나 막연한 감성의 떨림과 같지 않다. 그것은 마음과 사물이 서로를 감응시키고 형상을 낳으며, 다시 울림으로 돌아가는 존재의 운동 형식이다.\n\n예술에서 파동은 크게 세 차원으로 이해될 수 있다. 첫째는 생성의 파동이다. 작가와 재료와 세계가 만나 작품이 생겨나는 차원이다. 둘째는 응축의 파동이다. 셋째는 감응의 파동이다."
        },
        {
          title: "제4장 심물영사론(心物映寫論)",
          content: "“심물지철 여영사진(心物之哲 如映寫眞)”이라는 비유는 심물철학과 물파미학을 잇는 핵심 열쇠이다. 영사기의 빛, 필름, 스크린은 각각 따로 존재할 수 있지만, 영상이라는 사건은 셋의 상호작용 속에서만 성립한다.\n\n예술작품은 이미 완결되어 놓인 물체가 아니라, 어떤 드러남의 사건이다. 작가의 마음은 빛처럼 작품 전체를 관통하며 형상을 가능하게 하고, 재료와 형식은 필름처럼 그 빛을 머금고 구체적 모습을 지닌다."
        }
      ]
    },
    art: {
      title: "物波藝術",
      text: "예술은 형태가 아니라 파동이다. 그 파동이 마음에 닿을 때 공명이 일어난다. 작품은 만들어지는 것이 아니라 드러나는 것이다."
    },
    tea: {
      title: "弗寒仙茶",
      text: "차를 안다는 것은 차를 모른다는 것을 아는 데 있다. 불한선차는 알기 위한 차가 아니라 깨닫기 위한 차다."
    },
    teaDetail: {
      headline: "불한선차(弗寒仙茶)\n알 수 없음 속에 깨닫는 차",
      core: "이 차는 맛으로 정의되지 않는다.\n향으로도 설명되지 않는다.\n마음과 사물이 만나는 자리에서\n차는 비로소 드러난다.",
      experience: "마시지 말고 머물러라\n느끼려 하지 말고 두어라\n차는 스스로 다가온다",
      closing: "누가 차를 다 알 수 있으랴",
      final: "“불한선차는 제품이 아니라 철학의 구현이다.”"
    },
    archive: {
      title: "Archive",
      poetry: "시(詩)",
      calligraphy: "서(書)",
      painting: "화(畫)",
      carving: "각(刻)"
    },
    contact: {
      title: "Contact",
      collaboration: "Collaboration",
      email: "이메일",
      message: "메시지",
      send: "보내기"
    },
    about: {
      title: "About Bulhanza",
      text: "불한자(弗寒子)는 심물철학을 기반으로 한 사유와 예술의 장입니다. 마음과 사물은 둘이 아니라 하나의 파동이며, 그 파동은 글과 그림, 그리고 차로 드러납니다. 이곳은 철학이 머물고, 예술이 숨 쉬며, 차가 그것을 완성하는 공간입니다."
    },
    footer: "차는 철학의 끝이 아니라 철학이 시작하는 자리다",
    nav: {
      about: "소개",
      philosophy: "심물철학",
      art: "물파예술",
      tea: "불한선차",
      archive: "아카이브",
      contact: "문의"
    }
  },
  TC: {
    hero: {
      title: "心物之哲 如映寫眞",
      subtitle: "茶者，光之所止"
    },
    philosophy: {
      title: "心物哲學",
      text: "心物非二。 有形與無形，相生相成， 而世界於其中顯現。 求之則遠， 靜之則明。"
    },
    philosophyDetail: {
      title: "心物哲學與物波美學",
      subtitle: "心物之波與21世紀藝術哲學",
      intro: "藝術是人類與世界相遇的最深層形式之一。 人類觀察事物， 聆聽聲音， 觸摸萬物， 但僅憑感官接觸無法完整地生活在世界上。 我們總是能感受到可見物之外的存在。\n\n心物哲學不將心與物分開。 心不能獨自創造世界， 物也不能獨自擁有意義。 存在始終只在心與物相遇， 映照， 滲透的關係中具有現實性。",
      sections: [
        {
          title: "第一章 為什麼現在需要新的美學",
          content: "當我們說需要新的美學時， 並不是指要增加一種新的風格或技巧。 今天的藝術已經足夠新穎. 問題不在於缺乏新穎性， 而在於支撐這種新穎性的根本原理正變得越來越薄弱。"
        },
        {
          title: "第二章 心物哲學與物波美學的根本關係",
          content: "心物哲學的核心很簡單. 心與物並非各自獨立存在， 而是只有通過彼此才能獲得現實性. 只有心， 沒有世界. 無論心多麼豐富， 如果沒有可遇的事物, 形象和場域， 就無法展現自己。"
        }
      ]
    },
    art: {
      title: "物波藝術",
      text: "藝術，非形也，乃波也。 波動入心，則生共鳴。 作品，非造也， 乃顯也。"
    },
    tea: {
      title: "弗寒仙茶",
      text: "知茶者，知其不可知。 弗寒仙茶， 非為知而飲， 乃為覺而存。"
    },
    teaDetail: {
      headline: "弗寒仙茶\n靜於不知之茶",
      core: "此茶，不以味定，\n亦不以香述。\n心物相會之際，\n茶乃顯現。",
      experience: "勿飲而止\n勿求而任\n茶自來矣",
      closing: "誰能盡知茶乎",
      final: "“弗寒仙茶非產品，乃哲學之體現。”"
    },
    archive: {
      title: "檔案",
      poetry: "詩",
      calligraphy: "書",
      painting: "畫",
      carving: "刻"
    },
    contact: {
      title: "聯絡",
      collaboration: "合作",
      email: "電子郵件",
      message: "訊息",
      send: "發送"
    },
    about: {
      title: "關於 弗寒子",
      text: "關爲弗寒子（繁體） 弗寒子，乃以心物哲學為本之思想與藝術之場。 心與物，非二而一，其為波動而顯於詩書畫與茶。 此處，哲思所止，藝術所生， 而茶，為其完成之境。"
    },
    footer: "茶非哲之終 乃哲之所始",
    nav: {
      about: "關於",
      philosophy: "心物哲學",
      art: "物波藝術",
      tea: "弗寒仙茶",
      archive: "檔案",
      contact: "聯絡"
    }
  },
  EN: {
    hero: {
      title: "Mind and Matter, like light and projection",
      subtitle: "Tea is where the light comes to rest"
    },
    philosophy: {
      title: "Philosophy",
      text: "Mind and matter are not two. The visible and invisible give rise to each other, and the world emerges between them. To seek is to lose it. To stillness is to see it."
    },
    philosophyDetail: {
      title: "Mind-Matter Philosophy & Mulpa Aesthetics",
      subtitle: "The Wave of Mind-Matter and 21st Century Art Philosophy",
      intro: "Art is one of the deepest forms through which humans encounter the world. We see things, hear sounds, and touch all things, but we cannot say we live fully in the world through simple sensory contact alone. We always feel something beyond what is visible.\n\nMind-Matter philosophy does not separate the mind from the object. The mind alone cannot create a world, and the object alone cannot hold meaning. Existence only gains reality in the relationship where mind and matter meet, reflect, and permeate each other.",
      sections: [
        {
          title: "Chapter 1: Why a New Aesthetics is Needed Now",
          content: "When we say a new aesthetics is needed, it doesn't mean adding another style or technique. Today's art is already new enough. The problem is not a lack of novelty, but that the fundamental principles supporting that novelty are weakening."
        },
        {
          title: "Chapter 2: The Fundamental Relationship",
          content: "The core of Mind-Matter philosophy is simple. Mind and matter do not exist independently, but only gain reality through each other. Without the object, there is no world for the mind to manifest."
        }
      ]
    },
    art: {
      title: "Mulpa Art",
      text: "Art is not form — it is a wave. When the wave reaches the mind, resonance arises. A work is not made. It reveals itself."
    },
    tea: {
      title: "Bulhan Tea",
      text: "To know tea is to know that it cannot be fully known. Bulhan Tea is not for knowing. It is for dwelling."
    },
    teaDetail: {
      headline: "Bulhan Immortal Tea,\nA Tea Beyond Knowing",
      core: "This tea is not defined by taste,\nnor described by aroma.\nIt reveals itself\nwhere mind and matter meet.",
      experience: "Do not try to drink it.\nDo not try to grasp it.\nLet it come to you.",
      closing: "Who can fully know tea?",
      final: "“Bulhan Tea is not a product, but an embodiment of philosophy.”"
    },
    archive: {
      title: "Archive",
      poetry: "Poetry",
      calligraphy: "Calligraphy",
      painting: "Painting",
      carving: "Carving"
    },
    contact: {
      title: "Contact",
      collaboration: "Collaboration",
      email: "Email",
      message: "Message",
      send: "Send"
    },
    about: {
      title: "About Bulhanza",
      text: "Bulhanza is a space of philosophy and art grounded in the philosophy of Mind and Matter. Mind and matter are not separate—they move as one wave, expressed through writing, art, and tea. Here, philosophy dwells, art breathes, and tea completes the experience."
    },
    footer: "Tea is not the end of philosophy. It is where philosophy rests.",
    nav: {
      about: "About",
      philosophy: "Philosophy",
      art: "Art",
      tea: "Tea",
      archive: "Archive",
      contact: "Contact"
    }
  }
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1514483127413-f72f273478c3?q=80&w=2070&auto=format&fit=crop";

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};

const Section = ({ id, title, text, dark = false, bgImage }: { id: string; title: string; text: string; dark?: boolean; bgImage?: string }) => (
  <section id={id} className={`relative min-h-screen flex flex-col justify-center px-6 md:px-24 py-24 ${dark ? 'bg-[#1a1a1a] text-white' : 'bg-white text-[#1a1a1a]'} overflow-hidden group`}>
    {bgImage && (
      <div className="absolute inset-0 z-0">
        <img 
          src={bgImage} 
          alt={title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover grayscale opacity-25 group-hover:opacity-40 transition-opacity duration-1000"
        />
        <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-transparent to-[#1a1a1a]' : 'bg-gradient-to-b from-transparent to-white'}`} />
      </div>
    )}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="max-w-4xl z-10"
    >
      <h2 className="text-3xl md:text-5xl font-serif mb-12 tracking-widest opacity-80">{title}</h2>
      <p className="text-xl md:text-2xl font-serif leading-relaxed tracking-wide opacity-90 whitespace-pre-line">
        {text}
      </p>
    </motion.div>
  </section>
);

const PhilosophyPage = ({ t, setPage }: { t: any; setPage: (p: Page) => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="bg-[#fdfdfd]"
  >
    {/* Hero Section */}
    <header className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5 }}
        className="z-10 max-w-5xl"
      >
        <h1 className="text-4xl md:text-7xl font-serif mb-6 tracking-[0.2em] leading-tight">
          {t.philosophyDetail.title}
        </h1>
        <p className="text-xl md:text-2xl font-serif tracking-[0.3em] opacity-60">
          {t.philosophyDetail.subtitle}
        </p>
      </motion.div>
    </header>

    {/* Intro Section */}
    <section className="py-32 px-6 md:px-24 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative"
      >
        <div className="absolute -left-12 top-0 text-8xl font-serif opacity-[0.05] select-none">“</div>
        <p className="text-2xl md:text-3xl font-serif leading-relaxed tracking-wide whitespace-pre-line opacity-80 italic">
          {t.philosophyDetail.intro}
        </p>
      </motion.div>
    </section>

    {/* Chapters */}
    <section className="py-24 px-6 md:px-24 space-y-48 pb-64">
      {t.philosophyDetail.sections.map((section: any, i: number) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1 }}
          className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-16 items-center max-w-6xl mx-auto`}
        >
          <div className="flex-1 space-y-8">
            <h3 className="text-3xl md:text-4xl font-serif tracking-widest border-b border-black/10 pb-4 inline-block">
              {section.title}
            </h3>
            <p className="text-lg md:text-xl font-serif leading-relaxed tracking-wide opacity-70 whitespace-pre-line">
              {section.content}
            </p>
          </div>
          <div className="flex-1 w-full aspect-[4/5] overflow-hidden relative group">
            <img 
              src={`https://picsum.photos/seed/philosophy-${i}/800/1000?grayscale`} 
              alt={section.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-1000" />
          </div>
        </motion.div>
      ))}
    </section>

    {/* Back Button */}
    <div className="pb-24 text-center">
      <button 
        onClick={() => setPage('home')}
        className="text-sm tracking-[0.5em] uppercase opacity-40 hover:opacity-100 transition-opacity border-b border-black/20 pb-2"
      >
        Back to Main
      </button>
    </div>
  </motion.div>
);

const TeaDetailPage = ({ t, setPage }: { t: any; setPage: (p: Page) => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="bg-[#fdfdfd]"
  >
    {/* Hero Section */}
    <header className="relative h-[80vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5 }}
        className="z-10"
      >
        <h1 className="text-4xl md:text-6xl font-serif mb-6 tracking-[0.2em] leading-tight whitespace-pre-line">
          {t.teaDetail.headline}
        </h1>
      </motion.div>
    </header>

    {/* Core Description */}
    <section className="py-32 px-6 md:px-24 flex flex-col md:flex-row items-center gap-16">
      <div className="flex-1">
        <motion.p 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-serif leading-relaxed tracking-widest whitespace-pre-line opacity-80"
        >
          {t.teaDetail.core}
        </motion.p>
      </div>
      <div className="flex-1 w-full h-[500px] overflow-hidden">
        <img 
          src={bulhansunchaImg} 
          alt="Tea Leaves"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
        />
      </div>
    </section>

    {/* Experience Description */}
    <section className="py-32 px-6 md:px-24 bg-[#1a1a1a] text-white text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto"
      >
        <p className="text-2xl md:text-4xl font-serif leading-loose tracking-[0.2em] whitespace-pre-line opacity-90">
          {t.teaDetail.experience}
        </p>
      </motion.div>
    </section>

    {/* Closing & Final */}
    <section className="py-48 px-6 text-center">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto"
      >
        <h3 className="text-3xl md:text-5xl font-serif tracking-[0.3em] mb-24 opacity-80 whitespace-nowrap">
          {t.teaDetail.closing}
        </h3>
        <div className="w-16 h-px bg-black/20 mx-auto mb-24" />
        <p className="text-xl md:text-3xl font-serif tracking-widest leading-relaxed opacity-60">
          {t.teaDetail.final}
        </p>
      </motion.div>
    </section>

    {/* Back Button */}
    <div className="pb-24 text-center">
      <button 
        onClick={() => setPage('home')}
        className="text-sm tracking-[0.5em] uppercase opacity-40 hover:opacity-100 transition-opacity border-b border-black/20 pb-2"
      >
        Back to Main
      </button>
    </div>
  </motion.div>
);

const ArchivePage = ({ t, setPage, archiveItems, selectedArchiveItem, setSelectedArchiveItem, onEdit }: { t: any; setPage: (p: Page) => void; archiveItems: ArchiveItem[]; selectedArchiveItem: ArchiveItem | null; setSelectedArchiveItem: (i: ArchiveItem | null) => void; onEdit?: (item: ArchiveItem) => void }) => {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const filteredItems = filter === 'all' ? archiveItems : archiveItems.filter(item => item.category === filter);

  if (selectedArchiveItem) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen pt-32 px-6 md:px-24 bg-[#fdfdfd] pb-32"
      >
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => setSelectedArchiveItem(null)}
            className="flex items-center gap-2 text-sm tracking-widest opacity-40 hover:opacity-100 transition-opacity mb-16 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> BACK TO ARCHIVE
          </button>
          
          <article className="space-y-16">
            {/* Newspaper Masthead Style Header */}
            <div className="border-y-2 border-black py-12 space-y-8 text-center">
              <div className="flex justify-between items-center text-[10px] tracking-[0.5em] uppercase opacity-50 px-4">
                <span>Vol. {new Date(selectedArchiveItem.created_at).getFullYear()}</span>
                <span className="font-bold">{selectedArchiveItem.category}</span>
                <span>{new Date(selectedArchiveItem.created_at).toLocaleDateString()}</span>
              </div>
              <h1 className="text-5xl md:text-8xl font-serif leading-none tracking-tight px-4">
                {selectedArchiveItem.title}
              </h1>
              <div className="w-24 h-px bg-black mx-auto" />
              <p className="max-w-2xl mx-auto text-xl font-serif italic opacity-60 px-4">
                {selectedArchiveItem.summary}
              </p>
            </div>

            <div className="aspect-[21/9] overflow-hidden bg-gray-100">
              <img 
                src={selectedArchiveItem.image_url || DEFAULT_IMAGE} 
                alt={selectedArchiveItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale contrast-125"
              />
            </div>

            <div className="font-serif leading-relaxed tracking-wide opacity-90 text-lg md:text-xl whitespace-pre-wrap max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  img: ({ node, ...props }) => (
                    <img 
                      {...props} 
                      className="max-w-full h-auto my-12 mx-auto block shadow-xl border border-black/5" 
                      referrerPolicy="no-referrer" 
                    />
                  ),
                  p: ({ children }) => <p className="mb-4">{children}</p>,
                  h1: ({ children }) => <h1 className="text-3xl font-bold my-6">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-2xl font-bold my-4">{children}</h2>,
                  ul: ({ children }) => <ul className="list-disc ml-6 my-4">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-6 my-4">{children}</ol>,
                  li: ({ children }) => <li className="mb-2">{children}</li>
                }}
              >
                {selectedArchiveItem.content}
              </ReactMarkdown>
            </div>

            <div className="border-t border-black/10 pt-12 flex justify-between items-center">
              <div className="text-[10px] tracking-[0.5em] uppercase opacity-30">End of Article</div>
              {onEdit && (
                <button 
                  onClick={() => onEdit(selectedArchiveItem)}
                  className="text-[10px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2 border border-black/10 px-4 py-2 rounded"
                >
                  <Edit2 size={12} /> EDIT THIS ARTICLE
                </button>
              )}
            </div>
          </article>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-32 px-6 md:px-24 bg-[#fdfdfd]"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-32">
          <h2 className="text-5xl md:text-8xl font-serif mb-12 tracking-[0.1em]">{t.archive.title}</h2>
          <div className="flex flex-wrap justify-center gap-8 text-[10px] tracking-[0.4em] uppercase opacity-40">
            {(['all', 'poetry', 'calligraphy', 'painting', 'carving'] as const).map((cat) => (
              <button 
                key={cat}
                onClick={() => setFilter(cat)}
                className={`hover:opacity-100 transition-all duration-500 relative py-2 ${filter === cat ? 'opacity-100 font-bold' : ''}`}
              >
                {cat === 'all' ? 'All Collections' : t.archive[cat as keyof typeof t.archive]}
                {filter === cat && (
                  <motion.div 
                    layoutId="activeFilter"
                    className="absolute bottom-0 left-0 right-0 h-px bg-black"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-48 opacity-20 font-serif tracking-[0.5em] text-sm uppercase">
            No records found in this category
          </div>
        ) : (
          <div className="flex flex-col gap-12 pb-32">
            {filteredItems.map((item) => (
              <motion.div 
                key={item.id}
                layoutId={item.id}
                className="group flex flex-col md:flex-row gap-8 pb-12 border-b border-black/5 items-start"
              >
                <div 
                  onClick={() => setSelectedArchiveItem(item)}
                  className="w-full md:w-48 aspect-[4/3] overflow-hidden bg-gray-100 cursor-pointer relative shrink-0"
                >
                  <img 
                    src={item.image_url || DEFAULT_IMAGE} 
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 
                      onClick={() => setSelectedArchiveItem(item)}
                      className="text-xl md:text-3xl font-serif tracking-tight leading-tight cursor-pointer hover:text-gray-600 transition-colors"
                    >
                      {item.title}
                    </h3>
                    {onEdit && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                        className="text-[10px] tracking-[0.3em] uppercase opacity-20 hover:opacity-100 transition-opacity p-2"
                        title="Edit Article"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="text-blue-600 font-serif text-xs tracking-widest font-medium">
                    [{t.archive[item.category as keyof typeof t.archive] || item.category}]
                  </div>
                  <p className="text-base font-serif opacity-60 line-clamp-2 leading-relaxed text-justify">
                    {item.summary}
                  </p>
                  <div className="pt-1">
                    <span className="text-[10px] tracking-[0.2em] uppercase opacity-30 font-mono">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <div className="pb-24 text-center">
        <button 
          onClick={() => setPage('home')}
          className="text-sm tracking-[0.5em] uppercase opacity-40 hover:opacity-100 transition-opacity border-b border-black/20 pb-2"
        >
          Back to Main
        </button>
      </div>
    </motion.div>
  );
};

const AdminDashboard = ({ archiveItems, setArchiveItems, initialEditingItem, onClearEdit }: { archiveItems: ArchiveItem[]; setArchiveItems: React.Dispatch<React.SetStateAction<ArchiveItem[]>>; initialEditingItem?: ArchiveItem | null; onClearEdit?: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ArchiveItem | null>(initialEditingItem || null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: initialEditingItem?.title || '',
    content: initialEditingItem?.content || '',
    summary: initialEditingItem?.summary || '',
    category: (initialEditingItem?.category || 'poetry') as Category,
    image_url: initialEditingItem?.image_url || ''
  });

  useEffect(() => {
    if (initialEditingItem) {
      setEditingItem(initialEditingItem);
      setFormData({
        title: initialEditingItem.title,
        content: initialEditingItem.content,
        summary: initialEditingItem.summary,
        category: initialEditingItem.category,
        image_url: initialEditingItem.image_url
      });
      setIsAdding(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [initialEditingItem]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const base64 = await compressImage(file);
      setFormData({ ...formData, image_url: base64 });
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const base64 = await compressImage(file);
      setFormData({ 
        ...formData, 
        content: formData.content + `\n\n![image](${base64})\n\n` 
      });
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionData = {
      ...formData,
      image_url: formData.image_url.trim() || DEFAULT_IMAGE
    };

    if (editingItem) {
      const { error } = await supabase
        .from('archive_items')
        .update(submissionData)
        .eq('id', editingItem.id);
      if (!error) {
        setArchiveItems(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...submissionData } : item));
        setEditingItem(null);
        if (onClearEdit) onClearEdit();
      }
    } else {
      const { data, error } = await supabase
        .from('archive_items')
        .insert([submissionData])
        .select();
      if (!error && data) {
        setArchiveItems(prev => [data[0], ...prev]);
        setIsAdding(false);
      }
    }
    setFormData({ title: '', content: '', summary: '', category: 'poetry', image_url: '' });
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('archive_items').delete().eq('id', id);
      if (error) throw error;
      setArchiveItems(prev => prev.filter(item => item.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete item. Please check your connection.");
    }
  };

  return (
    <div className="min-h-screen pt-32 px-6 md:px-24 bg-[#f8f8f8]">
      <div className="max-w-7xl mx-auto pb-32">
        <div className="flex justify-between items-end mb-16 border-b border-black pb-8">
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.5em] uppercase opacity-40">System Management</p>
            <h2 className="text-5xl font-serif tracking-tight">Archive Control</h2>
          </div>
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              if (editingItem) {
                setEditingItem(null);
                if (onClearEdit) onClearEdit();
                setFormData({ title: '', content: '', summary: '', category: 'poetry', image_url: '' });
              }
            }}
            className="flex items-center gap-3 bg-black text-white px-8 py-4 text-[10px] tracking-[0.4em] uppercase hover:bg-gray-800 transition-all active:scale-95"
          >
            {(isAdding || editingItem) ? <X size={14} /> : <Plus size={14} />}
            {(isAdding || editingItem) ? 'Close Editor' : 'New Entry'}
          </button>
        </div>

        {(isAdding || editingItem) && (
          <motion.form 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="bg-white p-12 mb-24 shadow-2xl space-y-12 border border-black/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Article Title</label>
                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter headline..."
                  className="w-full border-b border-gray-300 py-4 text-2xl outline-none focus:border-black transition-colors font-serif placeholder:text-gray-300 text-black"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Category</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value as Category})}
                  className="w-full border-b border-gray-300 py-4 text-xl outline-none focus:border-black transition-colors font-serif bg-transparent cursor-pointer text-black"
                >
                  <option value="poetry" className="text-black">Poetry (詩)</option>
                  <option value="calligraphy" className="text-black">Calligraphy (書)</option>
                  <option value="painting" className="text-black">Painting (畫)</option>
                  <option value="carving" className="text-black">Carving (刻)</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Cover Image</label>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <input 
                  value={formData.image_url}
                  onChange={e => setFormData({...formData, image_url: e.target.value})}
                  placeholder="Image URL or upload..."
                  className="flex-1 border-b border-gray-300 py-4 outline-none focus:border-black transition-colors font-serif text-black placeholder:text-gray-300"
                />
                <input 
                  type="file" 
                  ref={coverInputRef}
                  onChange={handleCoverUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button 
                  type="button"
                  disabled={isUploading}
                  onClick={() => coverInputRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-3 border border-black/10 text-[10px] tracking-[0.2em] uppercase hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
              {formData.image_url && (
                <div className="mt-4 w-40 h-24 overflow-hidden border border-black/5">
                  <img src={formData.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Brief Summary</label>
              <textarea 
                required
                value={formData.summary}
                onChange={e => setFormData({...formData, summary: e.target.value})}
                rows={2}
                placeholder="A short introduction..."
                className="w-full border-b border-gray-300 py-4 text-lg outline-none focus:border-black transition-colors font-serif resize-none italic text-black placeholder:text-gray-300"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Main Content (Markdown Supported)</label>
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    ref={contentImageInputRef}
                    onChange={handleContentImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button 
                    type="button"
                    disabled={isUploading}
                    onClick={() => contentImageInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 border border-black/10 text-[9px] tracking-[0.2em] uppercase hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    <ImageIcon size={12} /> {isUploading ? 'Adding...' : 'Add Image'}
                  </button>
                </div>
              </div>
              <textarea 
                required
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
                rows={12}
                placeholder="Write the full article here... You can use Markdown."
                className="w-full border border-gray-200 p-8 outline-none focus:border-black transition-colors font-serif leading-relaxed text-lg text-black placeholder:text-gray-300"
              />
            </div>

            <div className="flex gap-4">
              <button type="submit" className="flex-1 bg-black text-white py-6 text-[10px] tracking-[0.5em] uppercase hover:bg-gray-800 transition-all">
                {editingItem ? 'Save Changes' : 'Publish to Archive'}
              </button>
              {editingItem && (
                <button 
                  type="button" 
                  onClick={() => { 
                    setEditingItem(null); 
                    if (onClearEdit) onClearEdit();
                    setFormData({title:'', content:'', summary:'', category:'poetry', image_url:''}); 
                  }}
                  className="px-12 border border-black/10 text-[10px] tracking-[0.5em] uppercase hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.form>
        )}

        <div className="bg-white shadow-2xl border border-black/5 overflow-hidden">
          <div className="p-8 bg-gray-50 border-b border-black/5 flex justify-between items-center">
            <span className="text-[10px] tracking-[0.5em] uppercase opacity-40">Database Records</span>
            <span className="text-[10px] tracking-[0.5em] uppercase opacity-40">{archiveItems.length} Total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[9px] tracking-[0.5em] uppercase opacity-30 border-b border-black/5">
                  <th className="px-8 py-6 font-bold">Preview</th>
                  <th className="px-8 py-6 font-bold">Headline</th>
                  <th className="px-8 py-6 font-bold">Category</th>
                  <th className="px-8 py-6 font-bold">Date</th>
                  <th className="px-8 py-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {archiveItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="w-20 h-12 overflow-hidden bg-gray-100">
                        <img src={item.image_url || DEFAULT_IMAGE} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-serif text-lg tracking-tight">{item.title}</div>
                      <div className="text-[10px] opacity-30 line-clamp-1 mt-1">{item.summary}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[9px] tracking-[0.3em] uppercase opacity-60 border border-black/10 px-3 py-1 rounded-full">{item.category}</span>
                    </td>
                    <td className="px-8 py-6 text-[10px] opacity-40 font-mono">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-6">
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setFormData({
                              title: item.title,
                              content: item.content,
                              summary: item.summary,
                              category: item.category,
                              image_url: item.image_url
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-gray-400 hover:text-black transition-colors p-2"
                          title="Edit Article"
                        >
                          <Edit2 size={16} />
                        </button>
                        {deleteConfirmId === item.id ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => deleteItem(item.id)}
                              className="bg-red-600 text-white text-[9px] px-3 py-1 uppercase tracking-widest hover:bg-red-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-gray-400 hover:text-black text-[9px] px-3 py-1 uppercase tracking-widest transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-2"
                            title="Delete Article"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactPage = ({ t, setPage }: { t: any; setPage: (p: Page) => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="min-h-screen pt-32 px-6 md:px-24 bg-[#fdfdfd]"
  >
    <div className="max-w-4xl mx-auto">
      <h2 className="text-4xl md:text-6xl font-serif mb-24 tracking-[0.2em] text-center">{t.contact.title}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-24 pb-32">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h3 className="text-2xl font-serif mb-8 tracking-widest opacity-80">{t.contact.title}</h3>
          <div className="space-y-6 opacity-60 font-serif tracking-wide">
            <p>Email: contact@bulhanza.com</p>
            <p>Instagram: @bulhanza_official</p>
            <p>Studio: Seoul, Korea</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h3 className="text-2xl font-serif mb-8 tracking-widest opacity-80">{t.contact.collaboration}</h3>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-xs tracking-[0.3em] uppercase opacity-40 mb-2">{t.contact.email}</label>
              <input type="email" className="w-full bg-transparent border-b border-black/10 py-2 focus:border-black transition-colors outline-none font-serif" />
            </div>
            <div>
              <label className="block text-xs tracking-[0.3em] uppercase opacity-40 mb-2">{t.contact.message}</label>
              <textarea rows={4} className="w-full bg-transparent border-b border-black/10 py-2 focus:border-black transition-colors outline-none font-serif resize-none" />
            </div>
            <button className="text-sm tracking-[0.5em] uppercase border border-black/20 px-8 py-3 hover:bg-black hover:text-white transition-all duration-500">
              {t.contact.send}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
    <div className="pb-24 text-center">
      <button 
        onClick={() => setPage('home')}
        className="text-sm tracking-[0.5em] uppercase opacity-40 hover:opacity-100 transition-opacity border-b border-black/20 pb-2"
      >
        Back to Main
      </button>
    </div>
  </motion.div>
);

export default function App() {
  const [lang, setLang] = useState<Language>('KR');
  const [page, setPage] = useState<Page>('home');
  const [selectedArchiveItem, setSelectedArchiveItem] = useState<ArchiveItem | null>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [adminEditingItem, setAdminEditingItem] = useState<ArchiveItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsLangOpen(false);
    if (isLangOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isLangOpen]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
    if (page !== 'archive') setSelectedArchiveItem(null);
  }, [page]);

  // Fetch Archive Items from Supabase
  useEffect(() => {
    const fetchArchive = async () => {
      const { data, error } = await supabase
        .from('archive_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching archive:', error);
      } else if (data) {
        setArchiveItems(data);
      }
    };

    fetchArchive();
  }, []);

  return (
    <div className="font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 py-6 flex justify-between items-center ${scrolled ? 'bg-white/80 backdrop-blur-md py-4' : 'bg-transparent'}`}>
        <div className="flex items-center gap-8">
          <button onClick={() => setPage('home')} className="text-3xl font-serif tracking-[0.2em] font-bold">弗寒子</button>
          <div className="hidden md:flex gap-8 text-lg tracking-widest uppercase opacity-70 font-medium">
            <a href={page === 'home' ? "#about" : "#"} onClick={(e) => { if (page !== 'home') { e.preventDefault(); setPage('home'); setTimeout(() => { const el = document.getElementById('about'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); } }} className="hover:opacity-100 transition-opacity">{t.nav.about}</a>
            <button onClick={() => setPage('philosophy')} className={`hover:opacity-100 transition-opacity ${page === 'philosophy' ? 'opacity-100 font-bold' : ''}`}>{t.nav.philosophy}</button>
            <a href={page === 'home' ? "#art" : "#"} onClick={(e) => { if (page !== 'home') { e.preventDefault(); setPage('home'); setTimeout(() => { const el = document.getElementById('art'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); } }} className="hover:opacity-100 transition-opacity">{t.nav.art}</a>
            <button onClick={() => setPage('tea')} className={`hover:opacity-100 transition-opacity ${page === 'tea' ? 'opacity-100 font-bold' : ''}`}>{t.nav.tea}</button>
            <button onClick={() => setPage('archive')} className={`hover:opacity-100 transition-opacity ${page === 'archive' ? 'opacity-100 font-bold' : ''}`}>{t.nav.archive}</button>
            <button onClick={() => setPage('contact')} className={`hover:opacity-100 transition-opacity ${page === 'contact' ? 'opacity-100 font-bold' : ''}`}>{t.nav.contact}</button>
            <button onClick={() => setPage('admin')} className={`hover:opacity-100 transition-opacity text-red-800/40 hover:text-red-800 ${page === 'admin' ? 'opacity-100 font-bold text-red-800' : ''}`}>ADMIN</button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsLangOpen(!isLangOpen); }}
              className="flex items-center gap-2 text-lg tracking-widest opacity-70 hover:opacity-100 transition-opacity font-medium"
            >
              <Globe size={20} />
              {lang}
              <ChevronDown size={18} className={`transition-transform duration-300 ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isLangOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-4 w-40 bg-white border border-gray-100 shadow-2xl py-2 z-[60]"
                >
                  {(['KR', 'TC', 'EN'] as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setIsLangOpen(false); }}
                      className={`w-full text-left px-6 py-4 text-sm tracking-widest hover:bg-gray-50 transition-colors ${lang === l ? 'font-bold text-black' : 'text-gray-500'}`}
                    >
                      {l === 'KR' ? '한국어' : l === 'TC' ? '繁體中文' : 'English'}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden opacity-70 hover:opacity-100">
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 bg-white z-40 flex flex-col items-center justify-center gap-10 text-3xl font-serif tracking-widest"
          >
            <a href="#about" onClick={() => { setIsMenuOpen(false); setPage('home'); setTimeout(() => { const el = document.getElementById('about'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); }}>{t.nav.about}</a>
            <button onClick={() => { setIsMenuOpen(false); setPage('philosophy'); }}>{t.nav.philosophy}</button>
            <a href="#art" onClick={() => { setIsMenuOpen(false); setPage('home'); setTimeout(() => { const el = document.getElementById('art'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); }}>{t.nav.art}</a>
            <button onClick={() => { setIsMenuOpen(false); setPage('tea'); }}>{t.nav.tea}</button>
            <button onClick={() => { setIsMenuOpen(false); setPage('archive'); }}>{t.nav.archive}</button>
            <button onClick={() => { setIsMenuOpen(false); setPage('contact'); }}>{t.nav.contact}</button>
            <div className="flex gap-6 mt-12">
              {(['KR', 'TC', 'EN'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setIsMenuOpen(false); }}
                  className={`text-lg ${lang === l ? 'font-bold' : 'opacity-40'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {page === 'home' ? (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Hero Section */}
            <header className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden group/hero">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <motion.path
                    d="M0 50 Q 25 40, 50 50 T 100 50"
                    fill="none"
                    stroke="black"
                    strokeWidth="0.1"
                    animate={{
                      d: [
                        "M0 50 Q 25 40, 50 50 T 100 50",
                        "M0 50 Q 25 60, 50 50 T 100 50",
                        "M0 50 Q 25 40, 50 50 T 100 50"
                      ]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="z-20"
              >
                <h1 className="text-4xl md:text-7xl font-serif mb-8 tracking-[0.3em] leading-tight drop-shadow-sm">
                  {t.hero.title}
                </h1>
                <p className="text-lg md:text-xl font-serif tracking-widest opacity-60 max-w-2xl mx-auto leading-relaxed">
                  {t.hero.subtitle}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 1 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="w-px h-16 bg-black/20 animate-pulse" />
              </motion.div>
            </header>

            {/* Content Sections */}
            <Section id="philosophy" title={t.philosophy.title} text={t.philosophy.text} />
            
            <div className="h-px bg-black/5 mx-24" />

            <Section id="art" title={t.art.title} text={t.art.text} />

            <div className="h-px bg-black/5 mx-24" />

            <Section id="tea" title={t.tea.title} text={t.tea.text} />

            {/* About Section */}
            <section id="about" className="min-h-screen bg-[#1a1a1a] text-white flex flex-col justify-center px-6 md:px-24 py-24">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5 }}
                className="max-w-4xl"
              >
                <h2 className="text-sm tracking-[0.5em] uppercase opacity-40 mb-12">About Bulhanza</h2>
                <p className="text-2xl md:text-4xl font-serif leading-relaxed tracking-wide opacity-80">
                  {t.about.text}
                </p>
              </motion.div>
            </section>
          </motion.div>
        ) : page === 'philosophy' ? (
          <PhilosophyPage key="philosophy" t={t} setPage={setPage} />
        ) : page === 'tea' ? (
          <TeaDetailPage key="tea" t={t} setPage={setPage} />
        ) : page === 'archive' ? (
          <ArchivePage 
            key="archive" 
            t={t} 
            setPage={setPage} 
            archiveItems={archiveItems} 
            selectedArchiveItem={selectedArchiveItem} 
            setSelectedArchiveItem={setSelectedArchiveItem} 
            onEdit={(item) => {
              setAdminEditingItem(item);
              setPage('admin');
            }}
          />
        ) : page === 'admin' ? (
          <AdminDashboard 
            key="admin" 
            archiveItems={archiveItems} 
            setArchiveItems={setArchiveItems} 
            initialEditingItem={adminEditingItem}
            onClearEdit={() => setAdminEditingItem(null)}
          />
        ) : (
          <ContactPage key="contact" t={t} setPage={setPage} />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-[#fdfdfd] py-32 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <p className="text-xl md:text-2xl font-serif tracking-widest mb-16 italic opacity-70">
            "{t.footer}"
          </p>
          <div className="w-12 h-px bg-black/20 mx-auto mb-12" />
          <button 
            onClick={() => setPage('admin')}
            className="text-[10px] tracking-[0.5em] opacity-60 hover:opacity-100 transition-opacity uppercase mb-8 block mx-auto font-bold border border-black/10 px-4 py-2 rounded"
          >
            Go to Dashboard
          </button>
          <p className="text-xs tracking-[0.3em] opacity-30 uppercase">
            &copy; {new Date().getFullYear()} Bulhanza. All Rights Reserved.
          </p>
        </motion.div>
      </footer>
    </div>
  );
}

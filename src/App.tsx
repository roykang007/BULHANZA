import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Globe, ChevronDown } from 'lucide-react';

type Language = 'KR' | 'TC' | 'EN';
type Page = 'home' | 'tea' | 'archive' | 'contact' | 'philosophy';

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

export default function App() {
  const [lang, setLang] = useState<Language>('KR');
  const [page, setPage] = useState<Page>('home');
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
  }, [page]);

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

  const PhilosophyPage = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-[#fdfdfd]"
    >
      {/* Hero Section */}
      <header className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/mountains.jpg" 
            alt="Philosophy Hero"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover grayscale opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#fdfdfd]" />
        </div>
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
        {t.philosophyDetail.sections.map((section, i) => (
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

  const TeaDetailPage = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-[#fdfdfd]"
    >
      {/* Hero Section */}
      <header className="relative h-[80vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/bulhansuncha.jpg" 
            alt="Bulhan Immortal Tea"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover grayscale opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#fdfdfd]" />
        </div>
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
            src="/assets/bulhansuncha.jpg" 
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

  const ArchivePage = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-32 px-6 md:px-24 bg-[#fdfdfd]"
    >
      <h2 className="text-4xl md:text-6xl font-serif mb-24 tracking-[0.2em] text-center">{t.archive.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto pb-32">
        {[
          { title: t.archive.poetry, img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800" },
          { title: t.archive.calligraphy, img: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=800" },
          { title: t.archive.painting, img: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=800" },
          { title: t.archive.carving, img: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=800" }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative aspect-[4/3] overflow-hidden bg-gray-100"
          >
            <img 
              src={item.img} 
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500 flex items-center justify-center">
              <h3 className="text-white text-3xl md:text-4xl font-serif tracking-[0.3em] drop-shadow-lg">{item.title}</h3>
            </div>
          </motion.div>
        ))}
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

  const ContactPage = () => (
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
              {/* Oriental Watercolor Background */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img 
                  src="/assets/mountains.jpg" 
                  alt="Oriental Mountains"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover grayscale transition-all duration-1000 ease-in-out group-hover/hero:grayscale-0 group-hover/hero:scale-105 opacity-60 group-hover/hero:opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#fdfdfd]/40 via-transparent to-[#fdfdfd]" />
              </div>

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

            <Section id="tea" title={t.tea.title} text={t.tea.text} bgImage="/assets/bulhansuncha.jpg" />

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
          <PhilosophyPage key="philosophy" />
        ) : page === 'tea' ? (
          <TeaDetailPage key="tea" />
        ) : page === 'archive' ? (
          <ArchivePage key="archive" />
        ) : (
          <ContactPage key="contact" />
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
          <p className="text-xs tracking-[0.3em] opacity-30 uppercase">
            &copy; {new Date().getFullYear()} Bulhanza. All Rights Reserved.
          </p>
        </motion.div>
      </footer>
    </div>
  );
}

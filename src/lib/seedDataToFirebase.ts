import { ArchiveItem, Artist } from '../types';

export const DEFAULT_TEA_POEMS: Omit<ArchiveItem, 'id'>[] = [
  {
    title: "선학의 잔 (The Cup of Zen)",
    summary: "뜨거운 서천의 물에 우러나는 선사들의 지혜와 비움.",
    content: "### 선학의 잔\n\n한 잎의 차는 푸른 산의 호흡이요,\n한 모금의 물은 깊은 골의 이슬이라.\n\n뜨거운 다기에 마음을 담글 때,\n세상의 일렁이던 욕심은 이내 흩어지고\n고요한 선(禪)의 바다만이 눈앞에 펼쳐진다.\n\n비우고 또 비워내니,\n마침내 내 작은 가슴이 온 우주를 품는다.",
    image_url: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200",
    category: "tea",
    language: "KR"
  },
  {
    title: "禅境之杯 (Cup of Zen Consciousness)",
    summary: "在温度与露水的交融中体会佛汉禅意。",
    content: "### 禅境之杯\n\n一叶绿茶，蕴含着翠谷的呼吸，\n一滴清泉，凝结着山涧的朝露。\n\n当沸水注入质朴的紫砂，\n凡尘的喧嚣在淡淡清香中悄然融化。\n\n虚空其心，方能纳大千世界。\n在这一冷一热的浸润里，\n我们终与真实的智慧邂逅。",
    image_url: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200",
    category: "tea",
    language: "SC"
  },
  {
    title: "Cup of Serenity",
    summary: "Steeping the cosmic wisdom of the ancient tea masters.",
    content: "### Cup of Serenity\n\nA leaf of tea holds the breathing of green misty hills,\nA drop of water is the wild dew of deep rocky canyons.\n\nAs we pour hot spring water into the clay bowl,\nAll earthly concerns vanish into the rising vapor.\n\nEmptiness is not holding nothing;\nIt is the capacity to hold the entire universe\nIn a single, quiet sip.",
    image_url: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200",
    category: "tea",
    language: "EN"
  }
];

export const DEFAULT_PHILOSOPHY_ITEMS: Omit<ArchiveItem, 'id'>[] = [
  {
    title: "심물(心物)의 끝없는 감응",
    summary: "마음과 물질이 상호 교섭하며 일으키는 존재의 흔적.",
    content: "### 심물의 무한 감응\n\n보이는 사물은 보이지 않는 마음의 그림자요,\n보이지 않는 마음은 사물이라는 형태를 빌어 스스로를 노래한다.\n\n화폭 위의 검은 먹선은 작가의 단순한 움직임이 아니라,\n그가 조율한 대자연의 떨림이자 심물지파(心物之波)의 시각화이다.\n\n우리는 형상에 지치고 집착하는 눈을 감고,\n만물 배후에 유유히 흐르는 보이지 않는 파동의 소리에 귀 기울인다.",
    image_url: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy",
    language: "KR"
  },
  {
    title: "心物理念的无限感应",
    summary: "当心与外部物质在时空中相遇产生的无形波动。",
    content: "### 心物无边之感\n\n有形之物无非是无形之心的倒影，\n无形之心借由物质的经络高唱生命的赞歌。\n\n宣纸上的水墨绝非空洞的修饰，\n而是艺术家生命元气与天地同频震荡后凝结的乐谱。\n\n拂拭尘埃，闭目凝神，\n在无声的宇宙波场中，寻找原本属于你的清明。",
    image_url: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy",
    language: "SC"
  },
  {
    title: "Continuous Harmony of Consciousness",
    summary: "How mind and physical elements interact in the field of beauty.",
    content: "### Mind-Matter Intertwining\n\nThe visible object is but a silhouette of the invisible mind,\nThe invisible mind sings its path through the textures of reality.\n\nThe ink line is not a rigid physical boundary,\nIt is a captured pulse of eternity vibrating through human fingers.\n\nClose the eyes that seek only vanity,\nAnd hear the primordial hum that runs deep within all physical creations.",
    image_url: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy",
    language: "EN"
  }
];

export const DEFAULT_JOURNEY_PHOTOS: Omit<ArchiveItem, 'id'>[] = [
  {
    title: "국제 선학 세미나 가야금 연주 (International Zen Performance)",
    summary: "심물철학과 선예술의 일치를 보여주는 가야금 연주 발표회.",
    content: "라석 원장은 아시아 평화 예술제 오프닝 연주에서 가야금 산조의 영적인 울림과 물파공간의 이론적 접점을 선보이며 세간의 깊은 주목을 받았습니다.\n\n현을 통해 전방위로 퍼져나가는 진동은 공간의 비어있음을 성숙함으로 가득 채웠습니다.",
    image_url: "https://images.unsplash.com/photo-1490127252417-7c393f993ee4?auto=format&fit=crop&q=80&w=1200",
    category: "journey",
    language: "KR"
  },
  {
    title: "国际禅学学术研讨会 伽倻琴演奏",
    summary: "展现心物哲学与禅宗美学一体性的现场音乐会。",
    content: "罗石院长在和平艺术周盛典上，以其精湛的伽倻琴古乐展现了宇宙元气与墨色震荡的契合。听众在沉浸于其空灵之音的同时，更能感知到超越物质阻隔的精神穿透力。",
    image_url: "https://images.unsplash.com/photo-1490127252417-7c393f993ee4?auto=format&fit=crop&q=80&w=1200",
    category: "journey",
    language: "SC"
  },
  {
    title: "Ancient Zithern Concert for Peace & Oneness",
    summary: "Spiritual sounds of Gayageum connecting human consciousness to nature.",
    content: "Poet and musician Lasok performed an emotional, atmospheric solo on the Gayageum string instrument during the annual Eastern Meditation Symposium. This performance illuminated the close synergy between sonic vibration and calligraphic flow.",
    image_url: "https://images.unsplash.com/photo-1490127252417-7c393f993ee4?auto=format&fit=crop&q=80&w=1200",
    category: "journey",
    language: "EN"
  }
];

export const DEFAULT_JOURNEY_PRESS: Omit<ArchiveItem, 'id'>[] = [
  {
    title: "[학술포럼] 21세기 도덕문명과 동양 직관철학의 부활",
    summary: "물파 공간과 심물철학 연구소, 한-중 학술 교류 대회 개최 발표.",
    content: "기성 물질주의 한계를 극복하고 인간 본연의 주체성을 살려내기 위해 대안으로 동양의 심물철학을 제시한 학술 논총이 전 세계 연구자들의 높은 공감을 샀습니다.",
    image_url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=1200",
    category: "journey",
    language: "KR"
  },
  {
    title: "[学术专栏] 21世纪道德文明与东方直觉哲学的复兴",
    summary: "物波美学研究所发表学术白皮书，引起东亚美学界热烈反响。",
    content: "为了应对信息泛滥和快节奏消费带来的心灵枯竭，东亚学者齐聚论坛，共同探讨水墨、禅茶以及艺术活动如何重塑大众精神，并推崇罗石的心物和谐假说作为前沿视角。",
    image_url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=1200",
    category: "journey",
    language: "SC"
  },
  {
    title: "[Symposium] Resurrection of Metaphysical Aesthetics in Contemporary Art",
    summary: "Annual Oriental Philosophy Conference profiles Lasok's critical works.",
    content: "Leading art historians debated the revival of calligraphic line art as a meditative vehicle. The unique concept 'Mind-Matter waves' was celebrated as a cornerstone to heal contemporary anxiety.",
    image_url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=1200",
    category: "journey",
    language: "EN"
  }
];

export const DEFAULT_MULPA_WRITINGS: Omit<ArchiveItem, 'id'>[] = [
  {
    title: "물파지파(物波之波)와 정신의 울림",
    summary: "사물과 마음이 하나가 될 때 일어나는 참된 기운의 파동에 대한 고찰.",
    content: "물파(物波)는 굳어있는 고정된 존재나 물질이 아닙니다. 그것은 끊임없이 움직이고 변화하는 미세한 진동이자 흐름입니다.\n\n우리 마음의 주파수가 사물의 참모습에 닿을 때, 보이지 않는 영적인 울림이 붓끝을 통해 흘러나와 서화와 다도가 됩니다. 이것이 곧 21세기 새로운 정신문명을 여는 물파주의의 근본입니다.",
    image_url: "/images/README.txt", // Using placeholder /images path
    category: "mulpa",
    language: "KR"
  },
  {
    title: "物波之波与精神之振幅",
    summary: "探讨物与心合一时，所产生的元气波澜及其对现代艺术的启迪。",
    content: "物波非固态之死物，乃是常动不居之微观振荡。\n\n当吾人内心之频率，深契万物原本之真态，将有不可思议之妙元，穿流于指腹、笔锋。此即物波空间创生之哲理核心。",
    image_url: "/images/README.txt",
    category: "mulpa",
    language: "SC"
  },
  {
    title: "Resonance of Mind-Matter Waves (物波之波)",
    summary: "An exploration into the vibrant flow created when mind and objects coalesce into one.",
    content: "Mulpa (物波) is not a static material object. It is an active vibration, a fine frequency that flows infinitely.\n\nWhen our consciousness aligns with the true frequency of nature, a sacred pulse is channeled through the brush, manifesting as genuine art and mindful tea paths.",
    image_url: "/images/README.txt",
    category: "mulpa",
    language: "EN"
  }
];

export const DEFAULT_ARTISTS: Omit<Artist, 'id'>[] = [
  {
    name: "라석 (羅石)",
    title: "물파주의 창시자 및 서화예술가",
    bio: "라석 선사는 동양 고유의 직관적 물아일체 사상인 심물합일론(心물合一論)을 바탕으로 물파예술을 개창하고, 가야금의 선율과 수묵의 파동을 조화롭게 일치시켜온 구도적 예술가입니다.",
    image: "/images/README.txt",
    language: "KR",
    works: [
      {
        title: "심물지파 (心物之波)",
        image: "/images/README.txt",
        size: "70x120cm",
        introduction: "마음의 미세한 흐름을 먹의 결로 구현한 대표 서화작품.",
        criticism: "대자연의 에너지가 여백 속에서 힘찬 서체로 요동치는 걸작."
      },
      {
        title: "선다삼매 (禪茶三昧)",
        image: "/images/README.txt",
        size: "60x60cm",
        introduction: "찻잔에 피어오르는 김과 온기를 먹색의 번짐으로 그린 작품.",
        criticism: "따뜻한 먹선과 고요한 공명이 깊은 편안함을 줍니다."
      }
    ]
  },
  {
    name: "罗石 (Lasok)",
    title: "物波主义创始人 & 书画大师",
    bio: "罗石禅师以东方古籍中的直观“心物合一论”为宗理，开创物波造型艺术。他使伽倻琴之金石音同水墨流淌之波共振，是一位知行合一的悟道艺术行者。",
    image: "/images/README.txt",
    language: "SC",
    works: [
      {
        title: "心物之波",
        image: "/images/README.txt",
        size: "70x120cm",
        introduction: "将精神念波寄托于润墨走笔细节中的书画力作。",
        criticism: "留白之间浩气充盈，堪称东方新灵性之笔墨杰作。"
      }
    ]
  },
  {
    name: "Lasok (Poet & Musician)",
    title: "Founder of Mulpaism & Zen Calligrapher",
    bio: "Lasok pioneered the Mulpa aesthetics movement, merging the vibrant voice of the Gayageum zithern with deep, meditative ink-line paintings.",
    image: "/images/README.txt",
    language: "EN",
    works: [
      {
        title: "Mind-Matter Ripple",
        image: "/images/README.txt",
        size: "70x120cm",
        introduction: "A representation of mental frequency flowing through traditional black ink strokes.",
        criticism: "A beautiful exploration of active silence and sublime dynamic currents."
      }
    ]
  }
];

export const DEFAULT_PHILOSOPHY_LECTURES: Omit<ArchiveItem, 'id'>[] = [
  {
    title: "제1장. 만남의 파동 (心物之波)",
    summary: "예술은 단순한 시각적 재현이나 인위적인 기교가 아닙니다. 마음이 사물을 비추고, 사물의 깊은 울림이 마음에 와닿을 때 생겨나는 살아있는 대화입니다.",
    content: "### 제1장. 만남의 파동 (心物之波)\n\n예술은 단순한 시각적 재현이나 인위적인 기교가 아닙니다. 마음이 사물을 비추고, 사물의 깊은 울림이 마음에 와닿을 때 생겨나는 살아있는 대화입니다. 붓질 하나, 찻잎 한 장도 대자연과 영적 우주가 나누는 고요한 호흡의 기록입니다.",
    image_url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy_lecture",
    language: "KR"
  },
  {
    title: "제2장. 유무쌍즉 (有無雙則)",
    summary: "비어 있는 화폭, 보이지 않는 향기는 '없음(無)'이 아니라 수많은 가능성의 요람입니다. 유(有)와 무(無)의 조화로운 상호 순환에 대한 탐구.",
    content: "### 제2장. 유무쌍즉 (有無雙則)\n\n비어 있는 화폭, 보이지 않는 향기는 '없음(無)'이 아니라 다가올 수많은 가능성의 요람입니다. 먹빛과 형상이라는 '있음(有)'을 통해 발현된 세계는, 다시 당신의 마음속에서 보이지 않는 깊은 감동과 여운이라는 '무'의 상태로 끊임없이 순환합니다.",
    image_url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy_lecture",
    language: "KR"
  },
  {
    title: "제3장. 정신의 거울과 자연 (心鏡)",
    summary: "우리 마음에 티없이 맑은 거울(心鏡)이 있을 때 비로소 자연의 밝은 기운이 온전히 비쳐듭니다. 현대사회를 치유하는 물파주의의 수행 예술.",
    content: "### 제3장. 정신의 거울과 자연 (心鏡)\n\n우리 마음에 티없이 맑은 거울(心鏡)이 있을 때 비로소 자연의 밝은 기운이 온전히 비쳐듭니다. 물파주의는 마음의 거울을 맑게 닦고, 흐트러진 현대사회의 속도를 늦춰 우주 근원에 어린 평온한 주파수를 응축해 내는 수행적 예술입니다.",
    image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy_lecture",
    language: "KR"
  },
  {
    title: "第一章. 邂逅的波动 (心物之波)",
    summary: "艺术不仅是简单的视觉再现或人为技巧。当心灵映照事物，事物的深沉共鸣触动心灵，就诞生了鲜活的对话。",
    content: "### 第一章. 邂逅的波动 (心物之波)\n\n艺术不仅是简单的视觉再现或人为技巧。当心灵映照事物，事物的深沉共鸣触动心灵，就诞生了鲜活的对话。一笔一划、一片茶叶，皆是大自然与精神宇宙静默呼吸的结晶。",
    image_url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy_lecture",
    language: "SC"
  },
  {
    title: "第二章. 有无双即 (有無雙則)",
    summary: "空旷的画布、看不见的香气，不是“无”，而是孕育无限可能的摇篮。通过“有”（墨色与形状）展现的世界，又在内心化为感动的循环。",
    content: "### 第二章. 有无双即 (有無雙則)\n\n空旷的画布、看不见的香气，不是“无”，而是孕育无限可能的摇篮。通过“有”（墨色与形状）展现的世界，又在您的内心化为无形无迹的感动与余温，不断循环。",
    image_url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy_lecture",
    language: "SC"
  },
  {
    title: "第三章. 精神之镜与自然 (心镜)",
    summary: "唯有当我们的内心拥有无暇的明镜（心镜）时，大自然的清明气韵才能完整地照进心灵。拂拭心镜、放慢喧嚣步伐的修行艺术。",
    content: "### 第三章. 精神之镜与自然 (心镜)\n\n唯有当我们的内心拥有无暇的明镜（心镜）时，大自然的清明气韵才能完整地照进心灵。物波主义是拂拭心镜、放慢现代社会喧嚣步伐、浓缩宇宙本源宁静频率的修行艺术。",
    image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy_lecture",
    language: "SC"
  },
  {
    title: "Chapter I. The Cosmic Resonance (心物之波)",
    summary: "Art is never a mere visual reproduction or technical design. It is a dialogue awakened when the mind reflects nature, and nature vibrates through the soul.",
    content: "### Chapter I. The Cosmic Resonance (心物之波)\n\nArt is never a mere visual reproduction or technical design. It is a dialogue awakened when the mind reflects nature, and nature vibrates through the soul. Every brush stroke is a trace of the universe breathing.",
    image_url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy_lecture",
    language: "EN"
  },
  {
    title: "Chapter II. Dual Oneness (有無雙則)",
    summary: "The empty canvas and formless scent are not blank spaces; they are cradles of absolute potential. Exploring the circular harmony between form and void.",
    content: "### Chapter II. Dual Oneness (有無雙則)\n\nThe empty canvas and formless scent are not blank spaces; they are cradles of absolute potential. The manifested world through shape and ink returns to formlessness inside your mind as a lasting resonance.",
    image_url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy_lecture",
    language: "EN"
  },
  {
    title: "Chapter III. The Mind Mirror (心鏡)",
    summary: "When our inner mind mirror remains transparently quiet, the clear energy of the universe reflects neatly. Polishing this inner mirror to condense peaceful rhythms.",
    content: "### Chapter III. The Mind Mirror (心鏡)\n\nWhen our inner mind mirror remains transparently quiet, the clear energy of the universe reflects neatly. Mulpaism is a practice of polishing this inner mirror, slowing down modern complexity to condense peaceful rhythms.",
    image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1200",
    category: "philosophy_lecture",
    language: "EN"
  }
];



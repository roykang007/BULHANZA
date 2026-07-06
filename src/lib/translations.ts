import { Language } from '../types';

export interface Content {
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  philosophy: {
    title: string;
    subtitle: string;
    text: string;
    chapters: { title: string; content: string }[];
  };
  art: {
    title: string;
    subtitle: string;
    intro: string;
    tabs: {
      intro: string;
      mulpaism: string;
      artists: string;
    };
    principles: { title: string; subtitle: string; description: string }[];
    whyTitle: string;
    whyContent: string;
    mulpaismTitle: string;
    mulpaismDeclaration: string;
  };
  poetryCollection: {
    title: string;
    subtitle: string;
    listTitle: string;
    allCollections: string[];
    emptyNotice: string;
    viewPoem: string;
    backToList: string;
  };
  tea: {
    title: string;
    subtitle: string;
    storyTitle: string;
    storyContent: string;
    scentNotes: string;
    scentDescription: string;
    brewingTitle: string;
    brewingSteps: string[];
    poemsTitle: string;
  };
  journey: {
    title: string;
    subtitle: string;
    photosSection: string;
    pressSection: string;
    emptyPhotos: string;
    emptyPress: string;
  };
  contact: {
    title: string;
    subtitle: string;
    collaboration: string;
    name: string;
    email: string;
    message: string;
    send: string;
    sending: string;
    success: string;
  };
  admin: {
    title: string;
    subtitle: string;
    passLogin: string;
    googleLogin: string;
    signOut: string;
    dashboard: string;
    poetryTab: string;
    journeyTab: string;
    settingsTab: string;
    restoreTab: string;
    totalPoems: string;
    totalJourney: string;
    activeSync: string;
    offlineMode: string;
  };
  nav: {
    home: string;
    philosophy: string;
    art: string;
    poetryCollection: string;
    tea: string;
    journey: string;
    contact: string;
    admin: string;
  };
}

export const translations: Record<Language, Content> = {
  KR: {
    hero: {
      title: "심물지철(心物之哲)\n여영사진(如映寫眞)",
      subtitle: "불한자(弗寒子)는 심물철학을 기반으로 한 사유와 예술의 장입니다.\n마음과 사물은 둘이 아니라 하나의 파동이며,\n그 파동은 글과 그림, 그리고 차로 드러납니다.\n이곳은 철학이 머물고, 예술이 숨 쉬며,\n차가 그것을 완성하는 공간입니다.",
      cta: "물파의 세계 탐색"
    },
    philosophy: {
      title: "심물철학",
      subtitle: "心物哲學 — 비침과 스며듦의 사유",
      text: "심물(心物)은 둘이 아닙니다. 물질과 정신은 동시적 존재의 다른 국면이며, 세상은 이 둘의 끝없는 감응과 파동 속에서 아름다움을 피워냅니다. 마음에 일렁이는 기운은 붓을 지나 형상으로 스미고, 찻잔의 온기로 돌아와 당신에게 전해집니다.",
      chapters: [
        {
          title: "제1장. 만남의 파동 (心物之波)",
          content: "예술은 단순한 시각적 재현이나 인위적인 기교가 아닙니다. 마음이 사물을 비추고, 사물의 깊은 울림이 마음에 와닿을 때 생겨나는 살아있는 대화입니다. 붓질 하나, 찻잎 한 장도 대자연과 영적 우주가 나누는 고요한 호흡의 기록입니다."
        },
        {
          title: "제2장. 유무쌍즉 (有無雙則)",
          content: "비어 있는 화폭, 보이지 않는 향기는 '없음(無)'이 아니라 다가올 수많은 가능성의 요람입니다. 먹빛과 형상이라는 '있음(有)'을 통해 발현된 세계는, 다시 당신의 마음속에서 보이지 않는 깊은 감동과 여운이라는 '무'의 상태로 끊임없이 순환합니다."
        },
        {
          title: "제3장. 정신의 거울과 자연 (心鏡)",
          content: "우리 마음에 티없이 맑은 거울(心鏡)이 있을 때 비로소 자연의 밝은 기운이 온전히 비쳐듭니다. 물파주의는 마음의 거울을 맑게 닦고, 흐트러진 현대사회의 속도를 늦춰 우주 근원에 어린 평온한 주파수를 응축해 내는 수행적 예술입니다."
        }
      ]
    },
    art: {
      title: "물파공간",
      subtitle: "物波空間 — 21세기 새로운 조형과 영성",
      intro: "물파공간은 인위적으로 다듬은 기교와 장식을 내려놓고, 우주의 흐름 본연에 깃든 에너지를 투영하는 '동기일심(同氣一心)'의 새로운 예술적 선언입니다.",
      tabs: {
        intro: "소개 & 사유",
        mulpaism: "물파주의 선언",
        artists: "대표 작가관"
      },
      principles: [
        {
          title: "01. 심물지파 (心物之波)",
          subtitle: "물체가 아니라 역동적인 파동",
          description: "물질 속에 갇힌 존재는 사실 미세한 진동의 응축형입니다. 예술가는 굳어버린 물상 뒤편에 잠자는 영적 기운의 결을 깨우는 파동의 매개자입니다."
        },
        {
          title: "02. 기운생동 (氣韻生動)",
          subtitle: "붓끝으로 흐르는 영혼의 파장",
          description: "서화작품은 구도를 맞추어 그리는 것이 아니라, 호흡의 압축과 기운의 유려한 흐름이 화폭에 맺히는 자연 현상과 닮아 있어야 합니다."
        },
        {
          title: "03. 여백과 공명 (共鳴)",
          subtitle: "채우지 않음으로써 울리는 우주",
          description: "화면의 빈 공간은 빈틈이 아니라 감상자의 영혼이 노닐며 자신의 마음 빛을 투사할 수 있게 열린 숭고한 침묵의 공간입니다."
        }
      ],
      whyTitle: "왜 물파공간인가?",
      whyContent: "디지털 정보의 과잉과 인공지능이 이미지를 자동 생성하는 초속도의 시대에, 인간은 오히려 영성의 빈곤을 겪습니다. 물파공간은 자극적인 순간의 소비를 넘어, 마음의 속도를 자연의 파장에 맞추고 존재 본연의 깊이와 침묵의 거룩함을 되찾게 돕는 영혼적 구심점입니다.",
      mulpaismTitle: "물파주의(物波主義) 선언문",
      mulpaismDeclaration: "20세기는 물질문명의 찬란한 번영에 가려 인류 본연의 도덕성과 정신적 깊이가 쇠퇴한 혼돈과 방황의 시대였습니다. 가치관이 전도되고 기성 종교가 빛을 잃어버리는 소용돌이 속에서, 우리는 동양 고유의 직관적 물아일체 사상인 심물합일론(心物合一論)을 바탕으로 한 새로운 조형예술의 길을 열고자 합니다.\n\n물파(物波)란 참된 심물의 파동(心物之波)입니다. 그것은 기계론적 서구 분석학의 유물적 파동이나, 단편적인 유심론의 신비에 치우치지 않는 예술적 실천입니다. 마음은 즉 기운이며, 붓끝과 형상에 실려 나오는 가야금의 선율이나 먹의 결은 우주적 새 기운(新氣運)과 감상자의 마음거울이 만나 일으키는 거룩한 신기파( deificar wave)의 만남입니다.\n\n이에 우리는 우주 본질의 진동을 깨우며 21세기 인류의 영적 변용과 존재 회복을 향한 예술적 비전으로서 물파주의를 선언합니다.\n\n— 물파공간 창립선언에서 발췌, 1997."
    },
    poetryCollection: {
      title: "라석시집",
      subtitle: "羅石詩集 — 라석 시원(詩苑)",
      listTitle: "시집 및 시원 목록",
      allCollections: ["1. 천자문시집", "2. 합작시집", "3. 심물철학시집", "4. 시전집", "5. 심물시집", "6. 기타 시집"],
      emptyNotice: "선택한 시집에 아카이브된 시 데이터가 없습니다. 관리자 대시보드에서 원본 데이터를 주입해 주세요.",
      viewPoem: "시 읽기",
      backToList: "목록으로 돌아가기"
    },
    tea: {
      title: "서화차향",
      subtitle: "書畵茶香 — SunCha",
      storyTitle: "글씨와 그림, 그리고 한 잔의 차에 담긴 풍류",
      storyContent: "시대를 사유하는 서화의 필치와 가슴을 따뜻하게 적시는 차 연재물이 머무는, 이 시대 철학가의 문방(文房)입니다.",
      scentNotes: "비움의 향 (Scent of Emptiness)",
      scentDescription: "흙에서 얻은 고요한 깊은 우디 노트, 찻잔에 서린 따뜻하고 아련한 야생 가을 안개의 은은함.",
      brewingTitle: "불한선차를 우리는 다법(茶法)",
      brewingSteps: [
        "90℃ 내외의 맑고 가벼운 첫 물로 다기를 조용히 데워 찻잔의 마음을 엽니다.",
        "보이차까오 한알을 넣고 따뜻한 물을 부어 약 40초간 첫 찻잔의 기운을 서서히 깨웁니다.",
        "목을 넘어가는 찻물의 온도를 온몸으로 느끼며, 자신의 호흡 소리에 귀를 기울이고 비움을 감상합니다."
      ],
      poemsTitle: "차가 선사하는 시적 상상"
    },
    journey: {
      title: "활동여정",
      subtitle: "라석 여정기록 (Poet Lasok Journey Archive)",
      photosSection: "여정 및 가야금 활동 아카이브",
      pressSection: "언론 보도 및 학술 기록",
      emptyPhotos: "게시된 활동 사진이 비어 있습니다.",
      emptyPress: "기재된 언론 기록이 현재 없습니다."
    },
    contact: {
      title: "연락하기",
      subtitle: "CONTACT & COLLABORATION",
      collaboration: "심물철학과 물파예술, 선차 문화를 나누는 기쁜 교류를 환영합니다.",
      name: "성함 (또는 단체명)",
      email: "이메일 주소",
      message: "남기실 내용",
      send: "메시지 보내기",
      sending: "전송 중...",
      success: "메시지가 성공적으로 전송되었습니다. 검토 후 연락드리겠습니다."
    },
    admin: {
      title: "관리자실",
      subtitle: "System Dashboard Management Panel",
      passLogin: "비밀번호 로그인",
      googleLogin: "Google 관리자 인증",
      signOut: "로그아웃",
      dashboard: "대시보드 홈",
      poetryTab: "시집(시/철학) 관리",
      journeyTab: "여정/언론/사진 관리",
      settingsTab: "글로벌 사이트 설정",
      restoreTab: "시스템 데이터 복원/백업",
      totalPoems: "총 시/철학 기록",
      totalJourney: "미디어 및 여정",
      activeSync: "실시간 Firebase 연동 상태",
      offlineMode: "오프라인 한시적 세션 모드"
    },
    nav: {
      home: "홈",
      philosophy: "심물철학",
      art: "물파공간",
      poetryCollection: "라석시집",
      tea: "서화차향",
      journey: "활동여정",
      contact: "연락처",
      admin: "관리자"
    }
  },
  SC: {
    hero: {
      title: "心物之哲\n如映写真",
      subtitle: "關爲弗寒子\n弗寒子，乃以心物哲學為本之思想與藝術之場。\n心與物，非二而一，其為波動而顯於詩書畫與茶。\n此處，哲思所止，藝術所生,\n而茶，為其完成之境。",
      cta: "探寻物波世界"
    },
    philosophy: {
      title: "心物哲学",
      subtitle: "心物哲学 — 照映与渗透的冥想",
      text: "心物非二。物质与精神是存在的不同面相，世界在两者的不息感应与波动中绽放美感。在心中起伏的能量穿过笔尖渗入形象，最终化为茶杯的温热，传递给您。",
      chapters: [
        {
          title: "第一章. 邂逅的波动 (心物之波)",
          content: "艺术不仅是简单的视觉再现或人为技巧。当心灵映照事物，事物的深沉共鸣触动心灵，就诞生了鲜活的对话。一笔一划、一片茶叶，皆是大自然与精神宇宙静默呼吸的结晶。"
        },
        {
          title: "第二章. 有无双即 (有無雙則)",
          content: "空旷的画布、看不见的香气，不是“无”，而是孕育无限可能的摇篮。通过“有”（墨色与形状）展现的世界，又在您的内心化为无形无迹的感动与余温，不断循环。"
        },
        {
          title: "第三章. 精神之镜与自然 (心镜)",
          content: "唯有当我们的内心拥有无暇的明镜（心镜）时，大自然的清明气韵才能完整地照进心灵。物波主义是拂拭心镜、放慢现代社会喧嚣步伐、浓缩宇宙本源宁静频率的修行艺术。"
        }
      ]
    },
    art: {
      title: "物波空间",
      subtitle: "物波空间 — 21世纪全新造型与心灵升华",
      intro: "物波空间抛弃了浮华的人工修饰，致力于投影宇宙本质流淌的本真力量，是极具东方智觉的艺术宣言。",
      tabs: {
        intro: "引言与思辨",
        mulpaism: "物波主义宣言",
        artists: "代表艺术家馆"
      },
      principles: [
        {
          title: "01. 心物之波",
          subtitle: "宇宙并非静止而是生动的波",
          description: "固化的物质只是微小振动的凝聚。艺术家是波动的中介者，唤醒在表象背后沉睡的灵奇波长。"
        },
        {
          title: "02. 气韵生动",
          subtitle: "笔尖流淌的灵魂波幅",
          description: "书画不是刻意追求构图，而是呼吸的浓缩和生命元气的蓬勃流淌，宛如自然景观的显现。"
        },
        {
          title: "03. 留白共鸣",
          subtitle: "空纳万境的静谧空间",
          description: "画面留白不是虚无，而是观赏者心灵游憩、映射内心真光的高贵沉默空间。"
        }
      ],
      whyTitle: "为何是物波空间？",
      whyContent: "在信息过载和人工智能飞速生成图像的时代，人类经历着精神深处的干涸。物波空间让心灵契合自然的频率，在静止中聆听永恒，重获存在的静洁深度。",
      mulpaismTitle: "物波主义（Mulpaism）宣言",
      mulpaismDeclaration: "20世纪虽然物质繁盛，人类本真的道德与精神文明却陷入衰微。在世界急剧变化与旧秩序重组的浪潮中，我们秉承东方直觉的“心物合一”智慧，开辟全新的造型艺术道路。\n\n物波即是心物交融所生的伟大波澜。它既不是西方机械剖析主义下的唯物波，也不偏执于狭隘精神论的神秘化，它是一场切实的艺术实践。心灵即是元气，笔墨勾勒、琴瑟和谐，皆是这宇宙原初之能与人类心镜碰撞出的神圣涟漪。\n\n我们据此宣告物波主义的创生，为21世纪引渡精神的蜕变与自我价值的返璞归真。\n\n— 摘自“物波空间”创立宣言，1997。"
    },
    poetryCollection: {
      title: "罗石诗集",
      subtitle: "罗石诗集 — 罗石诗苑",
      listTitle: "诗集与诗歌列表",
      allCollections: ["1. 千字文诗集", "2. 合作诗集", "3. 心物哲学诗集", "4. 诗全集", "5. 心物诗集", "6. 其他诗集"],
      emptyNotice: "所选诗集中尚无归档诗歌。请在管理员控制台注入初始数据。",
      viewPoem: "阅览诗文",
      backToList: "回到列表"
    },
    tea: {
      title: "書畵茶香",
      subtitle: "書畵茶香 — SunCha",
      storyTitle: "书画以及一盏茶中蕴含的风雅",
      storyContent: "这里是静思时代的书画笔触与温润心田的茶香连载交相辉映的、属于当代哲学家的书房（文房）。",
      scentNotes: "无形之香 (Scent of Emptiness)",
      scentDescription: "源自泥土深处的静谧木香，与茶盏泛出宛如秋烟霭霭般缠绕野性微甘。",
      brewingTitle: "布寒仙茶（Bulhan Suncha）冲泡法",
      brewingSteps: [
        "以九十度山泉沸水，暖淋茶具，打开器皿的纳香之境。",
        "投入普洱茶膏一粒，温水冲泡，静候四十秒，渐次呼唤杯中的温煦气韵。",
        "徐徐入喉，凝神觉察水温之流变，闭目聆听呼吸深处，体会万虑皆空的虚静。"
      ],
      poemsTitle: "茶中的诗意万物"
    },
    journey: {
      title: "行旅足迹",
      subtitle: "罗石行旅实录 (Poet Lasok Journey Archive)",
      photosSection: "行旅、伽倻琴演奏与学术影像档案",
      pressSection: "新闻报道及学术文献辑录",
      emptyPhotos: "暂未发布活动影像。",
      emptyPress: "目前无媒体报道资料。"
    },
    contact: {
      title: "联络合作",
      subtitle: "CONTACT & COLLABORATION",
      collaboration: "竭诚欢迎就心物哲学、物波艺术、禅茶文化进行各种富有深度的学术与艺术交流。",
      name: "您的姓名 / 机构名称",
      email: "电子邮箱",
      message: "留言正文",
      send: "提交留言",
      sending: "正在发送...",
      success: "留言已妥当发送。我们会尽快回复您，感谢关注。"
    },
    admin: {
      title: "管理台",
      subtitle: "System Dashboard Management Panel",
      passLogin: "密码登录",
      googleLogin: "Google 权限认证",
      signOut: "安全注销",
      dashboard: "看板主页",
      poetryTab: "诗集/哲学 管理",
      journeyTab: "媒体/履历/影像 管理",
      settingsTab: "全局网站参数配置",
      restoreTab: "初始数据安全恢复/备份",
      totalPoems: "收录诗词/篇目",
      totalJourney: "旅程/资历总量",
      activeSync: "实时 Firebase 云数据库握手通畅",
      offlineMode: "离线本地临时缓存模式"
    },
    nav: {
      home: "主页",
      philosophy: "心物哲学",
      art: "物波空间",
      poetryCollection: "罗石诗集",
      tea: "書畵茶香",
      journey: "行旅足迹",
      contact: "联络",
      admin: "管理"
    }
  },
  EN: {
    hero: {
      title: "Philosophy of\nMind & Matter",
      subtitle: "About Bulhanza :\nBulhanza is a space of philosophy and art grounded in the philosophy of Mind and Matter.\nMind and matter are not separate—they move as one wave,\nexpressed through writing, art, and tea.\nHere, philosophy dwells, art breathes,\nand tea completes the experience.",
      cta: "Explore the Mulpa Universe"
    },
    philosophy: {
      title: "Philosophy",
      subtitle: "Mind-Matter Unity — The Space of Reflections",
      text: "Mind and Matter are not dual. Physical substance and consciousness are two aspects of simultaneous existence, blooming into beauty through infinite resonances. The vibrant waves of our mind travel through the brush onto canvas, returning to you as the warmth of the tea cup.",
      chapters: [
        {
          title: "Chapter I. The Cosmic Resonance (心物之波)",
          content: "Art is never a mere visual reproduction or technical design. It is a dialogue awakened when the mind reflects nature, and nature vibrates through the soul. Every brush stroke is a trace of the universe breathing."
        },
        {
          title: "Chapter II. Dual Oneness (有無雙則)",
          content: "The empty canvas and formless scent are not blank spaces; they are cradles of absolute potential. The manifested world through shape and ink returns to formlessness inside your mind as a lasting resonance."
        },
        {
          title: "Chapter III. The Mind Mirror (心鏡)",
          content: "When our inner mind mirror remains transparently quiet, the clear energy of the universe reflects neatly. Mulpaism is a practice of polishing this inner mirror, slowing down modern complexity to condense peaceful rhythms."
        }
      ]
    },
    art: {
      title: "Mulpa Space",
      subtitle: "Mulpa Space — New Forms and Spirituality for the 21st Century",
      intro: "Mulpa Space dispels artificial decorations to capture the clean energy flow of the cosmos, announcing a major unity of mind, rhythm, and matter.",
      tabs: {
        intro: "Introduction & Essay",
        mulpaism: "Mulpaism Manifesto",
        artists: "Representative Artists"
      },
      principles: [
        {
          title: "01. Mind-Matter Waves (心物之波)",
          subtitle: "Dynamic frequency over rigid physical objects",
          description: "All physical substances are dense packages of microscopic vibration. The artist functions as a tuning fork to awaken spiritual waves behind static shapes."
        },
        {
          title: "02. Giun Saengdong (氣韻生動)",
          subtitle: "Spiritual currents flowing through the brush",
          description: "Visual and calligraphic works are not crafted by formula but by compressing breathing patterns into natural occurrences on paper."
        },
        {
          title: "03. Sublime Negative Space (共鳴)",
          subtitle: "Quietness that speaks infinitely",
          description: "Blank canvas spaces are not holes but avenues of silent sacredness inviting the viewers to cast their own light."
        }
      ],
      whyTitle: "Why Mulpa Space?",
      whyContent: "In an epoch of extreme data saturation where machine-generated visuals flood the daily lives, humanity starves spiritually. Mulpa Space acts as an organic center, inviting humans to match their biological speed back to nature's frequency.",
      mulpaismTitle: "The Mulpaism Manifesto",
      mulpaismDeclaration: "While the 20th century witnessed great material success, human morality and spirituality experienced a silent decay. Amidst value distortions, we seek to discover an elevated aesthetic avenue based on the unification of Subject and Object (心物合一).\n\nMulpa represents the real wave of Mind and Matter (心物之波). It is an artistic action that rejects both mechanistic Western compartmentalization and narrow spiritual mysticism. Mind is energy; the strokes on paper, the sound of the string, and the curves of the bowl are divine ripples emerging when original light hits human consciousness.\n\nWe hereby proclaim Mulpaism as an artistic vision toward spiritual transformation and existence recovery for the 21st century.\n\n— Excerpt from Mulpa Space Inaugural Statement, 1997."
    },
    poetryCollection: {
      title: "Lasok Poetry Collection",
      subtitle: "Lasok Poetry Collections",
      listTitle: "Select a Poetry Collection",
      allCollections: ["1. Cheonjamun Verse Collection", "2. Collaborative Poetry", "3. Mind-Matter Philosophy", "4. Complete Poems of Lasok", "5. Mind-Matter Poetry", "6. Other Poetry Collection"],
      emptyNotice: "No archived data is present under this collection. Please run the seed/restoration action at the Admin page.",
      viewPoem: "Read Poem",
      backToList: "Back to List"
    },
    tea: {
      title: "SunCha",
      subtitle: "書畵茶香 — SunCha",
      storyTitle: "The taste of calligraphic art, paintings, and a cup of elegant tea",
      storyContent: "A serene workspace of a contemporary philosopher, where the powerful brushstrokes of calligraphy reflecting the times and the warming series of Bulhan Suncha reside in perfect harmony.",
      scentNotes: "Scent of Emptiness (無形之香)",
      scentDescription: "Deep earthy woody tone coupled with the warm elegant hint of wild autumn fog hanging in the cup.",
      brewingTitle: "Art of Brewing Bulhan Suncha",
      brewingSteps: [
        "Warm the premium vessels with boiling spring water around 90°C, preparing the ceramic's heart.",
        "Add one piece of Pu'er tea paste (Chagao). Pour hot water and steep for 40 seconds to slowly awaken the cup's energy.",
        "Sip gently with eyes closed, listening only to your breathing, experiencing pure mindfulness."
      ],
      poemsTitle: "Verses Infused with Tea Scent"
    },
    journey: {
      title: "Journey",
      subtitle: "Chronicles of Lasok (Poet Lasok Journey Archive)",
      photosSection: "Journey, Academic & Gayageum Performance Archive",
      pressSection: "Press Coverages & Academic Publications",
      emptyPhotos: "No journey moments uploaded yet.",
      emptyPress: "No press documents currently recorded."
    },
    contact: {
      title: "Contact",
      subtitle: "CONTACT & COLLABORATION",
      collaboration: "We always welcome deep connections regarding Mind-Matter philosophy, Mulpa art, and tea meditate culture.",
      name: "Your Name / Organization",
      email: "Email Address",
      message: "Your Message",
      send: "Send Message",
      sending: "Sending...",
      success: "Your message has been sent successfully. We will be in touch shortly."
    },
    admin: {
      title: "Control Panel",
      subtitle: "System Dashboard Management Panel",
      passLogin: "Passcode Sign In",
      googleLogin: "Google Admin Auth",
      signOut: "Secure Sign Out",
      dashboard: "Dashboard Overview",
      poetryTab: "Poetry & Philosophy Manager",
      journeyTab: "Media & Journey Manager",
      settingsTab: "Global Site Settings",
      restoreTab: "System Restore & Synchronization",
      totalPoems: "Total Verses / Records",
      totalJourney: "Journey & Media Records",
      activeSync: "Active Real-Time Firebase Sync",
      offlineMode: "Temporary Offline Cache Mode"
    },
    nav: {
      home: "Home",
      philosophy: "Philosophy",
      art: "Mulpa Space",
      poetryCollection: "Lasok Poetry Collection",
      tea: "SunCha",
      journey: "Media",
      contact: "Contact",
      admin: "Admin"
    }
  }
};

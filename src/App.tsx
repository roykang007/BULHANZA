import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Globe, ChevronDown, Plus, Trash2, Edit2, ArrowLeft, Newspaper, Image as ImageIcon, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { supabase } from './lib/supabase';
import { SAMPLE_ARCHIVE_ITEMS } from './lib/seedData';

const bulhansunchaImg = 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1920';
const mountainsImg = 'mountains.jpg';
const logoImg = 'logo.png';

type Language = 'KR' | 'TC' | 'EN';
type Page = 'home' | 'tea' | 'archive' | 'contact' | 'philosophy' | 'admin' | 'art';
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

interface SiteSettings {
  id: string;
  logo_url: string;
  hero_bg_url: string;
  tea_detail_url: string;
  tea_slider_images?: string[];
  tea_slider_speed?: number;
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
  artDetail: {
    title: string;
    subtitle: string;
    tabs: {
      intro: string;
      philosophy: string;
      artist: string;
    };
    intro: string;
    principles: {
      title: string;
      subtitle: string;
      description: string;
    }[];
    why: {
      title: string;
      content: string;
    };
    mulpaismTitle: string;
    mulpaismContent: string;
    mulpaismDeclaration: string;
    artistName: string;
    artistTitle: string;
    artistDescription: string;
    artistImage: string;
  };
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
      title: "物波空間",
      text: "예술은 형태가 아니라 파동이다. 그 파동이 마음에 닿을 때 공명이 일어난다. 작품은 만들어지는 것이 아니라 드러나는 것이다."
    },
    artDetail: {
      title: "물파미학(物波美學)이란?",
      subtitle: "21세기의 새로운 예술철학",
      tabs: {
        intro: "소개",
        philosophy: "물파주의",
        artist: "작가"
      },
      intro: "물파미학은 마음(心)과 사물(物)이 분리되어 있지 않다는 '심물철학(心物哲學)'을 바탕으로, 예술을 단순한 대상의 재현이나 내면의 표현이 아니라 '마음과 사물이 만나 일으키는 파동(波)의 응축과 공명'으로 보는 새로운 예술철학입니다.",
      principles: [
        {
          title: "1. 심물지파(心物之波)",
          subtitle: "고정된 물체가 아닌 '살아있는 파동'",
          description: "예술작품은 박제된 대상이 아닙니다. 작가의 마음과 대상(사물)이 만나 일으킨 파동이 재료와 형식을 통해 '응축'된 결과물이며, 이것이 감상자를 만나 다시 움직이는 '사건'입니다."
        },
        {
          title: "2. 유무쌍즉(有無雙則)",
          subtitle: "무형과 유형의 끝없는 순환",
          description: "무형(작가의 마음, 기운, 영감)은 붓, 물감, 언어라는 유형(작품의 형상)을 통해 세상에 드러납니다. 완성된 유형은 감상자를 만나 다시 무형(마음속 깊은 여운과 울림)으로 돌아갑니다."
        },
        {
          title: "3. 공명(共鳴)",
          subtitle: "감동을 넘어선 존재의 변화",
          description: "공명은 3단계로 깊어집니다: 즉각적인 반응인 감동, 곁을 떠나서도 오래 남는 여운, 그리고 마침내 세상을 보는 눈과 삶의 태도까지 바꾸어 놓는 변용(變容)입니다."
        },
        {
          title: "4. 창작과 감상의 재정의",
          subtitle: "심물조형과 조형심물",
          description: "창작은 작가가 재료를 통제하는 기술이 아니라, 마음과 사물이 대화하며 형상을 이루는 과정입니다. 감상은 작품 속에 응축된 파동을 감상자 자신의 마음속에서 다시 살려내는 '창조적 완성'의 사건입니다."
        }
      ],
      why: {
        title: "왜 지금 물파미학이 필요한가?",
        content: "오늘날의 AI와 정보 과잉 시대 속에서 예술은 자극적인 이미지로 빠르게 소비되고 있습니다. 물파미학은 '예술이 왜 인간에게 필요한가'라는 근본적인 질문에 답합니다. 예술은 인간이 세계를 깊이 만나고 자신의 마음을 맑게 비추며 삶의 질서를 조율하는 '존재 방식의 운동'이 되어야 합니다."
      },
      mulpaismTitle: "물파주의(物波主義)의 핵심",
      mulpaismContent: "물파주의는 형상을 넘어선 파동의 미학입니다. 모든 존재는 진동하며, 그 진동이 멈춘 상태가 물질입니다. 예술가는 물질 속에 갇힌 파동을 다시 깨워내는 존재이며, 물파주의는 그 깨어남의 방법론입니다.",
      mulpaismDeclaration: "物波主義 宣言文\n\n20세기는 과학문명의 눈부신 성과에도 불구하고 정신문명은 오히려 衰(쇠)의 길을 걸어왔다고 보는 비판이 없지 않다. 즉 물질문화를 앞세운 나머지 도덕문화가 퇴보하게 되었다는 진단이다. 이 말은 가치관의 顚倒(전도)로 인류사회가 혼돈의 소용돌이 속에 휩쓸려 새 질서를 찾지 못한 채 방황하고 있음을 의미한다.\n\n한편으론 지금 세기말 격동적 변화의 세계를 두고 새로운 패러다임의 도덕문명을 맞이하기 위한 거대한 인류보편적 문명전환기로 파악하고 있기도 하다. 그리고 이러한 개벽적 새 문명의 물결이 物我的 二元論(물아적 이원론)의 서구문명으로부터 파장지우지 않고 그 구심점이 동북아 物我的 合一論(물아적 합일론)의 동북아 儒·佛·仙 三靈(유·불·선 삼령) 정신으로 압축되고 있음은 하나의 원대한 민족적 비전이 아닐 수 없다고 하겠다.\n\n따라서 인류도덕사회를 지향하는 21세기 새로운 문명의 철학적 패러다임은 기성종교의 唯心論(유심론)이나 변증법적 唯物論(유물론)이 아닌 인간 智中心(지중심)의 唯心論이 될 것이다. 그것은 낡은 인식체계인 서양의 분석적·과학적 방법의 지식 중심이 아니라 동양고유의 직관적 對物觀(대물관)이기도 한 인식주체로서의 心(심)과 인식대상인 物(물)과의 合一(합일)된 기운, 즉 同氣一心(동기일심)에 의한 心物論(심물론)적 智覺中心(지각중심)을 뜻한다. 다시 말해 새로운 인식체계의 패러다임인 新氣運(신기운)의 智覺中心과 동서문명을 아우르는 心物論 哲學이야말로 21세기 문명의 핵심적 키워드(Key Word)가 될 것이 분명하다.\n\n흔히들 21세기는 정보의 시대요 문화의 시대가 될 것이라고 말한다. 그리고 정보문화의 글로벌 경쟁의 시대라고도 한다. 모두들 정치적 제스처와 경제적 속도에 너무 들뜨거나 치우친 감이 없지 않다. 새로운 정보의 창출과 주체적·독창적 文化藝術(문화예술)의 재생산 없이 세계화에 대처할 수 있을까? 과연 글로벌 시대의 경쟁력에 살아남을 수가 있을까 반문해 보지 않을 수 없다.\n\n바야흐로 21세기를 불과 2년 앞두고 있다. 아날로그에서 디지털화하는 첨단 테크놀로지의 사이버 시대에 어떻게 해야 서예가 예술의 한 장르로 살아남을 수 있을까 하는 소극적인 물음이 아니라 서예가 어떻게 변해야 세계공통의 발돋움할 수 있을까 하는 보다 적극적인 문제로 다시 한번 심각하게 성찰해 보고자 지난 4월 19일 物波(물파)그룹이 창립되었다. 이러한 문제의식과 함께 새로운 문명전환의 정보고속도로망을 담당할 주역들 못지않게 文字文化(문자문화)와 필묵예술을 직접 다루는 우리 서화가들의 사명 또한 적지 않다는 것이 물파예술가들의 자각적 인식이자 새 출발점이기도 하다.\n\n그렇다면 예술로서의 物波主義(물파주의)란 무엇인가? 물파주의가 지향하는 物藝藝術(물예예술)이란 과연 어떤 예술을 가리키는 것인가에 대한 질문에 답하지 않으면 안 된다. 예술에 있어 물파주의란 心物論 哲學(심물론 철학)에 근거한다. 바꾸어 말하면 물파주의 예술이란 心物論的 동양서예정신과 文人畵(문인화) 정신에 입각한 線(선)의 예술이다. 한마디로 정의하면 物波(물파)란 心物之波(심물지파)다. 그것은 단순히 서구과학의 유물적 物(물)의 波(파)나 동양종교의 유심적 心(심)의 波가 아닌 線의 예술로서 心物의 波인 것이다. 물론 物波藝術에서 波는 파동을 일컫지만, 그것은 현대 아원자물리학에서 말하는 物質波(물질파)와는 판이하게 다른 心物之氣(심물지기)로서의 파동이다. 왜냐하면 마음은 기운(人心氣也)이므로 心物之波 역시 물질파가 아닌 정신적·靈的(영적) 新氣運의 파동, 神氣波(신기파)이기 때문이다. 그러므로 心物之氣란 '무형의 마음거울에 비친 자연의 밝은 기운(無形心鏡, 自然明氣)'으로서 心物之哲이다. 총결해서 말한다면 物波主義 예술이란 心物哲學에 근거한 線의 예술이자 筆墨藝術(필묵예술)인 것이다.\n\n(孫炳哲 / 物波空間 館長)\n1997. 12. 12.",
      artistName: "불한자 (弗寒子)",
      artistTitle: "심물철학자 및 물파예술가",
      artistDescription: "불한자는 마음과 사물의 파동을 탐구하며, 이를 차(茶), 글(書), 그림(畵)으로 형상화하는 작업을 이어오고 있습니다. 그의 작품은 완성된 결과물이 아니라, 감상자의 마음속에서 계속해서 퍼져나가는 파동의 시작점입니다.",
      artistImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop"
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
      art: "물파공간",
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
      title: "物波空間",
      text: "藝術，非形也，乃波也。 波動入心，則生共鳴。 作品，非造也， 乃顯也。"
    },
    artDetail: {
      title: "何謂物波美學？",
      subtitle: "21世紀的新藝術哲學",
      tabs: {
        intro: "介紹",
        philosophy: "物波主義",
        artist: "作家"
      },
      intro: "物波美學以「心物哲學」為基礎，認為心與物並非分離。藝術並非單純的對象再現或內在表現，而是「心與物相遇所產生的波動（波）之凝聚與共鳴」。",
      principles: [
        {
          title: "1. 心物之波",
          subtitle: "非固定物體，而是「活生生的波動」",
          description: "藝術作品並非被製成標本的對象。它是創作者的心與對象（物）相遇產生的波動，透過材料與形式「凝聚」而成的結果，是與觀者相遇後再次躍動的「事件」。"
        },
        {
          title: "2. 有無雙則",
          subtitle: "無形與有形的無盡循環",
          description: "無形（創作者的心、氣、靈感）透過筆、顏料、語言等有形（作品的形象）展現於世。完成的有形作品與觀者相遇後，再次回歸無形（內心深處的餘韻與迴響）。"
        },
        {
          title: "3. 共鳴",
          subtitle: "超越感動的存在轉化",
          description: "共鳴分為三個層次：即時反應的感動、離開後仍長久留存的餘韻，以及最終改變觀察世界的眼光與生活態度的「變容」。"
        },
        {
          title: "4. 創作與鑑賞的再定義",
          subtitle: "心物造形與造形心物",
          description: "創作並非創作者控制材料的技術，而是心與物對話並形塑形象的過程。鑑賞並非被動的觀看，而是在觀者心中重新喚醒作品中凝聚的波動，達成「創造性完成」的事件。"
        }
      ],
      why: {
        title: "為何現在需要物波美學？",
        content: "在當今 AI 與資訊過載的時代，藝術正被作為刺激性圖像快速消費。物波美學回應了「藝術為何對人類必要」這一根本問題。藝術應是人類深度接觸世界、映照清澈心靈並協調生活秩序的「存在方式之運動」。"
      },
      mulpaismTitle: "物波主義的核",
      mulpaismContent: "物波主義是超越形象的波動美學。所有存在都在振動，那振動停止的狀態就是物質。藝術家是將困在物質中的波動再次喚醒的存在，物波主義就是那種覺醒的方法論。",
      mulpaismDeclaration: "物波主義 宣言文\n\n20世紀雖然科學文明取得了令人矚目的成就，但人們仍批評精神文明反而走上了衰落之路。即，因重視物質文化而導致道德文化退步的診斷。這意味著由於價值觀的顚倒（顛倒），人類社會陷入混亂的漩渦中，在未能找到新秩序的情況下徘徊。\n\n另一方面，有人將當前世紀末激動變化的世界，視為為了迎接新範式的道德文明而進行的巨大的、全人類的文明轉型期。而且，這種開天闢地的新文明浪潮並非始於物我的二元論的西方文明，而是濃縮在東北亞物我的合一論的東北亞儒·佛·仙三靈精神中，這堪稱一個宏大的民族願景。\n\n因此，面向人類道德社會的21世紀新文明的哲學範式，將不是既成宗教的唯心論或辯證法的唯物論，而是以人智中心為基礎的唯心論。它不是指西方陳舊的、以分析和科學方法為主的知識中心，而是指作為認識主體的心與作為認識對象的物合一的氣，即由同氣一心產生的心物論式的智覺中心。換言之，作為新認識體系範式的新氣運的智覺中心和涵蓋東西方文明的心物論哲學，必將成為21世紀文明的核心關鍵詞（Key Word）。\n\n人們常說21世紀將是信息的時代、文化的時代。也被稱為信息文化的全球競爭時代。大家對政治姿態和經濟速度都顯得過於興奮或偏頗。如果沒有新信息的創造和主體性、原創性文化藝術的再生產，如何能應對全球化？在全球化時代的競爭力中，我們真的能生存下來嗎？對此不能不反問。\n\n眼看距離21世紀僅剩兩年。在從模擬轉向數字的尖端科技網絡時代，與其消極地問書法如何作為藝術的一個流派生存下來，不如更積極地思考書法應如何轉變才能走向世界。為了再次嚴肅反思這一問題，物波（MULPA）組合於去年4月19日宣告成立。伴隨著這種問題意識，我們書畫家除了要像那些負責文明轉型信息高速公路網的主角一樣重要外，直接處理文字文化和筆墨藝術的使命也不小，這既是物波藝術家的自覺認識，也是新的起點。\n\n那麼，作為藝術的物波主義（Mulpaism）究竟是什麼？對於物波主義所指向的物藝藝術究竟是指什麼樣的藝術，必須做出回答。在藝術方面，物波主義是以心物論哲學為基礎的。換言之，物波主義藝術是立足於心物論式的東方書法精神和文人畫精神的線的藝術。一言以蔽之，物波即心物之波。它不僅僅是西方科學的唯物性的物的波或東方宗教的唯心性的心的波，而是作為線的藝術的心物之波。當然，在物波藝術中，波是指波動，但它與現代亞原子物理學中所說的物質波截然不同，它是作為心物之氣的波動。因為心即氣（人心氣也），所以心物之波也不是物質波，而是精神上的、靈性的新氣運的波動，即神氣波。因此，所謂心物之氣，就是作為「映照在無形心鏡上的自然明亮之氣（無形心鏡, 自然明氣）」的心物之哲。總結來說，物波主義藝術是以心物哲學為基礎的線的藝術，也是筆墨藝術。\n\n（孫炳哲 / 物波空間 館長）\n1997. 12. 12.",
      artistName: "弗寒子 (Bulhanza)",
      artistTitle: "心物哲學家及物波藝術家",
      artistDescription: "弗寒子探求心與物的波動，並將其轉化為茶、書、畫。他的作品不是完成的結果，而是觀者心中不斷擴散的波動起點。",
      artistImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop"
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
      art: "物波空間",
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
      title: "MULPAISM",
      text: "Art is not form — it is a wave. When the wave reaches the mind, resonance arises. A work is not made. It reveals itself."
    },
    artDetail: {
      title: "What is Mulpa Aesthetics?",
      subtitle: "A New Art Philosophy for the 21st Century",
      intro: "Based on 'Mind-Matter Philosophy' which posits that mind (心) and matter (物) are inseparable, Mulpa Aesthetics views art not as mere representation or expression, but as the 'condensation and resonance of waves (波) created when mind and matter meet.'",
      tabs: {
        intro: "Intro",
        philosophy: "Mulpaism",
        artist: "Artist"
      },
      principles: [
        {
          title: "1. Mind-Matter Wave",
          subtitle: "A 'Living Wave', Not a Fixed Object",
          description: "Artworks are not static objects. They are the 'condensed' results of waves generated by the encounter between the artist's mind and the object, becoming an 'event' that moves again upon meeting the viewer."
        },
        {
          title: "2. Mutual Principle of Being and Non-being",
          subtitle: "The Endless Cycle of Formless and Form",
          description: "The formless (mind, energy, inspiration) manifests through the form (artwork) via brush, paint, or language. The completed form returns to the formless (deep resonance in the mind) upon meeting the viewer."
        },
        {
          title: "3. Resonance",
          subtitle: "Transformation of Existence Beyond Emotion",
          description: "Resonance deepens in three stages: immediate emotion, lasting afterglow, and finally 'transformation' (變容) that changes one's perspective on the world and attitude toward life."
        },
        {
          title: "4. Redefining Creation and Appreciation",
          subtitle: "Dialogue Between Mind and Matter",
          description: "Creation is not a skill of controlling materials, but a process of dialogue between mind and matter. Appreciation is not passive viewing, but a 'creative completion' where the viewer revives the condensed waves within their own mind."
        }
      ],
      why: {
        title: "Why Mulpa Aesthetics Now?",
        content: "In today's age of AI and information overload, art is consumed rapidly as stimulating images. Mulpa Aesthetics answers the fundamental question: 'Why is art necessary for humans?' Art must be a 'movement of the mode of existence' that tunes the order of life."
      },
      mulpaismTitle: "The Core of Mulpaism",
      mulpaismContent: "Mulpaism is an aesthetics of waves beyond form. All existence vibrates, and matter is the state where that vibration stops. Artists are those who reawaken the waves trapped within matter, and Mulpaism is the methodology of that awakening.",
      mulpaismDeclaration: "Mulpaism Declaration\n\nThe 20th century, despite its dazzling achievements in scientific civilization, has faced criticism that spiritual civilization has instead walked the path of decline. In other words, the diagnosis is that moral culture has regressed while material culture was prioritized. This means that due to the inversion of values, human society is caught in a whirlpool of chaos and is wandering without finding a new order.\n\nOn the other hand, some perceive the current turbulent world of the end of the century as a period of a great universal civilian transformation to welcome a new paradigm of moral civilization. And it can be said that the wave of this new civilization does not start from the Western civilization of self-material dualism, but its focal point is being compressed into the self-material oneness of Northeast Asia through the spirits of Confucianism, Buddhism, and Taoism, which is a grand national vision.\n\nTherefore, the philosophical paradigm of the new 21st-century civilization aimed at a moral human society will not be the idealism of established religions or dialectical materialism, but an idealism based on human wisdom-centering. It refers to the wisdom-centering through the oneness of mind and matter, which is the intuition of the East that combines the 'mind' as the subject of recognition and the 'matter' as the object of recognition, rather than the knowledge-centric analytical and scientific methods of the West. In other words, the wisdom-centering of new energy, which is a new paradigm of recognition, and the Mind-Matter Philosophy that encompasses Eastern and Western civilizations will surely be the key keywords of 21st-century civilization.\n\nIt is often said that the 21st century will be an eras of information and culture. And it is also called an era of global competition in information culture. Everyone seems a bit too excited or biased toward political gestures and economic speed. Without the creation of new information and the reproduction of subjective and creative culture and art, can we cope with globalization? Can we survive the competitiveness of the global era? We cannot help but ask back.\n\nNow, the 21st century is only two years away. In the cyber era of cutting-edge technology moving from analog to digital, the question is not a passive one of how calligraphy can survive as a genre of art, but rather a more active consideration of how calligraphy must change to make a global leap forward. To reflect deeply on this problem once again, the Mulpa Group was founded on April 19 last year. Along with this problem consciousness, the mission of us calligraphers and painters who directly handle the culture of letters and the art of ink and brush is no less than that of the protagonists who will be in charge of the information superhighway of the new civilian transformation. This is both the self-recognition and a new starting point for Mulpa artists.\n\nthen, what is Mulpaism as art? One must answer the question of what kind of art Mulpa-Art, which Mulpaism aims for, refers to. In art, Mulpaism is based on Mind-Matter Philosophy. In other words, Mulpaism art is an art of lines based on the Oriental calligraphic spirit of Mind-Matter logic and the spirit of literati painting. To define it in one word, Mulpa is the wave of mind and matter. It is not just the wave of material matter in Western science or the wave of idealistic mind in Eastern religion, but the wave of mind and matter as an art of lines. Of course, in Mulpa-Art, 'wave' refers to vibration, but it is a wave as the energy of mind and matter, which is completely different from the material wave spoken of in modern subatomic physics. Because the mind is energy (In-Sim-Gi-Ya), the wave of mind and matter is also not a material wave, but a wave of spiritual and energetic new vitality, a divine vitality wave. Therefore, the vitality of mind and matter is a philosophy of mind and matter as 'the bright vitality of nature reflected in the formless mirror of the mind (Mu-Hyeong-Sim-Gyeong, Ja-Yeon-Myeong-Gi)'. In conclusion, Mulpaism art is an art of lines based on Mind-Matter Philosophy and the art of ink and brush.\n\n(Sun Byung-chul / Director of Mulpa Space)\nDecember 12, 1997",
      artistName: "Bulhanza",
      artistTitle: "Mind-Matter Philosopher & Mulpa Artist",
      artistDescription: "Bulhanza explores the waves of mind and matter, manifesting them through tea, calligraphy, and painting. His work is not a completed result, but a starting point for waves that continue to spread within the viewer's mind.",
      artistImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop"
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
      art: "MULPAISM",
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

const Section = ({ id, title, text, dark = false, bgImage, onMore }: { id: string; title: string; text: string; dark?: boolean; bgImage?: string; onMore?: () => void }) => (
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
      <p className="text-xl md:text-2xl font-serif leading-relaxed tracking-wide opacity-90 whitespace-pre-line mb-12">
        {text}
      </p>
      {onMore && (
        <button 
          onClick={onMore}
          className={`text-sm tracking-[0.5em] uppercase border ${dark ? 'border-white/20 hover:bg-white hover:text-black' : 'border-black/20 hover:bg-black hover:text-white'} px-8 py-4 transition-all duration-500`}
        >
          Read More
        </button>
      )}
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

const ArtDetailPage = ({ t, setPage }: { t: any; setPage: (p: Page) => void }) => {
  const [activeTab, setActiveTab] = useState<'intro' | 'mulpaism' | 'artist'>('intro');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-[#fdfdfd]"
    >
      {/* Hero Section */}
      <header className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" 
            alt="Abstract Waves" 
            className="w-full h-full object-cover opacity-10 grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5 }}
          className="z-10 max-w-5xl"
        >
          <h1 className="text-4xl md:text-7xl font-serif mb-6 tracking-[0.2em] leading-tight text-black">
            {t.artDetail.title}
          </h1>
          <p className="text-xl md:text-3xl font-serif tracking-[0.4em] opacity-60 text-black">
            {t.artDetail.subtitle}
          </p>
        </motion.div>
      </header>

      {/* Sub tabs navigation */}
      <nav className="sticky top-20 bg-white/80 backdrop-blur-md z-30 border-b border-black/5">
        <div className="max-w-4xl mx-auto flex justify-center gap-8 md:gap-16 py-6 px-6">
          <button 
            onClick={() => setActiveTab('intro')}
            className={`text-xs md:text-sm tracking-[0.4em] uppercase transition-all pb-2 border-b ${activeTab === 'intro' ? 'border-black opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'}`}
          >
            {t.artDetail.tabs.intro}
          </button>
          <button 
            onClick={() => setActiveTab('mulpaism')}
            className={`text-xs md:text-sm tracking-[0.4em] uppercase transition-all pb-2 border-b ${activeTab === 'mulpaism' ? 'border-black opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'}`}
          >
            {t.artDetail.tabs.philosophy}
          </button>
          <button 
            onClick={() => setActiveTab('artist')}
            className={`text-xs md:text-sm tracking-[0.4em] uppercase transition-all pb-2 border-b ${activeTab === 'artist' ? 'border-black opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'}`}
          >
            {t.artDetail.tabs.artist}
          </button>
        </div>
      </nav>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'intro' ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Intro Section */}
            <section className="py-32 px-6 md:px-24 max-w-4xl mx-auto text-center">
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-2xl md:text-4xl font-serif leading-relaxed tracking-wide opacity-80 text-black"
              >
                {t.artDetail.intro}
              </motion.p>
            </section>

            {/* Principles Grid */}
            <section className="py-32 px-6 md:px-24 bg-white">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-[10px] tracking-[0.8em] uppercase opacity-40 mb-24 text-center text-black">Core Principles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-32">
                  {t.artDetail.principles.map((p: any, i: number) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.2 }}
                      className="space-y-8 group"
                    >
                      <div className="aspect-[16/9] overflow-hidden bg-gray-50 relative">
                        <img 
                          src={[
                            "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=2080&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2038&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2069&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop"
                          ][i]} 
                          alt={p.title}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-3xl font-serif tracking-widest text-black">{p.title}</h3>
                        <p className="text-sm tracking-[0.3em] uppercase opacity-40 italic text-black">{p.subtitle}</p>
                        <p className="text-lg font-serif leading-relaxed opacity-60 text-justify text-black">{p.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Why Now Section */}
            <section className="py-48 px-6 md:px-24 bg-[#1a1a1a] text-white relative overflow-hidden">
              <div className="max-w-4xl relative z-10">
                <h2 className="text-4xl md:text-6xl font-serif mb-12 tracking-tight">{t.artDetail.why.title}</h2>
                <p className="text-xl md:text-3xl font-serif leading-relaxed opacity-80 italic">
                  {t.artDetail.why.content}
                </p>
              </div>
            </section>
          </motion.div>
        ) : activeTab === 'mulpaism' ? (
          <motion.div
            key="mulpaism"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="py-32 px-6 md:px-24 max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-6xl font-serif mb-12 tracking-tight text-black">{t.artDetail.mulpaismTitle}</h2>
            <div className="w-16 h-px bg-black/20 mb-12" />
            <p className="text-xl md:text-3xl font-serif leading-relaxed tracking-wide opacity-80 text-black whitespace-pre-line mb-24">
              {t.artDetail.mulpaismContent}
            </p>

            <div className="bg-gray-50 p-8 md:p-16 border border-black/5 shadow-inner">
              <div className="max-w-prose mx-auto">
                <h3 className="text-2xl md:text-4xl font-serif text-center mb-12 text-black tracking-widest font-bold">
                  {t.artDetail.mulpaismDeclaration.split('\n')[0]}
                </h3>
                <pre className="whitespace-pre-line font-serif text-sm md:text-base leading-loose opacity-70 text-black text-justify">
                  {t.artDetail.mulpaismDeclaration.split('\n').slice(1).join('\n')}
                </pre>
              </div>
            </div>

            <div className="mt-24 aspect-video overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=2070&auto=format&fit=crop" 
                alt="Mulpaism" 
                className="w-full h-full object-cover grayscale opacity-80"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="artist"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="py-32 px-6 md:px-24 max-w-6xl mx-auto flex flex-col md:flex-row gap-16 items-center"
          >
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-serif text-black">{t.artDetail.artistName}</h2>
                <p className="text-sm tracking-[0.5em] uppercase opacity-40 font-bold text-black">{t.artDetail.artistTitle}</p>
              </div>
              <div className="w-16 h-px bg-black/20" />
              <p className="text-xl font-serif leading-relaxed tracking-wide opacity-70 text-black whitespace-pre-line">
                {t.artDetail.artistDescription}
              </p>
            </div>
            <div className="flex-1 w-full aspect-[4/5] overflow-hidden bg-gray-100">
              <img 
                src={t.artDetail.artistImage} 
                alt={t.artDetail.artistName}
                className="w-full h-full object-cover grayscale"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Button */}
      <div className="pb-24 text-center mt-24">
        <button 
          onClick={() => setPage('home')}
          className="text-sm tracking-[0.5em] uppercase opacity-40 hover:opacity-100 transition-opacity border-b border-black/20 pb-2 text-black"
        >
          Back to Main
        </button>
      </div>
    </motion.div>
  );
};

const ImageSlider = ({ images, speed = 3 }: { images: string[]; speed: number }) => {
  if (!images || images.length === 0) return null;
  
  const shouldAnimate = images.length > 3;
  // If we should animate, we need to repeat images for seamlessness
  const sliderItems = shouldAnimate ? [...images, ...images] : images;

  return (
    <div className="w-full overflow-hidden my-24 py-12">
      <div className="max-w-[2000px] mx-auto">
        <motion.div
          className="flex gap-4 px-4"
          animate={shouldAnimate ? { x: ['0%', '-50%'] } : {}}
          transition={shouldAnimate ? {
            duration: speed * images.length,
            repeat: Infinity,
            ease: "linear",
          } : {}}
          style={{ width: shouldAnimate ? 'max-content' : '100%', display: 'flex' }}
        >
          {sliderItems.map((src, idx) => (
            <div 
              key={idx} 
              className={`flex-shrink-0 aspect-[3/4] overflow-hidden border border-black/5 shadow-sm ${shouldAnimate ? 'w-[calc(33.333vw-1rem)] md:w-[calc(25vw-2rem)] lg:w-[calc(20vw-2rem)]' : 'flex-1'}`}
            >
              <img 
                src={src} 
                alt="" 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

const TeaDetailPage = ({ t, setPage, currentTeaImage, siteSettings }: { t: any; setPage: (p: Page) => void; currentTeaImage: string; siteSettings: SiteSettings | null }) => (
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
      <div className="flex-1 w-full h-[500px] overflow-hidden shadow-2xl">
        <img 
          src={currentTeaImage} 
          alt="Bulhansuncha Tea"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover hover:scale-105 transition-all duration-1000"
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
        <ImageSlider 
          images={siteSettings?.tea_slider_images || []} 
          speed={siteSettings?.tea_slider_speed || 3} 
        />
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

            <div className="font-serif leading-[1.2] tracking-wide opacity-90 text-lg md:text-xl whitespace-pre-wrap max-w-none">
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

const AdminDashboard = ({ 
  archiveItems, 
  setArchiveItems, 
  initialEditingItem, 
  onClearEdit,
  siteSettings,
  setSiteSettings
}: { 
  archiveItems: ArchiveItem[]; 
  setArchiveItems: React.Dispatch<React.SetStateAction<ArchiveItem[]>>; 
  initialEditingItem?: ArchiveItem | null; 
  onClearEdit?: () => void;
  siteSettings: SiteSettings | null;
  setSiteSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ArchiveItem | null>(initialEditingItem || null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'archive' | 'settings'>('archive');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const teaInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: initialEditingItem?.title || '',
    content: initialEditingItem?.content || '',
    summary: initialEditingItem?.summary || '',
    category: (initialEditingItem?.category || 'poetry') as Category,
    image_url: initialEditingItem?.image_url || ''
  });

  const [settingsData, setSettingsData] = useState<Partial<SiteSettings>>({
    logo_url: siteSettings?.logo_url || '',
    hero_bg_url: siteSettings?.hero_bg_url || '',
    tea_detail_url: siteSettings?.tea_detail_url || '',
    tea_slider_images: siteSettings?.tea_slider_images || [],
    tea_slider_speed: siteSettings?.tea_slider_speed || 3
  });

  useEffect(() => {
    if (siteSettings) {
      setSettingsData({
        logo_url: siteSettings.logo_url,
        hero_bg_url: siteSettings.hero_bg_url,
        tea_detail_url: siteSettings.tea_detail_url,
        tea_slider_images: siteSettings.tea_slider_images || [],
        tea_slider_speed: siteSettings.tea_slider_speed || 3
      });
    }
  }, [siteSettings]);

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
      setActiveTab('archive');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [initialEditingItem]);

  const handleSettingUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof SiteSettings) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      
      const response = await fetch('/upload.php', {
        method: 'POST',
        body: formDataUpload
      });
      
      const result = await response.json();
      if (result.url) {
        setSettingsData(prev => ({ ...prev, [field]: result.url }));
      } else {
        throw new Error('Upload server returned error');
      }
    } catch (err) {
      console.error("Upload failed, falling back to base64", err);
      try {
        const base64 = await compressImage(file);
        setSettingsData(prev => ({ ...prev, [field]: base64 }));
      } catch (compressErr) {
        console.error("Compression failed", compressErr);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const saveSettings = async () => {
    if (!siteSettings && (!settingsData.logo_url && !settingsData.hero_bg_url && !settingsData.tea_detail_url)) {
      alert("No settings to save.");
      return;
    }
    
    setIsUploading(true);
    try {
      if (siteSettings?.id) {
        const { error } = await supabase
          .from('site_settings')
          .update(settingsData)
          .eq('id', siteSettings.id);
        
        if (!error) {
          setSiteSettings({ ...siteSettings, ...settingsData } as SiteSettings);
          alert("Settings saved successfully.");
        } else {
          throw error;
        }
      } else {
        // Create new if somehow missing
        const { data, error } = await supabase
          .from('site_settings')
          .insert([settingsData])
          .select()
          .single();
        
        if (!error && data) {
          setSiteSettings(data);
          alert("Settings created and saved successfully.");
        } else {
          throw error;
        }
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Failed to save settings. Database connection issue or table missing.");
    } finally {
      setIsUploading(false);
    }
  };

  const seedArchive = async () => {
    if (!confirm("모든 샘플 데이터를 아카이브에 추가하시겠습니까?")) return;
    setIsUploading(true);
    try {
      const { data, error } = await supabase
        .from('archive_items')
        .insert(SAMPLE_ARCHIVE_ITEMS)
        .select();
      
      if (!error && data) {
        setArchiveItems(prev => [...data, ...prev]);
        alert("샘플 데이터가 성공적으로 복구되었습니다.");
      } else {
        throw error;
      }
    } catch (err) {
      console.error("Seeding failed:", err);
      alert("데이터 복구에 실패했습니다. DB 테이블이 생성되어 있는지 확인해주세요.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      
      const response = await fetch('/upload.php', {
        method: 'POST',
        body: formDataUpload
      });
      
      const result = await response.json();
      if (result.url) {
        setFormData({ ...formData, image_url: result.url });
      } else {
        // Fallback to base64 if PHP upload fails (e.g. in local dev)
        const base64 = await compressImage(file);
        setFormData({ ...formData, image_url: base64 });
      }
    } catch (err) {
      console.error("Upload failed, falling back to base64", err);
      const base64 = await compressImage(file).catch(() => '');
      if (base64) setFormData({ ...formData, image_url: base64 });
    } finally {
      setIsUploading(false);
    }
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      
      const response = await fetch('/upload.php', {
        method: 'POST',
        body: formDataUpload
      });
      
      const result = await response.json();
      if (result.url) {
        setFormData({ 
          ...formData, 
          content: formData.content + `\n\n![image](${result.url})\n\n` 
        });
      } else {
        const base64 = await compressImage(file);
        setFormData({ 
          ...formData, 
          content: formData.content + `\n\n![image](${base64})\n\n` 
        });
      }
    } catch (err) {
      console.error("Upload failed, falling back to base64", err);
      const base64 = await compressImage(file).catch(() => '');
      if (base64) {
        setFormData({ 
          ...formData, 
          content: formData.content + `\n\n![image](${base64})\n\n` 
        });
      }
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-black pb-8 gap-8">
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.5em] uppercase opacity-40">System Management</p>
            <h2 className="text-5xl font-serif tracking-tight">Control Center</h2>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('archive')}
              className={`px-6 py-3 text-[10px] tracking-[0.3em] uppercase transition-all ${activeTab === 'archive' ? 'bg-black text-white' : 'bg-white text-black border border-black/10'}`}
            >
              Archive
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-[10px] tracking-[0.3em] uppercase transition-all ${activeTab === 'settings' ? 'bg-black text-white' : 'bg-white text-black border border-black/10'}`}
            >
              Site Settings
            </button>
          </div>
        </div>

        {activeTab === 'settings' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="bg-white p-12 shadow-2xl border border-black/5 space-y-12">
              <h3 className="text-2xl font-serif tracking-widest border-b border-black/5 pb-4">Visual Identity</h3>
              
              {/* Logo Setting */}
              <div className="space-y-4">
                <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Site Logo</label>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <input 
                    value={settingsData.logo_url}
                    onChange={e => setSettingsData({...settingsData, logo_url: e.target.value})}
                    placeholder="Logo URL..."
                    className="flex-1 border-b border-gray-300 py-4 outline-none focus:border-black transition-colors font-serif text-black"
                  />
                  <input type="file" ref={logoInputRef} onChange={(e) => handleSettingUpload(e, 'logo_url')} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="px-6 py-3 border border-black/10 text-[10px] tracking-[0.2em] uppercase hover:bg-gray-50">Upload</button>
                </div>
                {settingsData.logo_url && <img src={settingsData.logo_url} className="h-12 object-contain bg-gray-50 p-2" referrerPolicy="no-referrer" />}
              </div>

              {/* Hero BG Setting */}
              <div className="space-y-4">
                <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Hero Background</label>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <input 
                    value={settingsData.hero_bg_url}
                    onChange={e => setSettingsData({...settingsData, hero_bg_url: e.target.value})}
                    placeholder="Hero Background URL..."
                    className="flex-1 border-b border-gray-300 py-4 outline-none focus:border-black transition-colors font-serif text-black"
                  />
                  <input type="file" ref={heroInputRef} onChange={(e) => handleSettingUpload(e, 'hero_bg_url')} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => heroInputRef.current?.click()} className="px-6 py-3 border border-black/10 text-[10px] tracking-[0.2em] uppercase hover:bg-gray-50">Upload</button>
                </div>
                {settingsData.hero_bg_url && <img src={settingsData.hero_bg_url} className="w-40 h-24 object-cover border border-black/5" referrerPolicy="no-referrer" />}
              </div>

              {/* Tea Detail Setting */}
              <div className="space-y-4">
                <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Tea Detail Image</label>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <input 
                    value={settingsData.tea_detail_url}
                    onChange={e => setSettingsData({...settingsData, tea_detail_url: e.target.value})}
                    placeholder="Tea Detail Image URL..."
                    className="flex-1 border-b border-gray-300 py-4 outline-none focus:border-black transition-colors font-serif text-black"
                  />
                  <input type="file" ref={teaInputRef} onChange={(e) => handleSettingUpload(e, 'tea_detail_url')} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => teaInputRef.current?.click()} className="px-6 py-3 border border-black/10 text-[10px] tracking-[0.2em] uppercase hover:bg-gray-50">Upload</button>
                </div>
                {settingsData.tea_detail_url && <img src={settingsData.tea_detail_url} className="w-40 h-24 object-cover border border-black/5" referrerPolicy="no-referrer" />}
              </div>

              {/* Tea Slider Setting */}
              <div className="space-y-6 pt-12 border-t border-black/5">
                <h3 className="text-2xl font-serif tracking-widest">Tea Section Slider</h3>
                
                <div className="space-y-4">
                  <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Slider Images ({settingsData.tea_slider_images?.length || 0})</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {settingsData.tea_slider_images?.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} className="w-full aspect-[3/4] object-cover border border-black/5" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => {
                            const newImages = [...(settingsData.tea_slider_images || [])];
                            newImages.splice(idx, 1);
                            setSettingsData({...settingsData, tea_slider_images: newImages});
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center aspect-[3/4] border-2 border-dashed border-black/10 hover:border-black/30 cursor-pointer transition-colors bg-gray-50">
                      <Plus size={24} className="opacity-20" />
                      <span className="text-[10px] tracking-widest uppercase opacity-40 mt-2 font-bold">Add Image</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploading(true);
                          try {
                            const formDataUpload = new FormData();
                            formDataUpload.append('image', file);
                            const response = await fetch('/upload.php', { method: 'POST', body: formDataUpload });
                            const result = await response.json();
                            const url = result.url || await compressImage(file);
                            setSettingsData(prev => ({
                              ...prev,
                              tea_slider_images: [...(prev.tea_slider_images || []), url]
                            }));
                          } catch (err) {
                            console.error("Upload failed", err);
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Slide Interval (Seconds)</label>
                  <input 
                    type="number"
                    min={1}
                    max={10}
                    value={settingsData.tea_slider_speed}
                    onChange={e => setSettingsData({...settingsData, tea_slider_speed: Number(e.target.value)})}
                    className="w-full md:w-32 border-b border-gray-300 py-4 outline-none focus:border-black transition-colors font-serif text-black"
                  />
                  <p className="text-[9px] opacity-40 italic">Determines how fast the images slide (seconds per image set)</p>
                </div>
              </div>

              <button 
                onClick={saveSettings}
                className="w-full bg-black text-white py-6 text-[10px] tracking-[0.5em] uppercase hover:bg-gray-800 transition-all"
              >
                Save Site Settings
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="flex justify-end mb-8 gap-4">
              <button 
                onClick={seedArchive}
                className="flex items-center gap-3 bg-white text-black border border-black/10 px-8 py-4 text-[10px] tracking-[0.4em] uppercase hover:bg-gray-50 transition-all active:scale-95"
              >
                <Plus size={14} /> Restore Samples
              </button>
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
            {/* Existing Archive Form and Table */}
            {(isAdding || editingItem) && (
              <motion.form 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="bg-white p-12 mb-24 shadow-2xl space-y-12 border border-black/5"
              >
                {/* ... existing form content ... */}
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
          </>
        )}
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
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [adminEditingItem, setAdminEditingItem] = useState<ArchiveItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = translations[lang];

  // Dynamic assets from settings or fallback
  const currentLogo = siteSettings?.logo_url || 'logo.png';
  const currentHeroBg = siteSettings?.hero_bg_url || 'mountains.jpg';
  const currentTeaImage = siteSettings?.tea_detail_url || 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1920';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Site Settings and Archive Items
  useEffect(() => {
    const initData = async () => {
      // Fetch Settings
      const { data: settings, error: settingsError } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      
      if (!settingsError && settings) {
        setSiteSettings(settings);
      } else if (settingsError && settingsError.code === 'PGRST116') {
        // No settings found, create initial
        const { data: newSettings } = await supabase
          .from('site_settings')
          .insert([{ 
            logo_url: 'logo.png', 
            hero_bg_url: 'mountains.jpg', 
            tea_detail_url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1920' 
          }])
          .select()
          .single();
        if (newSettings) setSiteSettings(newSettings);
      }

      // Fetch Archive
      const { data: archive, error: archiveError } = await supabase
        .from('archive_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!archiveError && archive) {
        setArchiveItems(archive);
      }
    };

    initData();
  }, []);

  return (
    <div className="font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 py-6 flex justify-between items-center ${scrolled ? 'bg-white/80 backdrop-blur-md py-4' : 'bg-transparent'}`}>
        <div className="flex items-center gap-8">
          <button onClick={() => setPage('home')} className="flex items-center">
            <img src={currentLogo} alt="Bulhanza Logo" className="h-12 md:h-16 w-auto object-contain" referrerPolicy="no-referrer" />
          </button>
          <div className="hidden md:flex gap-8 text-lg tracking-widest uppercase opacity-70 font-medium">
            <a href={page === 'home' ? "#about" : "#"} onClick={(e) => { if (page !== 'home') { e.preventDefault(); setPage('home'); setTimeout(() => { const el = document.getElementById('about'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); } }} className="hover:opacity-100 transition-opacity">{t.nav.about}</a>
            <button onClick={() => setPage('philosophy')} className={`hover:opacity-100 transition-opacity ${page === 'philosophy' ? 'opacity-100 font-bold' : ''}`}>{t.nav.philosophy}</button>
            <button onClick={() => setPage('art')} className={`hover:opacity-100 transition-opacity ${page === 'art' ? 'opacity-100 font-bold' : ''}`}>{t.nav.art}</button>
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
            <button onClick={() => { setIsMenuOpen(false); setPage('art'); }}>{t.nav.art}</button>
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
              <div className="absolute inset-0 z-0">
                <img 
                  src={currentHeroBg} 
                  alt="Mountains" 
                  className="w-full h-full object-cover opacity-20 grayscale group-hover/hero:scale-105 transition-transform duration-[10s] ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
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
            <Section id="philosophy" title={t.philosophy.title} text={t.philosophy.text} onMore={() => setPage('philosophy')} />
            
            <div className="h-px bg-black/5 mx-24" />

            <Section id="art" title={t.art.title} text={t.art.text} onMore={() => setPage('art')} />

            <div className="h-px bg-black/5 mx-24" />

            <Section id="tea" title={t.tea.title} text={t.tea.text} onMore={() => setPage('tea')} />

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
        ) : page === 'art' ? (
          <ArtDetailPage key="art" t={t} setPage={setPage} />
        ) : page === 'tea' ? (
          <TeaDetailPage key="tea" t={t} setPage={setPage} currentTeaImage={currentTeaImage} siteSettings={siteSettings} />
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
            siteSettings={siteSettings}
            setSiteSettings={setSiteSettings}
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

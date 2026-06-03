import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Plus, Trash2, Edit2, ArrowLeft, Newspaper, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, BookOpen, Settings, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { supabase } from './lib/supabase';
import { SAMPLE_ARCHIVE_ITEMS } from './lib/seedData';

const bulhansunchaImg = '/assets/bulhansuncha_v2.jpg';
const mountainsImg = '/assets/mountains_v2.jpg';
const logoImg = '/assets/logo_v2.jpg';
const DEFAULT_IMAGE = '/assets/logo.png';

type Language = 'KR' | 'TC' | 'EN';
type Page = 'home' | 'tea' | 'journey' | 'contact' | 'philosophy' | 'admin' | 'art' | 'poetryCollection' | 'dashboard' | 'archive' | 'collection' | 'artist' | 'about';

interface ArchiveItem {
  id: string;
  title: string;
  content: string;
  summary: string;
  image_url: string;
  created_at?: string;
  poetry_collection_name?: string | null;
  language?: Language;
}

interface SiteSettings {
  id: string;
  logo_url: string;
  hero_bg_url: string;
  tea_detail_url: string;
  tea_slider_images?: string[];
  tea_slider_speed?: number;
  artists?: Artist[];
}

interface Work {
  title: string;
  image: string;
  size?: string;
  introduction?: string;
  criticism?: string;
}

interface Artist {
  name: string;
  title: string;
  bio: string;
  image: string;
  works: Work[];
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
      mulpaism: string;
      artist: string;
      philosophy: string;
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
    artists: Artist[];
  };
  tea: { title: string; text: string };
  teaDetail: {
    hero: {
      title: string;
      subtitle: string;
      description: string;
    };
    features: {
      title: string;
      description: string;
      items: {
        title: string;
        desc: string;
      }[];
    };
    philosophy: {
      title: string;
      items: {
        name: string;
        desc: string;
      }[];
    };
    invention: {
      title: string;
      author: string;
      desc: string;
      benefits: {
        title: string;
        desc: string;
      }[];
    };
    innovation: {
      title: string;
      subtitle: string;
      desc: string;
    };
    storage: {
      title: string;
      subtitle: string;
      items: {
        title: string;
        desc: string;
      }[];
    };
    usage: {
      title: string;
      desc: string;
    };
    pricing: string;
    quote: string;
    final: string;
  };
  poetryCollection: {
    title: string;
    categories: {
      KR: string;
      TC: string;
      EN: string;
    };
    KR: string[];
    TC: string[];
    EN: string[];
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
    poetryCollection: string;
    tea: string;
    journey: string;
    contact: string;
  };
}

const translations: Record<Language, Content> = {
  KR: {
    hero: {
      title: "심물지철(心物之哲)\n여영사진(如映寫眞)",
      subtitle: "심물의 이치는 비춤과 같다 / 차는 그 빛이 머무는 자리다"
    },
    philosophy: {
      title: "心物哲學",
      text: "심물은 둘이 아니다. 보이는 것과 보이지 않는 것은 서로를 낳고, 그 사이에서 세계가 드러난다. 알고자 하면 멀어지고 고요하면 드러난다."
    },
    philosophyDetail: {
      title: "심물철학(心物哲學)과\n물파미학(物波美學)",
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
        mulpaism: "물파주의",
        artist: "작가",
        philosophy: "물파철학"
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
      mulpaismDeclaration: "物波主義 宣言文\n\n20세기는 과학문명의 눈부신 성과에도 불구하고 정신문명은 오히려 衰(쇠)의 길을 걸어왔다고 보는 비판이 없지 않다. 즉 물질문화를 앞세운 나머지 도덕문화가 퇴보하게 되었다는 진단이다. 이 말은 가치관의 顚倒(전도)로 인류사회가 혼돈의 소용돌이 속에 휩쓸려 새 질서를 찾지 못한 채 방황하고 있음을 의미한다.\n\n한편으론 지금 세기말 격동적 변화의 세계를 두고 새로운 패러다임의 도덕문명을 맞이하기 위한 거대한 인류보편적 문명전환기로 파악하고 있기도 하다. 그리고 이러한 개벽적 새 문명의 물결이 物我的 二元論(물아적 이원론)의 서구문명으로부터 파장지우지 않고 그 구심점이 동북아 物我的 合一論(물아적 합일론)의 동북아 儒·佛·仙 三靈(유·불·선 삼령) 정신으로 압축되고 있음은 하나의 원대한 민족적 비전이 아닐 수 없다고 하겠다.\n\n따라서 인류도덕사회를 지향하는 21세기 새로운 문명의 철학적 패러다임은 기성종교의 唯心論(유심론)이나 변증법적 唯物論(유물론)이 아닌 인간 智中心(지중심)의 唯心論이 될 것이다. 그것은 낡은 인식체계인 서양의 분석적·과학적 방법의 지식 중심이 아니라 동양고유의 직관적 對物觀(대물관)이기도 한 인식주체로서의 心(심)과 인식대상인 物(물)과의 合一(합일)된 기운, 즉 同氣一心(동기일심)에 의한 心物論(심물론)적 智覺中心(지각중심)을 뜻한다. 다시 말해 새로운 인식체계의 패러다임인 新氣運(신기운)의 智覺中心과 동서문명을 아우르는 心物論 哲學이야말로 21세기 문명의 핵심적 키워드(Key Word)가 될 것이 분명하다.\n\n흔히들 21세기는 정보의 시대요 문화의 시대가 될 것이라고 말한다. 그리고 정보문화의 글로벌 경쟁의 시대라고도 한다. 모두들 정치적 제스처와 경제적 속도에 너무 들뜨거나 치우친 감이 없지 않다. 새로운 정보의 창출과 주체적·독창적 文化藝術(문화예술)의 재생산 없이 세계화에 대처할 수 있을까? 과연 글로벌 시대의 경쟁력에 살아남을 수가 있을까 반문해 보지 않을 수 없다.\n\n바야흐로 21세기를 불과 2년 앞두고 있다. 아날로그에서 디지털화하는 첨단 테크놀로지의 사이버 시대에 어떻게 해야 서예가 예술의 한 장르로 살아남을 수 있을까 하는 소극적인 물음이 아니라 서예가 어떻게 변해야 세계공통의 발돋움할 수 있을까 하는 보다 적극적인 문제로 다시 한번 심각하게 성찰해 보고자 지난 4월 19일 物波(물파)그룹이 창립되었다. 이러한 문제의식과 함께 새로운 문명전환의 정보고속도로망을 담당할 주역들 못지않게 文字文化(문자문화)와 필묵예술을 직접 다루는 우리 서화가들의 사명 또한 적지 않다는 것이 물파예술가들의 자각적 인식이자 새 출발점이기도 하다.\n\n그렇다면 예술로서의 物波主義(물파주의)란 무엇인가? 물파주의가 지향하는 物藝藝術(물예예술)이란 과연 어떤 예술을 가리키는 것인가에 대한 질문에 답하지 않으면 안 된다. 예술에 있어 물파주의란 心物論 哲學(심물론 철학)에 근거한다. 바꾸어 말하면 물파주의 예술이란 心物論B的 동양서예정신과 文人畵(문인화) 정신에 입각한 線(선)의 예술이다. 한마디로 정의하면 物波(물파)란 心物之波(심물지파)다. 그것은 단순히 서구과학의 유물적 物(물)의 波(파)나 동양종교의 유심적 心(심)의 波가 아닌 線의 예술로서 心物의 波인 것이다. 물론 物波藝術에서 波는 파동을 일컫지만, 그것은 현대 아원자물리학에서 말하는 物質波(물질파)와는 판이하게 다른 心物之氣(심물지기)로서의 파동이다. 왜냐하면 마음은 기운(人心氣也)이므로 心物之波 역시 물질파가 아닌 정신적·靈的(영적) 新氣運의 파동, 神氣波(신기파)이기 때문이다. 그러므로 心物之氣란 '무형의 마음거울에 비친 자연의 밝은 기운(無形心鏡, 自然明氣)'으로서 心物之哲이다. 총결해서 말한다면 物波主義 예술이란 心物哲學에 근거한 線의 예술이자 筆墨藝術(필묵예술)인 것이다.\n\n(孫炳哲 / 物波空間 館長)\n1997. 12. 12.",
      artists: [
        {
          name: "불한자 (弗寒子)",
          title: "심물철학자 및 물파예술가",
          bio: "불한자는 마음과 사물의 파동을 탐구하며, 이를 차(茶), 글(書), 그림(畵)으로 형상화하는 작업을 이어오고 있습니다. 그의 작품은 완성된 결과물이 아니라, 감상자의 마음속에서 계속해서 퍼져나가는 파동의 시작점입니다.",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop",
          works: [
            { title: "심물지파 01", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=2090&auto=format&fit=crop" },
            { title: "심물지파 02", image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2038&auto=format&fit=crop" },
            { title: "심물지파 03", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=2070&auto=format&fit=crop" },
            { title: "심물지파 04", image: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1978&auto=format&fit=crop" }
          ]
        },
        {
          name: "김철수 (Kim Chul-soo)",
          title: "서양화가 / Painter",
          bio: "자연의 아름다움을 추상화하는 서양화가. 그의 작업은 시각적 평온함과 사유의 공간을 제공합니다.",
          image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop",
          works: [
            { title: "숲의 소리", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop" },
            { title: "도시의 빛", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2113&auto=format&fit=crop" },
            { title: "환영", image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1975&auto=format&fit=crop" },
            { title: "기억", image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=2070&auto=format&fit=crop" }
          ]
        },
        {
          name: "이영희 (Lee Young-hee)",
          title: "한국화가 / Korean Painter",
          bio: "전통과 현대가 공존하는 한국화의 정수. 한지의 질감과 먹의 깊이를 통해 한국적 미학을 현대적으로 재해석합니다.",
          image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1976&auto=format&fit=crop",
          works: [
            { title: "여백의 미", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2148&auto=format&fit=crop" },
            { title: "산수화 01", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop" },
            { title: "필묵", image: "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?q=80&w=2031&auto=format&fit=crop" },
            { title: "조화", image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?q=80&w=2070&auto=format&fit=crop" }
          ]
        }
      ]
    },
    tea: {
      title: "弗寒仙茶",
      text: "차를 안다는 것은 차를 모른다는 것을 아는 데 있다. 불한선차는 알기 위한 차가 아니라 깨닫기 위한 차다."
    },
    teaDetail: {
      hero: {
        title: "불한선차(弗寒仙茶)",
        subtitle: "천년의 양생, 한 알의 과학으로 깨어나다",
        description: "과학과 양생이 빚은 바이오 티(Bio-Tea) 레볼루션. 사춘생 소장의 '사씨 보이차 스타틴' 발명과 천년의 양생 지혜."
      },
      features: {
        title: "천년의 시간을 한 알의 과학으로 응축하다",
        description: "불한선차는 단순한 기호 음료가 아닙니다. 동양의 수천 년 양생(養生) 지혜와 현대 생명과학 기술을 융합하여 탄생한 새로운 카테고리, '바이오-티(Bio-Tea)' 차까오(茶膏)입니다.",
        items: [
          { title: "과학적 검증", desc: "사춘생 소장의 '사씨 보이차 스타틴' 규명으로 입증된 우주인의 음료." },
          { title: "제형의 혁신", desc: "20kg의 보이차를 1kg의 차고(茶膏)로 농축하여 환(丸)으로 정제." },
          { title: "보관의 미학", desc: "숨 쉬는 도자 호리병을 통한 자연 숙성과 휴대 이동의 안성맞춤." }
        ]
      },
      philosophy: {
        title: "브랜드 철학: 불한(弗寒)과 선(仙), 차(茶) 미학",
        items: [
          { name: "불한(弗寒)", desc: "'차갑지도 뜨겁지도 않다'. 음양의 조화를 이루어 몸이 과열되거나 막히지 않는 건강한 중정(中正)의 상태. 자연스러운 항상성(Homeostasis)의 회복." },
          { name: "선(仙)", desc: "신비주의가 아닌 '청심선화법(淸心仙化法)'. 마음을 맑게 하고 자연의 이치에 순응하여 삶의 질을 높이는 수행적 태도." },
          { name: "차(茶)", desc: "보이차 전통의 정수인 차까오(茶膏)를 현대 생활에 간편한 환(丸)의 형태로 정제함으로써 휴대성을 높인 고품격의 차." }
        ]
      },
      invention: {
        title: "핵심 발명: '사씨 보이차 스타틴(Xie's Pu-erh Tea Statins)'",
        author: "사춘생 소장",
        desc: "숙성된 보이차 내에서 인체에 유익한 천연 스타틴계 화합물을 최초로 규명.",
        benefits: [
          { title: "대사 조절", desc: "체내 대사 활동 촉진 및 조절" },
          { title: "체질 개선", desc: "불균형한 신체 리듬을 바로잡음" },
          { title: "소화 보조", desc: "위장 기능을 돕고 소화를 촉진" }
        ]
      },
      innovation: {
        title: "보이차의 혁신: 차고(茶膏)의 정수, 환(丸)으로 다시 태어나다",
        subtitle: "한 알의 차(丸)로 천년의 차맥을 잇다",
        desc: "번거로운 다구(茶具)와 우림 과정 없이, 바쁜 현대인이 일상 속에서 가장 간편하게 섭취할 수 있는 고품격 차 양생법."
      },
      storage: {
        title: "보관의 미학: 숨 쉬는 도자 호리병",
        subtitle: "도자 호리병: 생명을 담는 그릇",
        items: [
          { title: "숨 쉬는 소재", desc: "플라스틱이나 금속과 달리, 도자의 미세한 기공이 차가 숨 쉬게 하여 변질을 막습니다." },
          { title: "자연 숙성", desc: "시간이 지날수록 보이차의 풍미와 효능이 안정되고 맛이 깊어집니다." },
          { title: "상징성", desc: "기운을 모으는 호리병 형상은 생명을 담는 그릇이자 이동성을 상징합니다." }
        ]
      },
      usage: {
        title: "음용 방법: 일상 속의 간편한 양생",
        desc: "1일 1~2환을 권장합니다. 하루 한 두알, 따뜻한 물에 녹여 드시거나 가족과 벗들 함께 드십시오. 휴대하기 편한 호리병으로 언제 어디서나 품격을 유지할 수 있습니다."
      },
      pricing: "",
      quote: "차는\n 동방문화의 정수이자 품격입니다. 과도한 가공을 배제하고 시간과 자연이 빚어낸 정수만을 전하겠습니다.",
      final: "사춘생 소장의 과학적 발명과 한국의 차마고도 문경 불한령의 정신이 만나, 한국 차 문화의 새로운 기준을 제시합니다."
    },
    poetryCollection: {
      title: "라석시집 (Lasok Poetry Collection)",
      categories: {
        KR: "한글",
        TC: "중문",
        EN: "영문"
      },
      KR: [
        "1. 라석시전집", "2. 라석심물시집", "3. 라석심물철학시집", "4. 라석천자문시집", "5. 라석역학시집", "6. 라석화답시집", "7. 불한시사합작시집"
      ],
      TC: [
        "1. 羅石東夷文詩集", "2. 羅石心物詩集", "3. 羅石心物哲學詩集", "4. 羅石和答詩集", "5. 羅石道德經詩集"
      ],
      EN: [
        "1. Lasok's Complete Poetry Collection",
        "2. Lasok's Mind and Matter Poetry Collection <1>",
        "3. Lasok's Philosophy of Mind and Matter Poetry Collection",
        "4. Lasok's Thousand Character Classic Poetry Collection",
        "5. Lasok's I Ching Poetry Collection",
        "6. Lasok's Responsive Poetry Collection",
        "7. Bulhan Poetry Society Collaborative Poetry Collection",
        "8. Lasok's Tao Te Ching Poetry Collection"
      ]
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
      poetryCollection: "라석시집",
      tea: "불한선차",
      journey: "라석여정",
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
        mulpaism: "物波主義",
        artist: "作家",
        philosophy: "物波哲學"
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
      artists: [
        {
          name: "弗寒子 (Bulhanza)",
          title: "心物哲學家及物波藝術家",
          bio: "弗寒子探求心與物的波動，並將其轉化為茶、書、畫。他的作品不是完成的結果，而是觀者心中不斷擴散的波動起點。",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop",
          works: [
            { title: "心物之波 01", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=2090&auto=format&fit=crop" },
            { title: "心物之波 02", image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2038&auto=format&fit=crop" },
            { title: "心物之波 03", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=2070&auto=format&fit=crop" },
            { title: "心物之波 04", image: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1978&auto=format&fit=crop" }
          ]
        },
        {
          name: "金哲秀 (Kim Chul-soo)",
          title: "西洋畫家 / Painter",
          bio: "將自然之美抽象化的西洋畫家。他的作品提供視覺的寧靜與思考空間。",
          image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop",
          works: [
            { title: "林之聲", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop" },
            { title: "城之光", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2113&auto=format&fit=crop" },
            { title: "幻象", image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1975&auto=format&fit=crop" },
            { title: "記憶", image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=2070&auto=format&fit=crop" }
          ]
        },
        {
          name: "李英熙 (Lee Young-hee)",
          title: "韓國畫家 / Korean Painter",
          bio: "傳統與現代共存的韓國畫之精髓。透過韓紙質感與墨之深淺，對韓國美學進行現代演繹。",
          image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1976&auto=format&fit=crop",
          works: [
            { title: "空白之美", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2148&auto=format&fit=crop" },
            { title: "山水畫 01", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop" },
            { title: "筆墨", image: "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?q=80&w=2031&auto=format&fit=crop" },
            { title: "和諧", image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?q=80&w=2070&auto=format&fit=crop" }
          ]
        }
      ]
    },
    tea: {
      title: "弗寒仙茶",
      text: "知茶者，知其不可知。 弗寒仙茶， 非為知而飲， 乃為覺而存。"
    },
    teaDetail: {
      hero: {
        title: "弗寒仙茶 (Bulhan Suncha)",
        subtitle: "科學與養生締造的 Bio-Tea 革命",
        description: "謝春生所長的 '謝氏普洱茶他汀' 發明與千年的養生智慧相結合而誕生。"
      },
      features: {
        title: "將千年的時間濃縮為一丸科學",
        description: "弗寒仙茶不僅僅是簡單的嗜好飲料。它是融合了東方數千年的養生智慧與現代生命科學技術而誕生的高級 'Bio-Tea 茶膏'。",
        items: [
          { title: "科學驗證", desc: "謝春生所長的 '謝氏普洱茶他汀' 鑒定所證實的宇航員飲品。" },
          { title: "劑型創新", desc: "將 20kg 普洱茶濃縮為 1kg 茶膏，精製成丸劑。" },
          { title: "保存美學", desc: "通過透氣的陶瓷葫蘆瓶進行自然熟成，完美適配攜帶移動。" }
        ]
      },
      philosophy: {
        title: "品牌哲學：弗寒、仙、茶美學",
        items: [
          { name: "弗寒", desc: "'不冷不熱'。達到陰陽調和，使身體不致過熱或阻塞的健康中正狀態。恢復自然恆常性（Homeostasis）。" },
          { name: "仙", desc: "並非神秘主義，而是 '清心仙化法'。淨化心靈，順應自然之理，提升生活品質的修行態度。" },
          { name: "茶", desc: "將普洱茶傳統之精華——茶膏，精製成現代生活中簡便的丸劑形態，提升攜帶性的高規格茶。" }
        ]
      },
      invention: {
        title: "核心發明：'謝氏普洱茶他汀'",
        author: "謝春生所長",
        desc: "首次在熟成普洱茶中鑒定出對人體有益的天然他汀類化合物。",
        benefits: [
          { title: "代謝調節", desc: "促進及調節體內代謝活動" },
          { title: "體質改善", desc: "糾正失衡的身體律動" },
          { title: "助消化", desc: "輔助胃腸功能，促進消化" }
        ]
      },
      innovation: {
        title: "普洱茶的創新：茶膏之精華，重生為丸",
        subtitle: "一丸千年 (One Pellet, A Thousand Years!)",
        desc: "無需繁瑣的茶具與沖泡過程，是忙碌的現代人在日常生活中最簡便攝取的高規格茶養生法。"
      },
      storage: {
        title: "保存美學：會呼吸的陶瓷葫蘆瓶",
        subtitle: "陶瓷葫蘆：生命之器",
        items: [
          { title: "透氣材質", desc: "陶瓷的微孔讓茶呼吸，防止變質並加深風味。" },
          { title: "自然熟成", desc: "隨著時間流逝，普洱茶的風味與功效趨於穩定，味道愈發深厚。" },
          { title: "象徵性", desc: "匯聚氣息的葫蘆形狀是盛載生命的容器，也象徵著便攜性。" }
        ]
      },
      usage: {
        title: "飲用方法：日常生活中的簡便養生",
        desc: "建議每日 1~2 丸。每日一兩丸，溶解於溫水中飲用或與家人好友一同分享。攜帶方便的葫蘆瓶讓您隨時隨地保持高雅品味。"
      },
      pricing: "供應價：198,000 韓元",
      quote: "茶是東方文化的精髓與格調。我們不僅是在賣茶，而是提出了回歸自然秩序、滋養生命的智慧。",
      final: "謝春生所長的科學發明與韓國茶馬古道聞慶弗寒嶺的精神相結合，為韓國茶文化樹立了新標準。"
    },
    poetryCollection: {
      title: "羅石詩集 (Lasok Poetry Collection)",
      categories: {
        KR: "韓文",
        TC: "中文",
        EN: "英文"
      },
      KR: [
        "1. 라석시전집", "2. 라석심물시집", "3. 라석심물철학시집", "4. 라석천자문시집", "5. 라석역학시집", "6. 라석화답시집", "7. 불한시사합작시집"
      ],
      TC: [
        "1. 羅石東夷文詩集", "2. 羅石心物詩集", "3. 羅石心物哲學詩集", "4. 羅石和答詩集", "5. 羅石道德經詩集"
      ],
      EN: [
        "1. Lasok's Complete Poetry Collection",
        "2. Lasok's Mind and Matter Poetry Collection <1>",
        "3. Lasok's Philosophy of Mind and Matter Poetry Collection",
        "4. Lasok's Thousand Character Classic Poetry Collection",
        "5. Lasok's I Ching Poetry Collection",
        "6. Lasok's Responsive Poetry Collection",
        "7. Bulhan Poetry Society Collaborative Poetry Collection",
        "8. Lasok's Tao Te Ching Poetry Collection"
      ]
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
      poetryCollection: "羅石詩集",
      tea: "弗寒仙茶",
      journey: "羅石旅程",
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
        mulpaism: "Mulpaism",
        artist: "Artist",
        philosophy: "Mulpa Philosophy"
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
      artists: [
        {
          name: "Bulhanza",
          title: "Mind-Matter Philosopher & Mulpa Artist",
          bio: "Bulhanza explores the waves of mind and matter, manifesting them through tea, calligraphy, and painting. His work is not a completed result, but a starting point for waves that continue to spread within the viewer's mind.",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop",
          works: [
            { title: "Wave of Mind-Matter 01", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=2090&auto=format&fit=crop" },
            { title: "Wave of Mind-Matter 02", image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2038&auto=format&fit=crop" },
            { title: "Wave of Mind-Matter 03", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=2070&auto=format&fit=crop" },
            { title: "Wave of Mind-Matter 04", image: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1978&auto=format&fit=crop" }
          ]
        },
        {
          name: "Kim Chul-soo",
          title: "Painter",
          bio: "A painter who abstracts the beauty of nature. His work provides visual tranquility and space for contemplation.",
          image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop",
          works: [
            { title: "Sound of Forest", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop" },
            { title: "Urban Light", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2113&auto=format&fit=crop" },
            { title: "Illusion", image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1975&auto=format&fit=crop" },
            { title: "Memory", image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=2070&auto=format&fit=crop" }
          ]
        },
        {
          name: "Lee Young-hee",
          title: "Korean Painter",
          bio: "The essence of Korean painting where tradition and modernity coexist. Modern reinterpretation of Korean aesthetics through the texture of Hanji and the depth of ink.",
          image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1976&auto=format&fit=crop",
          works: [
            { title: "Beauty of Void", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2148&auto=format&fit=crop" },
            { title: "Landscape 01", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop" },
            { title: "Ink & Brush", image: "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?q=80&w=2031&auto=format&fit=crop" },
            { title: "Harmony", image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?q=80&w=2070&auto=format&fit=crop" }
          ]
        }
      ]
    },
    tea: {
      title: "Bulhan Tea",
      text: "To know tea is to know that it cannot be fully known. Bulhan Tea is not for knowing. It is for dwelling."
    },
    teaDetail: {
      hero: {
        title: "Bulhan Suncha",
        subtitle: "Millennium of Wellness, Awakened by Science",
        description: "A Bio-Tea Revolution of Science and Wellness. Director Xie Chun-sheng's invention of 'Xie's Pu-erh Tea Statins' meets a thousand years of wisdom."
      },
      features: {
        title: "Condensing a Millennium into a Single Pellet",
        description: "Bulhan Suncha is not just a favorite beverage. It is a new category, 'Bio-Tea Paste (Cha-go)', created by fusing thousands of years of Oriental wellness wisdom with modern life science technology.",
        items: [
          { title: "Scientific Validation", desc: "An astronaut's drink proven by the identification of 'Xie's Pu-erh Tea Statins' by Director Xie." },
          { title: "Form Innovation", desc: "20kg of premium Pu-erh tea concentrated into 1kg of tea paste (Cha-go) and refined into pellets." },
          { title: "Aesthetics of Storage", desc: "Natural aging through breathing ceramic gourd bottles, perfect for portability." }
        ]
      },
      philosophy: {
        title: "Philosophy: Bulhan, Seon, and Tea Aesthetics",
        items: [
          { name: "Bulhan", desc: "'Neither cold nor hot'. A healthy state of balance where the body is not overheated or blocked. Restoring natural homeostasis." },
          { name: "Seon", desc: "A meditative attitude of clearing the mind and conforming to the laws of nature to improve quality of life." },
          { name: "Tea", desc: "High-quality tea made portable by refining the essence of traditional Pu-erh tea paste into simple modern pellets." }
        ]
      },
      invention: {
        title: "Core Invention: 'Xie's Pu-erh Tea Statins'",
        author: "Director Xie Chun-sheng",
        desc: "First identification of beneficial natural statin compounds in aged Pu-erh tea.",
        benefits: [
          { title: "Metabolic Regulation", desc: "Promotion and regulation of metabolic activities." },
          { title: "Constitution Improvement", desc: "Correcting imbalanced physical rhythms." },
          { title: "Digestion Aid", desc: "Assisting gastrointestinal function and promoting digestion." }
        ]
      },
      innovation: {
        title: "Innovation: Essence of Tea Paste, Reborn as Pellet",
        subtitle: "One Pellet, A Thousand Years of Tea Lineage",
        desc: "A high-quality tea wellness method that allows busy modern people to easily consume tea without cumbersome tea tools or brewing processes."
      },
      storage: {
        title: "Aesthetics of Storage: Breathing Ceramic Gourd",
        subtitle: "Ceramic Gourd: A Vessel of Life",
        items: [
          { title: "Breathing Material", desc: "Unlike plastic or metal, micro-pores in the ceramic allow the tea to breathe, preventing spoilage." },
          { title: "Natural Aging", desc: "Flavor and efficacy stabilize and deepen as time passes." },
          { title: "Symbolism", desc: "The gourd shape, which gathers energy, represents a vessel of life and portability." }
        ]
      },
      usage: {
        title: "How to Use: Simple Wellness in Daily Life",
        desc: "1-2 pellets a day recommended. Dissolve 1-2 pellets in warm water or enjoy with family and friends. Maintain elegance anywhere with the portable gourd bottle."
      },
      pricing: "",
      quote: "Tea is\n the essence and dignity of Oriental culture. We will deliver only the essence created by time and nature, excluding excessive processing.",
      final: "Director Xie's scientific invention meets the spirit of Bulhan-ryeong in Mungyeong, establishing a new standard for Korean tea culture."
    },
    poetryCollection: {
      title: "Lasok Poetry Collection",
      categories: {
        KR: "Korean",
        TC: "Chinese",
        EN: "English"
      },
      KR: [
        "1. 라석시전집", "2. 라석심물시집", "3. 라석심물철학시집", "4. 라석천자문시집", "5. 라석역학시집", "6. 라석화답시집", "7. 불한시사합작시집"
      ],
      TC: [
        "1. 羅石東夷文詩集", "2. 羅石心物詩集", "3. 羅石心物哲學詩集", "4. 羅石和答詩集", "5. 羅石道德經詩集"
      ],
      EN: [
        "1. Lasok's Complete Poetry Collection",
        "2. Lasok's Mind and Matter Poetry Collection <1>",
        "3. Lasok's Philosophy of Mind and Matter Poetry Collection",
        "4. Lasok's Thousand Character Classic Poetry Collection",
        "5. Lasok's I Ching Poetry Collection",
        "6. Lasok's Responsive Poetry Collection",
        "7. Bulhan Poetry Society Collaborative Poetry Collection",
        "8. Lasok's Tao Te Ching Poetry Collection"
      ]
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
      poetryCollection: "Collection",
      tea: "Tea",
      journey: "Journey",
      contact: "Contact"
    }
  }
};

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
      <h2 className="text-[50px] font-serif mb-12 tracking-widest opacity-80">{title}</h2>
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
      {/* Philosophical Background Image with Elegant Overlays */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?q=80&w=1600&auto=format&fit=crop" 
          alt="Philosophical mountain peaks misty cloud"
          className="w-full h-full object-cover grayscale opacity-30 select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/50 to-[#fdfdfd]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5 }}
        className="z-10 max-w-5xl"
      >
        <span className="text-[11px] uppercase tracking-[0.4em] text-black/40 mb-3 block font-sans">
          MIND-MATTER & OBJECT WAVE AESTHETICS
        </span>
        <h1 className="text-3xl md:text-5xl font-serif mb-6 tracking-[0.2em] leading-tight whitespace-pre-line text-black">
          {t.philosophyDetail.title}
        </h1>
        <p className="text-xl md:text-2xl font-serif tracking-[0.3em] text-black/60">
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
        <div className="absolute -left-12 -top-6 text-9xl font-serif opacity-[0.04] select-none text-black">“</div>
        <p className="text-xl md:text-[28px] font-sans leading-relaxed tracking-wide whitespace-pre-line opacity-85 not-italic text-black">
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
            <h3 className="text-[28px] font-serif tracking-widest border-b border-black/10 pb-4 inline-block">
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

const ArtDetailPage = ({ t, setPage, siteSettings, archiveItems }: { t: any; setPage: (p: Page) => void; siteSettings: SiteSettings | null; archiveItems: ArchiveItem[] }) => {
  const [activeTab, setActiveTab] = useState<'intro' | 'mulpaism' | 'artist' | 'philosophy'>('intro');
  const [galleryState, setGalleryState] = useState<{ artist: Artist; index: number } | null>(null);
  const [readingItem, setReadingItem] = useState<ArchiveItem | null>(null);

  const artists = siteSettings?.artists || t.artDetail.artists || [];
  const activeLang = t.nav.about === '소개' ? 'KR' : t.nav.about === '關於' ? 'TC' : 'EN';
  
  const philosophyItems = archiveItems.filter(item => {
    const colName = item.poetry_collection_name;
    const isPhilosophyCollection = colName === '물파철학' || colName === '物波哲學' || colName === 'Mulpa Philosophy';
    return isPhilosophyCollection && item.language === activeLang;
  });

  let displayPhilosophyItems = philosophyItems;
  if (displayPhilosophyItems.length === 0) {
    displayPhilosophyItems = DEFAULT_PHILOSOPHY_ITEMS.filter(item => item.language === activeLang);
  }

  useEffect(() => {
    if (activeTab === 'philosophy') {
      if (displayPhilosophyItems.length > 0) {
        if (!readingItem || !displayPhilosophyItems.some(item => item.id === readingItem.id)) {
          setReadingItem(displayPhilosophyItems[0]);
        }
      } else {
        setReadingItem(null);
      }
    } else {
      setReadingItem(null);
    }
  }, [activeTab, activeLang, displayPhilosophyItems]);

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
          <h1 className="text-3xl md:text-5xl font-serif mb-6 tracking-[0.2em] leading-tight text-black whitespace-nowrap">
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
            className={`text-[16px] leading-[18px] tracking-[0.4em] uppercase transition-all pb-2 border-b ${activeTab === 'intro' ? 'border-black opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'}`}
          >
            {t.artDetail.tabs.intro}
          </button>
          <button 
            onClick={() => setActiveTab('mulpaism')}
            className={`text-[16px] leading-[18px] tracking-[0.4em] uppercase transition-all pb-2 border-b ${activeTab === 'mulpaism' ? 'border-black opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'}`}
          >
            {t.artDetail.tabs.mulpaism}
          </button>
          <button 
            onClick={() => setActiveTab('artist')}
            className={`text-[16px] leading-[18px] tracking-[0.4em] uppercase transition-all pb-2 border-b ${activeTab === 'artist' ? 'border-black opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'}`}
          >
            {t.artDetail.tabs.artist}
          </button>
          <button 
            onClick={() => setActiveTab('philosophy')}
            className={`text-[16px] leading-[18px] tracking-[0.4em] uppercase transition-all pb-2 border-b ${activeTab === 'philosophy' ? 'border-black opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'}`}
          >
            {t.artDetail.tabs.philosophy}
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
            <h2 className="text-[50px] font-serif mb-12 tracking-tight text-black">{t.artDetail.mulpaismTitle}</h2>
            <div className="w-16 h-px bg-black/20 mb-12" />
            <p className="text-xl md:text-3xl font-serif leading-relaxed tracking-wide opacity-80 text-black whitespace-pre-line mb-24">
              {t.artDetail.mulpaismContent}
            </p>

            <div className="bg-gray-50 p-8 md:p-16 border border-black/5 shadow-inner">
              <div className="max-w-prose mx-auto">
                <h3 className="text-xl md:text-3xl font-serif text-center mb-12 text-black tracking-[0.5em] font-bold opacity-80 decoration-black/5 underline underline-offset-[12px]">
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
        ) : activeTab === 'artist' ? (
          <motion.div
            key="artist"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="py-20 md:py-32 px-4 md:px-8 max-w-5xl mx-auto space-y-36"
          >
            {artists.map((artist: Artist, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1 }}
                className="border-b border-black/5 pb-28 last:border-b-0 last:pb-0"
              >
                {/* 1. 작가명 (Artist Name) & 타이틀 */}
                <div className="text-center space-y-3 mb-8">
                  <h3 className="text-3xl md:text-5xl font-serif tracking-[0.2em] font-light text-black">
                    {artist.name}
                  </h3>
                  <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-slate-400 font-bold">
                    {artist.title}
                  </p>
                </div>

                {/* 2. 작가 프로필 (Artist Profile / Bio) */}
                <div className="max-w-2xl mx-auto text-center px-4 md:px-0 mb-12">
                  <div className="w-12 h-[2px] bg-black/10 mx-auto mb-8" />
                  <p className="text-sm md:text-base font-serif leading-loose text-slate-600 whitespace-pre-line text-justify md:text-center">
                    {artist.bio}
                  </p>
                </div>

                {/* 3. 작가의 사진 (이미지 크게 표현) */}
                <div className="w-full max-w-4xl mx-auto mb-20 px-2">
                  <div className="aspect-[4/3] sm:aspect-[16/10] overflow-hidden bg-slate-50 border border-black/5 relative group shadow-sm transition-all duration-700 hover:shadow-md">
                    <img 
                      src={artist.image} 
                      alt={artist.name} 
                      className="w-full h-full object-cover grayscale brightness-95 group-hover:grayscale-0 group-hover:scale-[1.01] transition-all duration-[1.2s]" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-[9px] tracking-[0.3em] font-mono text-slate-300 text-center uppercase mt-3">
                    Artist Portrait — {artist.name}
                  </p>
                </div>

                {/* 4. Works (각 작품이미지 / 작품명, 크기 / 작품소개 / 비평글) */}
                <div className="space-y-16 mt-28 pt-16 border-t border-black/[0.04]">
                  <div className="text-center mb-16">
                    <span className="text-[10px] tracking-[0.6em] uppercase font-semibold text-slate-400">WORKS</span>
                  </div>
                  <div className="space-y-32 max-w-4xl mx-auto">
                    {artist.works.map((work, wIdx) => (
                      <motion.div 
                        key={wIdx} 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1 }}
                        className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start border-b border-black/[0.03] pb-24 last:border-0 last:pb-0 group"
                      >
                        {/* 작품 이미지 */}
                        <div 
                          onClick={() => setGalleryState({ artist, index: wIdx })}
                          className="md:col-span-7 aspect-[4/3] sm:aspect-[16/12] overflow-hidden bg-[#fdfdfd] border border-black/5 flex items-center justify-center p-6 relative group cursor-pointer shadow-sm hover:shadow-lg transition-all duration-750"
                        >
                          <img 
                            src={work.image} 
                            alt={work.title} 
                            className="max-h-full max-w-full object-contain transition-transform duration-[1s] group-hover:scale-[1.03]" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.01] transition-colors" />
                        </div>
                        {/* 작품 상세 정보 */}
                        <div className="md:col-span-5 space-y-6 flex flex-col pt-2 h-full justify-between select-text cursor-default">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <h4 
                                onClick={() => setGalleryState({ artist, index: wIdx })}
                                className="text-2xl font-serif text-black tracking-tight leading-snug cursor-pointer hover:text-[#5c4033] transition-colors"
                              >
                                {work.title}
                              </h4>
                              {work.size && (
                                <p className="text-[11px] font-mono tracking-widest text-[#a89f91] uppercase">
                                  {work.size}
                                </p>
                              )}
                            </div>
                            
                            {work.introduction && (
                              <div className="space-y-2 border-t border-black/5 pt-4">
                                <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#b5a690] block">작품 소개 / Introduction</span>
                                <p className="text-sm font-serif text-slate-700 leading-relaxed whitespace-pre-line text-justify">
                                  {work.introduction}
                                </p>
                              </div>
                            )}

                            {work.criticism && (
                              <div className="space-y-2 border-t border-black/5 pt-4">
                                <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#b5a690] block">비평 / Commentary</span>
                                <p className="text-xs font-serif text-slate-500 leading-relaxed whitespace-pre-line italic text-justify bg-gray-50/50 p-4 border-l-2 border-[#d3c2b0]">
                                  {work.criticism}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Modal for Work Viewing with Slider */}
            <AnimatePresence>
              {galleryState && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 md:p-12 cursor-pointer"
                  onClick={() => setGalleryState(null)}
                >
                  <button
                    className="absolute top-8 right-8 text-white/50 hover:text-white z-[110] p-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryState(null);
                    }}
                  >
                    <X size={32} />
                  </button>

                  <div 
                    className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center select-none cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Navigation Buttons */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 z-[110]">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setGalleryState(prev => prev ? {
                            ...prev,
                            index: (prev.index - 1 + prev.artist.works.length) % prev.artist.works.length
                          } : null);
                        }}
                        className="p-4 text-white/30 hover:text-white hover:scale-110 transition-all bg-black/20 rounded-full"
                      >
                        <ChevronLeft size={40} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setGalleryState(prev => prev ? {
                            ...prev,
                            index: (prev.index + 1) % prev.artist.works.length
                          } : null);
                        }}
                        className="p-4 text-white/30 hover:text-white hover:scale-110 transition-all bg-black/20 rounded-full"
                      >
                        <ChevronRight size={40} />
                      </button>
                    </div>

                    {/* Image */}
                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                      <motion.img
                        key={galleryState.index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                        src={galleryState.artist.works[galleryState.index].image}
                        className="max-w-full max-h-[70vh] object-contain shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Meta Info */}
                    <div className="text-center mt-6 max-w-2xl px-6 space-y-3 pb-8 text-white select-text">
                      <h4 className="text-2xl font-serif tracking-wide text-white">
                        {galleryState.artist.works[galleryState.index].title}
                      </h4>
                      {galleryState.artist.works[galleryState.index].size && (
                        <p className="text-xs font-mono text-white/40 tracking-widest uppercase">
                          {galleryState.artist.works[galleryState.index].size}
                        </p>
                      )}
                      
                      {galleryState.artist.works[galleryState.index].introduction && (
                        <p className="text-xs font-serif text-white/70 leading-relaxed max-w-prose mx-auto text-center">
                          {galleryState.artist.works[galleryState.index].introduction}
                        </p>
                      )}
                      {galleryState.artist.works[galleryState.index].criticism && (
                        <div className="pt-3 border-t border-white/10 max-w-prose mx-auto text-justify">
                          <span className="text-[8px] tracking-[0.2em] uppercase font-bold text-white/30 block mb-1 text-center">Commentary</span>
                          <p className="text-[11px] italic font-serif text-white/50 leading-relaxed">
                            {galleryState.artist.works[galleryState.index].criticism}
                          </p>
                        </div>
                      )}
                      
                      <div className="pt-4">
                        <span className="text-[9px] tracking-[0.4em] uppercase text-white/40 font-bold block">
                          {galleryState.artist.name}
                        </span>
                        <span className="text-[9px] text-white/20 font-mono">
                          {galleryState.index + 1} / {galleryState.artist.works.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="philosophy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="py-16 px-6 md:px-24 max-w-7xl mx-auto"
          >
            <div className="text-center mb-16 space-y-4">
              <span className="text-[10px] tracking-[0.5em] uppercase font-bold opacity-30">MULPA PHILOSOPHY</span>
              <h2 className="text-3xl md:text-5xl font-serif tracking-tight text-black">
                {t.artDetail.tabs.philosophy}
              </h2>
              <div className="w-12 h-px bg-black/10 mx-auto pt-4" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left Column: Title list */}
              <div className="lg:col-span-4 bg-white p-6 border border-black/5 shadow-sm rounded flex flex-col h-[600px]">
                <h3 className="text-xs font-bold tracking-[0.3em] uppercase opacity-40 mb-6 border-b border-black/5 pb-3">
                  {activeLang === 'KR' ? '철학 글 목차' : activeLang === 'TC' ? '哲學 文章 目錄' : 'Table of Contents'} ({displayPhilosophyItems.length})
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
                  {displayPhilosophyItems.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => setReadingItem(item)}
                      className={`w-full flex items-center justify-between p-4 transition-all duration-300 text-left border rounded ${
                        readingItem?.id === item.id
                          ? 'bg-[#1a1a1a] text-white border-black shadow'
                          : 'bg-[#faf9f6] text-black border-black/5 hover:border-black/20 hover:bg-[#f6f4ed]'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0 pr-2">
                        <span className={`text-[10px] font-mono opacity-40 ${readingItem?.id === item.id ? 'text-white' : 'text-black'}`}>
                          {(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <span className="font-serif text-base truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className={`w-3 h-px transition-all duration-300 shrink-0 ${readingItem?.id === item.id ? 'bg-white/40 w-6' : 'bg-black/10'}`} />
                    </button>
                  ))}
                  {displayPhilosophyItems.length === 0 && (
                    <div className="text-center py-12 text-slate-400 font-serif italic text-sm">
                      {activeLang === 'KR' ? '내용을 준비 중입니다.' : activeLang === 'TC' ? '內容準備中。' : 'Coming soon.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Reading view styled like the declaration/manifesto box */}
              <div className="lg:col-span-8">
                {readingItem ? (
                  <motion.div
                    key={readingItem.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white border border-black/5 p-8 md:p-12 shadow-sm rounded relative min-h-[600px] flex flex-col justify-between overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                      <BookOpen size={160} strokeWidth={0.5} />
                    </div>

                    <div className="relative z-10 space-y-8 pr-4">
                      <div className="border-b border-black/5 pb-6">
                        <h3 className="text-2xl md:text-3xl font-serif text-black leading-tight mb-2">
                          {readingItem.title}
                        </h3>
                        {readingItem.summary && (
                          <p className="text-xs tracking-widest uppercase opacity-40 font-mono mt-2">
                            {readingItem.summary}
                          </p>
                        )}
                      </div>

                      {/* Manifesto style view with custom typography and spacing */}
                      <div className="font-serif text-base md:text-lg leading-loose text-black/80 whitespace-pre-wrap pl-4 border-l-2 border-black/10">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            p: ({ children }) => <div className="mb-6 text-justify leading-relaxed">{children}</div>,
                          }}
                        >
                          {readingItem.content}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {readingItem.image_url && (
                      <div className="mt-8 relative h-48 overflow-hidden rounded border border-black/5 shadow-inner">
                        <img 
                          src={readingItem.image_url} 
                          alt={readingItem.title}
                          className="w-full h-full object-cover grayscale opacity-95 hover:grayscale-0 transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-black/5 flex justify-between items-center text-[10px] tracking-widest font-bold uppercase opacity-30">
                      <span>Mulpa Aesthetics</span>
                      <span>Mind-Matter Philosophy</span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full min-h-[600px] border border-dashed border-black/10 rounded flex flex-col items-center justify-center text-center p-12 bg-white/50">
                    <BookOpen className="opacity-10 mb-4" size={64} strokeWidth={0.5} />
                    <p className="text-lg font-serif italic opacity-30">
                      {activeLang === 'KR' 
                        ? '왼쪽 목차에서 글을 선택하여 읽어보세요.' 
                        : activeLang === 'TC' 
                          ? '請在左側目錄中選擇文章閱讀。' 
                          : 'Select an article from the table of contents to read.'}
                    </p>
                  </div>
                )}
              </div>
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

const DEFAULT_TEA_POEMS: ArchiveItem[] = [
  {
    id: '8b6931fb-bf9f-431e-bf11-c91ffb9ea0fc',
    title: '불한선차의 아침',
    summary: '불한령의 깊은 솔바람과 이슬을 담아 빚은 선차의 노래.',
    content: '### 불한선차의 아침\n\n문경 불한령의 깊은 안개 걷히고\n맑은 이슬 한 모금,\n초의선사의 숨결 어리니\n찻잔 속 푸른 물파가 일렁인다.\n\n한 알의 불한선차,\n뜨거운 물에 온전히 나를 풀 때\n우주가 먼저 머물고\n마음은 마침내 만물과 하나 되니\n\n비우고 가득 채운들 어떠하리\n한 잔의 향기가 온 누리에 스미는데.',
    image_url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '불한선차 시',
    language: 'KR'
  },
  {
    id: 'a43ffb9e-c88f-49ff-bc11-a88f7b7cbfe1',
    title: '弗寒仙茶之晨',
    summary: '吟詠聞慶弗寒嶺高潔松風與甘露所釀製的仙茶之美。',
    content: '### 弗寒仙茶之晨\n\n聞慶弗寒嶺的深霧初開\n清晨的一口甘露\n彷彿草衣禪師的呼吸悄立\n茶盞中碧綠的物波正蕩漾。\n\n一粒弗寒仙茶\n當它在熱水中全然釋放自己\n宇宙已然為之駐足\n而心，終與萬物化為一體。\n\n空無或充盈，又有何妨\n這一杯淡雅之香早已滲透乾坤。',
    image_url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '弗寒仙茶 詩',
    language: 'TC'
  },
  {
    id: '678d8a7c-cfd9-43ef-ba88-e92ffbb1ee8c',
    title: 'Elegance of Bulhan Seoncha',
    summary: 'A poetic dedication to the calming energy and cosmic waves of Bulhan Seoncha.',
    content: '### Elegance of Bulhan Seoncha\n\nDeep in the mists of Bulhan-ryeong,\nWhere the sacred dew descends,\nThe soul of Master Cho-ui breathes\nAs water and leaf unite as friends.\n\nOne tiny pellet of Seoncha,\nDissolving in the boiling stream,\nSpreads the cosmic wave of peace\nLike a gentle, timeless dream.\n\nEmpty or full,\nIt matters no more,\nFor the scent of tea\nRestores the earth\'s floor.',
    image_url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: 'Bulhan Seoncha Poem',
    language: 'EN'
  }
];

const DEFAULT_PHILOSOPHY_ITEMS: ArchiveItem[] = [
  {
    id: 'f93cb566-5e58-45ec-9aef-4fb10efb8b20',
    title: '물파주의 선언문 (物波主義 宣言文)',
    summary: '물파미학의 출발점을 알리는 역사적 선언문.',
    content: '### 물파주의 선언문 (物波主義 宣言文)\n\n20세기는 과학문명의 눈부신 성과에도 불구하고 정신문명은 오히려 쇠퇴의 길을 걸어왔습니다.\n\n물파주의(Mulpaism) 예술이란 **心物論(심물론)**에 근거한 동양 서예정신과 문인화 정신에 입각한 **선의 예술**입니다. 한마디로 정의하면 **물파(물파)란 심물지파(心物之波)**입니다. 단순히 서구 과학의 유물적인 파동도 아니요, 동양 종교의 유심적 마음의 파동도 아닌, 영적인 신기운의 파동(신기파)을 일컫는 것입니다.\n\n글씨와 붓, 먹을 도구 삼아 온 우주의 합일된 생명 파동을 마음에 여과시켜 표현하고자 한 것이 물파예술가들의 출발점이자 사명입니다.\n\n(孫炳哲 / 물파공간 관장)',
    poetry_collection_name: '물파철학',
    language: 'KR',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: '67ca9fce-fcf9-4299-addb-5b51a029307d',
    title: '심물지파론 (心物之波論)',
    summary: '마음과 사물이 빚어내는 살아있는 파동에 관하여.',
    content: '### 심물지파론 (心物之波論)\n\n예술작품은 박제된 대상이 아닙니다.\n\n어떤 존재도 홀로 고정되어 진동을 멈출 수 없습니다. 물결이 바람을 만나 일렁이듯, 가슴 깊은 곳의 참된 자아(心)가 삼라만상(物)이라는 객체와 부딪치는 순간, 무형의 순수한 의식이 유물의 흔적으로 응축됩니다.\n\n이것이 곧 심물지기(心物之氣)이며, 선(線)을 통해 우주적 연대를 확인하는 계기가 됩니다.',
    poetry_collection_name: '물파철학',
    language: 'KR',
    image_url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: '5e4bfa02-4fc3-4b6a-939e-2dcbf1189f3d',
    title: '유무쌍즉론 (有無雙則論)',
    summary: '보이는 형상과 보이지 않는 기운의 순환 법칙.',
    content: '### 유무쌍즉론 (有無雙則論)\n\n무형(無形)과 유형(Type)은 서로 다른 두 세계가 아닙니다.\n\n우주의 법체는 비어있음(無)으로 가득 차 있고, 사물은 채워져 있음(有)으로 비워집니다. 붓이 허공을 가를 때, 먹선은 있음을 증명하고 여백은 자리를 지킵니다.\n\n그릇이 비어있어야 무엇을 담을 수 있듯, 찻잔이 비워지고 내면의 번뇌가 소멸할 때 새로운 깨달음의 빛(자연명기)이 비치게 될 것입니다.',
    poetry_collection_name: '물파철학',
    language: 'KR',
    image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: '1e4e1a0b-21d1-4db8-99b8-3ec87be3ee80',
    title: '物波主義 宣言文',
    summary: '宣告物波美學的出發點與哲學基礎。',
    content: '### 物波主義 宣言文\n\n20世紀雖然科學文明取得了令人矚目的成就，但人們仍批評精神文明反而走上了衰落之路。\n\n物波主義（Mulpaism）藝術是立足於心物論式的東方書法精神和文人畫精神的**線的藝術**。一言以跡之，**物波即心物之波**。它不僅僅是西方科學的唯物性的物的波，而是作為線的藝術的心物之波。\n\n這也正是物波藝術家自覺認識的全新起點。\n\n（孫炳哲 / 物波空間 館長）\n1997. 12. 12.',
    poetry_collection_name: '物波哲學',
    language: 'TC',
    image_url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1200'
  },
  {
    id: 'b75fbe8e-a20c-4e5b-b9f1-396868af2d2a',
    title: '心物之波論',
    summary: '關於心靈與物質交融激盪而出的生命波動。',
    content: '### 心物之波論\n\n藝術作品並非被製成標本的對象。\n\n創作者的心(心)與對象(物)相遇產生的波動，透過材料與形式凝聚於那一條筆墨之線中。此一波動，在與鑑賞者相遇時，將會重新開始在觀者心頭盪漾開來，激發宇宙間的廣泛共鳴。',
    poetry_collection_name: '物波哲學',
    language: 'TC',
    image_url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1200'
  },
  {
    id: '8cb38de9-e688-466d-8bc4-de976afdeffd',
    title: '有無雙則論',
    summary: '揭示形象與精神、虛與實的循環規律。',
    content: '### 有無雙則論\n\n無形（心、氣、靈感）透過筆墨形象的有形展現於世。完成的有形作品，又將與觀者相遇而轉化為無形，化為心靈深處的餘韻。無與有，互為依仗，周而復始。',
    poetry_collection_name: '物波哲學',
    language: 'TC',
    image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200'
  },
  {
    id: '50e9ef6d-ee0e-43cc-8968-dec512dbfe12',
    title: 'Mulpaism Declaration',
    summary: 'The historic declaration outlining the foundations of Mulpaism Art.',
    content: '### Mulpaism Declaration\n\nDespite the dizzying achievements of 20th-century technology, our spiritual civilization has walked the path of decline.\n\nMulpaism is an **art of lines** based on the Mind-Matter Philosophy. In one word, **Mulpa is the wave of mind and matter**. It is a wave of spiritual and energetic new vitality, a divine vitality wave, carrying forward the ink and brush tradition to the 21st century.\n\n(Sun Byung-chul / Director of Mulpa Space)\nDecember 12, 1997',
    poetry_collection_name: 'Mulpa Philosophy',
    language: 'EN',
    image_url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1200'
  },
  {
    id: '967d3e91-72ef-4ca5-b8fb-98e3ca91ffd0',
    title: 'On the Wave of Mind-Matter',
    summary: 'Exploring the dynamic wave pattern formed by the merging of conscious mind and external object.',
    content: '### On the Wave of Mind-Matter\n\nArt is not a passive or static object.\n\nIt is the lively resonance of the creator\'s inner self merging with the material essence of the universe. When the ink meets paper, it captures this active wave of existence, allowing viewers to revive and complete that exact cosmic motion within their own hearts.',
    poetry_collection_name: 'Mulpa Philosophy',
    language: 'EN',
    image_url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1200'
  },
  {
    id: '921ecde0-eb14-416d-9be2-cc835def8afd',
    title: 'On the Dual Law of Being and Non-being',
    summary: 'The eternal circulation between the formless spirit and the physical manifestation.',
    content: '### On the Dual Law of Being and Non-being\n\nThe visible (form) and the invisible (vitality/spaces) are two sides of the same coin. Just as a cup must be empty to serve its purpose, a line of calligraphy relies on the surrounding emptiness. The visible brush stroke establishes presence, while the negative space invites eternal dreaming.',
    poetry_collection_name: 'Mulpa Philosophy',
    language: 'EN',
    image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200'
  }
];

const DEFAULT_JOURNEY_PHOTOS: ArchiveItem[] = [
  {
    id: '8c919245-c8cc-4d37-889a-6a5cf8a791a0',
    title: '동양 선(線) 미학 국제 학술보고 (International Symposium on Oriental Line Aesthetics)',
    summary: '동서양 예술인들이 모인 자리에서 물파선과 심물 사상을 발표하는 라석 시인.',
    content: '### 동양 선(線) 미학 국제 학술보고\n\n1997년 겨울, 서울에서 개최된 동양 미학 국제 심포지엄에서 라석 손병철 선생은 "동양의 선 예술은 단순한 잉크의 궤적이 아니라 심물지기(心物之氣)의 발현"임을 학술적으로 천명하였습니다.\n\n이 행사에서 세계적인 미학자들과 동서 교류의 새로운 방법론으로서 물파주의(Mulpaism)를 토론하며 현대 미술의 새로운 나침반을 제안했습니다.',
    image_url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '라석여정 - 활동사진',
    language: 'KR'
  },
  {
    id: 'f9b418de-b4f0-410a-b362-e64fcbce46ff',
    title: '문경 불한령 선차 수확 및 시원 (Bulhan-ryeong Tea Harvest)',
    summary: '문경 불한령의 야생 차밭에서 첫 찻잎을 거두며 생명 순환을 찬미하는 시인.',
    content: '### 문경 불한령 선차 수확 및 시원\n\n초의선사의 선다 정신이 살아 숨 쉬는 경북 문경 불한령 대자연 속에서, 눈 속에서도 기운을 품고 자란 찻잎을 정성스럽게 채취하는 여정입니다.\n\n시인은 한 알의 불한선차(차까오)가 완벽한 우주적 파동을 품고 우리 몸에 녹아들기 전, 그 생명력의 출발점에서 대자연에 깊은 경의를 담아 참선을 진행했습니다.',
    image_url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '라석여정 - 활동사진',
    language: 'KR'
  },
  {
    id: '960cda2d-ea0b-48af-ace1-2b638e5cbfe1',
    title: '東方線條美學 國際學術報告',
    summary: '羅石詩人在東西方藝術家聚集的論壇上發表物波線條與心物思想。',
    content: '### 東方線條美學 國際學術報告\n\n1997年冬，在首爾舉辦的東方美學國際研討會上，羅石孫炳哲先生在學術上闡明瞭：“東方的線條藝術並不是單純墨汁的軌跡，而是心物之氣的體現。”\n\n在此次活動中，他與世界級美學家共同討論了作為東西方交流新方法論的物波主義（Mulpaism），為現代美術提供了全新的指南。',
    image_url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '羅石旅程 - 活動照片',
    language: 'TC'
  },
  {
    id: '01a5eefc-9a48-43d9-ab77-bc43cebaefea',
    title: '聞慶弗寒嶺 仙茶採摘與始源',
    summary: '詩人在聞慶弗寒嶺野生茶園採集清晨新葉，讚頌生命循環之美。',
    content: '### 聞慶弗寒嶺 仙茶採摘與始源\n\n在草衣禪師仙茶精神生生不息的慶尚北道聞慶弗寒嶺大自然中，詩人細心採摘在冰雪中依然孕育著蓬勃生機的茶葉。\n\n在每一顆弗寒仙茶（茶膏）蘊含完整的宇宙波動並在我們體內融化之前，詩人在其生命力的起點上對大自然致以深切的敬意。',
    image_url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '羅石旅程 - 活動照片',
    language: 'TC'
  },
  {
    id: '9db45aee-68bb-4bfa-bede-409fcbce7001',
    title: 'International Forum on Line Aesthetics',
    summary: 'Poet Lasok presenting on Mulpa Wave and Mind-Matter philosophy at an international summit.',
    content: '### International Forum on Line Aesthetics\n\nIn the winter of 1997, during the International Symposium on Oriental Aesthetics in Seoul, Sun Byung-chul (Lasok) scientifically declared that "the Asian ink line is not a simple physical mark, but the physical manifestation of spirit-matter resonance (Qi)."\n\nAt this historical speech, he discussed Mulpaism with prominent global curators as a new paradigm for cross-cultural artistic creation.',
    image_url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: 'Lasok Journey - Activity Photos',
    language: 'EN'
  },
  {
    id: 'eab8900a-debb-4ea4-7b77-cfefbeab1a0f',
    title: 'Tea Harvest and Meditation at Bulhan-ryeong',
    summary: 'Poet Lasok harvesting wild tea buds deep in Mungyeong forests, honoring life\'s cycle.',
    content: '### Tea Harvest and Meditation at Bulhan-ryeong\n\nUnder the ancient trees of Bulhan-ryeong where Master Cho-ui\'s legacy resides, the poet harvested raw green tea buds that survived winter frost with unmatched inner strength.\n\nThis captures the exact spiritual beginning of Bulhan Seoncha (Tea paste) before it dissolves to restore our internal peace.',
    image_url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: 'Lasok Journey - Activity Photos',
    language: 'EN'
  }
];

const DEFAULT_JOURNEY_PRESS: ArchiveItem[] = [
  {
    id: 'fa2ca13d-deee-4fe4-add9-9db4f9be9901',
    title: '[인터뷰] 시인 라석, 선차(禪茶)의 향기로 현대인의 영혼을 가꾸다',
    summary: '동방문학신문 - 2024년 신춘 특별대담',
    content: '### 선차(禪茶)의 향기로 현대인의 영혼을 가꾸다\n\n"인간의 삶은 가속화되고 있지만, 우리의 영혼은 잠시 쉴 자리를 찾지 못해 헤매고 있습니다." 시인 라석 손병철 선생은 최근 출간한 심물시집과 더불어, 문경 불한선차의 보급이 단순한 차 마시기가 아닌 내면의 깊은 울림을 찾기 위한 과정이라고 설파했다.\n\n시인은 차와 시의 공통점에 대해 "둘 다 눈에 보이지 않는 무형의 기운을 유형의 결과물(찻잔의 맛, 종이 위의 글씨)로 이끌어내어 타인의 마음을 비추는 영사기 같은 역할을 한다"고 설명했다.',
    image_url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '라석여정 - 언론보도',
    language: 'KR'
  },
  {
    id: '6caefbe2-89cc-4a00-1111-e64cbcee8da0',
    title: '동방 문화의 기품, 묵선(墨線)의 에너지가 유럽 심장부 벨기에를 물들이다',
    summary: '벨기에 국영 매체 예술 리뷰 - 브뤼셀 특별전 보도',
    content: '### 동방 문화의 기품, 선(線)의 파동 벨기에를 물들이다\n\n벨기에 브뤼셀 예술 센터에서 열린 "물파주의(Mulpaism) 선묵전"에서 평론가들은 가볍고 빠른 현대 예술 사이에서 라석 시인의 철학이 담긴 두터운 선들이 엄청난 내세적 힘을 발휘하고 있다고 평가했다.\n\n특히 문인화를 원류로 하는 선의 힘과 마음을 맑게 하는 차의 수양이 보여주는 동양 미학의 심오함에 왕실과 교포 사회 모두가 영감과 치유를 경험했다는 찬사가 잇따랐다.',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '라석여정 - 언론보도',
    language: 'KR'
  },
  {
    id: 'ab2cd3ef-4f1b-4cf7-9a00-88cbdfbcee70',
    title: '【專訪】羅石詩人：以禪茶之香，灌溉現代人的心靈荒漠',
    summary: '東方文學報 - 2024年新春特別對談',
    content: '### 以禪茶之香，灌溉現代人的心靈荒漠\n\n“人類生活的節奏正在加快，但我們的心靈卻因為找不到片刻安歇而四處漂泊。” 羅石詩人表示，近期出版的心物詩集與聞慶弗寒仙茶的推廣，並非單純的品茗，而是尋找內心深處共鳴的旅程。\n\n詩人闡述茶與詩的共通之處：“二者皆是將看不見、摸不著的無形氣息，凝聚為有形的成果（茶盞中的甘露，紙面上的詩行），如同一臺映照他人心扉的投影儀。”',
    image_url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '羅石旅程 - 媒體報導',
    language: 'TC'
  },
  {
    id: 'bc3de4fg-5f2c-4ef8-ab11-99ccdfbcee80',
    title: '東方文化之風骨，墨線的生命動能激盪外邦',
    summary: '比利時國家電視臺文藝專題 - 布魯塞爾特展報導',
    content: '### 東方文化之風骨，墨線的生命動能激盪外邦\n\n在比利時布魯塞爾舉辦的“物波主義線條藝術展”上，歐洲評論家高度讚揚羅石詩人作品中展現的生命哲학，指出在瞬息萬變的快餐文化時代，其作品中蒼勁的墨線和富含哲思的空靈感具有強烈的震撼力。\n\n比利時王室及當地文化界紛紛對這種源於東方先賢、以詩茶相輔相成的修身美學表達了極大的驚歎。',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: '羅石旅程 - 媒體報導',
    language: 'TC'
  },
  {
    id: 'cd4ef5gh-6b3a-4da2-bcd2-aa8defabcee1',
    title: '[Interview] Poet Lasok: Nurturing the Soul of Modernity with Seoncha',
    summary: 'Oriental Literary Times - 2024 Spring Special Edition',
    content: '### Nurturing the Soul of Modernity with Seoncha\n\n"Human civilization moves too fast, but our spiritual self is drifting, unable to find a resting place." Poet Lasok Sun Byung-chul shared that his poetry collections combined with Mungyeong Bulhan Seoncha are not an advertisement for tea, but a spiritual calling.\n\nHe defined the union of poetry and tea: "Both draw formless, spiritual intent into tangible existence (the warmth of a tea cup, the line on paper), working together like a spiritual cinema to illuminate foreign hearts."',
    image_url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: 'Lasok Journey - Media Press',
    language: 'EN'
  },
  {
    id: 'de5fg6hi-7c4b-4da3-bda3-bb9defabcde2',
    title: 'The Dignity of Ink: Mulpa Lines Resonate in the Heart of Brussels',
    summary: 'Belgian Gazette Arts Review - Special Report from Brussels Exhibition',
    content: '### The Dignity of Ink: Mulpa Lines Resonate in Brussels\n\nCritics at the Brussels Arts Center exhibition representing "Mulpaism Ink & Spirit" observed that while modern commercial art is light and fleeting, Lasok\'s heavy, intentional line strokes command immense contemplative gravity.\n\nThe royal attendees and European scholars expressed profound gratitude for experiencing this visual Zen philosophy, noting it acts as a much-needed remedy for spiritual exhaustion.',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200',
    poetry_collection_name: 'Lasok Journey - Media Press',
    language: 'EN'
  }
];

const JourneyPage = ({ t, setPage, archiveItems }: { t: any; setPage: (p: Page) => void; archiveItems: ArchiveItem[] }) => {
  const activeLang = t.nav.about === '소개' ? 'KR' : t.nav.about === '關於' ? 'TC' : 'EN';
  const [selectedJourneyItem, setSelectedJourneyItem] = useState<ArchiveItem | null>(null);
  const [journeyTab, setJourneyTab] = useState<'photos' | 'press'>('photos');

  // Journey Photos (라석여정 - 활동사진)
  let journeyPhotos = (archiveItems || []).filter(item => {
    const colName = item.poetry_collection_name;
    return (
      colName === '라석여정 - 활동사진' ||
      colName === '羅石旅程 - 活動照片' ||
      colName === 'Lasok Journey - Activity Photos'
    ) && item.language === activeLang;
  });

  if (journeyPhotos.length === 0) {
    journeyPhotos = DEFAULT_JOURNEY_PHOTOS.filter(item => item.language === activeLang);
  }

  // Journey Press (라석여정 - 언론보도)
  let journeyPress = (archiveItems || []).filter(item => {
    const colName = item.poetry_collection_name;
    return (
      colName === '라석여정 - 언론보도' ||
      colName === '羅石旅程 - 媒體報導' ||
      colName === 'Lasok Journey - Media Press'
    ) && item.language === activeLang;
  });

  if (journeyPress.length === 0) {
    journeyPress = DEFAULT_JOURNEY_PRESS.filter(item => item.language === activeLang);
  }

  const journeySectionTitle = activeLang === 'KR' 
    ? '라석여정 (羅石旅程)' 
    : activeLang === 'TC' 
      ? '羅石旅程' 
      : "Lasok's Journey";

  const journeySectionSub = activeLang === 'KR'
    ? '시인 라석의 활동사진과 언론 미디어 기록'
    : activeLang === 'TC'
      ? '詩人羅石的活動照片與媒體報導記錄'
      : 'Activity photos and media press archives of Poet Lasok';

  const photoTabLabel = activeLang === 'KR' ? '활동사진' : activeLang === 'TC' ? '活動照片' : 'Activity Photos';
  const pressTabLabel = activeLang === 'KR' ? '언론 미디어' : activeLang === 'TC' ? '媒體報導' : 'Media Coverage';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-white min-h-screen pt-24"
    >
      {/* Lasok Journey Section (라석여정 목록) */}
      <section className="py-24 bg-white border-b border-black/5">
        <div className="container mx-auto px-6 md:px-24">
          <div className="text-center mb-16 space-y-4">
            <span className="text-[10px] tracking-[0.5em] uppercase font-bold opacity-30">Lasok Journey Archive</span>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight text-black">{journeySectionTitle}</h2>
            <p className="text-slate-500 font-serif italic text-base md:text-lg">{journeySectionSub}</p>
            <div className="w-12 h-px bg-black/10 mx-auto pt-4" />
          </div>

          {/* Tab Switcher */}
          <div className="flex justify-center gap-8 mb-16 border-b border-black/5 pb-4 max-w-md mx-auto">
            <button
              onClick={() => setJourneyTab('photos')}
              className={`pb-4 px-4 text-xs tracking-[0.3em] uppercase font-bold transition-all relative ${
                journeyTab === 'photos' ? 'text-black font-extrabold' : 'text-black/30 hover:text-black/70'
              }`}
            >
              {photoTabLabel} ({journeyPhotos.length})
              {journeyTab === 'photos' && (
                <motion.div layoutId="journeyUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
            <button
              onClick={() => setJourneyTab('press')}
              className={`pb-4 px-4 text-xs tracking-[0.3em] uppercase font-bold transition-all relative ${
                journeyTab === 'press' ? 'text-black font-extrabold' : 'text-black/30 hover:text-black/70'
              }`}
            >
              {pressTabLabel} ({journeyPress.length})
              {journeyTab === 'press' && (
                <motion.div layoutId="journeyUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          </div>

          {/* Journey List/Grid */}
          <div className="max-w-6xl mx-auto">
            {journeyTab === 'photos' ? (
              journeyPhotos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {journeyPhotos.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1, duration: 0.6 }}
                      className="group border border-black/5 p-6 bg-[#fcfbf9] hover:bg-white hover:border-black/10 hover:shadow-xl transition-all duration-500 flex flex-col h-full cursor-pointer"
                      onClick={() => setSelectedJourneyItem(item)}
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-gray-100 mb-6 relative">
                        <img
                          src={item.image_url || DEFAULT_IMAGE}
                          alt={item.title}
                          className="w-full h-full object-cover grayscale brightness-95 group-hover:scale-105 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 right-4 bg-white/90 text-black border border-black/10 px-2 py-1 text-[8px] tracking-widest font-mono uppercase">
                          Photo 0{idx + 1}
                        </div>
                      </div>
                      <div className="space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <h3 className="text-base font-serif text-black group-hover:text-black/70 transition-colors leading-tight line-clamp-2">
                            {item.title}
                          </h3>
                          <p className="text-xs text-black/50 font-serif leading-relaxed line-clamp-3">
                            {item.summary}
                          </p>
                        </div>
                        <div className="pt-4 border-t border-black/5 flex justify-between items-center text-[9px] tracking-[0.2em] font-bold uppercase opacity-40 group-hover:opacity-100 transition-all">
                          <span>See Details</span>
                          <span>→</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed border-black/10 bg-[#fefefe]/50">
                  <p className="text-sm font-serif italic opacity-40">No photos shared yet.</p>
                </div>
              )
            ) : (
              journeyPress.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {journeyPress.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1, duration: 0.6 }}
                      className="group border border-black/5 p-8 bg-white hover:border-black/20 hover:shadow-xl transition-all duration-500 flex flex-col sm:flex-row gap-6 items-start cursor-pointer"
                      onClick={() => setSelectedJourneyItem(item)}
                    >
                      <div className="w-full sm:w-1/3 aspect-[4/3] sm:aspect-square overflow-hidden bg-gray-100 shrink-0 relative">
                        <img
                          src={item.image_url || DEFAULT_IMAGE}
                          alt={item.title}
                          className="w-full h-full object-cover grayscale brightness-95 group-hover:scale-105 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="space-y-4 flex-1 flex flex-col h-full justify-between">
                        <div className="space-y-2">
                          <span className="text-[9px] tracking-widest font-mono uppercase opacity-40">
                            {item.summary}
                          </span>
                          <h3 className="text-lg font-serif text-black leading-snug group-hover:text-black/70 transition-colors line-clamp-3">
                            {item.title}
                          </h3>
                        </div>
                        <div className="pt-4 border-t border-black/5 flex justify-between items-center text-[9px] tracking-[0.2em] font-bold uppercase opacity-40 group-hover:opacity-100 transition-all w-full">
                          <span>Read Article</span>
                          <span>→</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed border-black/10 bg-[#fefefe]/50">
                  <p className="text-sm font-serif italic opacity-40">No press archives shared yet.</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Journey Detail Modal */}
      <AnimatePresence>
        {selectedJourneyItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative border border-black/5"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedJourneyItem(null)}
                className="absolute top-6 right-6 text-black bg-white/85 hover:bg-white p-2 rounded-full border border-black/10 z-10 transition-all shadow-sm"
              >
                <X size={18} />
              </button>

              <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                <img
                  src={selectedJourneyItem.image_url || DEFAULT_IMAGE}
                  alt={selectedJourneyItem.title}
                  className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 transition-all duration-[1s]"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="p-8 space-y-6 text-black">
                <div className="space-y-2">
                  <span className="text-[9px] tracking-[0.4em] font-mono uppercase bg-gray-100 border border-black/5 px-3 py-1 text-black/50">
                    {selectedJourneyItem.summary}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-serif text-black leading-tight pt-2">
                    {selectedJourneyItem.title}
                  </h3>
                </div>

                <div className="w-12 h-px bg-black/10" />

                <div className="prose prose-sm max-w-none text-black/80 font-serif leading-relaxed markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {selectedJourneyItem.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TeaDetailPage = ({ t, setPage, currentTeaImage, siteSettings, archiveItems }: { t: any; setPage: (p: Page) => void; currentTeaImage: string; siteSettings: SiteSettings | null; archiveItems: ArchiveItem[] }) => {
  const tea = t.teaDetail;
  const activeLang = t.nav.about === '소개' ? 'KR' : t.nav.about === '關於' ? 'TC' : 'EN';
  
  let teaPoems = (archiveItems || []).filter(item => {
    const colName = item.poetry_collection_name;
    const isTeaCollection = colName === '불한선차 시' || colName === '弗寒仙茶 詩' || colName === 'Bulhan Seoncha Poem';
    return isTeaCollection && item.language === activeLang;
  });

  if (teaPoems.length === 0) {
    teaPoems = DEFAULT_TEA_POEMS.filter(item => item.language === activeLang);
  }

  const [readingPoem, setReadingPoem] = useState<ArchiveItem | null>(null);

  useEffect(() => {
    if (teaPoems.length > 0 && !readingPoem) {
      setReadingPoem(teaPoems[0]);
    }
  }, [teaPoems, readingPoem]);

  const sectionTitle = activeLang === 'KR' 
    ? '불한선차 시 연재' 
    : activeLang === 'TC' 
      ? '弗寒仙茶 詩 連載' 
      : 'Bulhan Seoncha Poetry Series';

  const sectionSub = activeLang === 'KR'
    ? '생명과 차의 파동을 읊는 시편'
    : activeLang === 'TC'
      ? '吟詠生命與茶之波動的詩篇'
      : 'Psalms Humming the Resonance of Life and Tea';

  const selectPrompt = activeLang === 'KR'
    ? '목록에서 작품을 선택하여 아래에서 읽어보세요.'
    : activeLang === 'TC'
      ? '請在下方目錄中選擇作品閱讀。'
      : 'Select a poem from the list below to read.';
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-[#fcfbf9] text-[#1a1a1a] selection:bg-black selection:text-white"
    >
      {/* Hero Section */}
      <header className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden py-24">
        <div className="absolute inset-0 z-0">
          <img 
            src={currentTeaImage} 
            alt="Bulhan Suncha" 
            className="w-full h-full object-cover grayscale opacity-[0.1] scale-110"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            className="space-y-8 max-w-4xl"
          >
            <div className="inline-block px-4 py-1 border border-black/10 rounded-full text-[10px] tracking-[0.4em] uppercase font-bold mb-4">
              Bio-Tea Revolution
            </div>
            <h1 className="text-3xl md:text-5xl font-serif tracking-tight leading-none mb-6">
              {tea.hero.title}
            </h1>
            <p className="text-xl md:text-2xl font-serif tracking-widest opacity-60 max-w-2xl mx-auto italic">
              {tea.hero.subtitle}
            </p>
            <div className="w-12 h-px bg-black/20 mx-auto my-12" />
            <p className="text-lg md:text-xl font-serif leading-relaxed tracking-wide opacity-80 max-w-2xl mx-auto">
              {tea.hero.description}
            </p>
          </motion.div>
        </div>
        
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-20 animate-bounce">
          <ChevronDown size={32} />
        </div>
      </header>

      {/* Bulhan Seoncha Poetry Serialization Section */}
      <section className="py-24 bg-[#fbfaf5] border-t border-b border-black/5">
        <div className="container mx-auto px-6 md:px-24">
          <div className="text-center mb-16 space-y-4">
            <span className="text-[10px] tracking-[0.5em] uppercase font-bold opacity-30">Poetry Series</span>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight text-black">{sectionTitle}</h2>
            <p className="text-slate-500 font-serif italic text-base md:text-lg">{sectionSub}</p>
            <div className="w-12 h-px bg-black/10 mx-auto pt-4" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
            {/* Left Column: Poem Select List */}
            <div className="lg:col-span-4 bg-white p-6 border border-black/5 shadow-sm rounded flex flex-col h-[500px]">
              <h3 className="text-xs font-bold tracking-[0.3em] uppercase opacity-40 mb-6 border-b border-black/5 pb-3">
                {activeLang === 'KR' ? '시 목록' : activeLang === 'TC' ? '詩 目錄' : 'Poem List'} ({teaPoems.length})
              </h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
                {teaPoems.map((poem, idx) => (
                  <button
                    key={poem.id}
                    onClick={() => setReadingPoem(poem)}
                    className={`w-full flex items-center justify-between p-4 transition-all duration-300 text-left border rounded ${
                      readingPoem?.id === poem.id
                        ? 'bg-[#1a1a1a] text-white border-black shadow'
                        : 'bg-[#faf9f6] text-black border-black/5 hover:border-black/20 hover:bg-[#f6f4ed]'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 pr-2">
                      <span className={`text-[10px] font-mono opacity-40 ${readingPoem?.id === poem.id ? 'text-white' : 'text-black'}`}>
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <span className="font-serif text-base truncate">
                        {poem.title}
                      </span>
                    </div>
                    <div className={`w-3 h-px transition-all duration-300 shrink-0 ${readingPoem?.id === poem.id ? 'bg-white/40 w-6' : 'bg-black/10'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Poem display body */}
            <div className="lg:col-span-8">
              {readingPoem ? (
                <motion.div
                  key={readingPoem.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white border border-black/5 p-8 md:p-12 shadow-sm rounded relative min-h-[500px] flex flex-col justify-between overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <BookOpen size={160} strokeWidth={0.5} />
                  </div>

                  <div className="relative z-10 space-y-12 pr-4">
                    <div className="border-b border-black/5 pb-6">
                      <h3 className="text-2xl md:text-3xl font-serif text-black leading-tight mb-2">
                        {readingPoem.title}
                      </h3>
                      {readingPoem.summary && (
                        <p className="text-xs tracking-widest uppercase opacity-40 font-mono mt-2">
                          {readingPoem.summary}
                        </p>
                      )}
                    </div>

                    <div className="font-serif text-lg md:text-xl leading-[1.85] text-black/80 whitespace-pre-wrap pl-4 border-l-2 border-black/10 select-text text-left">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <div className="mb-6 leading-[1.85] select-text">{children}</div>,
                          br: () => <br className="hidden" />
                        }}
                      >
                        {readingPoem.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {readingPoem.image_url && (
                    <div className="mt-8 relative h-32 md:h-48 overflow-hidden rounded border border-black/5 shadow-inner">
                      <img 
                        src={readingPoem.image_url} 
                        alt={readingPoem.title}
                        className="w-full h-full object-cover grayscale opacity-95 hover:grayscale-0 transition-all duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-black/5 flex justify-between items-center text-[10px] tracking-widest font-bold uppercase opacity-30">
                    <span>Son Lasok Ph.D.</span>
                    <span>Bulhan Seoncha</span>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[500px] border border-dashed border-black/10 rounded flex flex-col items-center justify-center text-center p-12 bg-white/50">
                  <BookOpen className="opacity-10 mb-4" size={64} strokeWidth={0.5} />
                  <p className="text-lg font-serif italic opacity-30">
                    {selectPrompt}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Science & Discovery Section */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="container mx-auto px-6 md:px-24">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <span className="text-[10px] tracking-[0.5em] uppercase font-bold opacity-30">The Discovery</span>
                {activeLang === 'KR' ? (
                  <h2 className="font-serif leading-snug tracking-wide text-black flex flex-col gap-1">
                    <span className="block text-xs md:text-sm uppercase tracking-widest font-bold opacity-40">핵심발명:</span>
                    <span className="block text-[24px] md:text-[32px] font-medium mt-1 leading-normal text-[#1a1a1a]">'사씨 보이차 스타틴'</span>
                    <span className="block text-[16px] md:text-[20px] opacity-40 font-medium italic mt-1">(Xie's Pu-erh Tea Statins)</span>
                  </h2>
                ) : (
                  <h2 className="text-2xl md:text-4xl font-serif leading-tight text-black">
                    {tea.invention.title}
                  </h2>
                )}
              </div>
              
              <div className="space-y-6">
                <p className="text-xl font-serif italic opacity-60">By {tea.invention.author}</p>
                <p className="text-lg md:text-xl leading-relaxed opacity-80">
                  {tea.invention.desc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                {tea.invention.benefits.map((benefit: any, idx: number) => (
                  <div key={idx} className="space-y-4 p-6 bg-[#f9f9f9] border border-black/5 hover:border-black/20 transition-all">
                    <h4 className="text-xs tracking-widest font-bold uppercase">{benefit.title}</h4>
                    <p className="text-xs opacity-50 leading-relaxed font-serif">{benefit.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5 }}
              className="relative aspect-square"
            >
              <div className="absolute inset-0 border border-black/5 -rotate-3" />
              <img 
                src="/assets/science_discovery_new.jpg" 
                alt="Science Discovery" 
                className="w-full h-full object-cover grayscale brightness-90"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-black p-8 flex items-center justify-center text-white text-center">
                <p className="text-[9px] tracking-[0.3em] font-bold uppercase leading-relaxed">Verified for Space Exploration</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process Section - 20kg to 1kg */}
      <section className="py-32 bg-[#1a1a1a] text-white">
        <div className="container mx-auto px-6 md:px-24">
          <div className="max-w-4xl mx-auto text-center space-y-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-xl md:text-3xl lg:text-4xl font-serif tracking-wide leading-tight md:whitespace-nowrap text-center">
                {tea.features.title}
              </h2>
              <p className="text-lg md:text-xl font-serif opacity-50 tracking-widest">
                {tea.features.description}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-12 text-left">
              {tea.features.items.map((item: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2 }}
                  className="space-y-6 p-8 border border-white/5 hover:bg-white/5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-[10px] group-hover:bg-white group-hover:text-black transition-all">
                    0{idx + 1}
                  </div>
                  <h3 className="text-xl font-serif tracking-widest">{item.title}</h3>
                  <p className="text-sm opacity-40 leading-relaxed font-light">{item.desc}</p>
                </motion.div>
              ))}
            </div>
            
            <div className="pt-24 opacity-10">
               <p className="text-7xl md:text-[120px] font-serif leading-none tracking-tighter">20KG → 1KG</p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6 md:px-24">
          <div className="grid lg:grid-cols-2 gap-24 items-start">
            <div className="sticky top-32 space-y-8">
              <span className="text-[10px] tracking-[0.5em] uppercase font-bold opacity-30">Brand Essence</span>
              {activeLang === 'KR' ? (
                <h2 className="font-serif leading-snug tracking-wide text-black flex flex-col gap-1">
                  <span className="block text-lg md:text-2xl font-light opacity-50">브랜드 철학:</span>
                  <span className="block text-[26px] md:text-[36px] font-medium leading-normal text-[#1a1a1a] mt-1">불한(弗寒)과 선(仙), 차(茶) 미학</span>
                </h2>
              ) : (
                <h2 className="text-3xl md:text-5xl font-serif leading-tight text-black">
                  {tea.philosophy.title}
                </h2>
              )}
              <div className="w-12 h-px bg-black" />
            </div>

            <div className="space-y-24">
              {tea.philosophy.items.map((item: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="space-y-8 pb-12 border-b border-black/5 last:border-0"
                >
                  <h3 className="text-3xl md:text-4xl font-serif tracking-widest">{item.name}</h3>
                  <p className="text-lg md:text-xl font-serif leading-relaxed opacity-60 tracking-wide">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Storage Section */}
      <section className="py-32 bg-[#f9f9f9]">
        <div className="container mx-auto px-6 md:px-24">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               className="relative aspect-[3/4] md:aspect-square group overflow-hidden"
            >
              <img 
                src="/assets/ceramic_gourd_new.jpg" 
                alt="Ceramic Gourd" 
                className="w-full h-full object-cover grayscale transition-all duration-[3s] group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-[2s]" />
            </motion.div>

            <div className="space-y-16">
              <div className="space-y-4">
                <span className="text-[10px] tracking-[0.5em] uppercase font-bold opacity-30">{tea.storage.subtitle}</span>
                {activeLang === 'KR' ? (
                  <h2 className="font-serif leading-snug tracking-wide text-black flex flex-col gap-1">
                    <span className="block text-lg md:text-2xl font-light opacity-50">보관의 미학:</span>
                    <span className="block text-[26px] md:text-[36px] font-medium leading-normal text-[#1a1a1a] mt-1">"숨 쉬는 도자 호리병"</span>
                  </h2>
                ) : (
                  <h2 className="text-4xl md:text-6xl font-serif leading-tight">
                    {tea.storage.title}
                  </h2>
                )}
              </div>

              <div className="space-y-10">
                {tea.storage.items.map((item: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex gap-8 group"
                  >
                    <div className="text-xs font-mono opacity-20 group-hover:opacity-100 transition-opacity">0{idx + 1}</div>
                    <div className="space-y-2">
                       <h4 className="text-lg font-serif tracking-widest">{item.title}</h4>
                       <p className="text-sm font-serif opacity-50 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Section */}
      <section className="py-48 bg-white border-b border-black/5">
        <div className="container mx-auto px-6 text-center max-w-4xl space-y-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <p className="text-2xl md:text-4xl font-serif leading-[1.6] tracking-widest opacity-80 italic">
              "{tea.quote}"
            </p>
            <div className="tracking-[0.4em] uppercase font-bold opacity-30" style={{ color: '#081473', fontSize: '23px', lineHeight: '18px', fontFamily: 'Times New Roman' }}>— Son Lasok Ph.D.</div>
          </motion.div>

          <div className="space-y-10">
            <h3 className="text-2xl md:text-3xl font-serif tracking-[0.3em] font-light">
               {tea.final}
            </h3>
          </div>

          <div className="pt-24 space-y-8">
            <h4 className="text-[10px] tracking-[0.5em] uppercase font-bold opacity-30">{tea.usage.title}</h4>
            <p className="text-lg font-serif opacity-60 leading-relaxed tracking-wide max-w-xl mx-auto">
              {tea.usage.desc}
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="pt-24"
          >
            <img 
              src="/assets/tea_usage_bottom.jpg" 
              alt="Tea Usage" 
              className="w-full max-w-4xl mx-auto rounded-lg shadow-2xl grayscale hover:grayscale-0 transition-all duration-1000"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </section>

      {/* Back Button */}
      <div className="py-24 text-center">
        <button 
          onClick={() => setPage('home')}
          className="group relative inline-flex flex-col items-center gap-4"
        >
          <span className="text-xs tracking-[0.6em] uppercase font-bold opacity-40 group-hover:opacity-100 transition-opacity">Back to Main</span>
          <div className="w-12 h-px bg-black opacity-20 group-hover:opacity-100 group-hover:w-24 transition-all duration-500" />
        </button>
      </div>
    </motion.div>
  );
};


// ArchivePage removed as requested
const ArtistEditor = ({ 
  artist, 
  onSave, 
  onClose,
  isUploading,
  setIsUploading
}: { 
  artist: Artist; 
  onSave: (updated: Artist) => void; 
  onClose: () => void;
  isUploading: boolean;
  setIsUploading: (val: boolean) => void;
}) => {
  const [data, setData] = useState<Artist>({...artist});
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/upload.php', { method: 'POST', body: formData });
      const result = await response.json();
      const url = result.url || await compressImage(file);
      setData(prev => ({ ...prev, image: url }));
    } catch (err) {
      const base64 = await compressImage(file);
      setData(prev => ({ ...prev, image: base64 }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleWorkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsUploading(true);
    try {
      const newWorks = [...data.works];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', 'works');
        const response = await fetch('/upload.php', { method: 'POST', body: formData });
        const result = await response.json();
        const url = result.url || await compressImage(file);
        newWorks.push({ 
          title: file.name.split('.')[0], 
          image: url,
          size: '',
          introduction: '',
          criticism: ''
        });
      }
      setData(prev => ({ ...prev, works: newWorks }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto p-12 shadow-2xl relative scrollbar-hide"
      >
        <button onClick={onClose} className="absolute top-8 right-8 opacity-40 hover:opacity-100"><X size={24} /></button>
        <h3 className="text-3xl font-serif mb-12 tracking-tight text-black font-bold border-b border-black/5 pb-4">Focus Artist Profile</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Artist Name</label>
              <input value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full border-b border-black/10 py-4 outline-none focus:border-black font-serif text-black" placeholder="Name..." />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Artist Title</label>
              <input value={data.title} onChange={e => setData({...data, title: e.target.value})} className="w-full border-b border-black/10 py-4 outline-none focus:border-black font-serif text-black" placeholder="Title/Position..." />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Bio</label>
              <textarea value={data.bio} onChange={e => setData({...data, bio: e.target.value})} className="w-full h-40 border border-black/10 p-4 outline-none focus:border-black font-serif text-black text-sm leading-relaxed" placeholder="Artist biography..." />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Profile Photo</label>
              <div className="group relative aspect-square w-48 bg-gray-50 border border-black/5 overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                {data.image ? (
                  <img src={data.image} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                ) : (
                  <Upload size={24} className="opacity-20" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] uppercase tracking-widest font-bold">Change</div>
                <input type="file" ref={photoInputRef} className="hidden" onChange={handlePhotoUpload} accept="image/*" />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-6 pt-0">
              <div className="flex justify-between items-center border-b border-black/5 pb-4">
                <div className="space-y-1">
                  <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Works ({data.works.length})</label>
                  <p className="text-[8px] text-slate-400">작품은 uploads/works/ 폴더에 보관됩니다.</p>
                </div>
                <label className="text-[10px] tracking-[0.2em] uppercase font-bold text-blue-600 cursor-pointer hover:opacity-75 bg-blue-50 px-3 py-1.5 border border-blue-100 rounded">
                  + Add Works
                  <input type="file" multiple className="hidden" onChange={handleWorkUpload} accept="image/*" />
                </label>
              </div>
              <div className="space-y-8 max-h-[55vh] overflow-y-auto pr-2 scrollbar-hide">
                {data.works.map((work, idx) => (
                  <div key={idx} className="border border-black/5 p-6 bg-slate-50/50 flex flex-col sm:flex-row gap-6 relative group rounded">
                    <button 
                      onClick={() => {
                        const newWorks = [...data.works];
                        newWorks.splice(idx, 1);
                        setData({...data, works: newWorks});
                      }}
                      className="absolute top-4 right-4 p-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors border border-red-100 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="w-24 h-24 shrink-0 bg-gray-100 overflow-hidden border border-black/5 flex items-center justify-center relative">
                      <img src={work.image} className="w-full h-full object-contain grayscale" referrerPolicy="no-referrer" alt={work.title} />
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] tracking-[0.2em] uppercase opacity-40 font-bold">Work Title (작품명)</label>
                        <input 
                          value={work.title} 
                          onChange={e => {
                            const newWorks = [...data.works];
                            newWorks[idx] = { ...newWorks[idx], title: e.target.value };
                            setData({...data, works: newWorks});
                          }}
                          className="w-full text-xs font-serif border-b border-black/10 focus:border-black outline-none pb-1 bg-transparent text-black font-semibold"
                          placeholder="작품명"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] tracking-[0.2em] uppercase opacity-40 font-bold">Size (크기)</label>
                        <input 
                          value={work.size || ''} 
                          onChange={e => {
                            const newWorks = [...data.works];
                            newWorks[idx] = { ...newWorks[idx], size: e.target.value };
                            setData({...data, works: newWorks});
                          }}
                          className="w-full text-xs font-serif border-b border-black/10 focus:border-black outline-none pb-1 bg-transparent text-black"
                          placeholder="예: 70 x 70 cm"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[8px] tracking-[0.2em] uppercase opacity-40 font-bold">Introduction (작품소개)</label>
                        <input 
                          value={work.introduction || ''} 
                          onChange={e => {
                            const newWorks = [...data.works];
                            newWorks[idx] = { ...newWorks[idx], introduction: e.target.value };
                            setData({...data, works: newWorks});
                          }}
                          className="w-full text-xs font-serif border-b border-black/10 focus:border-black outline-none pb-1 bg-transparent text-black"
                          placeholder="작품의의와 간단한 소개 설명"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[8px] tracking-[0.2em] uppercase opacity-40 font-bold">Criticism (비평 및 해설)</label>
                        <textarea 
                          value={work.criticism || ''} 
                          onChange={e => {
                            const newWorks = [...data.works];
                            newWorks[idx] = { ...newWorks[idx], criticism: e.target.value };
                            setData({...data, works: newWorks});
                          }}
                          className="w-full text-xs h-16 p-2 bg-white border border-black/10 focus:border-black outline-none font-serif text-black leading-relaxed"
                          placeholder="작품 비평 또는 해설 설명문..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex gap-4 pt-12 border-t border-black/5">
          <button onClick={onClose} className="flex-1 py-4 border border-black/10 text-[10px] tracking-[0.4em] uppercase hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(data)} disabled={isUploading} className="flex-1 py-4 bg-black text-white text-[10px] tracking-[0.4em] uppercase hover:bg-gray-800 disabled:opacity-50">
            {isUploading ? 'Uploading...' : 'Confirm Artist'}
          </button>
        </div>
      </motion.div>
    </div>
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'poetry' | 'settings' | 'artists' | 'journey'>('poetry');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const teaInputRef = useRef<HTMLInputElement>(null);
  
  const [isAddingJourney, setIsAddingJourney] = useState(false);
  const [editingJourneyItem, setEditingJourneyItem] = useState<ArchiveItem | null>(null);
  const [journeyFormData, setJourneyFormData] = useState({
    title: '',
    content: '',
    summary: '',
    image_url: '',
    poetry_collection_name: '라석여정 - 활동사진',
    language: 'KR' as Language
  });
  const journeyCoverInputRef = useRef<HTMLInputElement>(null);
  const journeyContentImageInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: initialEditingItem?.title || '',
    content: initialEditingItem?.content || '',
    summary: initialEditingItem?.summary || '',
    image_url: initialEditingItem?.image_url || '',
    poetry_collection_name: initialEditingItem?.poetry_collection_name || '',
    language: initialEditingItem?.language || 'KR'
  });

  const [settingsData, setSettingsData] = useState<Partial<SiteSettings>>({
    logo_url: siteSettings?.logo_url || '',
    hero_bg_url: siteSettings?.hero_bg_url || '',
    tea_detail_url: siteSettings?.tea_detail_url || '',
    artists: siteSettings?.artists || translations.KR.artDetail.artists
  });

  const [editingArtistIdx, setEditingArtistIdx] = useState<number | null>(null);
  const [isAddingArtist, setIsAddingArtist] = useState(false);
  const isInitialSync = useRef(true);

  const isJourneyItem = (item: ArchiveItem) => {
    const name = item.poetry_collection_name || '';
    return name.startsWith('라석여정') || 
           name.startsWith('羅石旅程') || 
           name.toLowerCase().includes('journey');
  };

  const handleJourneyEditClick = (item: ArchiveItem) => {
    setEditingJourneyItem(item);
    setJourneyFormData({
      title: item.title,
      content: item.content,
      summary: item.summary,
      image_url: item.image_url,
      poetry_collection_name: item.poetry_collection_name || '라석여정 - 활동사진',
      language: item.language || 'KR'
    });
    setIsAddingJourney(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewJourneyClick = () => {
    const nextIsAdding = !isAddingJourney;
    setIsAddingJourney(nextIsAdding);
    if (editingJourneyItem) {
      setEditingJourneyItem(null);
    }
    if (nextIsAdding) {
      setJourneyFormData({
        title: '',
        content: '',
        summary: '',
        image_url: siteSettings?.logo_url || DEFAULT_IMAGE,
        poetry_collection_name: '라석여정 - 활동사진',
        language: 'KR'
      });
    } else {
      setJourneyFormData({ title: '', content: '', summary: '', image_url: '', poetry_collection_name: '라석여정 - 활동사진', language: 'KR' });
    }
  };

  useEffect(() => {
    if (siteSettings && isInitialSync.current) {
      setSettingsData({
        logo_url: siteSettings.logo_url || '',
        hero_bg_url: siteSettings.hero_bg_url || '',
        tea_detail_url: siteSettings.tea_detail_url || '',
        artists: siteSettings.artists || translations.KR.artDetail.artists
      });
      isInitialSync.current = false;
    }
  }, [siteSettings]);

  useEffect(() => {
    if (initialEditingItem) {
      setEditingItem(initialEditingItem);
      setFormData({
        title: initialEditingItem.title,
        content: initialEditingItem.content,
        summary: initialEditingItem.summary,
        image_url: initialEditingItem.image_url,
        poetry_collection_name: initialEditingItem.poetry_collection_name || '',
        language: initialEditingItem.language || 'KR'
      });
      setIsAdding(false);
      setActiveTab('poetry');
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

  const saveSettings = async (customSettings?: Partial<SiteSettings>) => {
    // Merge with current siteSettings to avoid overwriting with undefined
    const activeSettings = {
      logo_url: customSettings?.logo_url ?? settingsData.logo_url ?? siteSettings?.logo_url,
      hero_bg_url: customSettings?.hero_bg_url ?? settingsData.hero_bg_url ?? siteSettings?.hero_bg_url,
      tea_detail_url: customSettings?.tea_detail_url ?? settingsData.tea_detail_url ?? siteSettings?.tea_detail_url,
      artists: customSettings?.artists ?? settingsData.artists ?? siteSettings?.artists
    };

    if (!activeSettings.logo_url && !activeSettings.hero_bg_url && !activeSettings.tea_detail_url && (!activeSettings.artists || activeSettings.artists.length === 0)) {
      alert("No settings to save.");
      return;
    }
    
    setIsUploading(true);
    try {
      if (!supabase) {
        // Offline site settings fallback save
        const mockSettings = {
          id: siteSettings?.id || 'local-fallback',
          logo_url: activeSettings.logo_url || '',
          hero_bg_url: activeSettings.hero_bg_url || '',
          tea_detail_url: activeSettings.tea_detail_url || '',
          artists: activeSettings.artists || []
        };
        setSiteSettings(mockSettings);
        setSettingsData({
          logo_url: mockSettings.logo_url,
          hero_bg_url: mockSettings.hero_bg_url,
          tea_detail_url: mockSettings.tea_detail_url,
          artists: mockSettings.artists
        });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setIsUploading(false);
        return;
      }
      
      const payload = {
        logo_url: activeSettings.logo_url || '',
        hero_bg_url: activeSettings.hero_bg_url || '',
        tea_detail_url: activeSettings.tea_detail_url || '',
        artists: activeSettings.artists || []
      };

      if (siteSettings?.id) {
        const { error, data } = await supabase
          .from('site_settings')
          .update(payload)
          .eq('id', siteSettings.id)
          .select()
          .single();
        
        if (!error && data) {
          setSiteSettings(data);
          setSettingsData({
            logo_url: data.logo_url,
            hero_bg_url: data.hero_bg_url,
            tea_detail_url: data.tea_detail_url,
            artists: data.artists
          });
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } else if (error) {
          console.error("Supabase Save Error:", error);
          alert(`저장 실패: ${error.message}`);
        }
      } else {
        const { data: existing } = await supabase.from('site_settings').select('id').limit(1);
        
        if (existing && existing.length > 0) {
          const { data: updated, error: updateErr } = await supabase
            .from('site_settings')
            .update(payload)
            .eq('id', existing[0].id)
            .select()
            .single();
          
          if (!updateErr && updated) {
            setSiteSettings(updated);
            setSettingsData({
              logo_url: updated.logo_url,
              hero_bg_url: updated.hero_bg_url,
              tea_detail_url: updated.tea_detail_url,
              artists: updated.artists
            });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
          } else if (updateErr) {
            alert(`업데이트 실패: ${updateErr.message}`);
          }
        } else {
          const { data, error } = await supabase
            .from('site_settings')
            .insert([payload])
            .select()
            .single();
          
          if (!error && data) {
            setSiteSettings(data);
            setSettingsData({
              logo_url: data.logo_url,
              hero_bg_url: data.hero_bg_url,
              tea_detail_url: data.tea_detail_url,
              artists: data.artists
            });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
          } else if (error) {
            console.error("Supabase Create Error:", error);
            alert(`생성 실패: ${error.message}`);
          }
        }
      }
    } catch (err: any) {
      console.error("Error saving settings:", err);
      alert("설정 저장 중 오류가 발생했습니다: " + (err.message || "알 수 없는 오류"));
    } finally {
      setIsUploading(false);
    }
  };

  const seedArchive = async () => {
    if (!confirm("모든 샘플 데이터를 아카이브에 추가하시겠습니까?")) return;
    setIsUploading(true);
    try {
      if (!supabase) {
        // Seeding fallback in offline local mode
        const localSampleItems = SAMPLE_ARCHIVE_ITEMS.map((item, idx) => ({
          id: `local-seed-${idx}-${Date.now()}`,
          title: item.title,
          summary: item.summary,
          content: item.content,
          image_url: item.image_url,
          poetry_collection_name: '1. 라석시전집', // Assign a default collection
          language: 'KR' as Language
        }));
        setArchiveItems(prev => [...localSampleItems, ...prev]);
        alert("샘플 데이터가 성공적으로 복구되었습니다. (로컬 오프라인 모드)");
        setIsUploading(false);
        return;
      }
      const { data, error } = await supabase
        .from('archive_items')
        .insert(SAMPLE_ARCHIVE_ITEMS)
        .select();
      
      if (!error && data) {
        setArchiveItems(prev => [...data as ArchiveItem[], ...prev]);
        alert("샘플 데이터가 성공적으로 복구되었습니다.");
      } else {
        throw error;
      }
    } catch (err) {
      console.error("Seeding failed:", err);
      alert("데이터 복구에 실패했습니다.");
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
      
      const isJourney = formData.poetry_collection_name && (
        formData.poetry_collection_name.startsWith('라석여정') || 
        formData.poetry_collection_name.startsWith('羅石旅程') || 
        formData.poetry_collection_name.toLowerCase().includes('journey')
      );
      if (isJourney) {
        formDataUpload.append('folder', 'Journey');
      }
      
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
      
      const isJourney = formData.poetry_collection_name && (
        formData.poetry_collection_name.startsWith('라석여정') || 
        formData.poetry_collection_name.startsWith('羅石旅程') || 
        formData.poetry_collection_name.toLowerCase().includes('journey')
      );
      if (isJourney) {
        formDataUpload.append('folder', 'Journey');
      }
      
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

  const handleJourneyCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      formDataUpload.append('folder', 'Journey');
      
      const response = await fetch('/upload.php', {
        method: 'POST',
        body: formDataUpload
      });
      
      const result = await response.json();
      if (result.url) {
        setJourneyFormData(prev => ({ ...prev, image_url: result.url }));
      } else {
        const base64 = await compressImage(file);
        setJourneyFormData(prev => ({ ...prev, image_url: base64 }));
      }
    } catch (err) {
      console.error("Upload failed, falling back to base64", err);
      const base64 = await compressImage(file).catch(() => '');
      if (base64) setJourneyFormData(prev => ({ ...prev, image_url: base64 }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleJourneyContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      formDataUpload.append('folder', 'Journey');
      
      const response = await fetch('/upload.php', {
        method: 'POST',
        body: formDataUpload
      });
      
      const result = await response.json();
      if (result.url) {
        setJourneyFormData(prev => ({ 
          ...prev, 
          content: prev.content + `\n\n![image](${result.url})\n\n` 
        }));
      } else {
        const base64 = await compressImage(file);
        setJourneyFormData(prev => ({ 
          ...prev, 
          content: prev.content + `\n\n![image](${base64})\n\n` 
        }));
      }
    } catch (err) {
      console.error("Upload failed, falling back to base64", err);
      const base64 = await compressImage(file).catch(() => '');
      if (base64) {
        setJourneyFormData(prev => ({ 
          ...prev, 
          content: prev.content + `\n\n![image](${base64})\n\n` 
        }));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleJourneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    try {
      const submissionData = {
        title: journeyFormData.title,
        content: journeyFormData.content,
        summary: journeyFormData.summary,
        category: 'poetry', // satisfy DB logic
        image_url: journeyFormData.image_url.trim() || DEFAULT_IMAGE,
        poetry_collection_name: journeyFormData.poetry_collection_name || null,
        language: journeyFormData.language || 'KR'
      };

      if (!supabase) {
        // Offline state fallback
        const mockItem = {
          id: editingJourneyItem ? editingJourneyItem.id : `local-journey-${Date.now()}`,
          ...submissionData
        };
        if (editingJourneyItem) {
          setArchiveItems(prev => prev.map(item => item.id === editingJourneyItem.id ? mockItem : item));
          setEditingJourneyItem(null);
        } else {
          setArchiveItems(prev => [mockItem, ...prev]);
          setIsAddingJourney(false);
        }
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setJourneyFormData({ title: '', content: '', summary: '', image_url: '', poetry_collection_name: '라석여정 - 활동사진', language: 'KR' });
        setIsUploading(false);
        return;
      }

      if (editingJourneyItem) {
        const { error } = await supabase
          .from('archive_items')
          .update(submissionData)
          .eq('id', editingJourneyItem.id);
        
        if (error) throw error;
        
        setArchiveItems(prev => prev.map(item => item.id === editingJourneyItem.id ? { ...item, ...submissionData } : item));
        setEditingJourneyItem(null);
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        const { data, error } = await supabase
          .from('archive_items')
          .insert([submissionData])
          .select();
        
        if (error) throw error;
        if (!data) throw new Error("No data returned from insert");

        setArchiveItems(prev => [data[0] as ArchiveItem, ...prev]);
        setIsAddingJourney(false);
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
      setJourneyFormData({ title: '', content: '', summary: '', image_url: '', poetry_collection_name: '라석여정 - 활동사진', language: 'KR' });
    } catch (err: any) {
      console.error("Journey Save Error:", err);
      alert(`저장에 실패했습니다: ${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    try {
      const submissionData = {
        title: formData.title,
        content: formData.content,
        summary: formData.summary,
        category: 'poetry', // Hidden default to satisfy logic
        image_url: formData.image_url.trim() || DEFAULT_IMAGE,
        poetry_collection_name: formData.poetry_collection_name || null,
        language: formData.language || 'KR'
      };

      if (!supabase) {
        // Offline state fallback
        const mockItem = {
          id: editingItem ? editingItem.id : `local-archive-${Date.now()}`,
          ...submissionData
        };
        if (editingItem) {
          setArchiveItems(prev => prev.map(item => item.id === editingItem.id ? mockItem : item));
          setEditingItem(null);
          if (onClearEdit) onClearEdit();
        } else {
          setArchiveItems(prev => [mockItem, ...prev]);
          setIsAdding(false);
        }
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setFormData({ title: '', content: '', summary: '', image_url: '', poetry_collection_name: '', language: 'KR' });
        setIsUploading(false);
        return;
      }

      if (editingItem) {
        const { error } = await supabase
          .from('archive_items')
          .update(submissionData)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        
        setArchiveItems(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...submissionData } : item));
        setEditingItem(null);
        if (onClearEdit) onClearEdit();
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        const { data, error } = await supabase
          .from('archive_items')
          .insert([submissionData])
          .select();
        
        if (error) throw error;
        if (!data) throw new Error("No data returned from insert");

        setArchiveItems(prev => [data[0] as ArchiveItem, ...prev]);
        setIsAdding(false);
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
      setFormData({ title: '', content: '', summary: '', image_url: '', poetry_collection_name: '', language: 'KR' });
    } catch (err: any) {
      console.error("Save Error:", err);
      alert(`저장에 실패했습니다: ${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      if (!supabase) {
        setArchiveItems(prev => prev.filter(item => item.id !== id));
        setDeleteConfirmId(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        return;
      }
      const { error } = await supabase.from('archive_items').delete().eq('id', id);
      if (error) throw error;
      setArchiveItems(prev => prev.filter(item => item.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen pt-32 px-6 md:px-24 bg-[#f8f8f8]">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] bg-black text-white px-12 py-5 shadow-2xl flex items-center gap-4 border border-white/10"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[11px] tracking-[0.5em] uppercase font-bold">저장완료 / SAVED</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto pb-32">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-black pb-8 gap-8">
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.5em] uppercase opacity-40">System Management</p>
            <h2 className="text-5xl font-serif tracking-tight">Control Center</h2>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('poetry')}
              className={`px-6 py-3 text-[10px] tracking-[0.3em] uppercase transition-all ${activeTab === 'poetry' ? 'bg-black text-white' : 'bg-white text-black border border-black/10'}`}
            >
              Poetry Collections
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-[10px] tracking-[0.3em] uppercase transition-all ${activeTab === 'settings' ? 'bg-black text-white' : 'bg-white text-black border border-black/10'}`}
            >
              Site Settings
            </button>
            <button 
              onClick={() => setActiveTab('artists')}
              className={`px-6 py-3 text-[10px] tracking-[0.3em] uppercase transition-all ${activeTab === 'artists' ? 'bg-black text-white' : 'bg-white text-black border border-black/10'}`}
            >
              Artists
            </button>
            <button 
              onClick={() => setActiveTab('journey')}
              className={`px-6 py-3 text-[10px] tracking-[0.3em] uppercase transition-all ${activeTab === 'journey' ? 'bg-black text-white' : 'bg-white text-black border border-black/10'}`}
            >
              라석여정 (Lasok Journey)
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

              <button 
                onClick={() => saveSettings()}
                className="w-full bg-black text-white py-6 text-[10px] tracking-[0.5em] uppercase hover:bg-gray-800 transition-all"
              >
                Save Site Settings
              </button>
            </div>
          </motion.div>
        ) : activeTab === 'artists' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="flex justify-between items-end mb-8">
              <div className="space-y-2">
                <h3 className="text-3xl font-serif tracking-tight text-black">Artist Roster</h3>
                <p className="text-[10px] tracking-[0.3em] uppercase opacity-40">Manage art masters and their collections</p>
              </div>
              <button 
                onClick={() => {
                  const currentArtists = settingsData.artists || siteSettings?.artists || translations.KR.artDetail.artists;
                  const newArtist: Artist = { name: '', title: '', bio: '', image: '', works: [] };
                  const newArtists = [...currentArtists, newArtist];
                  setSettingsData(prev => ({ ...prev, artists: newArtists }));
                  setEditingArtistIdx(currentArtists.length);
                }}
                className="bg-black text-white px-8 py-4 text-[10px] tracking-[0.4em] uppercase hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus size={14} /> New Artist
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12 text-black">
              {(settingsData.artists || []).map((artist, idx) => (
                <div key={idx} className="bg-white p-8 border border-black/5 shadow-lg group relative">
                  <div className="flex gap-4 items-center mb-6">
                    <img src={artist.image || DEFAULT_IMAGE} className="w-16 h-16 object-cover grayscale" referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="font-serif text-lg leading-tight">{artist.name || 'Untitled Artist'}</h4>
                      <p className="text-[9px] tracking-widest uppercase opacity-40 font-bold">{artist.title || 'No Title'}</p>
                    </div>
                  </div>
                  <p className="text-xs font-serif leading-relaxed opacity-60 line-clamp-3 mb-6 h-12">{artist.bio || 'No bio provided.'}</p>
                  
                  <div className="grid grid-cols-4 gap-1 mb-8">
                    {artist.works.slice(0, 4).map((w, i) => (
                      <div key={i} className="aspect-square bg-gray-50 overflow-hidden">
                        <img src={w.image} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 border-t border-black/5 pt-6">
                    <button 
                      onClick={() => setEditingArtistIdx(idx)}
                      className="text-[9px] tracking-[0.3em] uppercase font-bold text-blue-600 hover:opacity-70 flex items-center gap-2"
                    >
                      <Edit2 size={12} /> Edit Profile
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to remove this artist?')) {
                          const currentArtists = settingsData.artists || siteSettings?.artists || translations.KR.artDetail.artists;
                          const newArtists = [...currentArtists];
                          newArtists.splice(idx, 1);
                          setSettingsData(prev => ({ ...prev, artists: newArtists }));
                          // Auto-save on removal
                          saveSettings({ artists: newArtists });
                        }
                      }}
                      className="text-[9px] tracking-[0.3em] uppercase font-bold text-red-600 hover:opacity-70 flex items-center gap-2 ml-auto"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {editingArtistIdx !== null && (
              <ArtistEditor 
                artist={settingsData.artists![editingArtistIdx]} 
                onSave={(updated) => {
                  const currentArtists = settingsData.artists || siteSettings?.artists || translations.KR.artDetail.artists;
                  const newArtists = [...currentArtists];
                  newArtists[editingArtistIdx] = updated;
                  
                  // Update local state and trigger save
                  setSettingsData(prev => ({ ...prev, artists: newArtists }));
                  setEditingArtistIdx(null);
                  saveSettings({ artists: newArtists });
                }}
                onClose={() => setEditingArtistIdx(null)}
                isUploading={isUploading}
                setIsUploading={setIsUploading}
              />
            )}

            <button 
              onClick={() => saveSettings()}
              className="w-full bg-black text-white py-6 text-[10px] tracking-[0.5em] uppercase hover:bg-gray-800 transition-all font-bold"
            >
              Save Roster to Database
            </button>
          </motion.div>
        ) : activeTab === 'journey' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12 text-black"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
              <div className="space-y-2">
                <h3 className="text-3xl font-serif tracking-tight text-black">라석여정 관리 (Lasok Journey Management)</h3>
                <p className="text-[10px] tracking-[0.3em] uppercase opacity-40">활동 사진 및 언론 보도 콘텐츠를 투명하게 관리합니다.</p>
              </div>
              <button 
                onClick={handleNewJourneyClick}
                className="bg-black text-white px-8 py-4 text-[10px] tracking-[0.4em] uppercase hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2"
              >
                {(isAddingJourney || editingJourneyItem) ? <X size={14} /> : <Plus size={14} />}
                {(isAddingJourney || editingJourneyItem) ? '닫기 (Close)' : '새 여정 등록 (New Journey)'}
              </button>
            </div>

            {/* Journey Form */}
            {(isAddingJourney || editingJourneyItem) && (
              <motion.form 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleJourneySubmit}
                className="bg-white p-12 mb-16 shadow-2xl space-y-12 border border-black/5"
              >
                <div className="border-b border-black/5 pb-4">
                  <h4 className="text-xl font-serif tracking-wide">{editingJourneyItem ? '여정 수정 (Edit Journey Entry)' : '새 여정 등록 (New Journey Entry)'}</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">언어 그룹 (Language Group)</label>
                    <select 
                      value={journeyFormData.language}
                      onChange={e => {
                        const newLang = e.target.value as Language;
                        // Automatically map default collection name based on language
                        let colName = '라석여정 - 활동사진';
                        if (newLang === 'TC') {
                          colName = '羅石旅程 - 活動照片';
                        } else if (newLang === 'EN') {
                          colName = 'Lasok Journey - Activity Photos';
                        }
                        setJourneyFormData({...journeyFormData, language: newLang, poetry_collection_name: colName});
                      }}
                      className="w-full border-b border-gray-300 py-4 text-xl outline-none focus:border-black transition-colors font-serif bg-transparent cursor-pointer text-black"
                    >
                      <option value="KR">한국어 (KR)</option>
                      <option value="TC">繁體中文 (TC)</option>
                      <option value="EN">English (EN)</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold font-serif">카테고리 선택 (Category)</label>
                    <select 
                      required
                      value={journeyFormData.poetry_collection_name}
                      onChange={e => setJourneyFormData({...journeyFormData, poetry_collection_name: e.target.value})}
                      className="w-full border-b border-gray-300 py-4 text-xl outline-none focus:border-black transition-colors font-serif bg-transparent cursor-pointer text-[#333]"
                    >
                      {journeyFormData.language === 'KR' && (
                        <>
                          <option value="라석여정 - 활동사진">라석여정 - 활동사진 (Photos)</option>
                          <option value="라석여정 - 언론보도">라석여정 - 언론보도 (Press)</option>
                        </>
                      )}
                      {journeyFormData.language === 'TC' && (
                        <>
                          <option value="羅石旅程 - 活動照片">羅石旅程 - 活動照片 (Photos)</option>
                          <option value="羅石旅程 - 媒體報導">羅石旅程 - 媒體報導 (Press)</option>
                        </>
                      )}
                      {journeyFormData.language === 'EN' && (
                        <>
                          <option value="Lasok Journey - Activity Photos">Lasok Journey - Activity Photos (Photos)</option>
                          <option value="Lasok Journey - Media Press">Lasok Journey - Media Press (Press)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
                  <div className="space-y-4">
                    <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">제목 (Title / Headline)</label>
                    <input 
                      required
                      value={journeyFormData.title}
                      onChange={e => setJourneyFormData({...journeyFormData, title: e.target.value})}
                      placeholder="제목을 입력하세요..."
                      className="w-full border-b border-gray-300 py-4 text-2xl outline-none focus:border-black transition-colors font-serif placeholder:text-gray-300 text-black animate-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">대표 이미지 (Cover Image)</label>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <input 
                        value={journeyFormData.image_url}
                        onChange={e => setJourneyFormData({...journeyFormData, image_url: e.target.value})}
                        placeholder="Image URL or upload..."
                        className="flex-1 border-b border-gray-300 py-4 outline-none focus:border-black transition-colors font-serif text-black placeholder:text-gray-300"
                      />
                      <input 
                        type="file" 
                        ref={journeyCoverInputRef}
                        onChange={handleJourneyCoverUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        disabled={isUploading}
                        onClick={() => journeyCoverInputRef.current?.click()}
                        className="flex items-center gap-2 px-6 py-3 border border-black/10 text-[10px] tracking-[0.2em] uppercase hover:bg-gray-50 transition-all disabled:opacity-50"
                      >
                        <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload File'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">간단 소개 (Brief Summary)</label>
                  <textarea 
                    required
                    value={journeyFormData.summary}
                    onChange={e => setJourneyFormData({...journeyFormData, summary: e.target.value})}
                    rows={2}
                    placeholder="활동이나 기사에 대한 간단한 요약을 적어주세요..."
                    className="w-full border-b border-gray-300 py-4 text-lg outline-none focus:border-black transition-colors font-serif resize-none italic text-black placeholder:text-gray-300 leading-tight"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">자세한 내용 (Full Content / Markdown Supported)</label>
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={journeyContentImageInputRef}
                        onChange={handleJourneyContentImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        disabled={isUploading}
                        onClick={() => journeyContentImageInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 border border-black/10 text-[9px] tracking-[0.2em] uppercase hover:bg-gray-50 transition-all disabled:opacity-50"
                      >
                        <ImageIcon size={12} /> {isUploading ? 'Adding...' : 'Add Image'}
                      </button>
                    </div>
                  </div>
                  <textarea 
                    required
                    value={journeyFormData.content}
                    onChange={e => setJourneyFormData({...journeyFormData, content: e.target.value})}
                    rows={10}
                    placeholder="상세 내용을 적어주세요..."
                    className="w-full border border-gray-200 p-8 outline-none focus:border-black transition-colors font-serif leading-[1.1] text-lg text-black placeholder:text-gray-300"
                  />
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="flex-1 bg-black text-white py-6 text-[10px] tracking-[0.5em] uppercase hover:bg-gray-800 transition-all">
                    {editingJourneyItem ? '변동사항 기입 (Save Journey Changes)' : '여정 등록 (Publish Journey Entry)'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { 
                      setEditingJourneyItem(null); 
                      setIsAddingJourney(false);
                      setJourneyFormData({ title: '', content: '', summary: '', image_url: '', poetry_collection_name: '라석여정 - 활동사진', language: 'KR' }); 
                    }}
                    className="px-12 border border-black/10 text-[10px] tracking-[0.5em] uppercase hover:bg-gray-50 transition-all font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}

            {/* List Table for Journey Items */}
            <div className="bg-white shadow-2xl border border-black/5 overflow-hidden">
              <div className="p-8 bg-gray-50 border-b border-black/5 flex justify-between items-center overflow-x-auto">
                <span className="text-[10px] tracking-[0.5em] uppercase opacity-40 font-bold">
                  라석여정 레코드 ({archiveItems.filter(isJourneyItem).length})
                </span>
                <span className="text-[9px] font-mono opacity-30 whitespace-nowrap">
                  Journey Categories: Photos, Media Press
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] tracking-[0.5em] uppercase opacity-30 border-b border-black/5">
                      <th className="px-8 py-6 font-bold">대표이미지</th>
                      <th className="px-8 py-6 font-bold">여정 제목</th>
                      <th className="px-8 py-6 font-bold">카테고리</th>
                      <th className="px-8 py-6 font-bold">언어</th>
                      <th className="px-8 py-6 font-bold text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {archiveItems.filter(isJourneyItem).map((item) => (
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
                          <span className="text-[9px] tracking-[0.1em] font-sans opacity-60 border border-black/10 px-3 py-1 rounded-full uppercase">{item.poetry_collection_name || 'Journey Item'}</span>
                        </td>
                        <td className="px-8 py-6 text-[10px] opacity-40 font-mono">
                          {item.language}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-6">
                            <button 
                              onClick={() => handleJourneyEditClick(item)}
                              className="text-gray-400 hover:text-black transition-colors p-2"
                              title="Edit Journey Entry"
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
                                title="Delete Entry"
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
                  const nextIsAdding = !isAdding;
                  setIsAdding(nextIsAdding);
                  
                  if (editingItem) {
                    setEditingItem(null);
                    if (onClearEdit) onClearEdit();
                  }

                  if (nextIsAdding) {
                    setFormData({ 
                      title: '', 
                      content: '', 
                      summary: '', 
                      image_url: siteSettings?.logo_url || DEFAULT_IMAGE,
                      poetry_collection_name: '',
                      language: 'KR'
                    });
                  } else {
                    setFormData({ title: '', content: '', summary: '', image_url: '', poetry_collection_name: '', language: 'KR' });
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
                    <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Poem Title</label>
                    <input 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter poem title..."
                      className="w-full border-b border-gray-300 py-4 text-2xl outline-none focus:border-black transition-colors font-serif placeholder:text-gray-300 text-black"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Language Group</label>
                    <select 
                      value={formData.language}
                      onChange={e => setFormData({...formData, language: e.target.value as Language})}
                      className="w-full border-b border-gray-300 py-4 text-xl outline-none focus:border-black transition-colors font-serif bg-transparent cursor-pointer text-black"
                    >
                      <option value="KR">한국어 (KR)</option>
                      <option value="TC">繁體中文 (TC)</option>
                      <option value="EN">English (EN)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
                  <div className="space-y-4">
                    <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Poetry Collection Selection</label>
                    <select 
                      required
                      value={formData.poetry_collection_name}
                      onChange={e => setFormData({...formData, poetry_collection_name: e.target.value})}
                      className="w-full border-b border-gray-300 py-4 text-xl outline-none focus:border-black transition-colors font-serif bg-transparent cursor-pointer text-black"
                    >
                      <option value="">Select a collection...</option>
                      {(() => {
                        const currentLang = (formData.language as Language) || 'KR';
                        const currentList = [...(translations[currentLang]?.poetryCollection?.[currentLang] || [])];
                        const extraItems: Record<Language, string[]> = {
                          KR: ["물파철학", "불한선차 시"],
                          TC: ["物波哲學", "弗寒仙茶 詩"],
                          EN: ["Mulpa Philosophy", "Bulhan Seoncha Poem"]
                        };
                        const restoredList = [...currentList];
                        const extraForLang = extraItems[currentLang] || [];
                        extraForLang.forEach(item => {
                          if (!restoredList.includes(item)) {
                            restoredList.push(item);
                          }
                        });
                        return restoredList.filter((colName: string) => !(
                          colName.startsWith('라석여정') || 
                          colName.startsWith('羅石旅程') || 
                          colName.toLowerCase().includes('journey')
                        )).map((colName: string) => (
                          <option key={colName} value={colName}>{colName}</option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Background Representative Image</label>
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
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] tracking-[0.4em] uppercase opacity-40 font-bold">Brief Summary</label>
                  <textarea 
                    required
                    value={formData.summary}
                    onChange={e => setFormData({...formData, summary: e.target.value})}
                    rows={2}
                    placeholder="A short introduction..."
                    className="w-full border-b border-gray-300 py-4 text-lg outline-none focus:border-black transition-colors font-serif resize-none italic text-black placeholder:text-gray-300 leading-tight"
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
                    placeholder="Write the full poem here..."
                    className="w-full border border-gray-200 p-8 outline-none focus:border-black transition-colors font-serif leading-[1.1] text-lg text-black placeholder:text-gray-300"
                  />
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="flex-1 bg-black text-white py-6 text-[10px] tracking-[0.5em] uppercase hover:bg-gray-800 transition-all">
                    {editingItem ? 'Save Changes' : 'Publish Poem'}
                  </button>
                  {editingItem && (
                    <button 
                      type="button" 
                      onClick={() => { 
                        setEditingItem(null); 
                        if (onClearEdit) onClearEdit();
                        setFormData({ 
                          title: '', 
                          content: '', 
                          summary: '', 
                          image_url: '', 
                          poetry_collection_name: '', 
                          language: 'KR' 
                        }); 
                      }}
                      className="px-12 border border-black/10 text-[10px] tracking-[0.5em] uppercase hover:bg-gray-50 transition-all font-bold"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </motion.form>
            )}

            <div className="bg-white shadow-2xl border border-black/5 overflow-hidden">
              <div className="p-8 bg-gray-50 border-b border-black/5 flex justify-between items-center overflow-x-auto">
                <div className="flex gap-4 items-center">
                   <span className="text-[10px] tracking-[0.5em] uppercase opacity-40">Database Records</span>
                   <span className="text-[10px] tracking-[0.5em] uppercase opacity-40">{archiveItems.length} Total</span>
                </div>
                <div className="text-[9px] tracking-[0.2em] font-mono opacity-30 whitespace-nowrap">
                  Collections: {archiveItems.filter(i => i.poetry_collection_name).length} entries
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] tracking-[0.5em] uppercase opacity-30 border-b border-black/5">
                      <th className="px-8 py-6 font-bold">Preview</th>
                      <th className="px-8 py-6 font-bold">Title</th>
                      <th className="px-8 py-6 font-bold">Collection</th>
                      <th className="px-8 py-6 font-bold">Lang</th>
                      <th className="px-8 py-6 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {archiveItems.filter(item => !isJourneyItem(item)).map((item) => (
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
                          <span className="text-[9px] tracking-[0.3em] uppercase opacity-60 border border-black/10 px-3 py-1 rounded-full">{item.poetry_collection_name || 'Individual'}</span>
                        </td>
                        <td className="px-8 py-6 text-[10px] opacity-40 font-mono">
                          {item.language}
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
                                  image_url: item.image_url,
                                  poetry_collection_name: item.poetry_collection_name || '',
                                  language: item.language || 'KR'
                                });
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="text-gray-400 hover:text-black transition-colors p-2"
                              title="Edit Poem"
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
                                title="Delete Poem"
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
            <p>Email: cocogame@kakao.com</p>
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

const PoetryCollectionPage = ({ t, setPage, archiveItems, dbError }: { t: any; setPage: (p: Page) => void; archiveItems: ArchiveItem[]; dbError: string | null }) => {
  const [activeLang, setActiveLang] = useState<Language>('KR');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [readingPoem, setReadingPoem] = useState<ArchiveItem | null>(null);
  const collections = t.poetryCollection[activeLang];

  const collectionPoems = archiveItems.filter(item => 
    item.poetry_collection_name === selectedCollection && 
    item.language === activeLang
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-32 px-6 md:px-24 bg-[#fdfdfd] flex flex-col items-center"
    >
      <div className="max-w-6xl w-full">
        <AnimatePresence mode="wait">
          {!selectedCollection ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-16">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center mb-8"
                >
                  <BookOpen className="opacity-10" size={64} strokeWidth={0.5} />
                </motion.div>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[40px] font-serif mb-12 tracking-tight text-black"
                >
                  {t.poetryCollection.title}
                </motion.h1>
                
                <div className="flex justify-center gap-4 mb-12">
                  {(['KR', 'TC', 'EN'] as const).map((langKey) => (
                    <button 
                      key={langKey}
                      onClick={() => setActiveLang(langKey)}
                      className={`px-6 py-2 text-lg font-serif transition-all duration-300 rounded shadow-sm border ${
                        activeLang === langKey 
                          ? 'bg-[#2c3e50] text-white border-[#2c3e50] shadow-md' 
                          : 'bg-[#e5e1d8] text-black border-black/10 hover:bg-[#d8d3c9]'
                      }`}
                    >
                      [{t.poetryCollection.categories[langKey]}]
                    </button>
                  ))}
                </div>

                {/* 데이터베이스 연결 또는 데이터 상태 경고 안내 */}
                {((!supabase && dbError === 'show_notice') || dbError || archiveItems.length === 0) && (
                  <div className="max-w-2xl mx-auto p-6 border border-dashed rounded text-center font-serif text-sm bg-amber-50/20 border-amber-600/30 text-amber-900/80 tracking-wide leading-relaxed">
                    <p className="font-bold mb-2 text-base text-amber-990 flex items-center justify-center gap-2">
                      ⚠️ 데이터베이스 연결 및 데이터 상태 안내
                    </p>
                    {!supabase ? (
                      <div>
                        <p className="text-amber-800 font-semibold mb-1">
                          현재 로컬 빌드 및 오프라인 모드로 안정적으로 작동 중입니다.
                        </p>
                        <p className="text-xs opacity-80">
                          실시간 데이터 영구 저장을 원하신다면, 호스팅 관리자 대시보드 환경 변수나 로컬 .env 설정에 
                          <strong>VITE_SUPABASE_URL</strong> 및 <strong>VITE_SUPABASE_ANON_KEY</strong>를 등록해 주시기 바랍니다.
                        </p>
                      </div>
                    ) : dbError ? (
                      <p>
                        <strong>데이터베이스 오류 발생:</strong> {dbError}<br />
                        테이블 구성이나 API 권한(RLS 정책 등)을 점검해 주세요.
                      </p>
                    ) : (
                      <p>
                        현재 연동된 데이터베이스 테이블(archive_items)에 저장된 시집 데이터가 비어 있습니다.<br />
                        상단 혹은 하단의 관리자 대시보드(Admin) 메뉴로 들어가 <strong>샘플 데이터 복구(Seed Data)</strong>를 실행해 보시기 바랍니다.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-32">
                {/* List Section */}
                <div className="md:col-span-6 bg-[#f9f7f2] p-12 shadow-sm border border-black/5 relative min-h-[600px]">
                  <div className="mb-12">
                    <h2 className="text-3xl font-serif text-black border-b border-black/10 pb-4 inline-block mb-8">
                      {activeLang === 'KR' ? '한국어 시집 목록' : activeLang === 'TC' ? '中文 詩集 目錄' : 'Poetry Collection List'}
                    </h2>
                    
                    <div className="space-y-6">
                      {collections.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center justify-between group gap-8 border-b border-black/[0.05] pb-4">
                          <span className="text-[20px] font-serif text-black opacity-80 group-hover:opacity-100 transition-opacity leading-tight">
                            {item}
                          </span>
                          <button 
                            onClick={() => {
                              const targetPoems = archiveItems.filter(p => 
                                p.poetry_collection_name === item && 
                                p.language === activeLang
                              );
                              
                              if (targetPoems.length === 0) {
                                if (!supabase) {
                                  alert(`알림: '${item}' 에 해당하는 시(데이터)가 현재 로컬 데이터셋에 없습니다.`);
                                } else {
                                  alert(`알림: '${item}' 에 해당하는 시(데이터)가 현재 데이터베이스에 없습니다. 관리자 대시보드(Admin)에서 샘플 데이터(Seed)를 복구한 후 하단의 '보기' 버튼으로 다시 시도해 주세요.`);
                                }
                              }
                              setSelectedCollection(item);
                            }}
                            className="px-6 py-2 border border-black/20 text-[10px] tracking-widest hover:bg-black hover:text-white transition-all duration-300 whitespace-nowrap shrink-0"
                          >
                            보기
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="absolute bottom-8 right-8 opacity-5">
                    <BookOpen size={120} />
                  </div>
                </div>

                {/* Image Section */}
                <div className="md:col-span-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-square rounded-full bg-[#f0ede6] overflow-hidden shadow-md">
                      <img 
                        src="/assets/1115073702.jpg" 
                        alt="Poetry Collection Cover 1" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="aspect-[3/4] pt-12">
                      <div className="bg-[#e5e1d8] p-4 shadow-inner">
                        <img 
                          src="/assets/9791173790355.jpg" 
                          alt="Poetry Collection Cover 2" 
                          className="w-full h-full object-cover rounded-sm"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="aspect-[16/9] bg-[#e5e1d8] overflow-hidden shadow-md">
                    <img 
                      src="/assets/9791198543004.jpg" 
                      alt="Poetry Collection Cover 3" 
                      className="w-full h-full object-cover opacity-60 mix-blend-multiply"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="pb-32 w-full"
            >
              <div className="flex items-center gap-4 mb-16">
                <button 
                  onClick={() => {
                    setSelectedCollection(null);
                    setReadingPoem(null);
                  }}
                  className="flex items-center gap-2 text-xs tracking-widest opacity-40 hover:opacity-100 transition-opacity uppercase font-bold"
                >
                  <ArrowLeft size={16} /> Back to List
                </button>
              </div>

              <div className="text-center mb-16">
                <h1 className="text-5xl font-serif mb-4 text-black">{selectedCollection}</h1>
                <div className="w-12 h-px bg-black/10 mx-auto" />
              </div>

              {/* Simplified vertical list of poems */}
              <div className="mb-24 flex flex-col items-center">
                <div className="w-full max-w-4xl border-y border-black/5 py-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                    {collectionPoems.map((poem, idx) => (
                      <button
                        key={poem.id}
                        onClick={() => setReadingPoem(poem)}
                        className={`w-full flex items-center justify-between py-3 px-4 transition-all duration-300 group border-b border-black/[0.03] ${
                          readingPoem?.id === poem.id 
                            ? 'bg-black text-white border-black' 
                            : 'hover:bg-black/5 text-black border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-6 overflow-hidden">
                          <span className={`text-[10px] tracking-[0.2em] font-bold opacity-30 italic ${readingPoem?.id === poem.id ? 'text-white' : 'text-black'}`}>
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <span className={`text-base font-serif truncate ${readingPoem?.id === poem.id ? 'text-white opacity-100' : 'text-black opacity-80 group-hover:opacity-100'}`}>
                            {poem.title}
                          </span>
                        </div>
                        <div className={`w-4 h-px transition-all duration-500 shrink-0 ${readingPoem?.id === poem.id ? 'bg-white/40 w-8' : 'bg-black/10 group-hover:w-8'}`} />
                      </button>
                    ))}
                  </div>
                  {collectionPoems.length === 0 && (
                    <div className="w-full py-12 text-center opacity-30 italic font-serif">No poems found in this collection.</div>
                  )}
                </div>
              </div>

              {/* Reading Section with Background Image */}
              <AnimatePresence mode="wait">
                {readingPoem ? (
                  <motion.div 
                    key={readingPoem.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="relative min-h-[600px] border border-black/5 bg-[#fcfaf4] overflow-hidden shadow-2xl"
                  >
                    {/* Background Representative Image */}
                    <div className="absolute inset-0 z-0 scale-105">
                       <img 
                        src={readingPoem.image_url || DEFAULT_IMAGE}
                        alt="Poem Background"
                        className="w-full h-full object-cover opacity-[0.04] grayscale brightness-50"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="relative z-10 p-12 md:p-24 max-w-4xl mx-auto flex flex-col items-center">
                      <div className="w-full max-w-xl flex flex-col items-start">
                        <div className="text-left mb-12 w-full">
                          <h2 className="text-2xl md:text-3xl font-serif font-bold text-black mb-6 leading-relaxed text-left tracking-wide">{readingPoem.title}</h2>
                          <div className="w-16 h-0.5 bg-[#2c3e50]/20" />
                        </div>

                        <div className="w-full prose prose-pre:bg-transparent prose-pre:p-0 prose-pre:text-black prose-p:my-0 prose-div:my-0 max-w-none">
                          <div className="markdown-body font-serif text-lg md:text-xl leading-[1.9] text-black/90 whitespace-pre-wrap text-left tracking-wide w-full">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => <div className="mb-8 leading-[1.9] text-left font-serif select-text">{children}</div>,
                                br: () => <br className="hidden" />
                              }}
                            >
                              {readingPoem.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>

                      <div className="mt-24 pt-12 border-t border-black/5 w-full text-center">
                        <p className="text-xs tracking-[0.4em] uppercase opacity-30 font-bold">Lasok Poetry Collection</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="relative h-[400px] border border-dashed border-black/10 flex flex-col items-center justify-center text-center p-12 bg-[#faf9f6]">
                     <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden opacity-[0.03]">
                        <img 
                          src="https://images.unsplash.com/photo-1490127252417-7c393f993ee4?auto=format&fit=crop&q=80&w=1200" 
                          alt="Scroll decor" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                     </div>
                     <BookOpen className="opacity-10 mb-6" size={80} strokeWidth={0.5} />
                     <p className="text-2xl font-serif italic opacity-30 relative z-10 px-4">
                        {activeLang === 'KR' ? '위에 있는 시집 목록에서 작품을 선택하여 읽어보세요.' : 'Select a poem from the list above to read.'}
                     </p>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pb-24 text-center border-t border-black/5 pt-24 mt-12">
          <button 
            onClick={() => setPage('home')}
            className="text-sm tracking-[0.5em] uppercase opacity-40 hover:opacity-100 transition-opacity border-b border-black/20 pb-2 text-black"
          >
            Back to Main
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [lang, setLang] = useState<Language>('KR');
  const [page, setPage] = useState<Page>('home');
  const [selectedArchiveItem, setSelectedArchiveItem] = useState<ArchiveItem | null>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [adminEditingItem, setAdminEditingItem] = useState<ArchiveItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const t = translations[lang];

  // Dynamic assets from settings or fallback - handle legacy database values
  const getAssetUrl = (url: string | undefined, fallback: string) => {
    if (!url) return fallback;
    // If it's a legacy filename without path, prepend /assets/
    if (url === 'logo.png' || url === 'mountains.jpg' || url === 'hero-bg.jpg') {
      return `/assets/${url}`;
    }
    return url;
  };

  const currentLogo = getAssetUrl(siteSettings?.logo_url, '/assets/logo.png');
  const currentHeroBg = getAssetUrl(siteSettings?.hero_bg_url, '/assets/hero-bg.jpg');
  const currentTeaImage = siteSettings?.tea_detail_url || 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=1920';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsMenuOpen(false); // Close mobile menu on navigation as well
  }, [page]);

  useEffect(() => {
    const initData = async () => {
      if (!supabase) {
        console.log("No Supabase configuration found. Initializing with local heritage database fallbacks.");
        // Set offline mock site settings
        setSiteSettings({
          id: 'local-fallback',
          logo_url: '/assets/logo_v2.jpg',
          hero_bg_url: '/assets/mountains_v2.jpg',
          tea_detail_url: '/assets/bulhansuncha_v2.jpg',
          artists: translations.KR.artDetail.artists,
          tea_slider_images: [
            '/assets/bulhansuncha_v2.jpg',
            '/assets/mountains_v2.jpg',
            '/assets/logo_v2.jpg'
          ],
          tea_slider_speed: 4000
        });

        // Initialize offline poetry/archive database
        const localItems: ArchiveItem[] = [
          ...DEFAULT_TEA_POEMS,
          ...DEFAULT_PHILOSOPHY_ITEMS,
          ...DEFAULT_JOURNEY_PHOTOS,
          ...DEFAULT_JOURNEY_PRESS,
        ];

        // Setup mock poems for each of the official collections to make the poetry list experience robust
        const collectionsKR = translations.KR.poetryCollection.KR;
        const collectionsTC = translations.TC.poetryCollection.TC;
        const collectionsEN = translations.EN.poetryCollection.EN;

        collectionsKR.forEach((colName, cIdx) => {
          localItems.push({
            id: `kr-col-${cIdx}-1`,
            title: `${colName} 서시 (序詩)`,
            summary: `${colName}의 깊은 사유와 예술 철학을 여는 서시.`,
            content: `### ${colName} 서시 (序詩)\n\n하늘과 땅이 나뉘기 전에\n한 가닥 맑은 파동이 있었으니\n이것이 곧 심물(心物)의 시초라.\n\n라석의 깊은 사유와 우주를 관통하는 예술이\n당신의 어두운 길에 한 줄기 고요한 촛불이 되기를.`,
            image_url: '/assets/logo_v2.jpg',
            poetry_collection_name: colName,
            language: 'KR'
          });
          localItems.push({
            id: `kr-col-${cIdx}-2`,
            title: `${colName} 물파와 가을 안개`,
            summary: `고요의 시간 속에서 바라보는 물파의 흔적.`,
            content: `### 물파와 가을 안개\n\n산마루 위로 흘러가는 가을 안개는\n소리 없이 내 마음의 여백을 두드린다.\n\n우리는 형상에 사로잡혀\n그 배후의 파동을 잊고 살아가지만\n찻물이 뜨거워지고 안개가 걷힐 때\n보이지 않던 진동이 마침내 보이기 시작한다.`,
            image_url: '/assets/mountains_v2.jpg',
            poetry_collection_name: colName,
            language: 'KR'
          });
        });

        collectionsTC.forEach((colName, cIdx) => {
          localItems.push({
            id: `tc-col-${cIdx}-1`,
            title: `${colName} 序詩`,
            summary: `${colName} 的深邃精神。`,
            content: `### ${colName} 序詩\n\n萬物皆有靈，\n心物本非二。\n茶中可見乾坤，\n詩中可載古今。\n\n願此茶之清香，\n洗滌心靈之塵埃。`,
            image_url: '/assets/logo_v2.jpg',
            poetry_collection_name: colName,
            language: 'TC'
          });
        });

        collectionsEN.forEach((colName, cIdx) => {
          localItems.push({
            id: `en-col-${cIdx}-1`,
            title: `Prelude to ${colName}`,
            summary: `An introductory piece that captures the essence of ${colName}.`,
            content: `### Prelude to ${colName}\n\nBefore the dawn of creation,\nA gentle cosmic wave vibrated.\nThis is the oneness of mind and matter.\n\nMay this collection of verse\nBring peace to your seeking spirit.`,
            image_url: '/assets/logo_v2.jpg',
            poetry_collection_name: colName,
            language: 'EN'
          });
        });

        setArchiveItems(localItems);
        return;
      }
      // Fetch Settings - Resiliently pick one and cleanup duplicates
      const { data: settingsList, error: settingsError } = await supabase
        .from('site_settings')
        .select('*')
        .order('id', { ascending: true });
      
      if (!settingsError && settingsList && settingsList.length > 0) {
        setSiteSettings(settingsList[0]);
        
        // Cleanup: if multiple rows exist, remove the redundant ones to prevent future confusion
        if (settingsList.length > 1) {
          const idsToDelete = settingsList.slice(1).map((s: SiteSettings) => s.id);
          supabase.from('site_settings').delete().in('id', idsToDelete).then(({ error }: { error: any }) => {
            if (!error) console.log("Cleaned up duplicate site_settings records.");
          });
        }
      } else if (!settingsError && (settingsList === null || settingsList.length === 0)) {
        // No settings found, create initial
        const { data: newSettings } = await supabase
          .from('site_settings')
          .insert([{ 
            logo_url: '/assets/logo_v2.jpg', 
            hero_bg_url: '/assets/mountains_v2.jpg', 
            tea_detail_url: '/assets/bulhansuncha_v2.jpg',
            artists: translations.KR.artDetail.artists
          }])
          .select()
          .single();
        if (newSettings) setSiteSettings(newSettings);
      } else if (settingsError) {
        console.error("Settings Fetch Error:", settingsError);
        setDbError(`환경설정 로드 실패: ${settingsError.message}`);
      }

      // Fetch Archive
      const { data: archive, error: archiveError } = await supabase
        .from('archive_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!archiveError && archive) {
        setArchiveItems(archive as ArchiveItem[]);
      } else if (archiveError) {
        console.error("Archive Fetch Error:", archiveError);
        setDbError(`시집 데이터 로드 실패: ${archiveError.message}`);
      }
    };

    initData();
  }, []);

  return (
    <div className="font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 py-6 flex justify-between items-center ${scrolled ? 'bg-white/80 backdrop-blur-md py-4 shadow-sm' : 'bg-transparent'}`}>
        <div className="flex items-center gap-12">
          <button onClick={() => setPage('home')} className="flex items-center group">
            <img 
              src={currentLogo} 
              alt="Bulhanza Logo" 
              className={`h-12 md:h-16 w-auto object-contain transition-all duration-500 ${(page === 'home' && !scrolled) ? 'invert brightness-200' : ''}`} 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== window.location.origin + '/assets/logo.png') {
                  target.src = '/assets/logo.png';
                }
              }}
            />
          </button>
          <div className={`hidden md:flex gap-12 text-[15px] md:text-[16px] tracking-[0.3em] uppercase font-medium transition-colors duration-500 ${(page === 'home' && !scrolled) ? 'text-white' : 'text-black'}`}>
            <button onClick={() => setPage('philosophy')} className={`hover:opacity-100 transition-opacity opacity-70 ${page === 'philosophy' ? 'opacity-100 font-bold border-b-2 border-current pb-1' : ''}`}>{t.nav.philosophy}</button>
            <button onClick={() => setPage('art')} className={`hover:opacity-100 transition-opacity opacity-70 ${page === 'art' ? 'opacity-100 font-bold border-b-2 border-current pb-1' : ''}`}>{t.nav.art}</button>
            <button onClick={() => setPage('poetryCollection')} className={`hover:opacity-100 transition-opacity opacity-70 ${page === 'poetryCollection' ? 'opacity-100 font-bold border-b-2 border-current pb-1' : ''}`}>{t.nav.poetryCollection}</button>
            <button onClick={() => setPage('tea')} className={`hover:opacity-100 transition-opacity opacity-70 ${page === 'tea' ? 'opacity-100 font-bold border-b-2 border-current pb-1' : ''}`}>{t.nav.tea}</button>
            <button onClick={() => setPage('journey')} className={`hover:opacity-100 transition-opacity opacity-70 ${page === 'journey' ? 'opacity-100 font-bold border-b-2 border-current pb-1' : ''}`}>{t.nav.journey}</button>
            <button onClick={() => setPage('contact')} className={`hover:opacity-100 transition-opacity opacity-70 ${page === 'contact' ? 'opacity-100 font-bold border-b-2 border-current pb-1' : ''}`}>{t.nav.contact}</button>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="flex items-center gap-6">
            {(['KR', 'TC', 'EN'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-[14px] md:text-[15px] font-bold tracking-[0.1em] transition-all duration-500 ${(page === 'home' && !scrolled) ? 'text-white' : 'text-black'} ${lang === l ? 'opacity-100 scale-110 underline underline-offset-4' : 'opacity-30 hover:opacity-70 scale-95'}`}
                title={l === 'KR' ? '한국어' : l === 'TC' ? '繁體中文' : 'English'}
              >
                {l === 'TC' ? 'CN' : l}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className={`md:hidden transition-colors duration-500 ${(page === 'home' && !scrolled) ? 'text-white' : 'text-black'} opacity-70 hover:opacity-100`}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
          
          <button 
                onClick={() => setPage('dashboard')}
                className={`hidden md:block transition-colors duration-500 ${(page === 'home' && !scrolled) ? 'text-white' : 'text-black'} opacity-40 hover:opacity-100`}
                title="Admin Dashboard"
              >
            <Settings size={18} />
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
            <button onClick={() => { setIsMenuOpen(false); setPage('philosophy'); }}>{t.nav.philosophy}</button>
            <button onClick={() => { setIsMenuOpen(false); setPage('art'); }}>{t.nav.art}</button>
            <button onClick={() => { setIsMenuOpen(false); setPage('poetryCollection'); }}>{t.nav.poetryCollection}</button>
            <button onClick={() => { setIsMenuOpen(false); setPage('tea'); }}>{t.nav.tea}</button>
            <button onClick={() => { setIsMenuOpen(false); setPage('journey'); }}>{t.nav.journey}</button>
            <button onClick={() => { setIsMenuOpen(false); setPage('contact'); }}>{t.nav.contact}</button>
            <div className="flex gap-12 mt-12">
              {(['KR', 'TC', 'EN'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setIsMenuOpen(false); }}
                  className={`text-2xl font-bold transition-all ${lang === l ? 'scale-125' : 'opacity-40'}`}
                >
                  {l === 'TC' ? 'CN' : l}
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
            <header className="relative h-[100vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden group/hero bg-black">
              <div className="absolute inset-0 z-0">
                <motion.div 
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 2.5, ease: "easeOut" }}
                  className="w-full h-full"
                >
                  <img 
                    src={currentHeroBg} 
                    alt="Hero Background" 
                    className="w-full h-full object-cover opacity-60 grayscale brightness-75 group-hover/hero:scale-105 transition-transform duration-[15s] ease-out"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1490127252417-7c393f993ee4?auto=format&fit=crop&q=80&w=1920';
                    }}
                  />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
                
                {/* Modern subtle patterns */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay">
                  <div className="absolute inset-0 border-[40px] border-white/10 m-12 md:m-24" />
                </div>
              </div>

              {/* Sophisticated light wave animation */}
              <div className="absolute inset-0 opacity-[0.08] pointer-events-none z-10 overflow-hidden">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <motion.path
                    d="M-10 50 Q 25 40, 50 50 T 110 50"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.05"
                    animate={{
                      d: [
                        "M-10 50 Q 25 40, 50 50 T 110 50",
                        "M-10 50 Q 25 70, 50 50 T 110 50",
                        "M-10 50 Q 25 40, 50 50 T 110 50"
                      ]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                className="z-20 relative max-w-[90vw] md:max-w-4xl"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ delay: 0.5, duration: 1.5 }}
                  className="text-[10px] md:text-[12px] tracking-[0.8em] uppercase font-bold text-white mb-8 block"
                >
                  Mind & Matter / Mulpaism
                </motion.div>
                <h1 className="text-3xl md:text-5xl font-serif mb-10 tracking-[0.1em] md:tracking-[0.2em] leading-tight text-white drop-shadow-2xl font-light whitespace-pre-line">
                  {t.hero.title}
                </h1>
                <p className="text-base md:text-xl font-serif tracking-[0.2em] opacity-80 text-white max-w-2xl mx-auto leading-relaxed italic border-t border-white/10 pt-10">
                  {t.hero.subtitle}
                </p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 1.5 }}
                  className="mt-16"
                >
                  <button 
                    onClick={() => {
                      const el = document.getElementById('philosophy');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="group flex flex-col items-center gap-4 mx-auto"
                  >
                    <span className="text-[9px] tracking-[0.6em] uppercase text-white opacity-40 group-hover:opacity-100 transition-opacity">Explore</span>
                    <div className="w-px h-12 bg-white/20 group-hover:h-20 transition-all duration-700 ease-out" />
                  </button>
                </motion.div>
              </motion.div>
            </header>

            {/* Enhanced Philosophy Section */}
            <section id="philosophy" className="relative min-h-[120vh] bg-white flex flex-col items-center justify-center py-32 overflow-hidden">
              <div className="absolute top-20 left-10 md:left-24 opacity-[0.03] select-none pointer-events-none">
                <span className="text-[15vw] md:text-[20vw] font-serif leading-none">心物</span>
              </div>
              <div className="absolute bottom-20 right-10 md:right-24 opacity-[0.03] select-none pointer-events-none">
                <span className="text-[15vw] md:text-[20vw] font-serif leading-none">哲學</span>
              </div>
              
              <div className="container mx-auto px-6 md:px-24 grid md:grid-cols-2 gap-20 items-center relative z-10">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="space-y-12"
                >
                  <div className="space-y-4">
                    <span className="text-xs tracking-[0.5em] uppercase opacity-40 font-bold block">Section 01</span>
                    <h2 className="text-3xl md:text-5xl font-serif tracking-widest leading-tight">
                      {t.philosophy.title}
                    </h2>
                  </div>
                  <p className="text-[33px] font-serif leading-relaxed tracking-wide opacity-80 text-left">
                    {t.philosophy.text}
                  </p>
                  <div className="pt-8">
                    <button 
                      onClick={() => setPage('philosophy')}
                      className="group relative inline-flex items-center gap-6 text-sm tracking-[0.6em] uppercase font-bold"
                    >
                      <span className="relative z-10">Read More</span>
                      <div className="w-12 h-px bg-black group-hover:w-24 transition-all duration-500" />
                    </button>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="relative aspect-[3/4] md:aspect-square"
                >
                  <div className="absolute -inset-4 border border-black/5 -rotate-3" />
                  <div className="absolute -inset-4 border border-black/5 rotate-3" />
                  <img 
                    src="https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1000" 
                    alt="Philosophy" 
                    className="w-full h-full object-cover grayscale brightness-95"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
                </motion.div>
              </div>
            </section>

            {/* Enhanced Art Section */}
            <section id="art" className="relative min-h-[120vh] bg-[#111] text-white py-32 flex items-center overflow-hidden">
               {/* Background noise and texture */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
              
              <div className="container mx-auto px-6 md:px-24 relative z-10">
                <div className="grid md:grid-cols-12 gap-12 items-end">
                  <div className="md:col-span-7">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1 }}
                      className="relative pb-20"
                    >
                      <img 
                        src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=1200" 
                        alt="Art Space" 
                        className="w-full h-[60vh] object-cover grayscale opacity-50 contrast-125"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-10 -right-10 md:-right-20 bg-white text-black p-12 md:p-16 max-w-md shadow-2xl">
                        <span className="text-xs tracking-[0.4em] uppercase opacity-40 mb-6 block font-bold">Concept 02</span>
                        <h2 className="text-[32px] md:text-[48px] font-serif tracking-[0.2em] mb-8 leading-tight">
                          {t.art.title}
                        </h2>
                        <p className="text-lg font-serif tracking-widest opacity-70 leading-relaxed mb-8">
                          {t.art.text}
                        </p>
                        <button 
                          onClick={() => setPage('art')}
                          className="text-xs tracking-[0.5em] uppercase font-bold border-b border-black pb-2 hover:opacity-50 transition-opacity"
                        >
                          Enter Space
                        </button>
                      </div>
                    </motion.div>
                  </div>
                  
                  <div className="md:col-span-5 md:pl-20 mt-20 md:mt-0">
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                      className="space-y-16"
                    >
                      <div className="w-px h-32 bg-white/20" />
                      <div className="space-y-6">
                        <p className="text-sm tracking-[0.3em] font-serif leading-loose opacity-60">
                          {lang === 'KR' ? '예술은 형태가 아니라 파동입니다. 그 파동이 마음에 닿을 때 비로소 작품은 생명을 얻습니다. 고요한 공간 속에서 울려 퍼지는 내면의 소리에 집중해 보십시오.' : 
                           lang === 'TC' ? '藝術非形也，乃波也。波動入心，則生共鳴。於寂靜之境，聽內心之音。' :
                           'Art is not a form, but a wave. When it reaches the mind, it resonates and comes to life. Focus on the inner sound echoing in the silent space.'}
                        </p>
                        <div className="grid grid-cols-2 gap-4 opacity-40">
                          <img src="https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=300" className="w-full aspect-square object-cover grayscale" referrerPolicy="no-referrer" />
                          <img src="https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=300" className="w-full aspect-square object-cover grayscale" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </section>

            {/* Enhanced Tea Section */}
            <section id="tea" className="relative min-h-screen bg-white flex items-center justify-center py-32 overflow-hidden">
              <div className="absolute inset-0 md:left-[50%] overflow-hidden flex items-center justify-center">
                <img 
                  src="/assets/tea_image.jpg" 
                  alt="Tea" 
                  className="w-full h-full object-cover grayscale opacity-[0.15] md:w-[70%] md:h-[70%] md:object-cover md:grayscale-0 md:opacity-100 transition-all duration-[5s] hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="container mx-auto px-6 md:px-24 relative z-10">
                <div className="max-w-xl bg-white/90 backdrop-blur-sm md:bg-white p-10 md:p-20 shadow-xl md:shadow-none border border-black/5">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                    className="space-y-12"
                  >
                    <div className="space-y-6">
                      <span className="text-[10px] tracking-[0.5em] uppercase font-bold opacity-40">The Essence 03</span>
                      <h2 className="text-3xl md:text-5xl font-serif tracking-[0.15em] leading-tight">
                        {t.tea.title}
                      </h2>
                    </div>
                    
                    <div className="w-12 h-px bg-black/40" />
                    
                    <p className="text-lg md:text-xl font-serif tracking-widest leading-relaxed opacity-80 italic">
                      {t.tea.text}
                    </p>
                    
                    <div className="pt-8">
                      <button 
                        onClick={() => setPage('tea')}
                        className="text-xs tracking-[0.5em] uppercase font-bold px-10 py-5 bg-black text-white hover:bg-black/80 transition-all shadow-lg hover:shadow-black/20"
                      >
                        Discover Tea
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              {/* Decorative text */}
              <div className="absolute top-24 right-24 hidden lg:block select-none pointer-events-none opacity-5">
                <span className="text-[120px] font-serif vertical-rl tracking-[0.5em]">弗寒仙茶</span>
              </div>
            </section>

            {/* Enhanced About Section */}
            <section id="about" className="relative min-h-screen bg-[#0a0a0a] text-white py-40 overflow-hidden">
              <div className="container mx-auto px-6 md:px-24 flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5 }}
                  className="max-w-5xl text-center space-y-20 relative"
                >
                  <div className="space-y-10">
                    <h2 className="text-[10px] md:text-[12px] tracking-[1em] uppercase font-bold opacity-30 text-white">Behind the Silence</h2>
                    <p className="text-[29px] leading-[42px] font-serif tracking-wide text-white font-light">
                      {t.about.text}
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-12 pt-20 border-t border-white/5">
                    <div className="space-y-4">
                      <h4 className="text-[11px] tracking-[0.4em] uppercase font-bold opacity-30">Our Mission</h4>
                      <p className="text-sm font-serif opacity-60 leading-relaxed tracking-[0.1em]">
                        {lang === 'KR' ? '보이지 않는 것의 가치를 글과 그림, 그리고 차의 울림으로 전달합니다.' : 
                         lang === 'TC' ? '透過筆、畫與茶的迴響，傳達無形之物的價值。' :
                         'Conveying the value of the invisible through writing, painting, and the resonance of tea.'}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[11px] tracking-[0.4em] uppercase font-bold opacity-30">The Philosophy</h4>
                      <p className="text-sm font-serif opacity-60 leading-relaxed tracking-[0.1em]">
                        {lang === 'KR' ? '심물철학은 마음과 사물이 하나임을 깨닫는 사유의 정점입니다.' : 
                         lang === 'TC' ? '心物哲學是領悟心與物合一的思想巔峰。' :
                         'Mind-Matter philosophy is the pinnacle of thought that realizes mind and matter are one.'}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[16px] tracking-[0.4em] uppercase font-bold text-[#0000ff]">The Space</h4>
                      <p className="text-sm font-serif opacity-60 leading-relaxed tracking-[0.1em]">
                        {lang === 'KR' ? '물파공간은 그 사유가 예술로 형상화되는 거룩한 장소입니다.' : 
                         lang === 'TC' ? '物波空間是將那種思維具象化為藝術的神聖場所。' :
                         'Mulpa Space is a sacred place where such thoughts are shaped into art.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-32 opacity-10 flex flex-col items-center gap-10">
                     <div className="w-[2px] h-[36px] bg-white" />
                     <img src="/assets/logo.png" alt="Bulhanza Logo" className="h-16 w-auto invert" referrerPolicy="no-referrer" />
                  </div>
                </motion.div>
              </div>
              
              {/* Animated subtle shapes */}
              <div className="absolute top-1/2 left-0 w-96 h-96 bg-white opacity-[0.01] rounded-full blur-[100px] -translate-x-1/2" />
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white opacity-[0.015] rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
            </section>

          </motion.div>
        ) : page === 'philosophy' ? (
          <PhilosophyPage key="philosophy" t={t} setPage={setPage} />
        ) : page === 'art' ? (
          <ArtDetailPage key="art" t={t} setPage={setPage} siteSettings={siteSettings} archiveItems={archiveItems} />
        ) : page === 'tea' ? (
          <TeaDetailPage key="tea" t={t} setPage={setPage} currentTeaImage={currentTeaImage} siteSettings={siteSettings} archiveItems={archiveItems} />
        ) : page === 'journey' ? (
          <JourneyPage key="journey" t={t} setPage={setPage} archiveItems={archiveItems} />
        ) : page === 'poetryCollection' ? (
          <PoetryCollectionPage key="poetryCollection" t={t} setPage={setPage} archiveItems={archiveItems} dbError={dbError} />
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

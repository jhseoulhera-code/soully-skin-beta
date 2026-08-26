export const chapters = [
  {
    "id": "morning",
    "title": "아침의 내 피부",
    "label": "유수분 · 기본 반응",
    "emoji": "🌤️",
    "accent": "#B9A7F3",
    "soft": "#F4F0FF",
    "deep": "#8067D7",
    "intro": "하루를 시작할 때 가장 먼저 느껴지는 피부 신호를 살펴봐요."
  },
  {
    "id": "afternoon",
    "title": "오후가 되면",
    "label": "유분 · 속당김 · 메이크업 변화",
    "emoji": "🕒",
    "accent": "#B6DDD0",
    "soft": "#F1FAF7",
    "deep": "#6FB49E",
    "intro": "시간이 지나면서 달라지는 피부의 균형을 확인해볼게요."
  },
  {
    "id": "newproduct",
    "title": "새로운 화장품",
    "label": "민감 반응 · 향 · 회복 속도",
    "emoji": "🧴",
    "accent": "#F1DFA7",
    "soft": "#FFFAEC",
    "deep": "#C7AA54",
    "intro": "처음 만나는 성분과 향에 내 피부가 어떻게 반응하는지 봐요."
  },
  {
    "id": "pores",
    "title": "모공과 트러블",
    "label": "블랙헤드 · 좁쌀 · 막힘",
    "emoji": "🫧",
    "accent": "#F2C1B5",
    "soft": "#FFF5F1",
    "deep": "#D78F7D",
    "intro": "겉으로 보이는 모공보다 반복되는 막힘과 트러블 패턴을 살펴봐요."
  },
  {
    "id": "marks",
    "title": "흔적과 피부톤",
    "label": "색소 · 흔적 · 피부톤",
    "emoji": "✨",
    "accent": "#E8C1D1",
    "soft": "#FFF5F9",
    "deep": "#B88399",
    "intro": "트러블이 지나간 뒤 남는 흔적과 피부톤 변화를 확인해요."
  },
  {
    "id": "heat",
    "title": "햇빛과 더위",
    "label": "열감 · 습도 · 환경 반응",
    "emoji": "☀️",
    "accent": "#F2CE9E",
    "soft": "#FFF8EE",
    "deep": "#D6A362",
    "intro": "더위와 햇빛, 습도에 피부가 얼마나 반응하는지 살펴봐요."
  },
  {
    "id": "tired",
    "title": "탄력과 피로",
    "label": "탄력 · 잔선 · 회복력",
    "emoji": "🌙",
    "accent": "#C4D3EA",
    "soft": "#F3F7FC",
    "deep": "#819DC5",
    "intro": "피곤한 날 드러나는 피부 회복력과 탄력 신호를 살펴봐요."
  },
  {
    "id": "recent",
    "title": "최근의 내 피부",
    "label": "현재 컨디션 · Skin Weather",
    "emoji": "💧",
    "accent": "#CBDDC7",
    "soft": "#F4FAF2",
    "deep": "#8BA884",
    "intro": "마지막으로 요즘 피부 컨디션을 따로 기록해둘게요."
  }
];

export const questions = [
  {
    "chapter": "morning",
    "text": "세안 후 아무것도 바르지 않고 10분이 지나면 가장 가까운 상태는?",
    "axis": "OD",
    "state": false,
    "tag": "post_cleanse",
    "options": [
      {
        "label": "얼굴 전체가 많이 당긴다",
        "score": -3
      },
      {
        "label": "볼이나 입 주변이 당긴다",
        "score": -1
      },
      {
        "label": "크게 불편하지 않다",
        "score": 1
      },
      {
        "label": "코·이마부터 유분이 느껴진다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "morning",
    "text": "아침에 일어났을 때 피부 표면은 어떤가요?",
    "axis": "OD",
    "state": false,
    "tag": "morning_surface",
    "options": [
      {
        "label": "건조하고 푸석하다",
        "score": -3
      },
      {
        "label": "볼은 건조하지만 T존은 괜찮다",
        "score": -1
      },
      {
        "label": "편안한 편이다",
        "score": 1
      },
      {
        "label": "코·이마 또는 얼굴 전체에 유분이 있다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "morning",
    "text": "세안 직후 얼굴이 붉어지거나 화끈거리는 편인가요?",
    "axis": "SR",
    "state": false,
    "tag": "cleansing_sensitivity",
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔 그렇다",
        "score": -1
      },
      {
        "label": "자주 그렇다",
        "score": 2
      },
      {
        "label": "거의 항상 그렇다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "morning",
    "text": "보습제를 충분히 바르지 않으면 피부가 어떻게 되나요?",
    "axis": "OD",
    "state": false,
    "tag": "moisturizer_need",
    "options": [
      {
        "label": "금방 심하게 당긴다",
        "score": -3
      },
      {
        "label": "몇 시간 뒤 건조해진다",
        "score": -1
      },
      {
        "label": "큰 차이가 없다",
        "score": 1
      },
      {
        "label": "가볍게 바르는 편이 더 편하다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "morning",
    "text": "아침 세안제를 바꿨을 때 피부 반응이 달라지는 편인가요?",
    "axis": "SR",
    "state": false,
    "tag": "cleanser_trigger",
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔 있다",
        "score": -1
      },
      {
        "label": "자주 있다",
        "score": 2
      },
      {
        "label": "매우 쉽게 달라진다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "afternoon",
    "text": "오후가 되면 가장 먼저 느껴지는 변화는?",
    "axis": "OD",
    "state": false,
    "tag": "afternoon_change",
    "options": [
      {
        "label": "전체적으로 푸석해진다",
        "score": -3
      },
      {
        "label": "볼은 건조하고 T존만 번들거린다",
        "score": 0
      },
      {
        "label": "아침과 크게 다르지 않다",
        "score": 1
      },
      {
        "label": "T존이나 얼굴 전체가 번들거린다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "afternoon",
    "text": "메이크업이나 선크림을 바른 날 시간이 지나면?",
    "axis": "OD",
    "state": false,
    "tag": "makeup_wear",
    "options": [
      {
        "label": "들뜨거나 갈라진다",
        "score": -3
      },
      {
        "label": "볼·입 주변만 건조해진다",
        "score": -1
      },
      {
        "label": "큰 변화가 없다",
        "score": 1
      },
      {
        "label": "유분 때문에 쉽게 무너진다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "afternoon",
    "text": "코와 이마는 번들거리는데 볼은 당기는 경우가 있나요?",
    "axis": "OD",
    "state": false,
    "tag": "combo_skin",
    "options": [
      {
        "label": "거의 없다",
        "score": -1
      },
      {
        "label": "가끔 있다",
        "score": 1
      },
      {
        "label": "자주 있다",
        "score": 2
      },
      {
        "label": "매우 자주 있다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "afternoon",
    "text": "겉은 번들거리는데 피부 안쪽은 당기는 느낌이 있나요?",
    "axis": "OD",
    "state": false,
    "tag": "dehydrated_oily",
    "options": [
      {
        "label": "거의 없다",
        "score": -1
      },
      {
        "label": "가끔",
        "score": 1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "afternoon",
    "text": "더운 날에도 피부가 건조하거나 당기는 편인가요?",
    "axis": "OD",
    "state": false,
    "tag": "hot_weather_dryness",
    "options": [
      {
        "label": "거의 항상",
        "score": -3
      },
      {
        "label": "자주",
        "score": -2
      },
      {
        "label": "가끔",
        "score": 0
      },
      {
        "label": "거의 없다",
        "score": 2
      }
    ]
  },
  {
    "chapter": "afternoon",
    "text": "오후가 되면 코 주변 유분을 닦아내거나 수정 화장을 자주 하나요?",
    "axis": "OD",
    "state": false,
    "tag": "oil_management",
    "options": [
      {
        "label": "거의 하지 않는다",
        "score": -2
      },
      {
        "label": "가끔 한다",
        "score": 0
      },
      {
        "label": "하루 1번 정도",
        "score": 2
      },
      {
        "label": "하루 여러 번 한다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "새 화장품을 사용했을 때 따갑거나 붉어진 적이 있나요?",
    "axis": "SR",
    "state": false,
    "tag": "general_trigger",
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔 있다",
        "score": -1
      },
      {
        "label": "자주 있다",
        "score": 2
      },
      {
        "label": "매우 자주 있다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "향이 강한 스킨케어 제품을 사용했을 때 피부가 불편해진 적이 있나요?",
    "axis": "SR",
    "state": false,
    "tag": "fragrance",
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "향은 느껴지지만 피부 반응은 없다",
        "score": -1
      },
      {
        "label": "가끔 따갑거나 붉어진다",
        "score": 2
      },
      {
        "label": "향이 강하면 피부가 쉽게 불편해진다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "향료나 에센셜오일이 들어간 제품을 피부 때문에 일부러 피하는 편인가요?",
    "axis": "SR",
    "state": false,
    "tag": "fragrance_avoid",
    "options": [
      {
        "label": "전혀 아니다",
        "score": -3
      },
      {
        "label": "거의 아니다",
        "score": -1
      },
      {
        "label": "가끔 피한다",
        "score": 2
      },
      {
        "label": "가능하면 피하는 편이다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "알코올감이 강한 토너나 선제품을 사용하면 따갑거나 건조해지나요?",
    "axis": "SR",
    "state": false,
    "tag": "alcohol",
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "평소 잘 쓰던 제품도 피부 컨디션이 안 좋은 날 따갑게 느껴지나요?",
    "axis": "SR",
    "state": false,
    "tag": "barrier",
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "각질 제거제나 필링 제품을 사용한 뒤 피부가 오래 불편한가요?",
    "axis": "SR",
    "state": false,
    "tag": "exfoliation",
    "options": [
      {
        "label": "거의 아니다",
        "score": -3
      },
      {
        "label": "약간 있다",
        "score": -1
      },
      {
        "label": "자주 있다",
        "score": 2
      },
      {
        "label": "오래 불편하다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "마스크·수건·화장솜처럼 피부에 마찰이 생긴 뒤 쉽게 붉어지나요?",
    "axis": "SR",
    "state": false,
    "tag": "friction",
    "options": [
      {
        "label": "거의 아니다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "냉난방이 강한 공간이나 건조한 바람에 피부가 쉽게 불편해지나요?",
    "axis": "SR",
    "state": false,
    "tag": "environment",
    "options": [
      {
        "label": "거의 아니다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "새 화장품 사용 후 불편함이 생겼다면 보통 얼마나 오래 지속되나요?",
    "axis": "SR",
    "state": false,
    "tag": "recovery",
    "options": [
      {
        "label": "10분 이내",
        "score": -3
      },
      {
        "label": "몇 시간",
        "score": -1
      },
      {
        "label": "하루 정도",
        "score": 2
      },
      {
        "label": "2일 이상",
        "score": 3
      }
    ]
  },
  {
    "chapter": "newproduct",
    "text": "처음 쓰는 제품을 바로 얼굴 전체에 바르는 것이 부담스럽나요?",
    "axis": "SR",
    "state": false,
    "tag": "behavior",
    "options": [
      {
        "label": "전혀 아니다",
        "score": -3
      },
      {
        "label": "크게 부담 없다",
        "score": -1
      },
      {
        "label": "작은 부위부터 써본다",
        "score": 2
      },
      {
        "label": "새 제품 자체가 부담스럽다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "pores",
    "text": "코나 턱을 만졌을 때 오돌토돌한 느낌이 있나요?",
    "axis": "CB",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "거의 항상",
        "score": 3
      }
    ]
  },
  {
    "chapter": "pores",
    "text": "화이트헤드나 좁쌀이 생기는 편인가요?",
    "axis": "CB",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "pores",
    "text": "블랙헤드를 관리해도 쉽게 다시 눈에 띄나요?",
    "axis": "CB",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 아니다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 빠르게 다시 생긴다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "pores",
    "text": "무거운 크림이나 오일을 충분히 바르면?",
    "axis": "CB",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "피부가 더 편안하다",
        "score": -3
      },
      {
        "label": "별 차이 없다",
        "score": -1
      },
      {
        "label": "답답할 때가 있다",
        "score": 2
      },
      {
        "label": "좁쌀이나 트러블이 잘 생긴다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "pores",
    "text": "선크림이나 메이크업을 며칠 연속 사용하면?",
    "axis": "CB",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "특별한 변화 없다",
        "score": -3
      },
      {
        "label": "약간 답답하다",
        "score": -1
      },
      {
        "label": "모공이 막히는 느낌이 든다",
        "score": 2
      },
      {
        "label": "트러블이 쉽게 생긴다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "pores",
    "text": "스트레스나 수면 부족 후 모공막힘이나 트러블이 늘어나나요?",
    "axis": "CB",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 변화 없다",
        "score": -3
      },
      {
        "label": "약간 늘어난다",
        "score": -1
      },
      {
        "label": "확실히 늘어난다",
        "score": 2
      },
      {
        "label": "매우 심해진다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "pores",
    "text": "반복적으로 막히는 부위가 있나요?",
    "axis": "CB",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "한 부위 정도",
        "score": -1
      },
      {
        "label": "두 부위 이상",
        "score": 2
      },
      {
        "label": "여러 부위에 반복된다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "pores",
    "text": "피부는 건조하게 느껴지는데 모공 안에는 피지가 있는 편인가요?",
    "axis": "CB",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "marks",
    "text": "트러블이 가라앉은 뒤 갈색이나 어두운 흔적이 남나요?",
    "axis": "PN",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 남지 않는다",
        "score": -3
      },
      {
        "label": "가끔 남는다",
        "score": -1
      },
      {
        "label": "자주 남는다",
        "score": 2
      },
      {
        "label": "거의 항상 오래 남는다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "marks",
    "text": "벌레에 물리거나 긁힌 자리가 어둡게 남는 편인가요?",
    "axis": "PN",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 아니다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 잘 남는다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "marks",
    "text": "작은 상처가 아문 뒤에도 색 변화가 남나요?",
    "axis": "PN",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "약간 남는다",
        "score": -1
      },
      {
        "label": "꽤 오래 남는다",
        "score": 2
      },
      {
        "label": "오래 지속된다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "marks",
    "text": "햇빛을 많이 받은 뒤 내 피부는?",
    "axis": "PN",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "붉었다가 비교적 빨리 돌아온다",
        "score": -3
      },
      {
        "label": "약간 어두워진다",
        "score": -1
      },
      {
        "label": "쉽게 탄다",
        "score": 2
      },
      {
        "label": "어두워진 상태가 오래간다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "marks",
    "text": "얼굴에 피부톤이 고르지 않은 부분이 눈에 띄나요?",
    "axis": "PN",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "약간 있다",
        "score": -1
      },
      {
        "label": "꽤 눈에 띈다",
        "score": 2
      },
      {
        "label": "가장 큰 고민 중 하나다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "marks",
    "text": "트러블 자체보다 지나간 뒤 흔적이 더 오래 신경 쓰이나요?",
    "axis": "PN",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "전혀 아니다",
        "score": -3
      },
      {
        "label": "조금 그렇다",
        "score": -1
      },
      {
        "label": "꽤 그렇다",
        "score": 2
      },
      {
        "label": "매우 그렇다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "marks",
    "text": "잡티나 흔적이 생긴 뒤 색이 옅어지는 속도는 어떤가요?",
    "axis": "PN",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "비교적 빨리 옅어진다",
        "score": -3
      },
      {
        "label": "조금 오래 걸린다",
        "score": -1
      },
      {
        "label": "꽤 오래 걸린다",
        "score": 2
      },
      {
        "label": "매우 오래 남는 편이다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "heat",
    "text": "더운 곳에 오래 있으면 얼굴이 쉽게 뜨거워지나요?",
    "axis": "HQ",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "heat",
    "text": "운동 후 얼굴의 열감이나 붉음은 얼마나 지속되나요?",
    "axis": "HQ",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "10분 이내",
        "score": -1
      },
      {
        "label": "10~30분",
        "score": 2
      },
      {
        "label": "30분 이상",
        "score": 3
      }
    ]
  },
  {
    "chapter": "heat",
    "text": "강한 햇빛을 받은 뒤 피부가 뜨겁거나 불편하게 느껴지나요?",
    "axis": "HQ",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 아니다",
        "score": -3
      },
      {
        "label": "약간",
        "score": -1
      },
      {
        "label": "꽤 그렇다",
        "score": 2
      },
      {
        "label": "매우 그렇다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "heat",
    "text": "덥고 습한 날 피부는?",
    "axis": "HQ",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "오히려 편안하다",
        "score": -3
      },
      {
        "label": "큰 변화 없다",
        "score": -1
      },
      {
        "label": "유분과 답답함이 늘어난다",
        "score": 2
      },
      {
        "label": "열감·붉음·트러블이 확실히 늘어난다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "heat",
    "text": "매운 음식이나 뜨거운 음식을 먹으면 얼굴이 붉어지나요?",
    "axis": "HQ",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "heat",
    "text": "마스크를 오래 쓰거나 환기가 안 되는 곳에 있으면?",
    "axis": "HQ",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 변화 없다",
        "score": -3
      },
      {
        "label": "조금 불편하다",
        "score": -1
      },
      {
        "label": "뜨겁고 답답하다",
        "score": 2
      },
      {
        "label": "피부 컨디션이 확실히 나빠진다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "heat",
    "text": "시원한 수딩 제품을 사용했을 때 피부가 편안해지는 느낌이 큰가요?",
    "axis": "HQ",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "별 차이 없다",
        "score": -3
      },
      {
        "label": "약간",
        "score": -1
      },
      {
        "label": "확실히",
        "score": 2
      },
      {
        "label": "매우 크게 느낀다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "heat",
    "text": "더운 날 피부가 평소보다 쉽게 예민해지나요?",
    "axis": "HQ",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 아니다",
        "score": -3
      },
      {
        "label": "가끔",
        "score": -1
      },
      {
        "label": "자주",
        "score": 2
      },
      {
        "label": "매우 자주",
        "score": 3
      }
    ]
  },
  {
    "chapter": "tired",
    "text": "표정을 짓지 않아도 눈가나 입가에 잔선이 보이나요?",
    "axis": "WT",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 없다",
        "score": -3
      },
      {
        "label": "아주 약간",
        "score": -1
      },
      {
        "label": "눈에 띈다",
        "score": 2
      },
      {
        "label": "확실히 보인다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "tired",
    "text": "몇 년 전보다 피부가 덜 탱탱해졌다고 느끼나요?",
    "axis": "WT",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 변화 없다",
        "score": -3
      },
      {
        "label": "약간",
        "score": -1
      },
      {
        "label": "꽤 그렇다",
        "score": 2
      },
      {
        "label": "확실히 그렇다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "tired",
    "text": "볼이나 턱선이 예전보다 처져 보인다고 느끼나요?",
    "axis": "WT",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "전혀 아니다",
        "score": -3
      },
      {
        "label": "약간",
        "score": -1
      },
      {
        "label": "꽤 그렇다",
        "score": 2
      },
      {
        "label": "많이 그렇다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "tired",
    "text": "수면이 부족한 날 피부가 유난히 푸석하고 힘없어 보이나요?",
    "axis": "WT",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 변화 없다",
        "score": -3
      },
      {
        "label": "약간",
        "score": -1
      },
      {
        "label": "꽤 그렇다",
        "score": 2
      },
      {
        "label": "매우 그렇다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "tired",
    "text": "피부가 피곤해 보인 뒤 원래 컨디션으로 돌아오는 속도는?",
    "axis": "WT",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "빠른 편",
        "score": -3
      },
      {
        "label": "하루 정도",
        "score": -1
      },
      {
        "label": "이틀 이상",
        "score": 2
      },
      {
        "label": "쉽게 회복되지 않는다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "tired",
    "text": "현재 탄력이나 잔주름 관리가 얼마나 중요하다고 느끼나요?",
    "axis": "WT",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 필요 없다",
        "score": -3
      },
      {
        "label": "예방 정도",
        "score": -1
      },
      {
        "label": "꽤 중요하다",
        "score": 2
      },
      {
        "label": "매우 중요한 고민이다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "tired",
    "text": "피부를 눌렀을 때 예전보다 탄성이 덜하다고 느끼나요?",
    "axis": "WT",
    "state": false,
    "tag": null,
    "options": [
      {
        "label": "거의 아니다",
        "score": -3
      },
      {
        "label": "약간",
        "score": -1
      },
      {
        "label": "꽤 그렇다",
        "score": 2
      },
      {
        "label": "확실히 그렇다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "recent",
    "text": "최근 3일 동안 수면은 어땠나요?",
    "axis": "sleep",
    "state": true,
    "tag": "sleep",
    "options": [
      {
        "label": "충분했다",
        "score": 0
      },
      {
        "label": "조금 부족했다",
        "score": 1
      },
      {
        "label": "많이 부족했다",
        "score": 2
      }
    ]
  },
  {
    "chapter": "recent",
    "text": "최근 1주일 피부 당김은?",
    "axis": "dehydration",
    "state": true,
    "tag": "dehydration",
    "options": [
      {
        "label": "평소와 비슷하다",
        "score": 0
      },
      {
        "label": "조금 심해졌다",
        "score": 1
      },
      {
        "label": "많이 심해졌다",
        "score": 2
      }
    ]
  },
  {
    "chapter": "recent",
    "text": "최근 1주일 트러블은?",
    "axis": "trouble",
    "state": true,
    "tag": "trouble",
    "options": [
      {
        "label": "평소와 비슷하다",
        "score": 0
      },
      {
        "label": "조금 늘었다",
        "score": 1
      },
      {
        "label": "많이 늘었다",
        "score": 2
      }
    ]
  },
  {
    "chapter": "recent",
    "text": "오늘 얼굴의 열감은?",
    "axis": "heat",
    "state": true,
    "tag": "heat",
    "options": [
      {
        "label": "편안하다",
        "score": 0
      },
      {
        "label": "약간 따뜻하다",
        "score": 1
      },
      {
        "label": "꽤 뜨겁다",
        "score": 2
      },
      {
        "label": "화끈거리고 불편하다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "recent",
    "text": "최근 스트레스 정도는?",
    "axis": "stress",
    "state": true,
    "tag": "stress",
    "options": [
      {
        "label": "낮다",
        "score": 0
      },
      {
        "label": "보통",
        "score": 1
      },
      {
        "label": "높다",
        "score": 2
      },
      {
        "label": "매우 높다",
        "score": 3
      }
    ]
  },
  {
    "chapter": "recent",
    "text": "최근 2주 안에 새로운 화장품을 사용했나요?",
    "axis": "new_product",
    "state": true,
    "tag": "new_product",
    "options": [
      {
        "label": "아니다",
        "score": 0
      },
      {
        "label": "1개 정도",
        "score": 1
      },
      {
        "label": "2~3개",
        "score": 2
      },
      {
        "label": "여러 제품을 바꿨다",
        "score": 3
      }
    ]
  }
];

const knex = require('knex');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config();

const db = knex({
    client: 'mssql',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    },
});

const EntityCodes = {
    1: { entityTypeId: 1, name: "الجهاز المركزي للتعبئة العامة والإحصاء", hierarchyId: "/1", code: "D0123" },
    2: { entityTypeId: 2, name: "رئاسة الجهاز المركزي للتعبئة العامة والإحصاء", hierarchyId: "/1/2", code: "D0000" },
    3: { entityTypeId: 3, name: "رئيس الجهاز", hierarchyId: "/1/2/3", code: "D0000" },
    4: { entityTypeId: 5, name: "الادارة العامة للمكتب الفني لرئيس الجهاز", hierarchyId: "/1/2/4", code: "D0010" },
    5: { entityTypeId: 5, name: "الادارة العامة للمراجعة الداخلية والحوكمة", hierarchyId: "/1/2/5", code: "D0020" },
    6: { entityTypeId: 5, name: "الادارة العامة للادارة الاستراتيجية", hierarchyId: "/1/2/6", code: "D0030" },
    7: { entityTypeId: 6, name: "الادارة المركزية لشئون مكتب رئيس الجهاز", hierarchyId: "/1/2/7", code: "D0100" },
    8: { entityTypeId: 5, name: "الادارة العامة للتنسيق والسكرتارية", hierarchyId: "/1/2/7/8", code: "D0110" },
    9: { entityTypeId: 5, name: "الادارة العامة للعلاقات العامة", hierarchyId: "/1/2/7/9", code: "D0120" },
    10: { entityTypeId: 5, name: "الادارة العامة لخدمة المواطنين", hierarchyId: "/1/2/7/10", code: "D0130" },
    11: { entityTypeId: 5, name: "الادارة العامة للشئون الفنية / رئاسة الجهاز", hierarchyId: "/1/2/7/11", code: "D0140" },
    12: { entityTypeId: 5, name: "الادارة العامة للامن", hierarchyId: "/1/2/7/12", code: "D0150" },
    13: { entityTypeId: 5, name: "الادارة العامة للتعاون الدولي", hierarchyId: "/1/2/7/13", code: "D0180" },
    14: { entityTypeId: 5, name: "الادارة العامة لتقييم ومراقبة جودة البيانات", hierarchyId: "/1/2/7/14", code: "D0190" },
    15: { entityTypeId: 6, name: "الادارة المركزية لمركز تنمية الموارد البشرية", hierarchyId: "/1/2/15", code: "D0200" },
    16: { entityTypeId: 5, name: "الادارة العامة للشئون المالية والادارية", hierarchyId: "/1/2/15/16", code: "D0210" },
    17: { entityTypeId: 5, name: "الادارة العامة لتخطيط البرامج التدريبية", hierarchyId: "/1/2/15/17", code: "D0220" },
    18: { entityTypeId: 5, name: "الادارة العامة لتنفيذ البرامج التدريبية", hierarchyId: "/1/2/15/18", code: "D0230" },
    19: { entityTypeId: 5, name: "الادارة العامة لمتابعة وتقييم البرامج التدريبية", hierarchyId: "/1/2/15/19", code: "D0240" },
    20: { entityTypeId: 6, name: "الادارة المركزية للشئون القانونية", hierarchyId: "/1/2/20", code: "D0300" },
    21: { entityTypeId: 5, name: "الادارة العامة للتحقيقات والتظلمات والشكاوى", hierarchyId: "/1/2/20/21", code: "D0310" },
    22: { entityTypeId: 5, name: "الادارة العامة للقضايا والفتوى والتشريع والعقود", hierarchyId: "/1/2/20/22", code: "D0320" },
    23: { entityTypeId: 4, name: "قطاع الامانة العامة", hierarchyId: "/1/23", code: "D2000" },
    24: { entityTypeId: 5, name: "الادارة العامة للشئون الفنية و المتابعة / قطاع الامانة العامة", hierarchyId: "/1/23/24", code: "D2010" },
    25: { entityTypeId: 6, name: "الادارة المركزية للموارد البشرية", hierarchyId: "/1/23/25", code: "D2100" },
    26: { entityTypeId: 5, name: "الادارة العامة للتطوير المؤسسي", hierarchyId: "/1/23/25/26", code: "D2110" },
    27: { entityTypeId: 5, name: "الادارة العامة لادارة وتنمية المواهب", hierarchyId: "/1/23/25/27", code: "D2120" },
    28: { entityTypeId: 5, name: "الادارة العامة لعمليات الموارد البشرية", hierarchyId: "/1/23/25/28", code: "D2130" },
    29: { entityTypeId: 5, name: "الادارة العامة للاستحقاقات والمزايا", hierarchyId: "/1/23/25/29", code: "D2140" },
    30: { entityTypeId: 6, name: "الادارة المركزية للشئون المالية والادارية", hierarchyId: "/1/23/30", code: "D2110" },
    31: { entityTypeId: 5, name: "الادارة العامة للشئون المالية", hierarchyId: "/1/23/30/31", code: "D2130" },
    32: { entityTypeId: 5, name: "الادارة العامة للشئون الادارية", hierarchyId: "/1/23/30/32", code: "D2140" },
    33: { entityTypeId: 5, name: "الادارة العامة للشئون للاحتياجات", hierarchyId: "/1/23/30/33", code: "D2230" },
    34: { entityTypeId: 5, name: "الإدارة العامة للحركة والنقل", hierarchyId: "/1/23/30/34", code: "D2240" },
    35: { entityTypeId: 6, name: "الادارة المركزية للشئون الهندسية والصيانة", hierarchyId: "/1/23/35", code: "D2300" },
    36: { entityTypeId: 5, name: "الادارة العامة للاعمال الهندسية", hierarchyId: "/1/23/35/36", code: "D2310" },
    37: { entityTypeId: 5, name: "الادارة العامة للصيانة", hierarchyId: "/1/23/35/37", code: "D2320" },
    38: { entityTypeId: 5, name: "الادارة العامة للمطبوعات والتصوير", hierarchyId: "/1/23/35/38", code: "D2330" },
    39: { entityTypeId: 4, name: "قطاع تكنولوجيا المعلومات", hierarchyId: "/1/39", code: "D3000" },
    40: { entityTypeId: 5, name: "الادارة العامة للشئون الفنية والتخطيط والمتابعة / قطاع تكنولوجيا المعلومات", hierarchyId: "/1/39/40", code: "D3010" },
    41: { entityTypeId: 5, name: "الادارة العامة لنظم المعلومات الجغرافية", hierarchyId: "/1/39/41", code: "D3020" },
    42: { entityTypeId: 6, name: "الادارة المركزية للحساب الالى", hierarchyId: "/1/39/42", code: "D3100" },
    43: { entityTypeId: 5, name: "الادارة العامة للتجهيز والمراجعة", hierarchyId: "/1/39/42/43", code: "D3110" },
    44: { entityTypeId: 5, name: "الادارة العامة لتجهيز البيانات", hierarchyId: "/1/39/42/44", code: "D3120" },
    45: { entityTypeId: 5, name: "الادارة العامة لبرمجيات الاحصاءات الحيوية", hierarchyId: "/1/39/42/45", code: "D3130" },
    46: { entityTypeId: 5, name: "الادارة العامة لبرمجيات بيانات الخدمات الصحية والاجتماعية", hierarchyId: "/1/39/42/46", code: "D3140" },
    47: { entityTypeId: 5, name: "الادارة العامة لبرمجيات بيانات الصناعة والتشييد", hierarchyId: "/1/39/42/47", code: "D3150" },
    48: { entityTypeId: 6, name: "الادارة المركزية لنظم المعلومات", hierarchyId: "/1/39/48", code: "D3200" },
    49: { entityTypeId: 5, name: "الادارة العامة لبرمجيات التعدادات", hierarchyId: "/1/39/48/49", code: "D3210" },
    50: { entityTypeId: 5, name: "الادارة العامة لبرمجيات احصاءات العمل", hierarchyId: "/1/39/48/50", code: "D3220" },
    51: { entityTypeId: 5, name: "الادارة العامة لبرمجيات بيانات النقل والمواصلات والاتصالات", hierarchyId: "/1/39/48/51", code: "D3230" },
    52: { entityTypeId: 5, name: "الادارة العامة لبنك المعلومات", hierarchyId: "/1/39/48/52", code: "D3240" },
    53: { entityTypeId: 6, name: "الادارة المركزية للتدريب على تكنولوجيا المعلومات", hierarchyId: "/1/39/53", code: "D3400" },
    54: { entityTypeId: 5, name: "الإدارة العامة للتدريب", hierarchyId: "/1/39/53/54", code: "D3410" },
    55: { entityTypeId: 5, name: "الإدارة العامة للبحوث والتطوير", hierarchyId: "/1/39/53/55", code: "D3420" },
    56: { entityTypeId: 6, name: "الادارة المركزية لنظم المعلومات والتحول الرقمى", hierarchyId: "/1/39/56", code: "D3500" },
    57: { entityTypeId: 5, name: "الادارة العامة للنظم والتطبيقات والدعم الفني", hierarchyId: "/1/39/56/57", code: "D3510" },
    58: { entityTypeId: 5, name: "الادارة العامة للبنية الأساسية وتأمين المعلومات", hierarchyId: "/1/39/56/58", code: "D3520" },
    59: { entityTypeId: 5, name: "الإدارة العامة للإحصاء والتقارير والنشر الإلكتروني", hierarchyId: "/1/39/56/59", code: "D3530" },
    60: { entityTypeId: 4, name: "قطاع الاحصاءات السكانية والتعدادات", hierarchyId: "/1/60", code: "D4000" },
    61: { entityTypeId: 5, name: "الادارة العامة للشئون الفنية و المتابعه / قطاع الاحصاءات السكانية والتعدادات", hierarchyId: "/1/60/61", code: "D4010" },
    62: { entityTypeId: 6, name: "الادارة المركزية للتعداد", hierarchyId: "/1/60/62", code: "D4100" },
    63: { entityTypeId: 5, name: "الادارة العامة للتعدادات السكانية", hierarchyId: "/1/60/62/63", code: "D4110" },
    64: { entityTypeId: 5, name: "الادارة العامة للتعدادات الاقتصادية", hierarchyId: "/1/60/62/64", code: "D4120" },
    65: { entityTypeId: 5, name: "الادارة العامة للعينات والادلة والتصانيف", hierarchyId: "/1/60/62/65", code: "D4130" },
    66: { entityTypeId: 6, name: "الادارة المركزية للاحصاءات السكانية والخدمات", hierarchyId: "/1/60/66", code: "D4200" },
    67: { entityTypeId: 5, name: "الادارة العامة للاحصاءات الحيوية", hierarchyId: "/1/60/66/67", code: "D4210" },
    68: { entityTypeId: 5, name: "الادارة العامة لاحصاءات العمل", hierarchyId: "/1/60/66/68", code: "D4220" },
    69: { entityTypeId: 5, name: "الادارة العامة احصاءات التعليم والكفايات العلمية", hierarchyId: "/1/60/66/69", code: "D4230" },
    70: { entityTypeId: 5, name: "الادارة العامة لاحصاءات الخدمات", hierarchyId: "/1/60/66/70", code: "D4240" },
    71: { entityTypeId: 6, name: "الادارة المركزية للدراسات و البحوث السكانية و الاجتماعية", hierarchyId: "/1/60/71", code: "D4300" },
    72: { entityTypeId: 5, name: "الادارة العامة لبحوث الخصوبة وتقديرات السكان", hierarchyId: "/1/60/71/72", code: "D4310" },
    73: { entityTypeId: 5, name: "الادارة العامة للدراسات و البحوث الاجتماعية", hierarchyId: "/1/60/71/73", code: "D4320" },
    74: { entityTypeId: 5, name: "الادارة العامة لبحوث الاسرة", hierarchyId: "/1/60/71/74", code: "D4330" },
    75: { entityTypeId: 6, name: "الادارة المركزية للتدريب الاحصائى", hierarchyId: "/1/60/75", code: "D4400" },
    76: { entityTypeId: 5, name: "الادارة العامة للتخطيط والتنفيذ", hierarchyId: "/1/60/75/76", code: "D4410" },
    77: { entityTypeId: 5, name: "الادارة العامة للتقييم والمتابعة", hierarchyId: "/1/60/75/77", code: "D4420" },
    78: { entityTypeId: 4, name: "قطاع الاحصاءات الاقتصادية والتعبوية", hierarchyId: "/1/78", code: "D5000" },
    79: { entityTypeId: 5, name: "الادارة العامة للشئون الفنية والمتابعة / قطاع الاحصاءات الاقتصادية والتعبوية", hierarchyId: "/1/78/79", code: "D5010" },
    80: { entityTypeId: 6, name: "الادارة المركزية لاحصاءات التجارة والمرافق العامة", hierarchyId: "/1/78/80", code: "D5100" },
    81: { entityTypeId: 5, name: "الادارة العامة لاحصاءات المرافق العامة والاسكان", hierarchyId: "/1/78/80/81", code: "D5110" },
    82: { entityTypeId: 5, name: "الادارة العامة لاحصاءات التجارة الخارجية و الداخلية", hierarchyId: "/1/78/80/82", code: "D5120" },
    83: { entityTypeId: 5, name: "الادارة العامة لاحصاءات النقل والاتصالات", hierarchyId: "/1/78/80/83", code: "D5130" },
    84: { entityTypeId: 6, name: "الادارة المركزية للاحصاءات الاقتصادية والمالية", hierarchyId: "/1/78/84", code: "D5200" },
    85: { entityTypeId: 5, name: "الادارة العامة للاحصاءات الزراعية", hierarchyId: "/1/78/84/85", code: "D5210" },
    86: { entityTypeId: 5, name: "الادارة العامة للاحصاءات الصناعية والطاقه", hierarchyId: "/1/78/84/86", code: "D5220" },
    87: { entityTypeId: 5, name: "الادارة العامة للاحصاءات المالية والاسعار", hierarchyId: "/1/78/84/87", code: "D5230" },
    88: { entityTypeId: 5, name: "الادارة العامة للحسابات القومية", hierarchyId: "/1/78/84/88", code: "D5240" },
    89: { entityTypeId: 6, name: "الادارة المركزية للدراسات الاقتصادية والتعبوية", hierarchyId: "/1/78/89", code: "D5300" },
    90: { entityTypeId: 5, name: "الادارة العامة للاحتياجات التعبوية والأزمات", hierarchyId: "/1/78/89/90", code: "D5310" },
    91: { entityTypeId: 5, name: "الادارة العامة لاحصاءات البيئة", hierarchyId: "/1/78/89/91", code: "D5320" },
    92: { entityTypeId: 5, name: "الادارة العامة للدراسات والبحوث الاقتصادية", hierarchyId: "/1/78/89/92", code: "D5330" },
    93: { entityTypeId: 4, name: "قطاع الفروع الاقليمية", hierarchyId: "/1/93", code: "D8000" },
    94: { entityTypeId: 6, name: "الادارة المركزية لشئون التعبئة العامة والاحصاء لاقليم القاهرة الكبرى", hierarchyId: "/1/93/94", code: "D8100" },
    95: { entityTypeId: 5, name: "الادارة العامة للاحصاءات والبحوث التعبوية لشمال القاهرة", hierarchyId: "/1/93/94/95", code: "D8110" },
    96: { entityTypeId: 5, name: "الادارة العامة للاحصاءات والبحوث التعبوية لجنوب القاهرة", hierarchyId: "/1/93/94/96", code: "D8120" },
    97: { entityTypeId: 5, name: "الادارة العامة للاحصاءات والبحوث التعبوية لشمال الجيزة", hierarchyId: "/1/93/94/97", code: "D8130" },
    98: { entityTypeId: 5, name: "الادارة العامة للاحصاءات والبحوث التعبوية لجنوب الجيزة", hierarchyId: "/1/93/94/98", code: "D8140" },
    99: { entityTypeId: 5, name: "الادارة العامة للاحصاءات والبحوث التعبوية لمحافظة القليوبية", hierarchyId: "/1/93/94/99", code: "D8150" },
    100: { entityTypeId: 6, name: "الادارة المركزية لشئون التعبئة العامة والاحصاء لاقليم الوجه البحرى", hierarchyId: "/1/93/100", code: "D8200" },
    101: { "entityTypeId": 5, "name": "الادارة العامة للاحصاءات والبحوث التعبوية لمحافظة الاسكندرية", "hierarchyId": "/1/93/100/101", "code": "D8210" },
    102: { "entityTypeId": 5, "name": "الادارة العامة للاحصاءات والبحوث التعبوية لمحافظتى دمياط /والدقهلية", "hierarchyId": "/1/93/100/102", "code": "D8220" },
    103: { "entityTypeId": 5, "name": "الادارة العامة للاحصاءات والبحوث التعبوية لمحافظتى الغربية /والمنوفية", "hierarchyId": "/1/93/100/103", "code": "D8230" },
    104: { "entityTypeId": 5, "name": "الادارة العامة للاحصاءات والبحوث التعبوية لمحافظتى كفر الشيخ/ والبحيرة", "hierarchyId": "/1/93/100/104", "code": "D8240" },
    105: { "entityTypeId": 6, "name": "الادارة المركزية لشئون التعبئة العامة والاحصاء لاقليم قناة السويس", "hierarchyId": "/1/93/105", "code": "D8300" },
    106: { "entityTypeId": 5, "name": "الادارة العامة للشئون الفنية / اقليم قناة السويس", "hierarchyId": "/1/93/105/106", "code": "D8310" },
    107: { "entityTypeId": 5, "name": "الادارة العامةللاحصاءات و البحوث التعبوية لمحافظات السويس/ الاسماعيلية/ بورسعيد", "hierarchyId": "/1/93/105/107", "code": "D8320" },
    108: { "entityTypeId": 5, "name": "الادارة العامة للاحصاءات و البحوث التعبوية لمحافظة الشرقية", "hierarchyId": "/1/93/105/108", "code": "D8330" },
    109: { "entityTypeId": 6, "name": "الادارة المركزية لشئون التعبئة العامة والاحصاء لاقليم الوجه القبلى", "hierarchyId": "/1/93/109", "code": "D8400" },
    110: { "entityTypeId": 5, "name": "الادارة العامة للاحصاءات و البحوث التعبوية لمحافظات بنى سويف/ المنيا/ الفيوم", "hierarchyId": "/1/93/109/110", "code": "D8410" },
    111: { "entityTypeId": 5, "name": "الادارة العامة للاحصاءات و البحوث التعبوية لمحافظات قنا/ اسوان /البحرالاحمر", "hierarchyId": "/1/93/109/111", "code": "D8420" },
    112: { "entityTypeId": 5, "name": "الادارة العامة للاحصاءات و البحوث التعبوية لمحافظتى اسيوط /وسوهاج", "hierarchyId": "/1/93/109/112", "code": "D8430" },
    113: { "entityTypeId": 6, "name": "الادارة المركزية  لمتابعة الاحصاءات الاقليمية", "hierarchyId": "/1/93/113", "code": "D8500" },
    114: { "entityTypeId": 5, "name": "الادارة العامة لمتابعة الدراسات والبحوث التعبوية", "hierarchyId": "/1/93/113/114", "code": "D8510" },
    115: { "entityTypeId": 5, "name": "الادارة العامة لمتابعة الاحصاءات الاقليمية لقطاعي الزراعة / الاقتصاد /التموين", "hierarchyId": "/1/93/113/115", "code": "D8520" },
    116: { "entityTypeId": 5, "name": "الادارة العامة لمتابعة الاحصاءات الاقليمية لقطاعي الصناعة / الإسكان /النقل", "hierarchyId": "/1/93/113/116", "code": "D8530" },
    117: { "entityTypeId": 5, "name": "الادارة العامة لمتابعة الاحصاءات الاقليمية لقطاع الخدمات", "hierarchyId": "/1/93/113/117", "code": "D8540" },
    119: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية لمركز تنمية الموارد البشرية", "hierarchyId": "/1/2/15/119", "code": "D0200" },
    120: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للشئون القانونية", "hierarchyId": "/1/2/20/120", "code": "D0300" },
    121: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للموارد البشرية", "hierarchyId": "/1/23/25/121", "code": "D2100" },
    122: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للشئون المالية والادارية", "hierarchyId": "/1/23/30/122", "code": "D2110" },
    123: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للشئون الهندسية والصيانة", "hierarchyId": "/1/23/35/123", "code": "D2300" },
    124: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للحساب الالى", "hierarchyId": "/1/39/42/124", "code": "D3100" },
    125: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية لنظم المعلومات", "hierarchyId": "/1/39/48/125", "code": "D3200" },
    126: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للتدريب على تكنولوجيا المعلومات", "hierarchyId": "/1/39/53/126", "code": "D3400" },
    127: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية لنظم المعلومات والتحول الرقمى", "hierarchyId": "/1/39/56/127", "code": "D3500" },
    128: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للتعداد", "hierarchyId": "/1/60/62/128", "code": "D4100" },
    129: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للاحصاءات السكانية والخدمات", "hierarchyId": "/1/60/66/129", "code": "D4200" },
    130: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للدراسات و البحوث السكانية و الاجتماعية", "hierarchyId": "/1/60/71/130", "code": "D4300" },
    131: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للتدريب الاحصائى", "hierarchyId": "/1/60/75/131", "code": "D4400" },
    132: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية لاحصاءات التجارة والمرافق العامة", "hierarchyId": "/1/78/80/132", "code": "D5100" },
    133: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للاحصاءات الاقتصادية والمالية", "hierarchyId": "/1/78/84/133", "code": "D5200" },
    134: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية للدراسات الاقتصادية والتعبوية", "hierarchyId": "/1/78/89/134", "code": "D5300" },
    135: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية لشئون التعبئة العامة والاحصاء لاقليم القاهرة الكبرى", "hierarchyId": "/1/93/94/135", "code": "D8100" },
    136: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية  لشئون التعبئة العامة والاحصاء لاقليم الوجه البحرى", "hierarchyId": "/1/93/100/136", "code": "D8200" },
    137: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية لشئون التعبئة العامة والاحصاء لاقليم قناة السويس", "hierarchyId": "/1/93/105/137", "code": "D8300" },
    138: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية لشئون التعبئة العامة والاحصاء لاقليم الوجه القبلى", "hierarchyId": "/1/93/109/138", "code": "D8400" },
    139: { "entityTypeId": 7, "name": "مكتب شئون فنية الادارة المركزية  لمتابعة الاحصاءات الاقليمية", "hierarchyId": "/1/93/113/139", "code": "D8500" },
    140: { "entityTypeId": 7, "name": "ارشيف الادارة العامة للشئون الفنية والتخطيط والمتابعة / قطاع تكنولوجيا المعلومات", "hierarchyId": "/1/39/40/140", "code": "D5000" },
    141: { "entityTypeId": 7, "name": "وحدة التنمية المستدامة", "hierarchyId": "/1/78/80/141", "code": "D5100" },
    142: { "entityTypeId": 7, "name": "مكتب شئون فنية قطاع الفروع الاقليمية", "hierarchyId": "/1/93/142", "code": "D8000" },
    143: { "entityTypeId": 7, "name": "خدمة عملاء بنك المعلومات", "hierarchyId": "/1/39/48/52/143", "code": "D3240" },
    144: { "entityTypeId": 7, "name": "المكتب الفنى لرئاسة الجهاز", "hierarchyId": "/1/2/7/144", "code": "D0100" },
    148: { "entityTypeId": 7, "name": "وحدة مخازن قطاع التكنولوجيا", "hierarchyId": "/1/39/56/58/148", "code": "D3520" },
    149: { "entityTypeId": 7, "name": "وحدة الرقابة الاداريه والمالية", "hierarchyId": "/1/93/149", "code": "D8000" },
    150: { "entityTypeId": 8, "name": "قسم الرقابة المالية", "hierarchyId": "/1/93/149/150", "code": "D8000" },
    151: { "entityTypeId": 8, "name": "قسم الرقابة الادارية", "hierarchyId": "/1/93/149/151", "code": "D8000" },
};

const correspondenceMap = {
    InboundCorrespondence: "المراسلات الواردة",
    OutBoundCorrespodence: "المراسلات الصادرة",
    InternalCorrespodence: "المراسلات الداخلية"
};

const CHUNK_SIZE = 10;
let ALL_CORRESPONDENCES = [];
let ALL_CORRESPONDENCESTITIES = [];
const ALL_CORRESPONDENCES_WITH_FOLDERS = new Map();
const campmasCode = "007002";

async function getAllCorrespondences() {
    try {
        console.log('Getting all correspondences in chunks...');
        let offset = 0;
        let hasMoreData = true;

        while (hasMoreData) {
            const correspondences = await db('Correspondences as C')
                .select(
                    'C.ID as CorrespondenceID',
                    'C.CreatorUserID',
                    'C.TypeID',
                    'C.StatusID',
                    'C.SourceID',
                    'C.PriorityID',
                    'C.Subject',
                    'C.SentDTS',
                    'C.ReceivedDTS',
                    'C.DueDTS',
                    'C.OrganizationID',
                    'C.ContactEmployeeID',
                    'C.ReferenceNumber',
                    'C.IsDeleted',
                    'C.DeleteDate',
                    'C.IsArchived',
                    'C.CreatedDTS',
                    'C.DeliveryDTS',
                    'C.IsConfidential',
                    'C.EntityId',
                    'C.SubjectName',
                    'C.LetterID',
                    'C.Published',
                    'C.ExternalOutboundReference',
                    'C.ClosedDate',
                    'C.SanitizedSubject',
                    'C.SubjectNames',
                    'C.IsMultiPurpose',
                    'E.ID as EntityID',
                    'E.Name as EntityName',
                    'E.ParentID',
                    'E.EntityTypeID',
                    'E.HierarchyId',
                    'E.logo',
                    'T.ID as CorrespondenceTypeID',
                    'T.Name as CorrespondenceTypeName',
                    'S.ID as StatusID',
                    'S.Name as StatusName',
                    'P.ID as PriorityID',
                    'P.Name as PriorityName',
                    'P.Note as PriorityNote',
                    'P.Color as PriorityColor',
                    'P.SLA as PrioritySLA'
                )
                .leftJoin('LKEntityStucture as E', 'C.EntityId', 'E.ID')
                .leftJoin('LKCorrespondenceTypes as T', 'C.TypeID', 'T.ID')
                .leftJoin('LKStatuses as S', 'C.StatusID', 'S.ID')
                .leftJoin('LKPriorities as P', 'C.PriorityID', 'P.ID')
                .where('C.IsDeleted', 0)
                .orderBy('C.ID')
                .offset(offset)
                .limit(CHUNK_SIZE);

            if (correspondences.length > 0) {
                ALL_CORRESPONDENCES = ALL_CORRESPONDENCES.concat(correspondences);
                offset += CHUNK_SIZE;
                hasMoreData = false;
            } else {
                hasMoreData = false; // No more data left
            }
        }

        ALL_CORRESPONDENCES = groupCorrespondencesBySanitizedSubject(ALL_CORRESPONDENCES);
        console.log(`Fetched total correspondences: ${ALL_CORRESPONDENCES.length}`);
        return ALL_CORRESPONDENCES;
    } catch (error) {
        console.error('Error fetching correspondences:', error);
        throw error;
    }
}


async function categorizeCorrespondence(correspondences) {
    const categorizedCorrespondences = new Map();

    for (const corr of correspondences) {
        const queryResult = await
            db('Tasks as t')
                .leftJoin('TaskAssignment as ta', 'ta.TaskID', 't.ID')
                .leftJoin('Users as u_creator', 't.CreatorUserID', 'u_creator.ID')
                .leftJoin('Users as u_assignee', 'ta.AssigneeUserID', 'u_assignee.ID')
                .leftJoin('Correspondences as c', 't.CorrespondenceID', 'c.ID')
                .select('u_assignee.EntityID as AssigneeEntityID')
                .max('u_creator.EntityID as CreatorEntityID')
                .select('ta.AssigneeEntityID')
                .where('c.ID', corr.CorrespondenceID)
                .groupBy('u_assignee.EntityID', 'ta.AssigneeEntityID');



        queryResult.forEach(row => {
            const entityId = Array.isArray(row.AssigneeEntityID)
                ? row.AssigneeEntityID.find(item => item !== null)
                : row.AssigneeEntityID;

            const creatorEntityId = row.CreatorEntityID;

            const assigneeKey = EntityCodes[Number(entityId)]?.code || null;
            const creatorKey = EntityCodes[Number(creatorEntityId)]?.code || null;


            if (assigneeKey) {
                if (!categorizedCorrespondences.has(assigneeKey)) {
                    categorizedCorrespondences.set(assigneeKey, []);
                }
            }

            if (creatorKey) {
                if (!categorizedCorrespondences.has(creatorKey)) {
                    categorizedCorrespondences.set(creatorKey, []);
                }
            }

            if (assigneeKey) {
                categorizedCorrespondences.get(assigneeKey).push({
                    correspondenceId: corr.CorrespondenceID,
                    creatorEntityId,
                    assigneeEntityId: entityId,
                    type: 'assignee'
                });
            }
            if (creatorKey) {
                categorizedCorrespondences.get(creatorKey).push({
                    correspondenceId: corr.CorrespondenceID,
                    creatorEntityId,
                    assigneeEntityId: entityId,
                    type: 'creator'
                });
            }
        });

        if (queryResult.length === 0) {
            const entityId = corr.EntityId;

            if (!categorizedCorrespondences.has(EntityCodes[Number(entityId)].code)) {
                categorizedCorrespondences.set(EntityCodes[Number(entityId)].code, []);
            }
            categorizedCorrespondences.get(EntityCodes[Number(entityId)].code).push({
                correspondenceId: corr.CorrespondenceID,
                creatorEntityId: corr.EntityId,
                assigneeEntityId: null
            });
        }
    }
    const data = Object.fromEntries(categorizedCorrespondences);

    ALL_CORRESPONDENCESTITIES = data;
}

function groupCorrespondencesBySanitizedSubject(correspondences) {
    let folderIndexMap = {};
    let folderCounter = 0;

    return correspondences.map(correspondence => {
        let sanitizedSubject = correspondence.SanitizedSubject;

        if (!(sanitizedSubject in folderIndexMap)) {
            folderIndexMap[sanitizedSubject] = folderCounter++;
        }

        let paddedIndex = folderIndexMap[sanitizedSubject].toString().padStart(4, '0'); // Ensure 4 digits
        let finalIndex = `4${paddedIndex}`; // Prefix with 4

        return {
            ...correspondence,
            folderIndex: finalIndex
        };
    });
}

async function validateCorrespondence() {

    Object.entries(ALL_CORRESPONDENCESTITIES).forEach(([key, entries]) => {
        let correspondenceIndex = 0;
        const updatedEntries = [];

        entries.forEach((item) => {
            const correID = item.correspondenceId;
            const correspondenceNum = correspondenceIndex.toString().padStart(3, '0');

            // Find the full correspondence details
            const fullCorrespondence = ALL_CORRESPONDENCES.find(
                corr => corr.CorrespondenceID === correID
            );

            if (!fullCorrespondence) {
                console.log(`No matching correspondence found for ID ${correID} in ALL_CORRESPONDENCES`);
                return;
            }

            const updatedCorrespondence = {
                ...fullCorrespondence,
                entityCode: key,
                correspondenceNum,
                creatorEntityId: item.creatorEntityId,
                assigneeEntityId: item.assigneeEntityId,
                creatorEntitycode: EntityCodes[Number(item.creatorEntityId)].code,
                assigneeEntitycode: item.assigneeEntityId ? EntityCodes[Number(item.assigneeEntityId)].code : null,
                creatorEntityName: EntityCodes[Number(item.creatorEntityId)].name,
                assigneeEntityName: item.assigneeEntityId ? EntityCodes[Number(item.assigneeEntityId)].name : null,
            };

            updatedEntries.push(updatedCorrespondence);

            correspondenceIndex++;

            if (correspondenceIndex >= 1000) {
                correspondenceIndex = 0;
            }
        });

        ALL_CORRESPONDENCES_WITH_FOLDERS.set(key, updatedEntries);
    });
}


async function processCorrespondences() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const rootFolder = `10-Batches-${date}`;

    await fs.mkdir(rootFolder, { recursive: true });

    for (const [entityCode, correspondences] of ALL_CORRESPONDENCES_WITH_FOLDERS.entries()) {
        for (const [index, correspondence] of correspondences.entries()) {
            const fullCode = `${campmasCode}${entityCode}${correspondence.folderIndex}${correspondence.correspondenceNum}`;
            const batchFolder = path.join(rootFolder, `BATCH-${entityCode}-${correspondence.correspondenceNum}`);
            const docCatFolder = path.join(batchFolder, 'DOCCAT0057');
            const folderP087 = path.join(docCatFolder, 'P087');
            const folderCapmas = path.join(folderP087, campmasCode);
            const folderEntity = path.join(folderCapmas, entityCode);
            const folderCorrespondence = path.join(folderEntity, fullCode);


            await fs.mkdir(folderCorrespondence, { recursive: true });
            console.log(`Created folder: ${folderCorrespondence}`);
            await generateXML(entityCode, correspondence, fullCode, docCatFolder);
        }
    }
}


async function generateXML(entityCode, corr, fullCode, docCatFolder) {
    const xmlHeader = '<?xml version="1.0" standalone="yes"?>\n<DocumentElement>\n';
    const xmlFooter = '</DocumentElement>';
    const xmlBody = `
                <Field Name="رقم الصادرالداخلى">${corr.ReferenceNumber || '#ARMNEWEGNC#'}</Field>
                <Field Name="تاريخ المراسلة">${corr.SentDTS ? corr.SentDTS.toISOString().split('T')[0] : '#ARMNEWEGNC#'}</Field>
                <Field Name="رقم التسجيل بدفتر الصادر">#ARMNEWEGNC#</Field>
                <Field Name="رقم التسجيل بدفتر الوارد">#ARMNEWEGNC#</Field>
                <Field Name="نسخة الى">#ARMNEWEGNC#</Field>
                <Field Name="نوع المراسلة">${correspondenceMap[corr.CorrespondenceTypeName] || '#ARMNEWEGNC#'}</Field>
                <Field Name="الرقم المرجعي">${corr.CorrespondenceID || '#ARMNEWEGNC#'}</Field>
                <Field Name="درجة الاهمية (الأولوية)">${corr.PriorityName || '#ARMNEWEGNC#'}</Field>
                <Field Name="الموضوع">${corr.Subject || '#ARMNEWEGNC#'}</Field>
                <Field Name="الادارة المرسل اليها">${corr.assigneeEntityName || '#ARMNEWEGNC#'}</Field>
                <Field Name="الإدارة الراسلة">${corr.creatorEntityName || '#ARMNEWEGNC#'}</Field>
                <Field Name="حالة العرض">#ARMNEWEGNC#</Field>
                <Field Name="تاريخ التأشيرة">#ARMNEWEGNC#</Field>
                <Field Name="التأشيرة">#ARMNEWEGNC#</Field>
                <Field Name="الملحقات">#ARMNEWEGNC#</Field>
                <Field Name="يحتاج متابعة">#ARMNEWEGNC#</Field>
                <Field Name="حالة المتابعة">#ARMNEWEGNC#</Field>
                <Field Name="ملاحظات">#ARMNEWEGNC#</Field>
                <Field Name="الباركود">#ARMNEWEGNC#</Field>
                <Field Name="سرية الملف">${corr.IsConfidential ? 'سري' : 'غير سري'}</Field>
                <Field Name="سرية الوثيقة">${corr.IsConfidential ? 'سري' : 'غير سري'}</Field>
                <Field Name="كود الوثيقة">${corr.creatorEntitycode || '#ARMNEWEGNC#'}</Field>
                <Field Name="كود الصندوق">${entityCode || '#ARMNEWEGNC#'}</Field>
                <Field Name="كود المستودع">'#ARMNEWEGNC#'</Field>
                <Field Name="كود المنطقة">'#ARMNEWEGNC#'</Field>
                <Field Name="كود الوحدة">'#ARMNEWEGNC#'</Field>
                <Field Name="كود الرف">'#ARMNEWEGNC#'</Field>
                <Field Name="عنوان الملف">${correspondenceMap[corr.CorrespondenceTypeName] || '#ARMNEWEGNC#'}</Field>
                <Field Name="مرجع الملف">'#ARMNEWEGNC#'</Field>
                <Field Name="كلمات دلالية">${corr.SubjectNames}</Field>
                <Field Name="التصنيف">فني</Field>
                <Field Name="نوع الوثيقة">${correspondenceMap[corr.CorrespondenceTypeName] || '#ARMNEWEGNC#'}</Field>
                <Field Name="العنوان">${corr.SubjectName || '#ARMNEWEGNC#'}</Field>
                <Field Name="التاريخ">${new Date(corr.CreatedDTS).toISOString().split('T')[0]}</Field>
                <Field Name="المرجع"></Field>
                <Field Name="كود الوحدة التنظيمية">${entityCode}</Field>
                <Field Name="الفئة العامة">${correspondenceMap[corr.CorrespondenceTypeName] || '#ARMNEWEGNC#'}</Field>
                <Field Name="كود الملف">${fullCode}</Field>
                <Field Name="ملاحظات">#ARMNEWEGNC#</Field>
                <Field Name="الوصف التفصيلى">#ARMNEWEGNC#</Field>
                <Field Name="اسم الحقل التخصصى1">#ARMNEWEGNC#</Field>
                <Field Name="قيمة الحقل التخصصى 1">#ARMNEWEGNC#</Field>
                <Field Name="اسم الحقل التخصصى2">#ARMNEWEGNC#</Field>
                <Field Name="قيمة الحقل التخصصى 2">#ARMNEWEGNC#</Field>
                <Field Name="مكان الحفظ الورقى">#ARMNEWEGNC#</Field>
                <Field Name="الفئة الفرعية">#ARMNEWEGNC#</Field>        
        `;
    const xmlContent = xmlHeader + xmlBody + xmlFooter;
    const filePath = path.join(docCatFolder, `Project_Data.xml`);
    fs.writeFile(filePath, xmlContent, 'utf8');
    const lookUps = getLookups()
    const filePathLookUps = path.join(docCatFolder, `Project_lookup_Fields.xml`);
    fs.writeFile(filePathLookUps, lookUps, 'utf8');
    const project = `
<?xml version="1.0" standalone="yes"?>
    <DocumentElement>
        <Project>
            <PROJECT_SHORT_DESC>P087</PROJECT_SHORT_DESC>
            <PROJECT_NAME>${correspondenceMap[corr.CorrespondenceTypeName]}</PROJECT_NAME>
            <CS_ARCHIVE_LEVEL_CODE>${entityCode || '#ARMNEWEGNC#'}</CS_ARCHIVE_LEVEL_CODE>
        </Project>
    </DocumentElement>`
    const filePathProject = path.join(docCatFolder, `Project.xml`);
    fs.writeFile(filePathProject, project, 'utf8');

    const ProjectFields = getProjectStr()
    const filePathProjectFields = path.join(docCatFolder, `Project_Fields.xml`);
    fs.writeFile(filePathProjectFields, ProjectFields, 'utf8');
}

function getProjectStr () {
    return `
    <?xml version="1.0" standalone="yes"?>
<DocumentElement>
  <Project_Fields>
    <FIELD_NAME>كود الوارد</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>تاريخ الورود</FIELD_NAME>
    <FIELD_TYPE>تاريخ</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>رقم التسجيل بدفتر الوارد</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>الموضوع</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>اسم الراسل داخل الجهة</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>اسم المرسل اليه</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>رقم صادر الجهة</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>تاريخ صادر الجهة</FIELD_NAME>
    <FIELD_TYPE>تاريخ</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>الملحقات</FIELD_NAME>
    <FIELD_TYPE>نص متعدد السطور</FIELD_TYPE>
    <FIELD_WIDTH>4000</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>تاريخ التأشيرة</FIELD_NAME>
    <FIELD_TYPE>تاريخ</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>التأشيرة</FIELD_NAME>
    <FIELD_TYPE>نص متعدد السطور</FIELD_TYPE>
    <FIELD_WIDTH>4000</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>حالة المتابعة</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>ملاحظات</FIELD_NAME>
    <FIELD_TYPE>نص متعدد السطور</FIELD_TYPE>
    <FIELD_WIDTH>4000</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>الباركود</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>كود الوثيقة</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>كود الصندوق</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>كود المستودع</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>كود المنطقة</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>كود الوحدة</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>كود الرف</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>عنوان الملف</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>مرجع الملف</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>العنوان</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>التاريخ</FIELD_NAME>
    <FIELD_TYPE>تاريخ</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>المرجع</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>كود الوحدة التنظيمية</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_TYPE>قائمة</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>كود الملف</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>ملاحظات</FIELD_NAME>
    <FIELD_TYPE>نص متعدد السطور</FIELD_TYPE>
    <FIELD_WIDTH>4000</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>الوصف التفصيلى</FIELD_NAME>
    <FIELD_TYPE>نص متعدد السطور</FIELD_TYPE>
    <FIELD_WIDTH>4000</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>اسم الحقل التخصصى1</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>قيمة الحقل التخصصى 1</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>اسم الحقل التخصصى2</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>قيمة الحقل التخصصى 2</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>مكان الحفظ الورقى</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
  <Project_Fields>
    <FIELD_NAME>الفئة الفرعية</FIELD_NAME>
    <FIELD_TYPE>نص</FIELD_TYPE>
    <FIELD_WIDTH>254</FIELD_WIDTH>
  </Project_Fields>
</DocumentElement>
    `
}

function getLookups() {
    return `
    <?xml version="1.0" standalone="yes"?>
<DocumentElement>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الإدارة الوارد اليها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>التصنيف</FIELD_NAME>
    <FIELD_LOOKUP>إداري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الجهة الوارد منها</FIELD_NAME>
    <FIELD_LOOKUP>D8530</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>الفئة العامة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>حالة العرض</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>درجة الاهمية (الأولوية)</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الملف</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>سرية الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>غير سري</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>شكل المرسلة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>شهر نوفمبر2022</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكة حديد شهر نوفمبر2022</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>عدد الركاب</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>السكه الحديد شهر ديسمبر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>عدد الركاب شهر ديسمبر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكه حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>السكه الحديد شهر اكتوبر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>عدد الركاب</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكك حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>يبان شهر سبتمبر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكه حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>ايرادات شهر سبتمبر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكه حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>حركه الركاب</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>بيان شهر اغسطس</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكه حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>شهر يوليو</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>حركه الركاب</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>حركه الركاب</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكه حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>شهر يونيو</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكه حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>حركه الركاب</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>شهر مايو</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>بيان مارس و ابريل</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>حركه الركاب</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكه حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكه حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>حركه الركاب</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>شهر فبراير</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>حركه الركاب</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>سكه حديد مصر</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>كلمات دلالية</FIELD_NAME>
    <FIELD_LOOKUP>بيان شهر يناير</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نسخة الى</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع المراسلة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>نوع الوثيقة</FIELD_NAME>
    <FIELD_LOOKUP>المراسلات الصادرة والواردة</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
  <Project_lookup_Fields>
    <FIELD_NAME>يحتاج متابعة</FIELD_NAME>
    <FIELD_LOOKUP>#ARMNEWEGNC#</FIELD_LOOKUP>
  </Project_lookup_Fields>
</DocumentElement>
    `
}

getAllCorrespondences()
    .then(categorizeCorrespondence)
    .then(validateCorrespondence)
    .then(processCorrespondences)
    //.then(generateXML)
    .then(() => db.destroy())
    .catch((error) => {
        console.error('Error:', error);
        db.destroy();
    });

export const particles = [
  ['6px', '10%', '18%', '#b6edd0', '16px', '24px', '11s', '-2s'],
  ['4px', '18%', '76%', '#ffd8be', '-10px', '-22px', '14s', '-7s'],
  ['5px', '26%', '31%', '#d8e6ff', '14px', '-18px', '13s', '-4s'],
  ['3px', '35%', '64%', '#ffc7d3', '-12px', '20px', '15s', '-9s'],
  ['7px', '48%', '12%', '#d7f5e6', '9px', '18px', '12s', '-6s'],
  ['4px', '57%', '72%', '#fff0c9', '-11px', '-16px', '16s', '-3s'],
  ['6px', '64%', '24%', '#d5edff', '17px', '16px', '13s', '-8s'],
  ['3px', '71%', '54%', '#cfeec6', '-8px', '19px', '10s', '-5s'],
  ['5px', '79%', '16%', '#ffe2e8', '10px', '-20px', '14s', '-1s'],
  ['4px', '86%', '64%', '#cfe7ff', '-14px', '14px', '15s', '-10s'],
  ['6px', '92%', '29%', '#dff6d8', '8px', '18px', '12s', '-4s'],
  ['3px', '6%', '56%', '#ffd9b6', '11px', '-15px', '17s', '-8s'],
] as const;

export const styleCopy = {
  traditional: {
    pill: '推荐投递',
    title: '传统证件照',
    cardCopy: '更稳、更标准，适合校招、实习和对规范性要求较高的岗位。突出清晰度、背景洁净和正式感。',
    preview: '这套方案强调标准、整洁和识别度。它会把重点放在清晰背景、稳定构图和职业可信度上。',
    summary: '当前状态：偏向标准化输出，适合追求稳妥感的校招、实习和报名投递场景。',
    tags: ['简洁背景', '正式表达', '适合投递'],
  },
  modern: {
    pill: '更年轻',
    title: '新式证件照',
    cardCopy: '保留职业感，同时让肤色、轮廓和背景氛围更轻盈一些。适合想显得精神、亲近又不失专业的用户。',
    preview: '在保留职业感的同时，增加一点更轻盈的氛围，让照片看起来更年轻、更有精神。',
    summary: '当前状态：偏向更轻快的职业审美，适合想要显得清爽、亲和又专业的用户。',
    tags: ['轻盈氛围', '年轻感', '高级清爽'],
  },
  custom: {
    pill: '个性表达',
    title: '自定义照片设计',
    cardCopy: '适合你有明确审美偏好时使用。可以偏稳重、偏清透、偏高级，按你想投递的岗位气质来定。',
    preview: '你可以把它理解为可调式风格方案。根据目标岗位气质，自由决定稳重、清透或高级感的比例。',
    summary: '当前状态：适合有明确审美偏好的人，之后可以继续按投递目标做个性化微调。',
    tags: ['风格自定义', '岗位适配', '灵活调整'],
  },
};

export type StyleKey = keyof typeof styleCopy;

export const backgroundOptions = {
  red: {
    label: '红底',
    value: '#c83d3d',
    copy: '适合要求红色背景的报名、考试和正式资料。',
  },
  blue: {
    label: '蓝底',
    value: '#d9eaff',
    copy: '报名、考试和常见证件场景更通用。',
  },
  white: {
    label: '白底',
    value: '#ffffff',
    copy: '适合简历头像、作品集和偏商务场景。',
  },
} as const;

export const modernStyleOptions = {
  style1: {
    label: '样式 1',
    value: '#eef6f1',
    copy: '清爽自然，适合校招和实习投递。',
  },
  style2: {
    label: '样式 2',
    value: '#edf2f8',
    copy: '轻商务感，适合咨询、产品、运营等岗位。',
  },
  style3: {
    label: '样式 3',
    value: '#f6efe7',
    copy: '更柔和的职业氛围，适合展示亲和力。',
  },
} as const;

export const sizeOptions = {
  resume: {
    label: '简历头像',
    ratio: '4:5',
    width: 960,
    height: 1200,
    copy: '适合放在简历、网申资料和个人介绍页。',
  },
  oneInch: {
    label: '一寸照',
    ratio: '25 x 35mm',
    width: 750,
    height: 1050,
    copy: '适合报名表、考试资料和基础证件场景。',
  },
  twoInch: {
    label: '二寸照',
    ratio: '35 x 49mm',
    width: 1050,
    height: 1470,
    copy: '适合更高分辨率的正式材料上传。',
  },
  free: {
    label: '自由裁剪',
    ratio: '自由比例',
    width: 1200,
    height: 1200,
    copy: '拖动照片上的裁剪框，按需要的比例导出。',
  },
} as const;

export type BackgroundKey = keyof typeof backgroundOptions;
export type ModernStyleKey = keyof typeof modernStyleOptions;
export type SizeKey = keyof typeof sizeOptions;

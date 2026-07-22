import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import PizZip from 'pizzip';

type ResumeDocxPayload = {
  name: string;
  targetTitle: string;
  phone: string;
  email: string;
  location: string;
  profile: string;
  skills: string[];
  awards: Array<{ name: string; result: string; year: string }>;
  experience: Array<{ role: string; organization: string; period: string; bullets: string[] }>;
  education: { school: string; major: string; period: string };
};

const sourceTemplate = {
  name: '赵思琪',
  targetTitle: '资深室内设计师',
  phone: '138-0000-0000',
  email: 'luxingchen@email.com',
  location: '广州市南沙区',
  profile:
    '专注住宅、商业空间全案设计，从户型优化、风格塑造到软装落地，打造 50+“功能与美学平衡” 空间，让设计真正服务生活与商业价值。擅长现代简约、新中式、侘寂风等，精准匹配客户生活 / 品牌需求。熟悉材料特性、施工工艺，保障设计效果 1:1 还原，降低返工率。',
  skills: ['AutoCAD', 'SketchUp', '3D Studio Max', 'Adobe Photoshop', 'Blender', 'Live Home 3D'],
  awards: [
    ['亚太室内设计奖', '银奖', '2024'],
    ['中国室内设计年鉴', '入围奖', '2023'],
  ],
  education: ['东华大学', '服装与服饰设计学士', '2012 – 2016'],
  experience: [
    {
      head: '资深室内设计师 | 广州 DESIGN ONE 创意',
      period: '2021.7 – 2025.12',
      bullets: [
        '1.主导30 + 住宅全案设计，为别墅业主打造 “现代侘寂风” 私宅，通过挑空客厅、自然材质运用，获业主朋友圈 “晒家” 传播，带动10组客户咨询。',
        '2.负责餐饮空间设计（如网红咖啡店、社区食堂 ），为 “工业风咖啡馆” 设计动线与视觉，开业后成为本地打卡地，客流量超同类店铺 2 倍。',
        '3.统筹商业办公空间改造，为科技创业公司设计 “开放 + 协作” 办公区，优化工位布局、休闲区氛围，员工满意度提升 40%。',
      ],
    },
    {
      head: '室内设计师 | 广州 DESIGN TWO 创意',
      period: '2018.3 – 2021.6',
      bullets: [
        '1.带领团队完成 15 + 高端住宅样板间设计，打造 “新中式轻奢”“奶油风” 等系列样板，助力楼盘去化率提升 35%。',
        '· 深度参与商业综合体公共空间设计，为购物中心设计 “主题中庭”，通过灯光、装置艺术吸引客流，带动营业额增长 20%。',
      ],
    },
    {
      head: '助理室内设计师 | 广州 DESIGN TWO 创意',
      period: '2017.5 - 2018.2',
      bullets: ['1.参与 10 + 中小户型住宅设计，主攻空间收纳优化，为刚需客户打造 “小而美” 温馨家，获业主转介绍率 30%。'],
    },
  ],
};

const floatingTextBoxes = {
  skillsHeading: { id: '53', y: 5057140 },
  skillsBody: { id: '11', y: 5335270 },
  awardsHeading: { id: '65', y: 7557135 },
  firstAward: { id: '64', y: 7896860 },
  secondAward: { id: '13', y: 8802370 },
} as const;

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function replaceAll(xml: string, from: string, to: string) {
  return xml.split(escapeXml(from)).join(escapeXml(to));
}

function findTextBoxBounds(xml: string, id: string) {
  const marker = `<wp:docPr id="${id}"`;
  const markerIndex = xml.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const start = xml.lastIndexOf('<mc:AlternateContent>', markerIndex);
  const end = xml.indexOf('</mc:AlternateContent>', markerIndex);

  if (start === -1 || end === -1) {
    return null;
  }

  return {
    start,
    end: end + '</mc:AlternateContent>'.length,
  };
}

function updateTextBoxByDocPrId(xml: string, id: string, update: (block: string) => string) {
  const bounds = findTextBoxBounds(xml, id);

  if (!bounds) {
    return xml;
  }

  return `${xml.slice(0, bounds.start)}${update(xml.slice(bounds.start, bounds.end))}${xml.slice(bounds.end)}`;
}

function removeTextBoxByDocPrId(xml: string, id: string) {
  return updateTextBoxByDocPrId(xml, id, () => '');
}

function moveTextBoxY(xml: string, id: string, y: number) {
  return updateTextBoxByDocPrId(xml, id, (block) => {
    const currentY = Number(block.match(/<wp:positionV[^>]*><wp:posOffset>(-?\d+)<\/wp:posOffset><\/wp:positionV>/)?.[1]);
    const deltaPt = Number.isFinite(currentY) ? (y - currentY) / 12700 : 0;

    return block
      .replace(
        /(<wp:positionV\b[^>]*><wp:posOffset>)-?\d+(<\/wp:posOffset><\/wp:positionV>)/,
        `$1${y}$2`,
      )
      .replace(/margin-top:([-.\d]+)pt/g, (_, value: string) => `margin-top:${(Number(value) + deltaPt).toFixed(2)}pt`);
  });
}

function shiftTextBoxesY(xml: string, ids: string[], deltaY: number) {
  return ids.reduce((nextXml, id) => {
    const bounds = findTextBoxBounds(nextXml, id);
    const block = bounds ? nextXml.slice(bounds.start, bounds.end) : '';
    const currentY = Number(block.match(/<wp:positionV[^>]*><wp:posOffset>(-?\d+)<\/wp:posOffset><\/wp:positionV>/)?.[1]);

    return Number.isFinite(currentY) ? moveTextBoxY(nextXml, id, currentY + deltaY) : nextXml;
  }, xml);
}

function applyOptionalFloatingSections(xml: string, payload: ResumeDocxPayload) {
  let nextXml = xml;
  const visibleSkills = payload.skills.filter((skill) => skill.trim());
  const visibleAwards = payload.awards.filter((award) => award.name.trim() || award.result.trim() || award.year.trim());

  if (visibleSkills.length === 0) {
    nextXml = removeTextBoxByDocPrId(nextXml, floatingTextBoxes.skillsHeading.id);
    nextXml = removeTextBoxByDocPrId(nextXml, floatingTextBoxes.skillsBody.id);
  }

  if (visibleAwards.length === 0) {
    nextXml = removeTextBoxByDocPrId(nextXml, floatingTextBoxes.awardsHeading.id);
    nextXml = removeTextBoxByDocPrId(nextXml, floatingTextBoxes.firstAward.id);
    nextXml = removeTextBoxByDocPrId(nextXml, floatingTextBoxes.secondAward.id);
    return nextXml;
  }

  if (visibleAwards.length === 1) {
    nextXml = removeTextBoxByDocPrId(nextXml, floatingTextBoxes.secondAward.id);
  }

  if (visibleSkills.length === 0) {
    const deltaY = floatingTextBoxes.skillsHeading.y - floatingTextBoxes.awardsHeading.y;
    nextXml = shiftTextBoxesY(
      nextXml,
      [floatingTextBoxes.awardsHeading.id, floatingTextBoxes.firstAward.id, floatingTextBoxes.secondAward.id],
      deltaY,
    );
  }

  return nextXml;
}

function firstLine(value: string) {
  return value.split('\n').map((item) => item.trim()).find(Boolean) || '';
}

function applyReplacements(xml: string, payload: ResumeDocxPayload) {
  const normalizedPayload = {
    ...payload,
    skills: payload.skills.filter((skill) => skill.trim()),
    awards: payload.awards.filter((award) => award.name.trim() || award.result.trim() || award.year.trim()),
  };
  let nextXml = applyOptionalFloatingSections(xml, normalizedPayload);

  nextXml = replaceAll(nextXml, sourceTemplate.name, normalizedPayload.name || sourceTemplate.name);
  nextXml = replaceAll(nextXml, sourceTemplate.targetTitle, normalizedPayload.targetTitle || sourceTemplate.targetTitle);
  nextXml = replaceAll(nextXml, sourceTemplate.phone, normalizedPayload.phone || sourceTemplate.phone);
  nextXml = replaceAll(nextXml, sourceTemplate.email, normalizedPayload.email || sourceTemplate.email);
  nextXml = replaceAll(nextXml, sourceTemplate.location, normalizedPayload.location || sourceTemplate.location);
  nextXml = replaceAll(nextXml, sourceTemplate.profile, normalizedPayload.profile || sourceTemplate.profile);

  sourceTemplate.skills.forEach((skill, index) => {
    nextXml = replaceAll(nextXml, skill, normalizedPayload.skills[index] || '');
  });

  sourceTemplate.awards.forEach(([name, result, year], index) => {
    const award = normalizedPayload.awards[index];
    nextXml = replaceAll(nextXml, name, award?.name || '');
    nextXml = replaceAll(nextXml, result, award?.result || '');
    nextXml = replaceAll(nextXml, year, award?.year || '');
  });

  sourceTemplate.experience.forEach((experience, index) => {
    const item = normalizedPayload.experience[index];
    nextXml = replaceAll(nextXml, experience.head, item ? `${item.role} | ${item.organization}` : '');
    nextXml = replaceAll(nextXml, experience.period, item?.period || '');
    experience.bullets.forEach((bullet, bulletIndex) => {
      nextXml = replaceAll(nextXml, bullet, item?.bullets[bulletIndex] || '');
    });
  });

  nextXml = replaceAll(nextXml, sourceTemplate.education[0], normalizedPayload.education.school || sourceTemplate.education[0]);
  nextXml = replaceAll(nextXml, sourceTemplate.education[1], normalizedPayload.education.major || sourceTemplate.education[1]);
  nextXml = replaceAll(nextXml, sourceTemplate.education[2], normalizedPayload.education.period || sourceTemplate.education[2]);

  return nextXml;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ResumeDocxPayload;
  const modelDir = path.join(process.cwd(), 'model');
  const templateFileName = (await readdir(modelDir)).find(
    (fileName) => fileName.endsWith('.docx') && fileName.includes('044') && !fileName.startsWith('~$'),
  );

  if (!templateFileName) {
    return Response.json({ error: 'DOCX template file was not found in model/' }, { status: 500 });
  }

  const templatePath = path.join(modelDir, templateFileName);
  const buffer = await readFile(templatePath);
  const zip = new PizZip(buffer);
  const documentFile = zip.file('word/document.xml');

  if (!documentFile) {
    return Response.json({ error: 'DOCX template is missing word/document.xml' }, { status: 500 });
  }

  const documentXml = documentFile.asText();
  zip.file('word/document.xml', Buffer.from(applyReplacements(documentXml, payload), 'utf8'), { binary: true });

  const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const fileName = `${firstLine(payload.name) || 'resume'}-设计师简历044.docx`;

  return new Response(new Uint8Array(output), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

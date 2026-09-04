export type Lang = 'en' | 'zh';

export const languages: Lang[] = ['en', 'zh'];

export const copy = {
  en: {
    nav: { home: 'Home', about: 'About', research: 'Research', projects: 'Projects', blog: 'Blog', contact: 'Contact' },
    hero: {
      kicker: 'Kaituo (Philip) Zhang',
      title: 'Building AI that deserves to be trusted.',
      intro: 'Hello, my name is Kaituo (Philip) Zhang. I’m a PhD candidate in the Department of Industrial Engineering at the University of Houston, advised by Dr. Na Zou. My current research interests include fairness and faithfulness in large language models (LLMs) and context management.',
      role: 'PhD Candidate · Research Assistant',
      place: 'Houston, United States',
    },
    labels: { current: 'Currently', focus: 'Research focus', news: 'News', work: 'Selected work', readMore: 'Explore research', latest: 'Latest notes' },
    verse: 'The LORD is my shepherd; I have all that I need.',
    verseRef: 'Psalm 23:1 · NLT',
    about: {
      kicker: 'About', title: 'Research with rigor, built for the real world.',
      body: [
        'I am a PhD candidate in Industrial Engineering at the University of Houston, advised by Dr. Na Zou. My research sits at the intersection of machine learning, reliability, and practical system building.',
        'I focus on fairness and faithfulness in large language models, context management, synthetic data evaluation, and unsupervised anomaly detection. I enjoy turning research questions into methods, experiments, and open tools that other people can use.',
      ],
      recognition: 'Recognition', awards: ['IDE Agrawal Scholarship Endowment, 2026', 'Agrawal Association of America Scholarship, 2025', 'Excellent Undergraduate Student in Zhejiang Province, 2024'],
    },
    research: {
      kicker: 'Research', title: 'Reliable intelligence, from evidence to deployment.',
      areas: [
        ['Trustworthy language models', 'I investigate how language models represent uncertainty, preserve faithfulness, and behave fairly across people and contexts.'],
        ['Synthetic data evaluation', 'My work studies how generated datasets should be measured—not only for resemblance, but for utility, reliability, privacy, and downstream risk.'],
        ['Anomaly detection', 'I develop unsupervised methods that remain useful in high-dimensional settings without costly parameter tuning.'],
      ],
    },
    projects: { kicker: 'Projects', title: 'Research artifacts and practical tools.' },
    blog: { kicker: 'Blog', title: 'Ideas, experiments, and field notes.', intro: 'Research notes and technical reflections written in Notion, published here as a fast static site.', empty: 'No English posts have been published yet.' },
    contact: { kicker: 'Contact', title: 'Let’s exchange ideas.', intro: 'For research conversations, collaborations, or a thoughtful hello, email is the best place to start.', email: 'Research, collaboration, and academic inquiries.', github: 'Code, experiments, and open-source work.' },
    allWriting: 'All writing', fieldNotes: 'Field notes', footer: 'Researcher · Engineer · Builder',
  },
  zh: {
    nav: { home: '首页', about: '关于我', research: '研究', projects: '项目', blog: '博客', contact: '联系' },
    hero: {
      kicker: '张开拓（Philip）',
      title: '让人工智能更可靠，也更值得信任。',
      intro: '你好，我是张开拓（Kaituo Philip Zhang）。目前就读于休斯顿大学工业工程系博士项目，师从邹娜教授。我的研究主要关注大语言模型的公平性与忠实性、上下文管理，以及可靠的机器学习方法。',
      role: '博士候选人 · 研究助理',
      place: '美国 · 休斯顿',
    },
    labels: { current: '当前', focus: '研究方向', news: '最新动态', work: '代表工作', readMore: '了解研究', latest: '最近文章' },
    verse: '耶和华是我的牧者，我必不致缺乏。',
    verseRef: '诗篇 23:1',
    about: {
      kicker: '关于我', title: '严谨地研究，也把成果带进真实世界。',
      body: [
        '我是休斯顿大学工业工程系博士候选人，师从邹娜教授。我的研究位于机器学习、可靠性与实际系统构建的交叉领域。',
        '目前，我主要研究大语言模型的公平性与忠实性、上下文管理、合成数据评估和无监督异常检测。我喜欢把研究问题转化为可验证的方法、实验，以及他人可以使用的开放工具。',
      ],
      recognition: '荣誉与奖项', awards: ['IDE Agrawal Scholarship Endowment，2026', 'Agrawal Association of America Scholarship，2025', '浙江省优秀本科毕业生，2024'],
    },
    research: {
      kicker: '研究', title: '从可靠证据出发，构建可信智能。',
      areas: [
        ['可信大语言模型', '研究语言模型如何表达不确定性、保持答案忠实性，并在不同人群和语境中实现更公平的表现。'],
        ['合成数据评估', '评估生成数据不仅是否相似，还包括实际效用、可靠性、隐私与下游风险。'],
        ['异常检测', '开发适用于高维场景、无需昂贵参数调节的无监督异常检测方法。'],
      ],
    },
    projects: { kicker: '项目', title: '研究成果与实用工具。' },
    blog: { kicker: '博客', title: '想法、实验与研究随笔。', intro: '文章在 Notion 中完成写作，并以快速、稳定的静态页面发布在这里。', empty: '中文文章正在整理中。' },
    contact: { kicker: '联系', title: '欢迎交流想法。', intro: '无论是研究讨论、合作机会，还是简单打个招呼，都欢迎通过邮件联系。', email: '研究、合作与学术交流。', github: '代码、实验与开源项目。' },
    allWriting: '返回全部文章', fieldNotes: '研究随笔', footer: '研究者 · 工程师 · 实践者',
  },
} as const;

export const news = [
  { date: '08 / 2026', en: 'SRD was accepted to Findings of EMNLP 2026.', zh: 'SRD 被 EMNLP 2026 Findings 接收。', links: [{ label: 'Code', href: 'https://github.com/KaituoZhang/SRD' }, { label: 'Paper', href: 'https://arxiv.org/pdf/2601.11776' }] },
  { date: '05 / 2026', en: 'Our survey on evaluating LLM-generated synthetic data was accepted by TMLR.', zh: '关于大模型合成数据评估的综述被 TMLR 接收。', links: [{ label: 'Repo', href: 'https://github.com/KaituoZhang/Awesome-LLM-Data-Generation' }, { label: 'Paper', href: 'https://arxiv.org/pdf/2601.17717' }] },
  { date: '05 / 2026', en: 'Tool-use Tax is available on arXiv.', zh: 'Tool-use Tax 已发布在 arXiv。', links: [{ label: 'Paper', href: 'https://arxiv.org/abs/2605.00136' }] },
  { date: '08 / 2025', en: 'I passed the screening exam and became a PhD candidate.', zh: '通过博士资格筛选考试，正式成为博士候选人。', links: [] },
  { date: '05 / 2025', en: 'Our anomaly detection work was accepted by Expert Systems with Applications.', zh: '异常检测研究被 Expert Systems with Applications 接收。', links: [{ label: 'Code', href: 'https://github.com/Philip0512/EDROD' }, { label: 'Paper', href: 'https://www.sciencedirect.com/science/article/pii/S0957417425020433' }] },
];

export const projects = [
  { title: 'Awesome LLM Data Generation', en: 'A metric-oriented survey on quality and trustworthiness in evaluating LLM-generated synthetic data.', zh: '从评估指标出发，系统梳理大模型合成数据的质量与可信度。', tags: ['LLM', 'Synthetic Data', 'Survey'], href: 'https://github.com/KaituoZhang/Awesome-LLM-Data-Generation', code: '01' },
  { title: 'EDROD', en: 'A parameter-free, unsupervised anomaly detection algorithm based on entropy density ratios.', zh: '基于熵密度比的无参数无监督异常检测算法。', tags: ['Anomaly Detection', 'Research'], href: 'https://github.com/Philip0512/EDROD', code: '02' },
  { title: 'RefChecker', en: 'A practical utility for reference formatting, validation, and citation checking.', zh: '用于参考文献格式化、验证与引用检查的实用工具。', tags: ['Tooling', 'Productivity'], href: 'https://github.com/KaituoZhang/RefChecker', code: '03' },
];

export function localePath(lang: Lang, path = '') {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `/${lang}/${clean ? `${clean}/` : ''}`;
}

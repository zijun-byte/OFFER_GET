import Link from 'next/link';
import SiteShell from '../components/SiteShell';
import styles from './UserCenter.module.css';

const destinations = [
  { title: '证件照优化', description: '上传照片，调整尺寸与形式。', href: '/id-photo-optimization-rebuilt' },
  { title: '我的简历', description: '选择模板，继续编辑简历。', href: '/template-library' },
  { title: '提前问答', description: '继续准备公司与岗位问题。', href: '/advance-qa' },
];

export default function UserCenter() {
  return (
    <SiteShell>
      <section className={styles.center} aria-labelledby="center-title">
        <div className={styles.heading}>
          <div className={styles.avatar} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19c.5-3.4 2.7-5.2 6.5-5.2s6 1.8 6.5 5.2" /></svg>
          </div>
          <div><p className={styles.eyebrow}>Offer GET</p><h1 id="center-title">用户中心</h1><p>从这里继续你的求职准备。</p></div>
        </div>
        <div className={styles.notice}>目前无需登录即可使用工具。简历草稿保存在当前浏览器中，暂不支持跨设备同步。</div>
        <div className={styles.links}>
          {destinations.map((item) => <Link key={item.href} href={item.href} className={styles.link}><span><strong>{item.title}</strong><small>{item.description}</small></span><span aria-hidden="true">↗</span></Link>)}
        </div>
      </section>
    </SiteShell>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import styles from './AdminLoginPage.module.css';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        body: JSON.stringify({ password, username }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to sign in.');
      }

      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(next?.startsWith('/admin') ? next : '/admin');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.form} onSubmit={submit}>
        <span className={styles.eyebrow}>OFFER GET</span>
        <h1>后台登录</h1>
        <p>仅限管理员访问智能体、提示词和运行数据。</p>
        <label>
          <span>账号</span>
          <input autoComplete="username" onChange={(event) => setUsername(event.target.value)} required value={username} />
        </label>
        <label>
          <span>密码</span>
          <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? '正在验证...' : '进入后台'}
        </button>
        <Link className={styles.returnLink} href="/">← 返回产品首页</Link>
      </form>
    </main>
  );
}

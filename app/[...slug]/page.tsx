import { notFound, redirect } from 'next/navigation';

const legacyRedirects: Record<string, string> = {
  'home-page': '/',
  'home-page.html': '/',
  'home page': '/',
  'home page.html': '/',
  'home-page-clean': '/',
  'home-page-clean.html': '/',
  'id-photo-optimization-rebuilt.html': '/id-photo-optimization-rebuilt',
  'id-photo-optimization-clean.html': '/id-photo-optimization-clean',
  'resume-optimization.html': '/resume-optimization',
  'advance-qa.html': '/advance-qa',
  'qa-chat.html': '/qa-chat',
  'tarot-fortune.html': '/tarot-fortune',
  'template-library.html': '/template-library',
  'online-editor.html': '/online-editor',
};

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const path = decodeURIComponent(slug.join('/'));
  const target = legacyRedirects[path];

  if (target) {
    redirect(target);
  }

  notFound();
}

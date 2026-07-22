'use client';

import { useEffect } from 'react';

export default function ResumeInterviewPage() {
  useEffect(() => {
    window.location.replace('/template-library');
  }, []);

  return null;
}

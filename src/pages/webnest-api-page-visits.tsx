import React, { useEffect, useState } from 'react';
import { getPageVisits } from '../services/developerApiService';

function getQueryParam(name: string) {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
}

const WebnestApiPageVisits: React.FC = () => {
  const [result, setResult] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pageId = getQueryParam('pageId');
    const devKey = getQueryParam('devKey');
    if (!pageId || !devKey) {
      setResult({});
      setLoading(false);
      return;
    }
    getPageVisits(pageId, devKey).then(res => {
      setResult(res);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      document.body.innerHTML = JSON.stringify(result);
    }
  }, [loading, result]);

  return null;
};

export default WebnestApiPageVisits; 
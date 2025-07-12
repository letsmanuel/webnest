import React, { useEffect, useState } from 'react';
import { checkDnsAvailability } from '../services/developerApiService';

function getQueryParam(name: string) {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
}

const WebnestApiCheckDns: React.FC = () => {
  const [result, setResult] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dns = getQueryParam('dns');
    const devKey = getQueryParam('devKey');
    if (!dns || !devKey) {
      setResult({});
      setLoading(false);
      return;
    }
    checkDnsAvailability(dns, devKey).then(res => {
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

export default WebnestApiCheckDns; 
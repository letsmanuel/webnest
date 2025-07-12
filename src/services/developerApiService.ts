import { developerService } from './developerService';
import { websiteService } from './websiteService';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Checks if a custom DNS is available.
 * @param {string} dns - The DNS name to check.
 * @param {string} devKey - The developer key.
 * @returns {Promise<{ dns: string, available: boolean } | { error: string }>} 
 */
export async function checkDnsAvailability(dns: string, devKey: string) {
  const keyData = await developerService.getKeyDataByKey(devKey);
  if (!keyData) {
    return { error: 'Invalid developer key' };
  }
  const allowed = await developerService.deductTokenIfNeeded(keyData.userId);
  if (!allowed) {
    return { error: 'Not enough tokens or usage limit reached' };
  }
  const dnsDocRef = doc(db, 'userdns', dns);
  const dnsDoc = await getDoc(dnsDocRef);
  const available = !dnsDoc.exists();
  return { dns, available };
}

/**
 * Gets the visit count for a page.
 * @param {string} pageId - The page ID.
 * @param {string} devKey - The developer key.
 * @returns {Promise<{ pageId: string, totalVisits: number } | { error: string }>} 
 */
export async function getPageVisits(pageId: string, devKey: string) {
  const keyData = await developerService.getKeyDataByKey(devKey);
  if (!keyData) {
    return { error: 'Invalid developer key' };
  }
  const allowed = await developerService.deductTokenIfNeeded(keyData.userId);
  if (!allowed) {
    return { error: 'Not enough tokens or usage limit reached' };
  }
  const website = await websiteService.getWebsite(pageId);
  if (!website) {
    return { error: 'Page not found' };
  }
  return { pageId, totalVisits: website.totalVisits || 0 };
} 
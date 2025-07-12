import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from './userService';

export interface Website {
  id?: string;
  name: string;
  userId: string;
  htmlContent: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  editorHeight?: number;
  elementsJson?: string;
  favicon?: string; // base64 .ico favicon
  totalVisits?: number;
  lastVisit?: Date;
  pendingUnpublishAt?: Date|null;
  unpublishDelayActive?: boolean;
  backgroundColor?: string; // Custom background color
}

export const websiteService = {
  async createWebsite(websiteData: Omit<Website, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Deduct tokens for creating a website
    const success = await userService.deductTokens(
      websiteData.userId, 
      userService.TOKEN_COSTS.WEBSITE_CREATION,
      'Website creation'
    );
    if (!success) {
      throw new Error('Nicht genügend Tokens');
    }

    const now = new Date();
    const docRef = await addDoc(collection(db, 'websites'), {
      ...websiteData,
      allowedUserIds: [websiteData.userId],
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    
    // Note: Token transaction is logged without websiteId since it's not available yet
    // This is acceptable for analytics purposes
    
    return docRef.id;
  },

  async getWebsite(id: string): Promise<Website | null> {
    const docRef = doc(db, 'websites', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Website;
    }
    return null;
  },

  async getWebsiteByCustomPath(customPath: string): Promise<Website | null> {
    console.log('websiteService: getWebsiteByCustomPath called with:', customPath);
    
    // First, check if the custom path exists in userdns collection
    const dnsDocRef = doc(db, 'userdns', customPath);
    const dnsDoc = await getDoc(dnsDocRef);
    
    console.log('websiteService: DNS lookup result - exists:', dnsDoc.exists());
    
    if (!dnsDoc.exists()) {
      console.log('websiteService: No DNS entry found for:', customPath);
      return null;
    }
    
    // Get the actual website ID from the DNS document
    const dnsData = dnsDoc.data();
    const actualWebsiteId = dnsData.websiteId;
    
    console.log('websiteService: Found DNS entry, websiteId:', actualWebsiteId);
    
    // Now get the actual website
    const website = await this.getWebsite(actualWebsiteId);
    
    console.log('websiteService: Website lookup result:', website ? 'found' : 'not found');
    if (website) {
      console.log('websiteService: Website isPublished:', website.isPublished);
    }
    
    if (!website || !website.isPublished) {
      return null;
    }
    
    return website;
  },

  async getUserWebsites(userId: string): Promise<Website[]> {
    const q = query(
      collection(db, 'websites'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const websites = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Website;
    });

    // Sort by creation date (newest first) on client side
    return websites.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async updateWebsite(id: string, updates: Partial<Website>): Promise<void> {
    const docRef = doc(db, 'websites', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    });
  },

  async deleteWebsite(id: string): Promise<void> {
    const website = await this.getWebsite(id);
    if (website) {
      // Check if website has a custom path
      const customPath = await this.getCustomPathForWebsite(id);
      const hasCustomPath = !!customPath;
      // Calculate website age in hours
      const websiteAge = Date.now() - website.createdAt.getTime();
      const websiteAgeHours = websiteAge / (1000 * 60 * 60);
      // Calculate refund using the new method
      const refundAmount = userService.calculateWebsiteRefund(hasCustomPath, websiteAgeHours);
      if (customPath) {
        // Delete DNS entry
        const dnsDocRef = doc(db, 'userdns', customPath);
        await deleteDoc(dnsDocRef);
        console.log('Deleted DNS entry for custom path:', customPath);
      }
      // Add refunded tokens to user account
      if (refundAmount > 0) {
        await userService.addTokens(
          website.userId, 
          refundAmount, 
          `Website deletion refund (${websiteAgeHours.toFixed(1)}h old)`
        );
        console.log(`Refunded ${refundAmount} tokens to user ${website.userId} for website deletion`);
      }
    }
    const docRef = doc(db, 'websites', id);
    await deleteDoc(docRef);
  },

  async setCustomPath(websiteId: string, customPath: string): Promise<void> {
    const website = await this.getWebsite(websiteId);
    if (!website) {
      throw new Error('Website nicht gefunden');
    }

    // Validate custom path format and content
    const validation = userService.validateCustomPath(customPath);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid custom path');
    }

    // Check if custom path already exists in userdns collection
    const dnsDocRef = doc(db, 'userdns', customPath);
    const dnsDoc = await getDoc(dnsDocRef);
    
    if (dnsDoc.exists()) {
      throw new Error('Custom Path bereits vergeben');
    }

    // Deduct tokens for custom path
    const success = await userService.deductTokens(
      website.userId, 
      userService.TOKEN_COSTS.CUSTOM_PATH,
      'Custom path setup',
      websiteId
    );
    if (!success) {
      throw new Error('Nicht genügend Tokens für Custom Path');
    }

    // Create DNS entry
    await setDoc(dnsDocRef, {
      websiteId: websiteId,
      userId: website.userId,
      createdAt: Timestamp.fromDate(new Date()),
      allowedUserIds: [website.userId],
    });
  },

  async getCustomPathForWebsite(websiteId: string): Promise<string | null> {
    const q = query(
      collection(db, 'userdns'),
      where('websiteId', '==', websiteId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id; // The document ID is the custom path
    }
    
    return null;
  },

  generateHTML(elements: any[], backgroundColor?: string): string {
    const bg = backgroundColor || '#ffffff';
    let html = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meine Website</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            width: 100vw;
            min-width: 100vw;
            transition: background-color 0.3s, color 0.3s;
            background: ${bg};
        }
        .dark-mode {
            background-color: #1a1a1a;
            color: #ffffff;
        }
        .topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        .dark-mode .topbar {
            background: #2d2d2d;
        }
        .topbar-buttons {
            display: flex;
            gap: 0.5rem;
        }
        .youtube-container {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%;
            margin: 1rem 0;
        }
        .youtube-container iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        input {
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            margin: 4px 0;
        }
        .dark-mode input {
            background: #333;
            color: white;
            border-color: #555;
        }
        a {
            color: inherit;
            text-decoration: underline;
        }
        .dark-mode a {
            color: #6cb6ff;
        }
        /* Animation base classes */
        .webnest-animate-fade-in { animation: webnest-fade-in 1s ease; }
        .webnest-animate-fly-in { animation: webnest-fly-in-left 1s ease; }
        .webnest-animate-zoom-in { animation: webnest-zoom-in 1s ease; }
        .webnest-animate-slide-in { animation: webnest-slide-in-left 1s ease; }
        .webnest-animate-bounce { animation: webnest-bounce 1s ease; }
        .webnest-animate-flip { animation: webnest-flip 1s ease; }
        .webnest-animate-speed-slow { animation-duration: 2s !important; }
        .webnest-animate-speed-normal { animation-duration: 1s !important; }
        .webnest-animate-speed-fast { animation-duration: 0.5s !important; }
        .webnest-animate-direction-left { animation-name: webnest-fly-in-left, webnest-slide-in-left, webnest-bounce-left; }
        .webnest-animate-direction-right { animation-name: webnest-fly-in-right, webnest-slide-in-right, webnest-bounce-right; }
        .webnest-animate-direction-up { animation-name: webnest-fly-in-up, webnest-slide-in-up, webnest-bounce-up; }
        .webnest-animate-direction-down { animation-name: webnest-fly-in-down, webnest-slide-in-down, webnest-bounce-down; }
        @keyframes webnest-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes webnest-fly-in-left { from { transform: translateX(-50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes webnest-fly-in-right { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes webnest-fly-in-up { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes webnest-fly-in-down { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes webnest-zoom-in { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes webnest-slide-in-left { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes webnest-slide-in-right { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes webnest-slide-in-up { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes webnest-slide-in-down { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes webnest-bounce-left { 0% { transform: translateX(-100%); } 60% { transform: translateX(30px); } 80% { transform: translateX(-10px); } 100% { transform: translateX(0); } }
        @keyframes webnest-bounce-right { 0% { transform: translateX(100%); } 60% { transform: translateX(-30px); } 80% { transform: translateX(10px); } 100% { transform: translateX(0); } }
        @keyframes webnest-bounce-up { 0% { transform: translateY(-100%); } 60% { transform: translateY(30px); } 80% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
        @keyframes webnest-bounce-down { 0% { transform: translateY(100%); } 60% { transform: translateY(-30px); } 80% { transform: translateY(10px); } 100% { transform: translateY(0); } }
        @keyframes webnest-flip { from { transform: rotateY(90deg); opacity: 0; } to { transform: rotateY(0deg); opacity: 1; } }
    </style>
</head>
<body>
    <script>
        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        }
        
        // Load dark mode preference
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
        
        function getYouTubeVideoId(url) {
            const regex = /(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([^&\\n?#]+)/;
            const match = url.match(regex);
            return match ? match[1] : null;
        }
    </script>
`;

    // Calculate required container height based on elements
    let requiredHeight = 0;
    const editorHeight = elements && elements.length && elements[0].editorHeight ? elements[0].editorHeight : 1200;
    elements.forEach(el => {
      const yPercent = typeof el.y === 'number' ? el.y : 10;
      const yPx = (yPercent / 100) * editorHeight;
      const heightPx = el.heightPx || 40; // Default to 40px if not set
      const bottom = yPx + heightPx;
      if (bottom > requiredHeight) requiredHeight = bottom;
    });
    if (requiredHeight < editorHeight) requiredHeight = editorHeight;
    let bodyAttrs = '';
    if (elements && elements.length) {
      bodyAttrs = ` data-editor-height="${editorHeight}" style="overflow-y:auto;overflow-x:hidden;width:100vw;box-sizing:border-box;"`;
    }
    html += `<body${bodyAttrs}>\n`;
    html += `<div style="position:relative;width:100vw;max-width:100vw;height:${requiredHeight}px;overflow-x:hidden;box-sizing:border-box;">\n`;
    elements.forEach(element => {
      // Helper for width/height style
      const sizeStyle =
        (element.widthPx ? `width:${element.widthPx}px;` : '') +
        (element.heightPx ? `height:${element.heightPx}px;` : '');
      switch (element.type) {
        case 'text':
          html += `    <p style="position:absolute; left:${element.x ?? 10}%; top:${element.y ?? 10}%; color: ${element.color}; font-size: ${element.fontSize}px; font-family: ${element.fontFamily || 'Arial'};" data-animation="${element.animation}" data-animation-speed="${element.animationSpeed}" data-animation-direction="${element.animationDirection}" class="webnest-animate-${element.animation} webnest-animate-speed-${element.animationSpeed} webnest-animate-direction-${element.animationDirection}">${element.content || 'Text'}</p>\n`;
          break;
        case 'button':
          const buttonJS = element.customJS ? element.customJS : 'alert("Button geklickt!")';
          // Escape JavaScript code to prevent HTML parsing issues
          const escapedButtonJS = buttonJS.replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
          html += `    <button style="position:absolute; left:${element.x ?? 10}%; top:${element.y ?? 10}%; background-color: ${element.backgroundColor}; color: white; font-family: ${element.fontFamily || 'Arial'};${sizeStyle}" onclick="${escapedButtonJS}" data-animation="${element.animation}" data-animation-speed="${element.animationSpeed}" data-animation-direction="${element.animationDirection}" class="webnest-animate-${element.animation} webnest-animate-speed-${element.animationSpeed} webnest-animate-direction-${element.animationDirection}">${element.text || 'Button'}</button>\n`;
          break;
        case 'image':
          html += `    <img src="${element.src || '/placeholder.svg'}" alt="${element.alt || 'Bild'}" style="position:absolute; left:${element.x ?? 10}%; top:${element.y ?? 10}%; max-width: 100%; height: auto; border-radius: 4px; font-family: ${element.fontFamily || 'Arial'};${sizeStyle}" data-animation="${element.animation}" data-animation-speed="${element.animationSpeed}" data-animation-direction="${element.animationDirection}" class="webnest-animate-${element.animation} webnest-animate-speed-${element.animationSpeed} webnest-animate-direction-${element.animationDirection}">\n`;
          break;
        case 'input':
          html += `    <input type="${element.inputType || 'text'}" id="${element.inputId || `input-${element.id}` }" placeholder="${element.placeholder || 'Eingabe...'}" style="position:absolute; left:${element.x ?? 10}%; top:${element.y ?? 10}%; width: 100%; font-family: ${element.fontFamily || 'Arial'};" data-animation="${element.animation}" data-animation-speed="${element.animationSpeed}" data-animation-direction="${element.animationDirection}" class="webnest-animate-${element.animation} webnest-animate-speed-${element.animationSpeed} webnest-animate-direction-${element.animationDirection}">\n`;
          break;
        case 'link-text':
          html += `    <p style="position:absolute; left:${element.x ?? 10}%; top:${element.y ?? 10}%;"><a href="${element.url || '#'}" style="color: ${element.color}; font-size: ${element.fontSize}px; font-family: ${element.fontFamily || 'Arial'};" target="_blank" data-animation="${element.animation}" data-animation-speed="${element.animationSpeed}" data-animation-direction="${element.animationDirection}" class="webnest-animate-${element.animation} webnest-animate-speed-${element.animationSpeed} webnest-animate-direction-${element.animationDirection}">${element.text || 'Link Text'}</a></p>\n`;
          break;
        case 'youtube':
          const videoId = element.url ? this.extractYouTubeVideoId(element.url) : null;
          if (videoId) {
            html += `    <div class="youtube-container" style="position:absolute; left:${element.x ?? 10}%; top:${element.y ?? 10}%;${sizeStyle}">
        <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen data-animation="${element.animation}" data-animation-speed="${element.animationSpeed}" data-animation-direction="${element.animationDirection}" class="webnest-animate-${element.animation} webnest-animate-speed-${element.animationSpeed} webnest-animate-direction-${element.animationDirection}" style="font-family: ${element.fontFamily || 'Arial'};${sizeStyle}"></iframe>
    </div>\n`;
          } else {
            html += `    <div style="background: #f0f0f0; padding: 2rem; text-align: center; border-radius: 4px; font-family: ${element.fontFamily || 'Arial'};${sizeStyle}" data-animation="${element.animation}" data-animation-speed="${element.animationSpeed}" data-animation-direction="${element.animationDirection}" class="webnest-animate-${element.animation} webnest-animate-speed-${element.animationSpeed} webnest-animate-direction-${element.animationDirection}">
        <p>YouTube Video nicht verfügbar</p>
        <p style="font-size: 12px; color: #666;">${element.url || 'Keine URL'}</p>
    </div>\n`;
          }
          break;
        case 'video':
          html += `    <video src="${element.videoUrl || ''}" style="position:absolute; left:${element.x ?? 10}%; top:${element.y ?? 10}%;${sizeStyle}"${element.videoAutoplay ? ' autoplay' : ''}${element.videoControls ? ' controls' : ''}${element.videoLoop ? ' loop' : ''}${element.videoMuted ? ' muted' : ''} data-animation="${element.animation}" data-animation-speed="${element.animationSpeed}" data-animation-direction="${element.animationDirection}" class="webnest-animate-${element.animation} webnest-animate-speed-${element.animationSpeed} webnest-animate-direction-${element.animationDirection}"></video>\n`;
          break;
        case 'topbar':
          html += `    <div class="topbar" style="position:absolute; left:0; top:0; width:100%;">
        <span style="font-weight: bold; font-family: ${element.fontFamily || 'Arial'};">${element.label || 'Navigation'}</span>
        <div class="topbar-buttons">`;
          (element.buttons || []).forEach(btn => {
            const btnJS = btn.customJS || 'alert("Button geklickt!")';
            // Escape JavaScript code to prevent HTML parsing issues
            const escapedBtnJS = btnJS.replace(/\"/g, '"').replace(/'/g, '&#39;');
            html += `            <button style="background-color: ${btn.backgroundColor}; color: white; font-family: ${btn.fontFamily || 'Arial'};" onclick="${escapedBtnJS}" data-animation="${btn.animation}" data-animation-speed="${btn.animationSpeed}" data-animation-direction="${btn.animationDirection}" class="webnest-animate-${btn.animation} webnest-animate-speed-${btn.animationSpeed} webnest-animate-direction-${btn.animationDirection}">${btn.text}</button>\n`;
          });
          html += `        </div>
    </div>\n`;
          break;
      }
    });
    html += `</div>\n`;

    html += `
</body>
</html>`;

    // Use UTF-8 safe base64 encoding
    return this.base64EncodeUnicode(html);
  },

  base64EncodeUnicode(str: string): string {
    // Encodes a string in UTF-8 safe base64
    return btoa(unescape(encodeURIComponent(str)));
  },

  parseHTML(htmlContent: string): { elements: any[], editorHeight?: number } {
    console.log('parseHTML: Starting to parse HTML content');
    if (!htmlContent) {
      console.log('parseHTML: No htmlContent provided, returning empty array');
      return { elements: [] };
    }
    
    try {
      const decodedHtml = atob(htmlContent);
      console.log('parseHTML: Decoded HTML length:', decodedHtml.length);
      console.log('parseHTML: First 200 chars of decoded HTML:', decodedHtml);
      
      // Use DOMParser to properly parse the HTML document
      const parser = new DOMParser();
      const doc = parser.parseFromString(decodedHtml, 'text/html');
      const bodyContent = doc.body;
      
      if (!bodyContent) {
        console.log('parseHTML: No body element found in HTML');
        return { elements: [] };
      }
      
      console.log('parseHTML: Found body element with', bodyContent.children.length, 'children');
      
      const elements: any[] = [];
      let elementId = 1;

      // Helper function to extract style properties, searching up the DOM tree if not found
      const getStylePropertyDeep = (element: Element, property: string): string => {
        let el: Element | null = element;
        while (el) {
          const style = el.getAttribute('style');
          if (style) {
            const match = style.match(new RegExp(`${property}:\s*([^;]+)`));
            if (match) return match[1].trim();
          }
          el = el.parentElement;
        }
        return '';
      };

      // Helper function to extract YouTube video ID
      const extractVideoId = (url: string): string | null => {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
      };

      // Helper function to process all text content recursively
      const processTextContent = (element: Element) => {
        // Process headings
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
          const headingElement = heading as Element;
          elements.push({
            id: elementId.toString(),
            type: 'text',
            content: headingElement.textContent || 'Heading',
            color: getStylePropertyDeep(headingElement, 'color') || '#333333',
            fontSize: parseInt(getStylePropertyDeep(headingElement, 'font-size'), 10) || 
                     (headingElement.tagName === 'H1' ? 32 : 
                      headingElement.tagName === 'H2' ? 28 : 
                      headingElement.tagName === 'H3' ? 24 : 20),
            animation: element.getAttribute('data-animation'),
            animationSpeed: element.getAttribute('data-animation-speed'),
            animationDirection: element.getAttribute('data-animation-direction'),
            x: parseFloat((getStylePropertyDeep(headingElement, 'left') || '').replace('%','')) || 10,
            y: parseFloat((getStylePropertyDeep(headingElement, 'top') || '').replace('%','')) || 10,
            fontFamily: getStylePropertyDeep(headingElement, 'font-family') || undefined,
          });
          elementId++;
        });

        // Process paragraphs
        const paragraphs = element.querySelectorAll('p');
        paragraphs.forEach(p => {
          const pElement = p as Element;
          // Skip if this paragraph is inside a heading (already processed)
          if (pElement.closest('h1, h2, h3, h4, h5, h6')) return;
          
          elements.push({
            id: elementId.toString(),
            type: 'text',
            content: pElement.textContent || 'Text',
            color: getStylePropertyDeep(pElement, 'color') || '#333333',
            fontSize: parseInt(getStylePropertyDeep(pElement, 'font-size'), 10) || 16,
            animation: element.getAttribute('data-animation'),
            animationSpeed: element.getAttribute('data-animation-speed'),
            animationDirection: element.getAttribute('data-animation-direction'),
            x: parseFloat((getStylePropertyDeep(pElement, 'left') || '').replace('%','')) || 10,
            y: parseFloat((getStylePropertyDeep(pElement, 'top') || '').replace('%','')) || 10,
            fontFamily: getStylePropertyDeep(pElement, 'font-family') || undefined,
          });
          elementId++;
        });

        // Process buttons
        const buttons = element.querySelectorAll('button');
        buttons.forEach(button => {
          const buttonElement = button as Element;
          const onclick = buttonElement.getAttribute('onclick') || 'alert("Button geklickt!")';
          const isDarkToggle = buttonElement.textContent?.includes('🌙') || onclick.includes('toggleDarkMode');
          
          if (isDarkToggle) {
            elements.push({
              id: elementId.toString(),
              type: 'dark-toggle',
              animation: element.getAttribute('data-animation'),
              animationSpeed: element.getAttribute('data-animation-speed'),
              animationDirection: element.getAttribute('data-animation-direction'),
              x: parseFloat((getStylePropertyDeep(buttonElement, 'left') || '').replace('%','')) || 10,
              y: parseFloat((getStylePropertyDeep(buttonElement, 'top') || '').replace('%','')) || 10,
              fontFamily: getStylePropertyDeep(buttonElement, 'font-family') || undefined,
            });
          } else {
            elements.push({
              id: elementId.toString(),
              type: 'button',
              text: buttonElement.textContent || 'Button',
              backgroundColor: getStylePropertyDeep(buttonElement, 'background-color') || '#667eea',
              customJS: onclick,
              animation: element.getAttribute('data-animation'),
              animationSpeed: element.getAttribute('data-animation-speed'),
              animationDirection: element.getAttribute('data-animation-direction'),
              x: parseFloat((getStylePropertyDeep(buttonElement, 'left') || '').replace('%','')) || 10,
              y: parseFloat((getStylePropertyDeep(buttonElement, 'top') || '').replace('%','')) || 10,
              fontFamily: getStylePropertyDeep(buttonElement, 'font-family') || undefined,
              widthPx: parseInt(getStylePropertyDeep(buttonElement, 'width'), 10) || undefined,
              heightPx: parseInt(getStylePropertyDeep(buttonElement, 'height'), 10) || undefined,
            });
          }
          elementId++;
        });

        // Process images
        const images = element.querySelectorAll('img');
        images.forEach(img => {
          const imgElement = img as Element;
          elements.push({
            id: elementId.toString(),
            type: 'image',
            src: imgElement.getAttribute('src') || '/placeholder.svg',
            alt: imgElement.getAttribute('alt') || 'Bild',
            animation: element.getAttribute('data-animation'),
            animationSpeed: element.getAttribute('data-animation-speed'),
            animationDirection: element.getAttribute('data-animation-direction'),
            x: parseFloat((getStylePropertyDeep(imgElement, 'left') || '').replace('%','')) || 10,
            y: parseFloat((getStylePropertyDeep(imgElement, 'top') || '').replace('%','')) || 10,
            fontFamily: getStylePropertyDeep(imgElement, 'font-family') || undefined,
            widthPx: parseInt(getStylePropertyDeep(imgElement, 'width'), 10) || undefined,
            heightPx: parseInt(getStylePropertyDeep(imgElement, 'height'), 10) || undefined,
          });
          elementId++;
        });

        // Process inputs
        const inputs = element.querySelectorAll('input');
        inputs.forEach(input => {
          const inputElement = input as Element;
          elements.push({
            id: elementId.toString(),
            type: 'input',
            inputId: inputElement.getAttribute('id') || `input-${inputElement.id}`,
            inputType: inputElement.getAttribute('type') || 'text',
            placeholder: inputElement.getAttribute('placeholder') || 'Eingabe...',
            animation: element.getAttribute('data-animation'),
            animationSpeed: element.getAttribute('data-animation-speed'),
            animationDirection: element.getAttribute('data-animation-direction'),
            x: parseFloat((getStylePropertyDeep(inputElement, 'left') || '').replace('%','')) || 10,
            y: parseFloat((getStylePropertyDeep(inputElement, 'top') || '').replace('%','')) || 10,
            fontFamily: getStylePropertyDeep(inputElement, 'font-family') || undefined,
          });
          elementId++;
        });

        // Process links
        const links = element.querySelectorAll('a');
        links.forEach(link => {
          const linkElement = link as Element;
          // Skip if this link is inside a paragraph (already processed as text)
          if (linkElement.closest('p')) return;
          
          elements.push({
            id: elementId.toString(),
            type: 'link-text',
            text: linkElement.textContent || 'Link Text',
            url: linkElement.getAttribute('href') || '#',
            color: getStylePropertyDeep(linkElement, 'color') || '#667eea',
            fontSize: parseInt(getStylePropertyDeep(linkElement, 'font-size'), 10) || 16,
            animation: element.getAttribute('data-animation'),
            animationSpeed: element.getAttribute('data-animation-speed'),
            animationDirection: element.getAttribute('data-animation-direction'),
            x: parseFloat((getStylePropertyDeep(linkElement, 'left') || '').replace('%','')) || 10,
            y: parseFloat((getStylePropertyDeep(linkElement, 'top') || '').replace('%','')) || 10,
            fontFamily: getStylePropertyDeep(linkElement, 'font-family') || undefined,
          });
          elementId++;
        });
      };

      // Check if this looks like template HTML (has sections, h1, h2, etc.)
      const hasTemplateStructure = decodedHtml.includes('<section') || decodedHtml.includes('<h1') || decodedHtml.includes('<h2');
      if (hasTemplateStructure) {
        console.log('parseHTML: Detected template HTML structure - converting to builder elements');
        processTextContent(bodyContent);
        console.log('parseHTML: Converted template to elements:', elements);
        const editorHeightAttr = bodyContent.getAttribute('data-editor-height');
        const editorHeight = editorHeightAttr ? parseInt(editorHeightAttr, 10) : undefined;
        return { elements, editorHeight };
      }

      // Process each child element of the body (for builder-generated HTML)
      Array.from(bodyContent.children).forEach((child) => {
        const element = child as Element;
        const tagName = element.tagName.toLowerCase();
        console.log('parseHTML: Processing element:', tagName, 'with content:', element.textContent?.substring(0, 50));
        
        switch (tagName) {
          case 'p':
            // Check if it's a link-text element
            const link = element.querySelector('a');
            if (link) {
              console.log('parseHTML: Found link-text element');
              elements.push({
                id: elementId.toString(),
                type: 'link-text',
                text: link.textContent || 'Link Text',
                url: link.getAttribute('href') || '#',
                color: getStylePropertyDeep(link, 'color') || '#667eea',
                fontSize: parseInt(getStylePropertyDeep(link, 'font-size'), 10) || 16,
                animation: element.getAttribute('data-animation'),
                animationSpeed: element.getAttribute('data-animation-speed'),
                animationDirection: element.getAttribute('data-animation-direction'),
                x: parseFloat((getStylePropertyDeep(link, 'left') || '').replace('%','')) || 10,
                y: parseFloat((getStylePropertyDeep(link, 'top') || '').replace('%','')) || 10,
                fontFamily: getStylePropertyDeep(link, 'font-family') || undefined,
              });
            } else {
              console.log('parseHTML: Found text element');
              // Regular text element
              elements.push({
                id: elementId.toString(),
                type: 'text',
                content: element.textContent || 'Text',
                color: getStylePropertyDeep(element, 'color') || '#333333',
                fontSize: parseInt(getStylePropertyDeep(element, 'font-size'), 10) || 16,
                animation: element.getAttribute('data-animation'),
                animationSpeed: element.getAttribute('data-animation-speed'),
                animationDirection: element.getAttribute('data-animation-direction'),
                x: parseFloat((getStylePropertyDeep(element, 'left') || '').replace('%','')) || 10,
                y: parseFloat((getStylePropertyDeep(element, 'top') || '').replace('%','')) || 10,
                fontFamily: getStylePropertyDeep(element, 'font-family') || undefined,
              });
            }
            elementId++;
            break;

          case 'button':
            console.log('parseHTML: Found button element');
            let onclick = element.getAttribute('onclick') || 'alert("Button geklickt!")';
            // Unescape JavaScript code that was escaped during generation
            onclick = onclick.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            const isDarkToggle = element.textContent?.includes('🌙') || onclick.includes('toggleDarkMode');
            
            if (isDarkToggle) {
              elements.push({
                id: elementId.toString(),
                type: 'dark-toggle',
                animation: element.getAttribute('data-animation'),
                animationSpeed: element.getAttribute('data-animation-speed'),
                animationDirection: element.getAttribute('data-animation-direction'),
                x: parseFloat((getStylePropertyDeep(element, 'left') || '').replace('%','')) || 10,
                y: parseFloat((getStylePropertyDeep(element, 'top') || '').replace('%','')) || 10,
                fontFamily: getStylePropertyDeep(element, 'font-family') || undefined,
              });
            } else {
              elements.push({
                id: elementId.toString(),
                type: 'button',
                text: element.textContent || 'Button',
                backgroundColor: getStylePropertyDeep(element, 'background-color') || '#667eea',
                customJS: onclick,
                animation: element.getAttribute('data-animation'),
                animationSpeed: element.getAttribute('data-animation-speed'),
                animationDirection: element.getAttribute('data-animation-direction'),
                x: parseFloat((getStylePropertyDeep(element, 'left') || '').replace('%','')) || 10,
                y: parseFloat((getStylePropertyDeep(element, 'top') || '').replace('%','')) || 10,
                fontFamily: getStylePropertyDeep(element, 'font-family') || undefined,
                widthPx: parseInt(getStylePropertyDeep(element, 'width'), 10) || undefined,
                heightPx: parseInt(getStylePropertyDeep(element, 'height'), 10) || undefined,
              });
            }
            elementId++;
            break;

          case 'img':
            console.log('parseHTML: Found image element');
            elements.push({
              id: elementId.toString(),
              type: 'image',
              src: element.getAttribute('src') || '/placeholder.svg',
              alt: element.getAttribute('alt') || 'Bild',
              animation: element.getAttribute('data-animation'),
              animationSpeed: element.getAttribute('data-animation-speed'),
              animationDirection: element.getAttribute('data-animation-direction'),
              x: parseFloat((getStylePropertyDeep(element, 'left') || '').replace('%','')) || 10,
              y: parseFloat((getStylePropertyDeep(element, 'top') || '').replace('%','')) || 10,
              fontFamily: getStylePropertyDeep(element, 'font-family') || undefined,
              widthPx: parseInt(getStylePropertyDeep(element, 'width'), 10) || undefined,
              heightPx: parseInt(getStylePropertyDeep(element, 'height'), 10) || undefined,
            });
            elementId++;
            break;

          case 'input':
            console.log('parseHTML: Found input element');
            elements.push({
              id: elementId.toString(),
              type: 'input',
              inputId: element.getAttribute('id') || `input-${element.id}`,
              inputType: element.getAttribute('type') || 'text',
              placeholder: element.getAttribute('placeholder') || 'Eingabe...',
              animation: element.getAttribute('data-animation'),
              animationSpeed: element.getAttribute('data-animation-speed'),
              animationDirection: element.getAttribute('data-animation-direction'),
              x: parseFloat((getStylePropertyDeep(element, 'left') || '').replace('%','')) || 10,
              y: parseFloat((getStylePropertyDeep(element, 'top') || '').replace('%','')) || 10,
              fontFamily: getStylePropertyDeep(element, 'font-family') || undefined,
            });
            elementId++;
            break;

          case 'div':
            // Check if it's a YouTube container
            if (element.classList.contains('youtube-container')) {
              console.log('parseHTML: Found YouTube container');
              const iframe = element.querySelector('iframe');
              if (iframe) {
                const src = iframe.getAttribute('src') || '';
                const videoId = src.split('/').pop()?.split('?')[0] || '';
                const url = `https://www.youtube.com/watch?v=${videoId}`;
                elements.push({
                  id: elementId.toString(),
                  type: 'youtube',
                  url: url,
                  animation: element.getAttribute('data-animation'),
                  animationSpeed: element.getAttribute('data-animation-speed'),
                  animationDirection: element.getAttribute('data-animation-direction'),
                  x: parseFloat((getStylePropertyDeep(element, 'left') || '').replace('%','')) || 10,
                  y: parseFloat((getStylePropertyDeep(element, 'top') || '').replace('%','')) || 10,
                  fontFamily: getStylePropertyDeep(element, 'font-family') || undefined,
                  widthPx: parseInt(getStylePropertyDeep(element, 'width'), 10) || undefined,
                  heightPx: parseInt(getStylePropertyDeep(element, 'height'), 10) || undefined,
                });
                elementId++;
              }
            } else if (element.classList.contains('topbar')) {
              console.log('parseHTML: Found topbar element');
              // Parse topbar
              const label = element.querySelector('span')?.textContent || 'Navigation';
              const buttons: Array<{text: string, backgroundColor: string, customJS?: string}> = [];
              
              const buttonElements = element.querySelectorAll('.topbar-buttons button');
              buttonElements.forEach(btn => {
                let btnOnclick = btn.getAttribute('onclick') || 'alert("Button geklickt!")';
                // Unescape JavaScript code that was escaped during generation
                btnOnclick = btnOnclick.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                const btnObj: any = {
                  text: btn.textContent || 'Button',
                  backgroundColor: getStylePropertyDeep(btn, 'background-color') || '#667eea',
                  customJS: btnOnclick
                };
                if (element.getAttribute('data-animation')) btnObj.animation = element.getAttribute('data-animation');
                if (element.getAttribute('data-animation-speed')) btnObj.animationSpeed = element.getAttribute('data-animation-speed');
                if (element.getAttribute('data-animation-direction')) btnObj.animationDirection = element.getAttribute('data-animation-direction');
                btnObj.fontFamily = getStylePropertyDeep(btn, 'font-family') || undefined;
                buttons.push(btnObj);
              });

              elements.push({
                id: elementId.toString(),
                type: 'topbar',
                label: label,
                buttons: buttons,
                animation: element.getAttribute('data-animation'),
                animationSpeed: element.getAttribute('data-animation-speed'),
                animationDirection: element.getAttribute('data-animation-direction'),
                x: parseFloat((getStylePropertyDeep(element, 'left') || '').replace('%','')) || 10,
                y: parseFloat((getStylePropertyDeep(element, 'top') || '').replace('%','')) || 10,
                fontFamily: getStylePropertyDeep(element, 'font-family') || undefined,
              });
              elementId++;
            } else {
              console.log('parseHTML: Found div element but not recognized as special type');
            }
            break;
            
          default:
            console.log('parseHTML: Unrecognized element type:', tagName);
            break;
        }
      });

      console.log('parseHTML: Final parsed elements:', elements);
      const editorHeightAttr = bodyContent.getAttribute('data-editor-height');
      const editorHeight = editorHeightAttr ? parseInt(editorHeightAttr, 10) : undefined;
      return { elements, editorHeight };
    } catch (error) {
      console.error('Error parsing HTML:', error);
      return { elements: [] };
    }
  },

  extractYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  },

  generateTemplateHTML(templateId: string): string {
    const templates = {
      'landing': `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Willkommen - Landing Page</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;400&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Roboto', Arial, sans-serif; background: linear-gradient(135deg, #e0e7ff 0%, #fbc2eb 100%); color: #222; }
        .hero {
            background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 120px 20px 80px 20px;
            text-align: center;
            border-radius: 0 0 40px 40px;
            box-shadow: 0 8px 32px rgba(102,126,234,0.15);
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.2s both;
        }
        .hero h1 {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 3.2em;
            margin-bottom: 1rem;
            letter-spacing: -2px;
            animation: popIn 1.2s cubic-bezier(.77,0,.18,1) 0.4s both;
        }
        .hero p {
            font-size: 1.3em;
            margin-bottom: 2.5rem;
            opacity: 0.95;
        }
        .btn {
            background: linear-gradient(90deg, #ff6b6b 0%, #fbc2eb 100%);
            color: white;
            padding: 18px 38px;
            border: none;
            border-radius: 30px;
            font-size: 1.2em;
            font-family: 'Montserrat', Arial, sans-serif;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(251,194,235,0.15);
            transition: transform 0.2s, box-shadow 0.2s;
            animation: fadeInUp 1s cubic-bezier(.77,0,.18,1) 0.7s both;
        }
        .btn:hover {
            transform: scale(1.07) translateY(-2px);
            box-shadow: 0 8px 32px rgba(251,194,235,0.25);
        }
        .features {
            padding: 80px 20px 40px 20px;
            background: transparent;
        }
        .features h2 {
            text-align: center;
            margin-bottom: 3rem;
            font-size: 2.5em;
            font-family: 'Montserrat', Arial, sans-serif;
            color: #764ba2;
            letter-spacing: -1px;
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.6s both;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 2.5rem;
            max-width: 1100px;
            margin: 0 auto;
        }
        .feature {
            background: white;
            padding: 2.5rem 2rem;
            border-radius: 18px;
            box-shadow: 0 4px 24px rgba(102,126,234,0.08);
            text-align: center;
            transition: transform 0.2s, box-shadow 0.2s;
            font-size: 1.1em;
            animation: fadeInUp 1s cubic-bezier(.77,0,.18,1) both;
        }
        .feature:hover {
            transform: scale(1.04) translateY(-4px) rotate(-1deg);
            box-shadow: 0 8px 32px rgba(102,126,234,0.18);
        }
        .feature h3 {
            color: #667eea;
            margin-bottom: 1rem;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 1.3em;
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
            0% { opacity: 0; transform: scale(0.7); }
            80% { opacity: 1; transform: scale(1.08); }
            100% { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 700px) {
            .hero h1 { font-size: 2em; }
            .features h2 { font-size: 1.5em; }
        }
    </style>
</head>
<body>
    <section class="hero">
        <div class="container">
            <h1>Willkommen zur Zukunft</h1>
            <p>Entdecken Sie unsere innovative Lösung für Ihr Unternehmen</p>
            <button class="btn" onclick="alert('Mehr erfahren!')">Jetzt starten</button>
        </div>
    </section>
    <section class="features">
        <div class="container">
            <h2>Unsere Vorteile</h2>
            <div class="feature-grid">
                <div class="feature" style="animation-delay:0.1s"><h3>🚀 Schnell</h3><p>Blitzschnelle Performance für optimale Nutzererfahrung</p></div>
                <div class="feature" style="animation-delay:0.2s"><h3>🔒 Sicher</h3><p>Höchste Sicherheitsstandards für Ihre Daten</p></div>
                <div class="feature" style="animation-delay:0.3s"><h3>💡 Innovativ</h3><p>Modernste Technologien für beste Ergebnisse</p></div>
            </div>
        </div>
    </section>
</body>
</html>`,
      'business': `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ihr Unternehmen - Business Template</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;400&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Roboto', Arial, sans-serif; background: linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%); color: #222; }
        header {
            background: linear-gradient(90deg, #2c3e50 0%, #4b6cb7 100%);
            color: white;
            padding: 1.5rem 0 1rem 0;
            box-shadow: 0 4px 16px rgba(44,62,80,0.08);
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.2s both;
        }
        nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .logo { font-size: 2em; font-family: 'Montserrat', Arial, sans-serif; font-weight: bold; letter-spacing: -1px; }
        .nav-links { display: flex; list-style: none; gap: 2.2rem; }
        .nav-links a { color: white; text-decoration: none; font-size: 1.1em; font-family: 'Montserrat', Arial, sans-serif; transition: color 0.2s; }
        .nav-links a:hover { color: #fbc2eb; }
        .hero {
            background: linear-gradient(90deg, #34495e 0%, #667eea 100%);
            color: white;
            padding: 100px 20px 70px 20px;
            text-align: center;
            border-radius: 0 0 40px 40px;
            box-shadow: 0 8px 32px rgba(52,73,94,0.10);
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.4s both;
        }
        .hero h1 {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 2.8em;
            margin-bottom: 1rem;
            letter-spacing: -1px;
            animation: popIn 1.2s cubic-bezier(.77,0,.18,1) 0.6s both;
        }
        .services {
            padding: 80px 20px 40px 20px;
            background: transparent;
        }
        .services h2 {
            text-align: center;
            margin-bottom: 2.5rem;
            font-size: 2.2em;
            font-family: 'Montserrat', Arial, sans-serif;
            color: #4b6cb7;
            letter-spacing: -1px;
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.7s both;
        }
        .service-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 2.5rem;
            max-width: 1100px;
            margin: 0 auto;
        }
        .service {
            background: white;
            padding: 2.2rem 2rem;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(44,62,80,0.08);
            text-align: center;
            font-size: 1.1em;
            transition: transform 0.2s, box-shadow 0.2s;
            animation: fadeInUp 1s cubic-bezier(.77,0,.18,1) both;
        }
        .service:hover {
            transform: scale(1.04) translateY(-4px) rotate(-1deg);
            box-shadow: 0 8px 32px rgba(44,62,80,0.18);
        }
        .service h3 {
            color: #34495e;
            margin-bottom: 1rem;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 1.2em;
        }
        .contact {
            background: linear-gradient(90deg, #4b6cb7 0%, #182848 100%);
            color: white;
            padding: 70px 20px 60px 20px;
            text-align: center;
            border-radius: 30px;
            margin: 60px auto 0 auto;
            max-width: 900px;
            box-shadow: 0 4px 24px rgba(44,62,80,0.10);
            animation: fadeInUp 1s cubic-bezier(.77,0,.18,1) 1s both;
        }
        .btn {
            background: linear-gradient(90deg, #e74c3c 0%, #fbc2eb 100%);
            color: white;
            padding: 15px 34px;
            border: none;
            border-radius: 30px;
            font-size: 1.1em;
            font-family: 'Montserrat', Arial, sans-serif;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(231,76,60,0.15);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: scale(1.07) translateY(-2px);
            box-shadow: 0 8px 32px rgba(231,76,60,0.25);
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
            0% { opacity: 0; transform: scale(0.7); }
            80% { opacity: 1; transform: scale(1.08); }
            100% { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 700px) {
            .hero h1 { font-size: 1.5em; }
            .services h2 { font-size: 1.2em; }
        }
    </style>
</head>
<body>
    <header>
        <nav>
            <div class="logo">Ihr Unternehmen</div>
            <ul class="nav-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#contact">Kontakt</a></li>
            </ul>
        </nav>
    </header>
    <section class="hero">
        <div class="container">
            <h1>Professionelle Lösungen</h1>
            <p>Wir helfen Ihrem Unternehmen beim Wachstum</p>
        </div>
    </section>
    <section class="services">
        <div class="container">
            <h2>Unsere Services</h2>
            <div class="service-grid">
                <div class="service" style="animation-delay:0.1s"><h3>Beratung</h3><p>Strategische Unternehmensberatung für nachhaltiges Wachstum</p></div>
                <div class="service" style="animation-delay:0.2s"><h3>Entwicklung</h3><p>Maßgeschneiderte Softwarelösungen für Ihr Business</p></div>
                <div class="service" style="animation-delay:0.3s"><h3>Support</h3><p>24/7 Support für alle Ihre technischen Anfragen</p></div>
            </div>
        </div>
    </section>
    <section class="contact">
        <div class="container">
            <h2>Kontaktieren Sie uns</h2>
            <p>Bereit für den nächsten Schritt? Lassen Sie uns sprechen!</p>
            <button class="btn" onclick="alert('Kontakt aufnehmen!')">Jetzt Kontakt</button>
        </div>
    </section>
</body>
</html>`,
      'portfolio': `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mein Portfolio</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;400&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Roboto', Arial, sans-serif; background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); color: #222; }
        .hero {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            padding: 110px 20px 80px 20px;
            text-align: center;
            border-radius: 0 0 40px 40px;
            box-shadow: 0 8px 32px rgba(255,107,107,0.10);
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.2s both;
        }
        .hero h1 {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 3em;
            margin-bottom: 1rem;
            letter-spacing: -2px;
            animation: popIn 1.2s cubic-bezier(.77,0,.18,1) 0.4s both;
        }
        .hero p {
            font-size: 1.2em;
            opacity: 0.95;
        }
        .about {
            padding: 80px 20px 40px 20px;
            background: #fff;
        }
        .about-content {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 3rem;
            align-items: center;
            max-width: 1000px;
            margin: 0 auto;
        }
        .profile-img {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: linear-gradient(135deg, #a6c1ee 0%, #fbc2eb 100%);
            box-shadow: 0 4px 24px rgba(166,193,238,0.15);
            margin: 0 auto;
            animation: fadeInUp 1s cubic-bezier(.77,0,.18,1) 0.5s both;
        }
        .about-content h2 {
            font-family: 'Montserrat', Arial, sans-serif;
            color: #ff6b6b;
            margin-bottom: 1rem;
        }
        .projects {
            padding: 80px 20px 40px 20px;
            background: transparent;
        }
        .projects h2 {
            text-align: center;
            margin-bottom: 2.5rem;
            font-size: 2em;
            font-family: 'Montserrat', Arial, sans-serif;
            color: #4ecdc4;
            letter-spacing: -1px;
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.7s both;
        }
        .project-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 2.5rem;
            max-width: 1100px;
            margin: 0 auto;
        }
        .project {
            background: white;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(255,107,107,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
            animation: fadeInUp 1s cubic-bezier(.77,0,.18,1) both;
        }
        .project:hover {
            transform: scale(1.04) translateY(-4px) rotate(-1deg);
            box-shadow: 0 8px 32px rgba(255,107,107,0.18);
        }
        .project-img {
            height: 200px;
            background: linear-gradient(45deg, #a6c1ee, #fbc2eb);
        }
        .project-content {
            padding: 1.5rem;
        }
        .skills {
            background: #2c3e50;
            color: white;
            padding: 60px 20px;
            text-align: center;
        }
        .skill-list {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-top: 2rem;
            flex-wrap: wrap;
        }
        .skill {
            background: #34495e;
            padding: 10px 20px;
            border-radius: 20px;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 1em;
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
            0% { opacity: 0; transform: scale(0.7); }
            80% { opacity: 1; transform: scale(1.08); }
            100% { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 900px) {
            .about-content { grid-template-columns: 1fr; gap: 2rem; }
        }
        @media (max-width: 700px) {
            .hero h1 { font-size: 1.5em; }
            .projects h2 { font-size: 1.2em; }
        }
    </style>
</head>
<body>
    <section class="hero">
        <div class="container">
            <h1>Max Mustermann</h1>
            <p>Webentwickler & Designer</p>
        </div>
    </section>
    <section class="about">
        <div class="container">
            <div class="about-content">
                <div class="profile-img"></div>
                <div>
                    <h2>Über mich</h2>
                    <p>Ich bin ein leidenschaftlicher Webentwickler mit über 5 Jahren Erfahrung in der Entwicklung moderner Webanwendungen. Meine Spezialität liegt in der Verbindung von ansprechendem Design und funktionaler Programmierung.</p>
                </div>
            </div>
        </div>
    </section>
    <section class="projects">
        <div class="container">
            <h2>Meine Projekte</h2>
            <div class="project-grid">
                <div class="project"><div class="project-img"></div><div class="project-content"><h3>E-Commerce Platform</h3><p>Vollständige Online-Shop-Lösung mit React und Node.js</p></div></div>
                <div class="project"><div class="project-img"></div><div class="project-content"><h3>Mobile App Design</h3><p>UI/UX Design für eine innovative Fitness-App</p></div></div>
                <div class="project"><div class="project-img"></div><div class="project-content"><h3>Corporate Website</h3><p>Responsive Unternehmenswebsite mit CMS</p></div></div>
            </div>
        </div>
    </section>
    <section class="skills">
        <div class="container">
            <h2>Meine Skills</h2>
            <div class="skill-list">
                <div class="skill">JavaScript</div>
                <div class="skill">React</div>
                <div class="skill">Node.js</div>
                <div class="skill">CSS/SASS</div>
                <div class="skill">MongoDB</div>
                <div class="skill">UI/UX Design</div>
            </div>
        </div>
    </section>
</body>
</html>`,
      'shop': `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Shop</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;400&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Roboto', Arial, sans-serif; background: linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%); color: #222; }
        header {
            background: #fff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.08);
            padding: 1.5rem 0 1rem 0;
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.2s both;
        }
        nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .logo { font-size: 2em; font-family: 'Montserrat', Arial, sans-serif; font-weight: bold; color: #e74c3c; letter-spacing: -1px; }
        .nav-links { display: flex; list-style: none; gap: 2.2rem; }
        .nav-links a { color: #333; text-decoration: none; font-size: 1.1em; font-family: 'Montserrat', Arial, sans-serif; transition: color 0.2s; }
        .nav-links a:hover { color: #e74c3c; }
        .hero {
            background: #f8f9fa;
            padding: 80px 20px 60px 20px;
            text-align: center;
            border-radius: 0 0 40px 40px;
            box-shadow: 0 8px 32px rgba(231,76,60,0.10);
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.4s both;
        }
        .hero h1 {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 2.5em;
            margin-bottom: 1rem;
            color: #2c3e50;
            letter-spacing: -1px;
            animation: popIn 1.2s cubic-bezier(.77,0,.18,1) 0.6s both;
        }
        .products {
            padding: 80px 20px 40px 20px;
            background: transparent;
        }
        .products h2 {
            text-align: center;
            margin-bottom: 2.5rem;
            font-size: 2em;
            font-family: 'Montserrat', Arial, sans-serif;
            color: #e74c3c;
            letter-spacing: -1px;
            animation: fadeInDown 1s cubic-bezier(.77,0,.18,1) 0.7s both;
        }
        .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 2.5rem;
            max-width: 1100px;
            margin: 0 auto;
        }
        .product {
            background: white;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(231,76,60,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
            animation: fadeInUp 1s cubic-bezier(.77,0,.18,1) both;
        }
        .product:hover {
            transform: scale(1.04) translateY(-4px) rotate(-1deg);
            box-shadow: 0 8px 32px rgba(231,76,60,0.18);
        }
        .product-img {
            height: 200px;
            background: linear-gradient(45deg, #3498db, #2ecc71);
        }
        .product-content {
            padding: 1.5rem;
        }
        .product h3 {
            margin-bottom: 0.5rem;
            font-family: 'Montserrat', Arial, sans-serif;
        }
        .price {
            font-size: 1.2em;
            font-weight: bold;
            color: #e74c3c;
            margin: 0.5rem 0;
        }
        .btn {
            background: linear-gradient(90deg, #e74c3c 0%, #fbc2eb 100%);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 30px;
            font-size: 1.1em;
            font-family: 'Montserrat', Arial, sans-serif;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(231,76,60,0.15);
            transition: transform 0.2s, box-shadow 0.2s;
            width: 100%;
        }
        .btn:hover {
            transform: scale(1.07) translateY(-2px);
            box-shadow: 0 8px 32px rgba(231,76,60,0.25);
        }
        .features {
            background: #2c3e50;
            color: white;
            padding: 60px 20px;
            text-align: center;
        }
        .feature-list {
            display: flex;
            justify-content: center;
            gap: 3rem;
            margin-top: 2rem;
            flex-wrap: wrap;
        }
        .feature-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .feature-icon {
            font-size: 2em;
            margin-bottom: 1rem;
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
            0% { opacity: 0; transform: scale(0.7); }
            80% { opacity: 1; transform: scale(1.08); }
            100% { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 700px) {
            .hero h1 { font-size: 1.5em; }
            .products h2 { font-size: 1.2em; }
        }
    </style>
</head>
<body>
    <header>
        <nav>
            <div class="logo">ShopName</div>
            <ul class="nav-links">
                <li><a href="#products">Produkte</a></li>
                <li><a href="#about">Über uns</a></li>
                <li><a href="#contact">Kontakt</a></li>
                <li><a href="#cart">🛒 Warenkorb</a></li>
            </ul>
        </nav>
    </header>
    <section class="hero">
        <div class="container">
            <h1>Willkommen in unserem Shop</h1>
            <p>Entdecken Sie unsere hochwertigen Produkte zu unschlagbaren Preisen</p>
        </div>
    </section>
    <section class="products">
        <div class="container">
            <h2>Unsere Bestseller</h2>
            <div class="product-grid">
                <div class="product"><div class="product-img"></div><div class="product-content"><h3>Premium Produkt 1</h3><p>Hochwertige Qualität für den täglichen Gebrauch</p><div class="price">€49,99</div><button class="btn" onclick="alert('Produkt zum Warenkorb hinzugefügt!')">In den Warenkorb</button></div></div>
                <div class="product"><div class="product-img"></div><div class="product-content"><h3>Bestseller Artikel</h3><p>Unser meistverkauftes Produkt mit Top-Bewertungen</p><div class="price">€79,99</div><button class="btn" onclick="alert('Produkt zum Warenkorb hinzugefügt!')">In den Warenkorb</button></div></div>
                <div class="product"><div class="product-img"></div><div class="product-content"><h3>Limitierte Edition</h3><p>Exklusives Design in begrenzter Auflage</p><div class="price">€129,99</div><button class="btn" onclick="alert('Produkt zum Warenkorb hinzugefügt!')">In den Warenkorb</button></div></div>
                <div class="product"><div class="product-img"></div><div class="product-content"><h3>Eco-Friendly Option</h3><p>Nachhaltig produziert für umweltbewusste Kunden</p><div class="price">€39,99</div><button class="btn" onclick="alert('Produkt zum Warenkorb hinzugefügt!')">In den Warenkorb</button></div></div>
            </div>
        </div>
    </section>
    <section class="features">
        <div class="container">
            <h2>Warum bei uns kaufen?</h2>
            <div class="feature-list">
                <div class="feature-item"><div class="feature-icon">🚚</div><h3>Kostenloser Versand</h3><p>Ab 50€ Bestellwert</p></div>
                <div class="feature-item"><div class="feature-icon">🔒</div><h3>Sicher bezahlen</h3><p>SSL-verschlüsselt</p></div>
                <div class="feature-item"><div class="feature-icon">↩️</div><h3>30 Tage Rückgabe</h3><p>Ohne Wenn und Aber</p></div>
                <div class="feature-item"><div class="feature-icon">⭐</div><h3>Top Bewertungen</h3><p>4.8/5 Sterne</p></div>
            </div>
        </div>
    </section>
</body>
</html>`,
      'blank': `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neue Website</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;400&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Roboto', Arial, sans-serif;
            margin: 0;
            padding: 40px 20px;
            background: linear-gradient(135deg, #e0e7ff 0%, #fbc2eb 100%);
            color: #333333;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            box-shadow: 0 8px 32px rgba(102,126,234,0.10);
            padding: 48px 32px;
            text-align: center;
            animation: fadeInUp 1s cubic-bezier(.77,0,.18,1) 0.2s both;
        }
        h1 {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 2.2em;
            margin-bottom: 1rem;
            color: #667eea;
            letter-spacing: -1px;
        }
        p {
            font-size: 1.1em;
            color: #555;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Willkommen auf Ihrer neuen Website!</h1>
        <p>Beginnen Sie hier mit der Gestaltung Ihrer Website.</p>
    </div>
</body>
</html>`
    };

    const template = templates[templateId as keyof typeof templates];
    return template ? this.base64EncodeUnicode(template) : this.base64EncodeUnicode(templates.blank);
  },

  // Test function to verify parsing works
  testParseHTML() {
    const testHtmlContent = "CjwhRE9DVFlQRSBodG1sPgo8aHRtbCBsYW5nPSJkZSI+CjxoZWFkPgogICAgPG1ldGEgY2hhcnNldD0iVVRGLTgiPgogICAgPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAiPgogICAgPHRpdGxlPk1laW5lIFdlYnNpdGU8L3RpdGxlPgogICAgPHN0eWxlPgogICAgICAgIGJvZHkgewogICAgICAgICAgICBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7CiAgICAgICAgICAgIG1hcmdpbjogMDsKICAgICAgICAgICAgcGFkZGluZzogMjBweDsKICAgICAgICAgICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZC1jb2xvciAwLjNzLCBjb2xvciAwLjNzOwogICAgICAgIH0KICAgICAgICAuZGFyay1tb2RlIHsKICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzFhMWExYTsKICAgICAgICAgICAgY29sb3I6ICNmZmZmZmY7CiAgICAgICAgfQogICAgICAgIC50b3BiYXIgewogICAgICAgICAgICBkaXNwbGF5OiBmbGV4OwogICAgICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47CiAgICAgICAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgICAgICAgICAgIHBhZGRpbmc6IDFyZW07CiAgICAgICAgICAgIGJhY2tncm91bmQ6ICNmOGY5ZmE7CiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDhweDsKICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMXJlbTsKICAgICAgICB9CiAgICAgICAgLmRhcmstbW9kZSAudG9wYmFyIHsKICAgICAgICAgICAgYmFja2dyb3VuZDogIzJkMmQyZDsKICAgICAgICB9CiAgICAgICAgLnRvcGJhci1idXR0b25zIHsKICAgICAgICAgICAgZGlzcGxheTogZmxleDsKICAgICAgICAgICAgZ2FwOiAwLjVyZW07CiAgICAgICAgfQogICAgICAgIC55b3V0dWJlLWNvbnRhaW5lciB7CiAgICAgICAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsKICAgICAgICAgICAgd2lkdGg6IDEwMCU7CiAgICAgICAgICAgIGhlaWdodDogMDsKICAgICAgICAgICAgcGFkZGluZy1ib3R0b206IDU2LjI1JTsKICAgICAgICAgICAgbWFyZ2luOiAxcmVtIDA7CiAgICAgICAgfQogICAgICAgIC55b3V0dWJlLWNvbnRhaW5lciBpZnJhbWUgewogICAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7CiAgICAgICAgICAgIHRvcDogMDsKICAgICAgICAgICAgbGVmdDogMDsKICAgICAgICAgICAgd2lkdGg6IDEwMCU7CiAgICAgICAgICAgIGhlaWdodDogMTAwJTsKICAgICAgICB9CiAgICAgICAgYnV0dG9uIHsKICAgICAgICAgICAgcGFkZGluZzogOHB4IDE2cHg7CiAgICAgICAgICAgIGJvcmRlcjogbm9uZTsKICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4OwogICAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDsKICAgICAgICB9CiAgICAgICAgaW5wdXQgewogICAgICAgICAgICBwYWRkaW5nOiA4cHg7CiAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNjY2M7CiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDRweDsKICAgICAgICAgICAgbWFyZ2luOiA0cHggMDsKICAgICAgICB9CiAgICAgICAgLmRhcmstbW9kZSBpbnB1dCB7CiAgICAgICAgICAgIGJhY2tncm91bmQ6ICMzMzM7CiAgICAgICAgICAgIGNvbG9yOiB3aGl0ZTsKICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiAjNTU1OwogICAgICAgIH0KICAgICAgICBhIHsKICAgICAgICAgICAgY29sb3I6IGluaGVyaXQ7CiAgICAgICAgICAgIHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lOwogICAgICAgIH0KICAgICAgICAuZGFyay1tb2RlIGEgewogICAgICAgICAgICBjb2xvcjogIzZjYjZmZjsKICAgICAgICB9CiAgICA8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5PgogICAgPHNjcmlwdD4KICAgICAgICBmdW5jdGlvbiB0b2dnbGVEYXJrTW9kZSgpIHsKICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKCdkYXJrLW1vZGUnKTsKICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2RhcmtNb2RlJywgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ2RhcmstbW9kZScpKTsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLy8gTG9hZCBkYXJrIG1vZGUgcHJlZmVyZW5jZQogICAgICAgIGlmIChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZGFya01vZGUnKSA9PT0gJ3RydWUnKSB7CiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgnZGFyay1tb2RlJyk7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIGZ1bmN0aW9uIGdldFlvdVR1YmVWaWRlb0lkKHVybCkgewogICAgICAgICAgICBjb25zdCByZWdleCA9IC8oPzp5b3V0dWJlLmNvbS93YXRjaD92PXx5b3V0dS5iZS8pKFteJGo/I10rKS87CiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gdXJsLm1hdGNoKHJlZ2V4KTsKICAgICAgICAgICAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiBudWxsOwogICAgICAgIH0KICAgIDwvc2NyaXB0PgogICAgPHAgc3R5bGU9ImNvbG9yOiAjMzMzMzMzOyBmb250LXNpemU6IDE2cHg7Ij5IYWxsbywgaWNoIGJpbiBlczwvcD4KCjwvYm9keT4KPC9odG1sPg==";
    
    console.log('=== TESTING PARSE HTML ===');
    const result = this.parseHTML(testHtmlContent);
    console.log('Test result:', result);
    console.log('=== END TEST ===');
    return result;
  },

  /**
   * Generate editor-native elementsJson for a given templateId.
   * Each template showcases free movement, scaling, custom fonts, and animations.
   */
  generateTemplateElementsJson(templateId: string): any[] {
    switch (templateId) {
      case 'landing':
        return [
          {
            id: '1',
            type: 'text',
            content: 'Willkommen zur Zukunft',
            color: '#fff',
            fontSize: 40,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 20,
            y: 10,
            animation: 'fade-in',
            animationSpeed: 'normal',
            animationDirection: 'up',
          },
          {
            id: '2',
            type: 'text',
            content: 'Entdecken Sie unsere innovative Lösung für Ihr Unternehmen',
            color: '#fff',
            fontSize: 20,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 20,
            y: 18,
            animation: 'fade-in',
            animationSpeed: 'normal',
            animationDirection: 'up',
          },
          {
            id: '3',
            type: 'button',
            text: 'Jetzt starten',
            backgroundColor: '#ff6b6b',
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 20,
            y: 25,
            animation: 'bounce',
            animationSpeed: 'fast',
            animationDirection: 'up',
            customJS: "alert('Mehr erfahren!')"
          },
          {
            id: '4',
            type: 'text',
            content: 'Unsere Vorteile',
            color: '#764ba2',
            fontSize: 28,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 10,
            y: 40,
            animation: 'fade-in',
            animationSpeed: 'normal',
            animationDirection: 'left',
          },
          {
            id: '5',
            type: 'text',
            content: '🚀 Schnell: Blitzschnelle Performance für optimale Nutzererfahrung',
            color: '#333',
            fontSize: 18,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 48,
            animation: 'slide-in',
            animationSpeed: 'normal',
            animationDirection: 'left',
          },
          {
            id: '6',
            type: 'text',
            content: '🔒 Sicher: Höchste Sicherheitsstandards für Ihre Daten',
            color: '#333',
            fontSize: 18,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 54,
            animation: 'slide-in',
            animationSpeed: 'normal',
            animationDirection: 'left',
          },
          {
            id: '7',
            type: 'text',
            content: '💡 Innovativ: Modernste Technologien für beste Ergebnisse',
            color: '#333',
            fontSize: 18,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 60,
            animation: 'slide-in',
            animationSpeed: 'normal',
            animationDirection: 'left',
          },
        ];
      case 'business':
        return [
          {
            id: '1',
            type: 'topbar',
            label: 'Ihr Unternehmen',
            buttons: [
              { text: 'Home', backgroundColor: '#4b6cb7' },
              { text: 'Services', backgroundColor: '#4b6cb7' },
              { text: 'Kontakt', backgroundColor: '#4b6cb7' },
            ],
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 0,
            y: 0,
            animation: 'fade-in',
          },
          {
            id: '2',
            type: 'text',
            content: 'Professionelle Lösungen',
            color: '#fff',
            fontSize: 36,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 20,
            y: 12,
            animation: 'fade-in',
          },
          {
            id: '3',
            type: 'text',
            content: 'Wir helfen Ihrem Unternehmen beim Wachstum',
            color: '#fff',
            fontSize: 20,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 20,
            y: 18,
            animation: 'fade-in',
          },
          {
            id: '4',
            type: 'text',
            content: 'Unsere Services',
            color: '#4b6cb7',
            fontSize: 28,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 10,
            y: 35,
            animation: 'fade-in',
          },
          {
            id: '5',
            type: 'text',
            content: 'Beratung: Strategische Unternehmensberatung für nachhaltiges Wachstum',
            color: '#333',
            fontSize: 18,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 43,
            animation: 'slide-in',
          },
          {
            id: '6',
            type: 'text',
            content: 'Entwicklung: Maßgeschneiderte Softwarelösungen für Ihr Business',
            color: '#333',
            fontSize: 18,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 49,
            animation: 'slide-in',
          },
          {
            id: '7',
            type: 'text',
            content: 'Support: 24/7 Support für alle Ihre technischen Anfragen',
            color: '#333',
            fontSize: 18,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 55,
            animation: 'slide-in',
          },
          {
            id: '8',
            type: 'button',
            text: 'Jetzt Kontakt',
            backgroundColor: '#e74c3c',
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 20,
            y: 65,
            animation: 'bounce',
            customJS: "alert('Kontakt aufnehmen!')"
          },
        ];
      case 'portfolio':
        return [
          {
            id: '1',
            type: 'text',
            content: 'Max Mustermann',
            color: '#fff',
            fontSize: 36,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 20,
            y: 10,
            animation: 'fade-in',
          },
          {
            id: '2',
            type: 'text',
            content: 'Webentwickler & Designer',
            color: '#fff',
            fontSize: 20,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 20,
            y: 16,
            animation: 'fade-in',
          },
          {
            id: '3',
            type: 'image',
            src: '/placeholder.svg',
            alt: 'Profilbild',
            x: 10,
            y: 25,
            widthPx: 120,
            heightPx: 120,
            animation: 'zoom-in',
          },
          {
            id: '4',
            type: 'text',
            content: 'Über mich',
            color: '#ff6b6b',
            fontSize: 28,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 30,
            y: 25,
            animation: 'fade-in',
          },
          {
            id: '5',
            type: 'text',
            content: 'Ich bin ein leidenschaftlicher Webentwickler mit über 5 Jahren Erfahrung in der Entwicklung moderner Webanwendungen. Meine Spezialität liegt in der Verbindung von ansprechendem Design und funktionaler Programmierung.',
            color: '#333',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 30,
            y: 30,
            animation: 'fade-in',
          },
          {
            id: '6',
            type: 'text',
            content: 'Meine Projekte',
            color: '#4ecdc4',
            fontSize: 24,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 10,
            y: 50,
            animation: 'fade-in',
          },
          {
            id: '7',
            type: 'text',
            content: 'E-Commerce Platform: Vollständige Online-Shop-Lösung mit React und Node.js',
            color: '#333',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 56,
            animation: 'slide-in',
          },
          {
            id: '8',
            type: 'text',
            content: 'Mobile App Design: UI/UX Design für eine innovative Fitness-App',
            color: '#333',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 60,
            animation: 'slide-in',
          },
          {
            id: '9',
            type: 'text',
            content: 'Corporate Website: Responsive Unternehmenswebsite mit CMS',
            color: '#333',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 64,
            animation: 'slide-in',
          },
          {
            id: '10',
            type: 'text',
            content: 'Meine Skills',
            color: '#2c3e50',
            fontSize: 24,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 10,
            y: 75,
            animation: 'fade-in',
          },
          {
            id: '11',
            type: 'text',
            content: 'JavaScript, React, Node.js, CSS/SASS, MongoDB, UI/UX Design',
            color: '#fff',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 80,
            animation: 'fade-in',
          },
        ];
      case 'shop':
        return [
          {
            id: '1',
            type: 'topbar',
            label: 'ShopName',
            buttons: [
              { text: 'Produkte', backgroundColor: '#e74c3c' },
              { text: 'Über uns', backgroundColor: '#e74c3c' },
              { text: 'Kontakt', backgroundColor: '#e74c3c' },
              { text: '🛒 Warenkorb', backgroundColor: '#e74c3c' },
            ],
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 0,
            y: 0,
            animation: 'fade-in',
          },
          {
            id: '2',
            type: 'text',
            content: 'Willkommen in unserem Shop',
            color: '#2c3e50',
            fontSize: 32,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 20,
            y: 12,
            animation: 'fade-in',
          },
          {
            id: '3',
            type: 'text',
            content: 'Entdecken Sie unsere hochwertigen Produkte zu unschlagbaren Preisen',
            color: '#333',
            fontSize: 18,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 20,
            y: 18,
            animation: 'fade-in',
          },
          {
            id: '4',
            type: 'text',
            content: 'Unsere Bestseller',
            color: '#e74c3c',
            fontSize: 24,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 10,
            y: 35,
            animation: 'fade-in',
          },
          {
            id: '5',
            type: 'text',
            content: 'Premium Produkt 1: Hochwertige Qualität für den täglichen Gebrauch',
            color: '#333',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 43,
            animation: 'slide-in',
          },
          {
            id: '6',
            type: 'text',
            content: 'Bestseller Artikel: Unser meistverkauftes Produkt mit Top-Bewertungen',
            color: '#333',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 47,
            animation: 'slide-in',
          },
          {
            id: '7',
            type: 'text',
            content: 'Limitierte Edition: Exklusives Design in begrenzter Auflage',
            color: '#333',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 51,
            animation: 'slide-in',
          },
          {
            id: '8',
            type: 'text',
            content: 'Eco-Friendly Option: Nachhaltig produziert für umweltbewusste Kunden',
            color: '#333',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 55,
            animation: 'slide-in',
          },
          {
            id: '9',
            type: 'text',
            content: 'Warum bei uns kaufen?',
            color: '#2c3e50',
            fontSize: 22,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 10,
            y: 65,
            animation: 'fade-in',
          },
          {
            id: '10',
            type: 'text',
            content: '🚚 Kostenloser Versand ab 50€ | 🔒 Sicher bezahlen | ↩️ 30 Tage Rückgabe | ⭐ Top Bewertungen',
            color: '#333',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 10,
            y: 70,
            animation: 'fade-in',
          },
        ];
      case 'blank':
      default:
        return [
          {
            id: '1',
            type: 'text',
            content: 'Willkommen auf Ihrer neuen Website!',
            color: '#667eea',
            fontSize: 28,
            fontFamily: 'Montserrat, Arial, sans-serif',
            x: 20,
            y: 20,
            animation: 'fade-in',
          },
          {
            id: '2',
            type: 'text',
            content: 'Beginnen Sie hier mit der Gestaltung Ihrer Website.',
            color: '#555',
            fontSize: 16,
            fontFamily: 'Roboto, Arial, sans-serif',
            x: 20,
            y: 28,
            animation: 'fade-in',
          },
        ];
    }
  },

  async unpublishWebsite(id: string, instant: boolean = true): Promise<void> {
    await websiteService.updateWebsite(id, { isPublished: false, pendingUnpublishAt: null, unpublishDelayActive: false });
  },

  async scheduleUnpublish(id: string, delayMs?: number): Promise<void> {
    // No-op: instant unpublish only
    await websiteService.updateWebsite(id, { isPublished: false, pendingUnpublishAt: null, unpublishDelayActive: false });
  },

  async undoUnpublish(id: string, userId: string): Promise<void> {
    // Deduct 1 token for undo
    const success = await userService.deductTokens(userId, 1, 'Undo unpublish', id);
    if (!success) throw new Error('Nicht genügend Tokens für Undo.');
    await websiteService.updateWebsite(id, { pendingUnpublishAt: null, unpublishDelayActive: false });
  },

  async renameWebsite(id: string, newName: string, userId: string): Promise<void> {
    // Deduct 1 token for rename
    const success = await userService.deductTokens(userId, 1, 'Rename website', id);
    if (!success) throw new Error('Nicht genügend Tokens für Umbenennen.');
    await websiteService.updateWebsite(id, { name: newName });
  },
};

/**
 * Upload a published website to the community marketplace.
 * Only published sites can be uploaded. Must be owned by the author.
 * Defaults: price=0 (free), stock=null (unlimited), soldCount=0, favorites=[], published=true, removed=false
 */
export async function uploadToCommunityMarketplace({
  websiteId,
  authorId,
  name,
  price = 0,
  stock = null,
  tags = [],
  description = '',
  authorName = '',
  authorAvatar = '',
  preview = ''
}: {
  websiteId: string;
  authorId: string;
  name: string;
  price?: number;
  stock?: number|null;
  tags?: string[];
  description?: string;
  authorName?: string;
  authorAvatar?: string;
  preview?: string;
}) {
  // 1. Fetch website and validate
  const website = await websiteService.getWebsite(websiteId);
  if (!website) throw new Error('Website not found');
  if (!website.isPublished) throw new Error('Website must be published to upload');
  if (website.userId !== authorId) throw new Error('You do not own this website');

  // 2. Prepare document
  const now = Timestamp.now();
  const docData = {
    websiteId,
    authorId,
    name,
    price,
    stock,
    tags,
    description,
    soldCount: 0,
    favorites: [],
    preview,
    published: true,
    createdAt: now,
    updatedAt: now,
    removed: false,
    authorName,
    authorAvatar
  };

  // 3. Add to communitymarketplace collection
  const communityRef = collection(db, 'communitymarketplace');
  await addDoc(communityRef, docData);
}

/**
 * Buy or use a template from the community marketplace.
 * Decrements stock, increments soldCount, transfers tokens to seller, prevents buying if out of stock.
 * Returns the updated template document.
 */
export async function buyCommunityTemplate({ templateId, buyerId }: { templateId: string, buyerId: string }) {
  const templateRef = doc(db, 'communitymarketplace', templateId);
  const templateSnap = await getDoc(templateRef);
  if (!templateSnap.exists()) throw new Error('Template not found');
  const template = templateSnap.data();
  if (!template.published || template.removed) throw new Error('Template not available');
  if (template.stock !== null && template.stock <= 0) throw new Error('Out of stock');
  if (buyerId === template.authorId) throw new Error('Cannot buy your own template');

  // Deduct tokens from buyer if price > 0
  if (template.price > 0) {
    const ok = await userService.deductTokens(buyerId, template.price, 'Buy community template');
    if (!ok) throw new Error('Not enough tokens');
    await userService.addTokens(template.authorId, template.price, 'Template sold');
  }

  // Decrement stock if not unlimited
  let newStock = template.stock;
  if (template.stock !== null) newStock = template.stock - 1;

  // Increment soldCount
  const newSold = (template.soldCount || 0) + 1;

  await updateDoc(templateRef, { stock: newStock, soldCount: newSold });
  return { ...template, stock: newStock, soldCount: newSold };
}

/**
 * Favorite or unfavorite a template for a user.
 * If already favorited, unfavorite. Otherwise, favorite.
 */
export async function toggleFavoriteCommunityTemplate({ templateId, userId }: { templateId: string, userId: string }) {
  const templateRef = doc(db, 'communitymarketplace', templateId);
  const templateSnap = await getDoc(templateRef);
  if (!templateSnap.exists()) throw new Error('Template not found');
  const template = templateSnap.data();
  let favorites = template.favorites || [];
  if (favorites.includes(userId)) {
    favorites = favorites.filter((id: string) => id !== userId);
  } else {
    favorites.push(userId);
  }
  await updateDoc(templateRef, { favorites });
  return favorites;
}

/**
 * Remove a template from the marketplace (mark as removed, costs 5 tokens, only by author).
 */
export async function removeCommunityTemplate({ templateId, authorId }: { templateId: string, authorId: string }) {
  const templateRef = doc(db, 'communitymarketplace', templateId);
  const templateSnap = await getDoc(templateRef);
  if (!templateSnap.exists()) throw new Error('Template not found');
  const template = templateSnap.data();
  if (template.authorId !== authorId) throw new Error('Not your template');
  if (template.removed) throw new Error('Already removed');
  // Deduct 5 tokens as work fee
  const ok = await userService.deductTokens(authorId, 5, 'Remove template from marketplace');
  if (!ok) throw new Error('Not enough tokens');
  await updateDoc(templateRef, { removed: true, published: false });
}

/**
 * Edit a marketplace listing (price, stock, tags, description, name; only by author).
 */
export async function editCommunityTemplate({ templateId, authorId, updates }: { templateId: string, authorId: string, updates: Partial<{ price: number, stock: number|null, tags: string[], description: string, name: string }> }) {
  const templateRef = doc(db, 'communitymarketplace', templateId);
  const templateSnap = await getDoc(templateRef);
  if (!templateSnap.exists()) throw new Error('Template not found');
  const template = templateSnap.data();
  if (template.authorId !== authorId) throw new Error('Not your template');
  await updateDoc(templateRef, { ...updates, updatedAt: Timestamp.now() });
}

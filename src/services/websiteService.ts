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
}

export const websiteService = {
  async createWebsite(websiteData: Omit<Website, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Deduct 2 tokens for creating a website
    const success = await userService.deductTokens(websiteData.userId, 2);
    if (!success) {
      throw new Error('Nicht genügend Tokens');
    }

    const now = new Date();
    const docRef = await addDoc(collection(db, 'websites'), {
      ...websiteData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    
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
      // Refund 50% of tokens (1 token for creating)
      await userService.addTokens(website.userId, 1);
      
      // Delete DNS entry if it exists
      const customPath = await this.getCustomPathForWebsite(id);
      if (customPath) {
        const dnsDocRef = doc(db, 'userdns', customPath);
        await deleteDoc(dnsDocRef);
        console.log('Deleted DNS entry for custom path:', customPath);
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

    // Check if custom path already exists in userdns collection
    const dnsDocRef = doc(db, 'userdns', customPath);
    const dnsDoc = await getDoc(dnsDocRef);
    
    if (dnsDoc.exists()) {
      throw new Error('Custom Path bereits vergeben');
    }

    // Deduct 5 tokens for custom path
    const success = await userService.deductTokens(website.userId, 5);
    if (!success) {
      throw new Error('Nicht genügend Tokens für Custom Path');
    }

    // Create DNS entry
    await setDoc(dnsDocRef, {
      websiteId: websiteId,
      userId: website.userId,
      createdAt: Timestamp.fromDate(new Date())
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

  generateHTML(elements: any[]): string {
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
            padding: 20px;
            transition: background-color 0.3s, color 0.3s;
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
            const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
            const match = url.match(regex);
            return match ? match[1] : null;
        }
    </script>
`;

    elements.forEach(element => {
      switch (element.type) {
        case 'text':
          html += `    <p style="color: ${element.color}; font-size: ${element.fontSize}px;">${element.content || 'Text'}</p>\n`;
          break;
        case 'button':
          const buttonJS = element.customJS ? element.customJS : 'alert("Button geklickt!")';
          html += `    <button style="background-color: ${element.backgroundColor}; color: white;" onclick="${buttonJS}">${element.text || 'Button'}</button>\n`;
          break;
        case 'image':
          html += `    <img src="${element.src || '/placeholder.svg'}" alt="${element.alt || 'Bild'}" style="max-width: 100%; height: auto; border-radius: 4px;">\n`;
          break;
        case 'input':
          html += `    <input type="text" placeholder="${element.placeholder || 'Eingabe...'}" style="width: 100%;">\n`;
          break;
        case 'link-text':
          html += `    <p><a href="${element.url || '#'}" style="color: ${element.color}; font-size: ${element.fontSize}px;" target="_blank">${element.text || 'Link Text'}</a></p>\n`;
          break;
        case 'youtube':
          const videoId = element.url ? this.extractYouTubeVideoId(element.url) : null;
          if (videoId) {
            html += `    <div class="youtube-container">
        <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
    </div>\n`;
          } else {
            html += `    <div style="background: #f0f0f0; padding: 2rem; text-align: center; border-radius: 4px;">
        <p>YouTube Video nicht verfügbar</p>
        <p style="font-size: 12px; color: #666;">${element.url || 'Keine URL'}</p>
    </div>\n`;
          }
          break;
        case 'dark-toggle':
          html += `    <button onclick="toggleDarkMode()" style="background-color: #333; color: white;">🌙 Dark Mode</button>\n`;
          break;
        case 'topbar':
          html += `    <div class="topbar">
        <span style="font-weight: bold;">${element.label || 'Navigation'}</span>
        <div class="topbar-buttons">`;
          (element.buttons || []).forEach(btn => {
            const btnJS = btn.customJS || 'alert("Button geklickt!")';
            html += `            <button style="background-color: ${btn.backgroundColor}; color: white;" onclick="${btnJS}">${btn.text}</button>\n`;
          });
          html += `        </div>
    </div>\n`;
          break;
      }
    });

    html += `
</body>
</html>`;

    return btoa(html);
  },

  parseHTML(htmlContent: string): any[] {
    console.log('parseHTML: Starting to parse HTML content');
    if (!htmlContent) {
      console.log('parseHTML: No htmlContent provided, returning empty array');
      return [];
    }
    
    try {
      const decodedHtml = atob(htmlContent);
      console.log('parseHTML: Decoded HTML length:', decodedHtml.length);
      console.log('parseHTML: First 200 chars of decoded HTML:', decodedHtml.substring(0, 200));
      
      // Use DOMParser to properly parse the HTML document
      const parser = new DOMParser();
      const doc = parser.parseFromString(decodedHtml, 'text/html');
      const bodyContent = doc.body;
      
      if (!bodyContent) {
        console.log('parseHTML: No body element found in HTML');
        return [];
      }
      
      console.log('parseHTML: Found body element with', bodyContent.children.length, 'children');
      
      const elements: any[] = [];
      let elementId = 1;

      // Helper function to extract style properties
      const getStyleProperty = (element: Element, property: string): string => {
        const style = element.getAttribute('style');
        if (!style) return '';
        const match = style.match(new RegExp(`${property}:\\s*([^;]+)`));
        return match ? match[1].trim() : '';
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
            color: getStyleProperty(headingElement, 'color') || '#333333',
            fontSize: parseInt(getStyleProperty(headingElement, 'font-size')) || 
                     (headingElement.tagName === 'H1' ? 32 : 
                      headingElement.tagName === 'H2' ? 28 : 
                      headingElement.tagName === 'H3' ? 24 : 20)
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
            color: getStyleProperty(pElement, 'color') || '#333333',
            fontSize: parseInt(getStyleProperty(pElement, 'font-size')) || 16
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
              type: 'dark-toggle'
            });
          } else {
            elements.push({
              id: elementId.toString(),
              type: 'button',
              text: buttonElement.textContent || 'Button',
              backgroundColor: getStyleProperty(buttonElement, 'background-color') || '#667eea',
              customJS: onclick
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
            alt: imgElement.getAttribute('alt') || 'Bild'
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
            placeholder: inputElement.getAttribute('placeholder') || 'Eingabe...'
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
            color: getStyleProperty(linkElement, 'color') || '#667eea',
            fontSize: parseInt(getStyleProperty(linkElement, 'font-size')) || 16
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
        return elements;
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
                color: getStyleProperty(link, 'color') || '#667eea',
                fontSize: parseInt(getStyleProperty(link, 'font-size')) || 16
              });
            } else {
              console.log('parseHTML: Found text element');
              // Regular text element
              elements.push({
                id: elementId.toString(),
                type: 'text',
                content: element.textContent || 'Text',
                color: getStyleProperty(element, 'color') || '#333333',
                fontSize: parseInt(getStyleProperty(element, 'font-size')) || 16
              });
            }
            elementId++;
            break;

          case 'button':
            console.log('parseHTML: Found button element');
            const onclick = element.getAttribute('onclick') || 'alert("Button geklickt!")';
            const isDarkToggle = element.textContent?.includes('🌙') || onclick.includes('toggleDarkMode');
            
            if (isDarkToggle) {
              elements.push({
                id: elementId.toString(),
                type: 'dark-toggle'
              });
            } else {
              elements.push({
                id: elementId.toString(),
                type: 'button',
                text: element.textContent || 'Button',
                backgroundColor: getStyleProperty(element, 'background-color') || '#667eea',
                customJS: onclick
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
              alt: element.getAttribute('alt') || 'Bild'
            });
            elementId++;
            break;

          case 'input':
            console.log('parseHTML: Found input element');
            elements.push({
              id: elementId.toString(),
              type: 'input',
              placeholder: element.getAttribute('placeholder') || 'Eingabe...'
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
                  url: url
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
                buttons.push({
                  text: btn.textContent || 'Button',
                  backgroundColor: getStyleProperty(btn, 'background-color') || '#667eea',
                  customJS: btn.getAttribute('onclick') || 'alert("Button geklickt!")'
                });
              });

              elements.push({
                id: elementId.toString(),
                type: 'topbar',
                label: label,
                buttons: buttons
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
      return elements;
    } catch (error) {
      console.error('Error parsing HTML:', error);
      return [];
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
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 100px 20px; text-align: center; }
        .hero h1 { font-size: 3em; margin-bottom: 1rem; }
        .hero p { font-size: 1.2em; margin-bottom: 2rem; }
        .btn { background: #ff6b6b; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 1.1em; cursor: pointer; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .features { padding: 80px 20px; background: #f8f9fa; }
        .features h2 { text-align: center; margin-bottom: 3rem; font-size: 2.5em; }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .feature { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; }
        .feature h3 { color: #667eea; margin-bottom: 1rem; }
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
                <div class="feature">
                    <h3>🚀 Schnell</h3>
                    <p>Blitzschnelle Performance für optimale Nutzererfahrung</p>
                </div>
                <div class="feature">
                    <h3>🔒 Sicher</h3>
                    <p>Höchste Sicherheitsstandards für Ihre Daten</p>
                </div>
                <div class="feature">
                    <h3>💡 Innovativ</h3>
                    <p>Modernste Technologien für beste Ergebnisse</p>
                </div>
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
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        header { background: #2c3e50; color: white; padding: 1rem 0; }
        nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .logo { font-size: 1.5em; font-weight: bold; }
        .nav-links { display: flex; list-style: none; gap: 2rem; }
        .nav-links a { color: white; text-decoration: none; }
        .hero { background: #34495e; color: white; padding: 80px 20px; text-align: center; }
        .hero h1 { font-size: 2.5em; margin-bottom: 1rem; }
        .services { padding: 80px 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .service-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-top: 2rem; }
        .service { background: #ecf0f1; padding: 2rem; border-radius: 8px; text-align: center; }
        .contact { background: #3498db; color: white; padding: 60px 20px; text-align: center; }
        .btn { background: #e74c3c; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; }
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
            <h2 style="text-align: center; margin-bottom: 2rem;">Unsere Services</h2>
            <div class="service-grid">
                <div class="service">
                    <h3>Beratung</h3>
                    <p>Strategische Unternehmensberatung für nachhaltiges Wachstum</p>
                </div>
                <div class="service">
                    <h3>Entwicklung</h3>
                    <p>Maßgeschneiderte Softwarelösungen für Ihr Business</p>
                </div>
                <div class="service">
                    <h3>Support</h3>
                    <p>24/7 Support für alle Ihre technischen Anfragen</p>
                </div>
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
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .hero { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 100px 20px; text-align: center; }
        .hero h1 { font-size: 3em; margin-bottom: 1rem; }
        .hero p { font-size: 1.2em; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .about { padding: 80px 20px; background: #f8f9fa; }
        .about-content { display: grid; grid-template-columns: 1fr 2fr; gap: 3rem; align-items: center; }
        .profile-img { width: 200px; height: 200px; border-radius: 50%; background: #ddd; }
        .projects { padding: 80px 20px; }
        .project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-top: 2rem; }
        .project { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .project-img { height: 200px; background: #667eea; }
        .project-content { padding: 1.5rem; }
        .skills { background: #2c3e50; color: white; padding: 60px 20px; text-align: center; }
        .skill-list { display: flex; justify-content: center; gap: 2rem; margin-top: 2rem; flex-wrap: wrap; }
        .skill { background: #34495e; padding: 10px 20px; border-radius: 20px; }
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
            <h2 style="text-align: center; margin-bottom: 2rem;">Meine Projekte</h2>
            <div class="project-grid">
                <div class="project">
                    <div class="project-img"></div>
                    <div class="project-content">
                        <h3>E-Commerce Platform</h3>
                        <p>Vollständige Online-Shop-Lösung mit React und Node.js</p>
                    </div>
                </div>
                <div class="project">
                    <div class="project-img"></div>
                    <div class="project-content">
                        <h3>Mobile App Design</h3>
                        <p>UI/UX Design für eine innovative Fitness-App</p>
                    </div>
                </div>
                <div class="project">
                    <div class="project-img"></div>
                    <div class="project-content">
                        <h3>Corporate Website</h3>
                        <p>Responsive Unternehmenswebsite mit CMS</p>
                    </div>
                </div>
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
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        header { background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 1rem 0; }
        nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .logo { font-size: 1.8em; font-weight: bold; color: #e74c3c; }
        .nav-links { display: flex; list-style: none; gap: 2rem; }
        .nav-links a { color: #333; text-decoration: none; }
        .hero { background: #f8f9fa; padding: 60px 20px; text-align: center; }
        .hero h1 { font-size: 2.5em; margin-bottom: 1rem; color: #2c3e50; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .products { padding: 80px 20px; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-top: 2rem; }
        .product { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: transform 0.3s; }
        .product:hover { transform: translateY(-5px); }
        .product-img { height: 200px; background: linear-gradient(45deg, #3498db, #2ecc71); }
        .product-content { padding: 1.5rem; }
        .product h3 { margin-bottom: 0.5rem; }
        .price { font-size: 1.2em; font-weight: bold; color: #e74c3c; margin: 0.5rem 0; }
        .btn { background: #e74c3c; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; width: 100%; }
        .btn:hover { background: #c0392b; }
        .features { background: #2c3e50; color: white; padding: 60px 20px; text-align: center; }
        .feature-list { display: flex; justify-content: center; gap: 3rem; margin-top: 2rem; flex-wrap: wrap; }
        .feature-item { display: flex; flex-direction: column; align-items: center; }
        .feature-icon { font-size: 2em; margin-bottom: 1rem; }
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
            <h2 style="text-align: center; margin-bottom: 2rem;">Unsere Bestseller</h2>
            <div class="product-grid">
                <div class="product">
                    <div class="product-img"></div>
                    <div class="product-content">
                        <h3>Premium Produkt 1</h3>
                        <p>Hochwertige Qualität für den täglichen Gebrauch</p>
                        <div class="price">€49,99</div>
                        <button class="btn" onclick="alert('Produkt zum Warenkorb hinzugefügt!')">In den Warenkorb</button>
                    </div>
                </div>
                <div class="product">
                    <div class="product-img"></div>
                    <div class="product-content">
                        <h3>Bestseller Artikel</h3>
                        <p>Unser meistverkauftes Produkt mit Top-Bewertungen</p>
                        <div class="price">€79,99</div>
                        <button class="btn" onclick="alert('Produkt zum Warenkorb hinzugefügt!')">In den Warenkorb</button>
                    </div>
                </div>
                <div class="product">
                    <div class="product-img"></div>
                    <div class="product-content">
                        <h3>Limitierte Edition</h3>
                        <p>Exklusives Design in begrenzter Auflage</p>
                        <div class="price">€129,99</div>
                        <button class="btn" onclick="alert('Produkt zum Warenkorb hinzugefügt!')">In den Warenkorb</button>
                    </div>
                </div>
                <div class="product">
                    <div class="product-img"></div>
                    <div class="product-content">
                        <h3>Eco-Friendly Option</h3>
                        <p>Nachhaltig produziert für umweltbewusste Kunden</p>
                        <div class="price">€39,99</div>
                        <button class="btn" onclick="alert('Produkt zum Warenkorb hinzugefügt!')">In den Warenkorb</button>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <section class="features">
        <div class="container">
            <h2>Warum bei uns kaufen?</h2>
            <div class="feature-list">
                <div class="feature-item">
                    <div class="feature-icon">🚚</div>
                    <h3>Kostenloser Versand</h3>
                    <p>Ab 50€ Bestellwert</p>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">🔒</div>
                    <h3>Sicher bezahlen</h3>
                    <p>SSL-verschlüsselt</p>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">↩️</div>
                    <h3>30 Tage Rückgabe</h3>
                    <p>Ohne Wenn und Aber</p>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">⭐</div>
                    <h3>Top Bewertungen</h3>
                    <p>4.8/5 Sterne</p>
                </div>
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
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            color: #333333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
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
    return template ? btoa(template) : btoa(templates.blank);
  },

  // Test function to verify parsing works
  testParseHTML() {
    const testHtmlContent = "CjwhRE9DVFlQRSBodG1sPgo8aHRtbCBsYW5nPSJkZSI+CjxoZWFkPgogICAgPG1ldGEgY2hhcnNldD0iVVRGLTgiPgogICAgPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAiPgogICAgPHRpdGxlPk1laW5lIFdlYnNpdGU8L3RpdGxlPgogICAgPHN0eWxlPgogICAgICAgIGJvZHkgewogICAgICAgICAgICBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7CiAgICAgICAgICAgIG1hcmdpbjogMDsKICAgICAgICAgICAgcGFkZGluZzogMjBweDsKICAgICAgICAgICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZC1jb2xvciAwLjNzLCBjb2xvciAwLjNzOwogICAgICAgIH0KICAgICAgICAuZGFyay1tb2RlIHsKICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzFhMWExYTsKICAgICAgICAgICAgY29sb3I6ICNmZmZmZmY7CiAgICAgICAgfQogICAgICAgIC50b3BiYXIgewogICAgICAgICAgICBkaXNwbGF5OiBmbGV4OwogICAgICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47CiAgICAgICAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgICAgICAgICAgIHBhZGRpbmc6IDFyZW07CiAgICAgICAgICAgIGJhY2tncm91bmQ6ICNmOGY5ZmE7CiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDhweDsKICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMXJlbTsKICAgICAgICB9CiAgICAgICAgLmRhcmstbW9kZSAudG9wYmFyIHsKICAgICAgICAgICAgYmFja2dyb3VuZDogIzJkMmQyZDsKICAgICAgICB9CiAgICAgICAgLnRvcGJhci1idXR0b25zIHsKICAgICAgICAgICAgZGlzcGxheTogZmxleDsKICAgICAgICAgICAgZ2FwOiAwLjVyZW07CiAgICAgICAgfQogICAgICAgIC55b3V0dWJlLWNvbnRhaW5lciB7CiAgICAgICAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsKICAgICAgICAgICAgd2lkdGg6IDEwMCU7CiAgICAgICAgICAgIGhlaWdodDogMDsKICAgICAgICAgICAgcGFkZGluZy1ib3R0b206IDU2LjI1JTsKICAgICAgICAgICAgbWFyZ2luOiAxcmVtIDA7CiAgICAgICAgfQogICAgICAgIC55b3V0dWJlLWNvbnRhaW5lciBpZnJhbWUgewogICAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7CiAgICAgICAgICAgIHRvcDogMDsKICAgICAgICAgICAgbGVmdDogMDsKICAgICAgICAgICAgd2lkdGg6IDEwMCU7CiAgICAgICAgICAgIGhlaWdodDogMTAwJTsKICAgICAgICB9CiAgICAgICAgYnV0dG9uIHsKICAgICAgICAgICAgcGFkZGluZzogOHB4IDE2cHg7CiAgICAgICAgICAgIGJvcmRlcjogbm9uZTsKICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4OwogICAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDsKICAgICAgICB9CiAgICAgICAgaW5wdXQgewogICAgICAgICAgICBwYWRkaW5nOiA4cHg7CiAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNjY2M7CiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDRweDsKICAgICAgICAgICAgbWFyZ2luOiA0cHggMDsKICAgICAgICB9CiAgICAgICAgLmRhcmstbW9kZSBpbnB1dCB7CiAgICAgICAgICAgIGJhY2tncm91bmQ6ICMzMzM7CiAgICAgICAgICAgIGNvbG9yOiB3aGl0ZTsKICAgICAgICAgICAgYm9yZGVyLWNvbG9yOiAjNTU1OwogICAgICAgIH0KICAgICAgICBhIHsKICAgICAgICAgICAgY29sb3I6IGluaGVyaXQ7CiAgICAgICAgICAgIHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lOwogICAgICAgIH0KICAgICAgICAuZGFyay1tb2RlIGEgewogICAgICAgICAgICBjb2xvcjogIzZjYjZmZjsKICAgICAgICB9CiAgICA8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5PgogICAgPHNjcmlwdD4KICAgICAgICBmdW5jdGlvbiB0b2dnbGVEYXJrTW9kZSgpIHsKICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKCdkYXJrLW1vZGUnKTsKICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2RhcmtNb2RlJywgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ2RhcmstbW9kZScpKTsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLy8gTG9hZCBkYXJrIG1vZGUgcHJlZmVyZW5jZQogICAgICAgIGlmIChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZGFya01vZGUnKSA9PT0gJ3RydWUnKSB7CiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgnZGFyay1tb2RlJyk7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIGZ1bmN0aW9uIGdldFlvdVR1YmVWaWRlb0lkKHVybCkgewogICAgICAgICAgICBjb25zdCByZWdleCA9IC8oPzp5b3V0dWJlLmNvbS93YXRjaD92PXx5b3V0dS5iZS8pKFteJGo/I10rKS87CiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gdXJsLm1hdGNoKHJlZ2V4KTsKICAgICAgICAgICAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiBudWxsOwogICAgICAgIH0KICAgIDwvc2NyaXB0PgogICAgPHAgc3R5bGU9ImNvbG9yOiAjMzMzMzMzOyBmb250LXNpemU6IDE2cHg7Ij5IYWxsbywgaWNoIGJpbiBlczwvcD4KCjwvYm9keT4KPC9odG1sPg==";
    
    console.log('=== TESTING PARSE HTML ===');
    const result = this.parseHTML(testHtmlContent);
    console.log('Test result:', result);
    console.log('=== END TEST ===');
    return result;
  }
};

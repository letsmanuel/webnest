import React from 'react';

const PrivacyPolicy: React.FC = () => (
  <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow mt-8 mb-16">
    <h1 className="text-2xl font-bold mb-4">Datenschutzerklärung für Webnest</h1>
    <div className="text-sm text-gray-800 dark:text-gray-100 mb-2">Stand: 07. Juli 2025</div>
    <h2 className="text-lg font-semibold mt-6 mb-2">1. Verantwortlicher</h2>
    <p className="mb-4">
      Verantwortlich für die Verarbeitung personenbezogener Daten:<br/>
      <b>Webnest</b><br/>
      E-Mail: <a href="mailto:luap.palu@gmail.com" className="text-blue-600 underline">luap.palu@gmail.com</a>
    </p>
    <h2 className="text-lg font-semibold mt-6 mb-2">2. Allgemeines zur Datenverarbeitung</h2>
    <p className="mb-4">
      Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. Wir verarbeiten personenbezogene Daten ausschließlich im Rahmen der geltenden Datenschutzgesetze (insbesondere DSGVO). Es erfolgt keine Weitergabe personenbezogener Daten an Dritte.
    </p>
    <h2 className="text-lg font-semibold mt-6 mb-2">3. Hosting und Infrastruktur</h2>
    <div className="mb-2">
      <b>🔹 Vercel (Hosting)</b><br/>
      Unsere Website wird über Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA gehostet. Beim Aufruf der Website werden automatisch technische Informationen verarbeitet, wie:
      <ul className="list-disc ml-6 mt-1">
        <li>IP-Adresse</li>
        <li>Browsertyp/-version</li>
        <li>Betriebssystem</li>
        <li>Datum und Uhrzeit des Zugriffs</li>
      </ul>
      Diese Daten dienen der technischen Auslieferung und Stabilität der Website.<br/>
      Datenschutzerklärung Vercel: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://vercel.com/legal/privacy-policy</a>
    </div>
    <div className="mb-4 mt-4">
      <b>🔹 Firebase & Firestore</b><br/>
      Wir nutzen Firebase (inkl. Firestore und Firebase Authentication), bereitgestellt von Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.<br/>
      Dabei werden ggf. folgende Daten verarbeitet:
      <ul className="list-disc ml-6 mt-1">
        <li>IP-Adresse</li>
        <li>Geräteinformationen (z. B. Browsertyp)</li>
        <li>Interaktionen innerhalb der Website</li>
      </ul>
      Weitere Informationen: <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://firebase.google.com/support/privacy</a>
    </div>
    <h2 className="text-lg font-semibold mt-6 mb-2">4. Google Analytics über Firebase</h2>
    <p className="mb-2">Zur statistischen Auswertung nutzen wir Google Analytics for Firebase.</p>
    <div className="mb-2">
      Erhobene Daten:
      <ul className="list-disc ml-6 mt-1">
        <li>Besuchte Seiten</li>
        <li>Verweildauer</li>
        <li>Gerätetyp, Betriebssystem, Sprache</li>
        <li>IP-Adresse (gekürzt)</li>
        <li>Events wie Seitenaufrufe</li>
      </ul>
      Wir verwenden keine personalisierte Werbung. Mehr Infos: Firebase Analytics Info
    </div>
    <h2 className="text-lg font-semibold mt-6 mb-2">5. Cookies und Tracking</h2>
    <p className="mb-4">
      Unsere Website verwendet keine Cookies für Werbe- oder Marketingzwecke. Firebase kann technisch notwendige Cookies oder LocalStorage-Elemente einsetzen.
    </p>
    <h2 className="text-lg font-semibold mt-6 mb-2">6. Ihre Rechte nach DSGVO</h2>
    <div className="mb-4">
      Sie haben jederzeit das Recht auf:
      <ul className="list-disc ml-6 mt-1">
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen Datenverarbeitung (Art. 21 DSGVO)</li>
      </ul>
      Kontakt: <a href="mailto:luap.palu@gmail.com" className="text-blue-600 underline">luap.palu@gmail.com</a>
    </div>
    <h2 className="text-lg font-semibold mt-6 mb-2">7. Datensicherheit</h2>
    <p className="mb-4">
      Die Website wird per SSL/TLS verschlüsselt. Alle Daten werden ausschließlich über Firebase verarbeitet, durch Sicherheitsregeln geschützt, und nicht an unbeteiligte Dritte weitergegeben.
    </p>
    <h2 className="text-lg font-semibold mt-6 mb-2">8. Änderungen dieser Erklärung</h2>
    <p className="mb-4">
      Diese Datenschutzerklärung kann bei technischen oder rechtlichen Änderungen angepasst werden. Die aktuelle Version ist jederzeit auf unserer Website abrufbar.
    </p>
    <h2 className="text-lg font-semibold mt-6 mb-2">9. Kontakt</h2>
    <p className="mb-4">
      Fragen zum Datenschutz?<br/>
      📧 <a href="mailto:luap.palu@gmail.com" className="text-blue-600 underline">luap.palu@gmail.com</a>
    </p>
    <div className="text-xs text-gray-500 mt-6">
      Hinweis: Diese Website ist ein nicht-kommerzielles Projekt und richtet sich nicht an Personen unter 13 Jahren. Die Dienste werden im Rahmen der geltenden Richtlinien verwendet.
    </div>
  </div>
);

export default PrivacyPolicy; 
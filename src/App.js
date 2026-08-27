/* global __initial_auth_token */
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

const ScheduleModal = ({ entityName, scheduleType, scheduleData, onClose }) => {
  const dayMap = { '1': 'Lundi', '2': 'Mardi', '3': 'Mercredi', '4': 'Jeudi', '5': 'Vendredi' };
  const hourMap = {
    '1': '8h20-9h10', '2': '9h10-10h00', '3': '10h20-11h10', '4': '11h10-12h00',
    '5': '13h10-14h00', '6': '14h00-14h50', '7': '15h05-15h55', '8': '15h55-16h45'
  };
  const daysOfWeek = ['1', '2', '3', '4', '5']; 
  const hoursOfDay = ['1', '2', '3', '4', '5', '6', '7', '8']; 

  const scheduleGrid = {};
  daysOfWeek.forEach(day => {
    scheduleGrid[day] = {};
    hoursOfDay.forEach(hour => { scheduleGrid[day][hour] = null; });
  });

  scheduleData.forEach(entry => {
    const day = entry.day;
    const hour = entry.hour;
    if (daysOfWeek.includes(day) && hoursOfDay.includes(hour)) {
      let cellContent = '';
      if (scheduleType === 'professors') {
        cellContent = (
          <>
            <div className="font-semibold text-blue-800">{entry.course}</div>
            <div className="text-gray-700 text-xs">Classes: {entry.class}</div>
            <div className="text-gray-700 text-xs">Local: {entry.room}</div>
          </>
        );
      } else if (scheduleType === 'classes') {
        cellContent = (
          <>
            <div className="font-semibold text-green-800">{entry.course}</div>
            <div className="text-gray-700 text-xs">Prof: {entry.professorName}</div>
            <div className="text-gray-700 text-xs">Local: {entry.room}</div>
          </>
          );
      } else if (scheduleType === 'rooms') {
        cellContent = (
          <>
            <div className="font-semibold text-purple-800">{entry.course}</div>
            <div className="text-gray-700 text-xs">Prof: {entry.professorName}</div>
            <div className="text-gray-700 text-xs">Classes: {entry.class}</div>
          </>
        );
      }
      scheduleGrid[day][hour] = cellContent;
    }
  });

  let modalTitle = '';
  switch (scheduleType) {
    case 'professors': modalTitle = `Emploi du temps de ${entityName}`; break;
    case 'classes': modalTitle = `Emploi du temps de la classe ${entityName}`; break;
    case 'rooms': modalTitle = `Emploi du temps du local ${entityName}`; break;
    default: modalTitle = `Détails pour ${entityName}`;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{modalTitle}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-semibold">&times;</button>
        </div>
        {scheduleData.length > 0 ? (
          <div className="overflow-x-auto max-h-[70vh] pb-4">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg table-fixed">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Heure / Jour</th>
                  {daysOfWeek.map(dayKey => (<th key={dayKey} className="py-2 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/5">{dayMap[dayKey]}</th>))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {hoursOfDay.map(hourKey => (
                  <tr key={hourKey} className="h-20">
                    <td className="py-2 px-3 text-sm text-gray-800 font-medium border-r border-gray-200">{hourMap[hourKey]}</td>
                    {daysOfWeek.map(dayKey => (<td key={`${dayKey}-${hourKey}`} className="py-2 px-3 text-sm text-gray-800 align-top border-r border-gray-200">{scheduleGrid[dayKey][hourKey]}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">Aucun emploi du temps trouvé pour cette entité.</p>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md">Fermer</button>
        </div>
      </div>
    </div>
  );
};

const UNKNOWN_PROFESSOR_KEY = 'INCONNU';
const convertSetsToArrays = (obj) => {
  if (Array.isArray(obj)) return obj.map(convertSetsToArrays);
  if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = obj[key] instanceof Set ? Array.from(obj[key]) : convertSetsToArrays(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};
function App() {
  const [professorHours, setProfessorHours] = useState({});
  const [allSchedules, setAllSchedules] = useState({ professors: {}, classes: {}, rooms: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('professors');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileName, setFileName] = useState("Aucun fichier sélectionné");

  const [db, setDb] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Initialisation de Firebase et authentification
  useEffect(() => {
    try {
      const firebaseConfig = JSON.parse(typeof process.env.REACT_APP_FIREBASE_CONFIG !== 'undefined' ? process.env.REACT_APP_FIREBASE_CONFIG : '{}');

      if (Object.keys(firebaseConfig).length === 0) {
        setError("Erreur de configuration de la base de données.");
        setLoading(false);
        return;
      }

      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const firestoreInstance = getFirestore(app);
      setDb(firestoreInstance);

      onAuthStateChanged(authInstance, (user) => {
        setIsAuthReady(true);
      });

      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        signInWithCustomToken(authInstance, __initial_auth_token).catch(() => signInAnonymously(authInstance));
      } else {
        signInAnonymously(authInstance);
      }

    } catch (err) {
      setError("Erreur d'initialisation.");
      setLoading(false);
    }
  }, []);

  // Écouter en temps réel Firestore
  useEffect(() => {
    if (!db || !isAuthReady) return;

    setLoading(true);
    const scheduleRef = doc(db, "app_data", "current_schedule");
    
    const unsubscribe = onSnapshot(scheduleRef, (docSnap) => {
      if (docSnap.exists()) {
        const fileData = docSnap.data();
        if (fileData.schedules) setAllSchedules(fileData.schedules);
        if (fileData.professorHours) setProfessorHours(fileData.professorHours);
      }
      setLoading(false);
    }, (err) => {
      setError("Impossible de charger les plannings.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, isAuthReady]);

  // Fonction de lecture et d'envoi du fichier texte
  const handleFileUpload = (event) => {
    const file = event.target.files;
    if (!file || !db) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        setError(null);
        const textContent = e.target.result;
        const schedules = { professors: {}, classes: {}, rooms: {} };
        const profHoursCounter = {};

        const lines = textContent.split(/\r?\n/);

        lines.forEach((line) => {
          if (!line.trim()) return;
          const columns = line.split(/\t|,|;/); 
          
          if (columns.length >= 5) {
            const day = columns[0]?.trim();
            const hour = columns[1]?.trim();
            const className = columns[2]?.trim();
            const profSigle = columns[3]?.trim() || UNKNOWN_PROFESSOR_KEY;
            const course = columns[4]?.trim();
            const room = columns[5]?.trim() || "N/A";

            const entry = { day, hour, class: className, professorName: profSigle, course, room };

            if (!schedules.professors[profSigle]) schedules.professors[profSigle] = [];
            schedules.professors[profSigle].push(entry);

            if (!schedules.classes[className]) schedules.classes[className] = [];
            schedules.classes[className].push(entry);

            if (!schedules.rooms[room]) schedules.rooms[room] = [];
            schedules.rooms[room].push(entry);

            profHoursCounter[profSigle] = (profHoursCounter[profSigle] || 0) + 1;
          }
        });

        await setDoc(doc(db, "app_data", "current_schedule"), {
          schedules: convertSetsToArrays(schedules),
          professorHours: profHoursCounter,
          updatedAt: new Date().toISOString()
        });

        alert("Fichier injecté avec succès ! 🎉");
      } catch (err) {
        setError("Le format du fichier texte n'est pas correct.");
      }
    };
    reader.readAsText(file);
  };

  const handleSecretClick = () => {
    const password = prompt("Entrez le mot de passe administrateur pour ouvrir le volet :");
    if (password === "MonMotDePasseSecret123") {
      setShowAdminPanel(true);
    } else if (password !== null) {
      alert("Mot de passe incorrect.");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><p>Chargement des horaires...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h1 onDoubleClick={handleSecretClick} className="text-3xl font-bold text-gray-900 cursor-default select-none">
            Horaires des Professeurs
          </h1>
          <p className="text-sm text-gray-500 mt-1">Application synchronisée</p>
        </div>

        {showAdminPanel && (
          <div className="mt-4 md:mt-0 p-4 border border-blue-200 bg-blue-50 rounded-lg max-w-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-blue-900">🛠️ Import du fichier .txt</h3>
              <button onClick={() => setShowAdminPanel(false)} className="text-gray-400 hover:text-gray-600 text-xs ml-4">Fermer X</button>
            </div>
            <input type="file" accept=".txt" onChange={handleFileUpload} className="block w-full text-xs cursor-pointer" />
            <p className="text-xs text-gray-600 mt-1 truncate">Fichier : {fileName}</p>
          </div>
        )}
      </header>

      {error && <div className="max-w-6xl mx-auto bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <main className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <div className="flex border-b border-gray-200 mb-6">
          {['professors', 'classes', 'rooms'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setSelectedEntity(entity); setIsModalOpen(true); }}
              className={`py-2 px-4 font-medium text-sm border-b-2 capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
            >
              {tab === 'professors' ? 'Professeurs' : tab === 'classes' ? 'Classes' : 'Locaux'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.keys(allSchedules[activeTab] || {}).sort().map((entity) => (
             { setSelectedEntity(entity); setIsModalOpen(true); }}
              className="p-3 text-center bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg font-medium text-gray-700 transition"
            >
              {entity}
              {activeTab === 'professors' && professorHours[entity] && (
                <span className="block text-xs font-normal text-gray-400 mt-0.5">{professorHours[entity]}h</span>
              )}
            </button>
          ))}
        </div>
   
      </main>

      {isModalOpen && selectedEntity && (
         { setIsModalOpen(false); setSelectedEntity(null); }}
        />
      )}
    </div>
  );
}

export default App;

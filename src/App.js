/* global __initial_auth_token */

import React, { useEffect, useState } from 'react';

import { initializeApp } from 'firebase/app';

import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';


/* =========================================================
   ADMINISTRATEURS AUTORISÉS
   ========================================================= */

const ADMIN_EMAILS = [
  'miy@belgacom.net',
  'hef@saintbar.be',
  'blv@saintbar.be'
];


/* =========================================================
   CONSTANTES
   ========================================================= */

const UNKNOWN_PROFESSOR_KEY = 'INCONNU';

const DAYS_OF_WEEK = ['1', '2', '3', '4', '5'];

const HOURS_OF_DAY = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8'
];

const DAY_MAP = {
  '1': 'Lundi',
  '2': 'Mardi',
  '3': 'Mercredi',
  '4': 'Jeudi',
  '5': 'Vendredi'
};

const HOUR_MAP = {
  '1': '8h20-9h10',
  '2': '9h10-10h00',
  '3': '10h20-11h10',
  '4': '11h10-12h00',
  '5': '13h10-14h00',
  '6': '14h00-14h50',
  '7': '15h05-15h55',
  '8': '15h55-16h45'
};


/* =========================================================
   SUPPRESSION DES GUILLEMETS AUTOUR DES CHAMPS
   ========================================================= */

const cleanField = (value) => {

  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .replace(/^"|"$/g, '');
};


/* =========================================================
   CONVERSION DES SETS EN TABLEAUX
   ========================================================= */

const convertSetsToArrays = (obj) => {

  if (Array.isArray(obj)) {
    return obj.map(convertSetsToArrays);
  }

  if (
    typeof obj === 'object' &&
    obj !== null
  ) {

    const newObj = {};

    Object.keys(obj).forEach((key) => {

      if (obj[key] instanceof Set) {

        newObj[key] = Array.from(obj[key]);

      } else {

        newObj[key] =
          convertSetsToArrays(obj[key]);

      }

    });

    return newObj;
  }

  return obj;
};


/* =========================================================
   MODAL EMPLOI DU TEMPS
   ========================================================= */

const ScheduleModal = ({
  entityName,
  scheduleType,
  scheduleData,
  onClose
}) => {

  const scheduleGrid = {};


  DAYS_OF_WEEK.forEach((day) => {

    scheduleGrid[day] = {};

    HOURS_OF_DAY.forEach((hour) => {

      scheduleGrid[day][hour] = null;

    });

  });


  scheduleData.forEach((entry) => {

    const day = String(entry.day);
    const hour = String(entry.hour);


    if (
      DAYS_OF_WEEK.includes(day) &&
      HOURS_OF_DAY.includes(hour)
    ) {

      let cellContent = null;


      if (scheduleType === 'professors') {

        cellContent = (

          <>

            <div className="font-semibold text-blue-800">
              {entry.course}
            </div>

            <div className="text-gray-700 text-xs">
              Classe : {entry.class}
            </div>

            <div className="text-gray-700 text-xs">
              Local : {entry.room}
            </div>

          </>

        );

      }


      if (scheduleType === 'classes') {

        cellContent = (

          <>

            <div className="font-semibold text-green-800">
              {entry.course}
            </div>

            <div className="text-gray-700 text-xs">
              Prof : {entry.professorName}
            </div>

            <div className="text-gray-700 text-xs">
              Local : {entry.room}
            </div>

          </>

        );

      }


      if (scheduleType === 'rooms') {

        cellContent = (

          <>

            <div className="font-semibold text-purple-800">
              {entry.course}
            </div>

            <div className="text-gray-700 text-xs">
              Prof : {entry.professorName}
            </div>

            <div className="text-gray-700 text-xs">
              Classe : {entry.class}
            </div>

          </>

        );

      }


      scheduleGrid[day][hour] = cellContent;
    }

  });


  let modalTitle = '';


  switch (scheduleType) {

    case 'professors':

      modalTitle =
        'Emploi du temps de ' + entityName;

      break;


    case 'classes':

      modalTitle =
        'Emploi du temps de la classe ' +
        entityName;

      break;


    case 'rooms':

      modalTitle =
        'Emploi du temps du local ' +
        entityName;

      break;


    default:

      modalTitle =
        'Détails pour ' + entityName;

      break;
  }


  return (

    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">

      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-auto">

        <div className="flex justify-between items-center border-b pb-3 mb-4">

          <h2 className="text-2xl font-bold text-gray-800">
            {modalTitle}
          </h2>


          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-semibold"
          >
            &times;
          </button>

        </div>


        {scheduleData.length > 0 ? (

          <div className="overflow-x-auto max-h-[70vh] pb-4">

            <table className="min-w-full bg-white border border-gray-200 rounded-lg table-fixed">

              <thead className="bg-gray-100 sticky top-0 z-10">

                <tr>

                  <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                    Heure / Jour
                  </th>


                  {DAYS_OF_WEEK.map((dayKey) => (

                    <th
                      key={dayKey}
                      className="py-2 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/5"
                    >
                      {DAY_MAP[dayKey]}
                    </th>

                  ))}

                </tr>

              </thead>


              <tbody className="divide-y divide-gray-200">

                {HOURS_OF_DAY.map((hourKey) => (

                  <tr
                    key={hourKey}
                    className="h-20"
                  >

                    <td className="py-2 px-3 text-sm text-gray-800 font-medium border-r border-gray-200">
                      {HOUR_MAP[hourKey]}
                    </td>


                    {DAYS_OF_WEEK.map((dayKey) => (

                      <td
                        key={dayKey + '-' + hourKey}
                        className="py-2 px-3 text-sm text-gray-800 align-top border-r border-gray-200"
                      >

                        {scheduleGrid[dayKey][hourKey]}

                      </td>

                    ))}

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        ) : (

          <p className="text-gray-600">
            Aucun emploi du temps trouvé pour cette entité.
          </p>

        )}


        <div className="flex justify-end mt-4">

          <button
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md"
          >
            Fermer
          </button>

        </div>

      </div>

    </div>

  );
};


/* =========================================================
   APPLICATION
   ========================================================= */

function App() {

  const [professorHours, setProfessorHours] =
    useState({});


  const [allSchedules, setAllSchedules] =
    useState({
      professors: {},
      classes: {},
      rooms: {}
    });


  const [loading, setLoading] =
    useState(true);


  const [error, setError] =
    useState(null);


  const [activeTab, setActiveTab] =
    useState('professors');


  const [selectedEntity, setSelectedEntity] =
    useState(null);


  const [isModalOpen, setIsModalOpen] =
    useState(false);


  const [fileName, setFileName] =
    useState('Aucun fichier sélectionné');


  const [db, setDb] =
    useState(null);


  const [isAuthReady, setIsAuthReady] =
    useState(false);


  const [showAdminPanel, setShowAdminPanel] =
    useState(false);


  const [showLogin, setShowLogin] =
    useState(false);


  const [adminEmail, setAdminEmail] =
    useState('');


  const [adminPassword, setAdminPassword] =
    useState('');


  const [adminUser, setAdminUser] =
    useState(null);


  const [loginError, setLoginError] =
    useState('');


  const [importing, setImporting] =
    useState(false);


  /* =======================================================
     INITIALISATION FIREBASE
     ======================================================= */

  useEffect(() => {

    try {

      const configText =
        typeof process.env.REACT_APP_FIREBASE_CONFIG !==
        'undefined'
          ? process.env.REACT_APP_FIREBASE_CONFIG
          : '{}';


      const firebaseConfig =
        JSON.parse(configText);


      if (
        Object.keys(firebaseConfig).length === 0
      ) {

        setError(
          'Erreur de configuration de la base de données.'
        );

        setLoading(false);

        return;
      }


      const app =
        initializeApp(firebaseConfig);


      const authInstance =
        getAuth(app);


      const firestoreInstance =
        getFirestore(app);


      setDb(firestoreInstance);


      const unsubscribeAuth =
        onAuthStateChanged(
          authInstance,
          (user) => {

            setIsAuthReady(true);


            if (
              user &&
              !user.isAnonymous &&
              user.email &&
              ADMIN_EMAILS.includes(
                user.email.toLowerCase()
              )
            ) {

              setAdminUser(user);

            } else {

              setAdminUser(null);

            }

          }
        );


      if (
        typeof __initial_auth_token !== 'undefined' &&
        __initial_auth_token
      ) {

        signInWithCustomToken(
          authInstance,
          __initial_auth_token
        ).catch(() => {

          signInAnonymously(
            authInstance
          );

        });

      } else {

        signInAnonymously(
          authInstance
        );

      }


      return () => {

        unsubscribeAuth();

      };

    } catch (err) {

      console.error(err);

      setError(
        'Erreur d’initialisation.'
      );

      setLoading(false);

    }

  }, []);


  /* =======================================================
     ÉCOUTE FIRESTORE
     ======================================================= */

  useEffect(() => {

    if (
      !db ||
      !isAuthReady
    ) {

      return;
    }


    setLoading(true);


    const scheduleRef =
      doc(
        db,
        'app_data',
        'current_schedule'
      );


    const unsubscribe =
      onSnapshot(
        scheduleRef,

        (docSnap) => {

          if (docSnap.exists()) {

            const fileData =
              docSnap.data();


            if (
              fileData.schedules
            ) {

              setAllSchedules(
                fileData.schedules
              );

            }


            if (
              fileData.professorHours
            ) {

              setProfessorHours(
                fileData.professorHours
              );

            }

          }


          setLoading(false);

        },


        (err) => {

          console.error(err);

          setError(
            'Impossible de charger les plannings.'
          );

          setLoading(false);

        }
      );


    return () => {

      unsubscribe();

    };

  }, [db, isAuthReady]);


  /* =======================================================
     CONNEXION ADMINISTRATEUR
     ======================================================= */

  const handleAdminLogin =
    async (event) => {

      event.preventDefault();

      setLoginError('');


      const email =
        adminEmail
          .trim()
          .toLowerCase();


      if (
        !ADMIN_EMAILS.includes(email)
      ) {

        setLoginError(
          'Cette adresse e-mail n’est pas autorisée.'
        );

        return;
      }


      if (
        !adminPassword
      ) {

        setLoginError(
          'Veuillez entrer votre mot de passe.'
        );

        return;
      }


      try {

        const authInstance =
          getAuth();


        const credential =
          await signInWithEmailAndPassword(
            authInstance,
            email,
            adminPassword
          );


        const connectedEmail =
          credential.user.email
            ? credential.user.email.toLowerCase()
            : '';


        if (
          !ADMIN_EMAILS.includes(
            connectedEmail
          )
        ) {

          await signOut(
            authInstance
          );


          setLoginError(
            'Ce compte n’est pas autorisé à administrer les horaires.'
          );

          return;
        }


        setAdminUser(
          credential.user
        );


        setAdminEmail('');

        setAdminPassword('');

        setLoginError('');

        setShowLogin(false);

        setShowAdminPanel(true);

      } catch (err) {

        console.error(err);

        setLoginError(
          'Adresse e-mail ou mot de passe incorrect.'
        );

      }

    };


  /* =======================================================
     DÉCONNEXION
     ======================================================= */

  const handleAdminLogout =
    async () => {

      try {

        const authInstance =
          getAuth();


        await signOut(
          authInstance
        );


        setAdminUser(null);

        setShowAdminPanel(false);


        await signInAnonymously(
          authInstance
        );

      } catch (err) {

        console.error(err);

        setError(
          'Erreur lors de la déconnexion.'
        );

      }

    };


  /* =======================================================
     OUVERTURE ADMINISTRATION
     ======================================================= */

  const handleSecretClick =
    () => {

      if (adminUser) {

        setShowAdminPanel(true);

        return;
      }


      setLoginError('');

      setAdminEmail('');

      setAdminPassword('');

      setShowLogin(true);

    };


  /* =======================================================
     IMPORT DU FICHIER GPU001.TXT
     ======================================================= */

  const handleFileUpload =
    (event) => {

      const file =
        event.target.files &&
        event.target.files[0];


      if (
        !file ||
        !db ||
        !adminUser
      ) {

        return;
      }


      setFileName(
        file.name
      );


      setImporting(true);

      setError(null);


      const reader =
        new FileReader();


      reader.onload =
        async (e) => {

          try {

            const textContent =
              e.target.result;


            const schedules = {

              professors: {},
              classes: {},
              rooms: {}

            };


            const profHoursCounter =
              {};


            const lines =
              textContent.split(
                /\r?\n/
              );


            let importedLines = 0;

            let ignoredLines = 0;


            lines.forEach(
              (line) => {

                if (
                  !line.trim()
                ) {

                  return;
                }


                /*
                  Exemple :

                  6003,"6B","SIC","MAT6","F12",1,7,,

                  Structure :

                  0 = identifiant
                  1 = classe
                  2 = professeur
                  3 = cours
                  4 = local
                  5 = jour
                  6 = heure
                  7+ = champs supplémentaires
                */


                const columns =
                  line.split(',');


                if (
                  columns.length < 7
                ) {

                  ignoredLines++;

                  return;
                }


                const className =
                  cleanField(
                    columns[1]
                  ) ||
                  'Classe inconnue';


                const profSigle =
                  cleanField(
                    columns[2]
                  ) ||
                  UNKNOWN_PROFESSOR_KEY;


                const course =
                  cleanField(
                    columns[3]
                  ) ||
                  'Cours inconnu';


                const room =
                  cleanField(
                    columns[4]
                  ) ||
                  'N/A';


                const day =
                  cleanField(
                    columns[5]
                  );


                const hour =
                  cleanField(
                    columns[6]
                  );


                if (
                  !day ||
                  !hour
                ) {

                  ignoredLines++;

                  return;
                }


                const entry = {

                  day: day,

                  hour: hour,

                  class: className,

                  professorName:
                    profSigle,

                  course: course,

                  room: room

                };


                /* PROFESSEURS */

                if (
                  !schedules.professors[
                    profSigle
                  ]
                ) {

                  schedules.professors[
                    profSigle
                  ] = [];

                }


                schedules.professors[
                  profSigle
                ].push(entry);


                /* CLASSES */

                if (
                  !schedules.classes[
                    className
                  ]
                ) {

                  schedules.classes[
                    className
                  ] = [];

                }


                schedules.classes[
                  className
                ].push(entry);


                /* LOCAUX */

                if (
                  !schedules.rooms[
                    room
                  ]
                ) {

                  schedules.rooms[
                    room
                  ] = [];

                }


                schedules.rooms[
                  room
                ].push(entry);


                /* HEURES PROFESSEURS */

                profHoursCounter[
                  profSigle
                ] =
                  (
                    profHoursCounter[
                      profSigle
                    ] || 0
                  ) + 1;


                importedLines++;

              }
            );


            if (
              importedLines === 0
            ) {

              throw new Error(
                'Aucune ligne valide trouvée dans le fichier.'
              );

            }


            await setDoc(

              doc(
                db,
                'app_data',
                'current_schedule'
              ),

              {

                schedules:
                  convertSetsToArrays(
                    schedules
                  ),

                professorHours:
                  profHoursCounter,

                updatedAt:
                  new Date().toISOString()

              }

            );


            let message =
              'Fichier importé avec succès ! ';

            message +=
              importedLines +
              ' lignes importées.';


            if (
              ignoredLines > 0
            ) {

              message +=
                ' ' +
                ignoredLines +
                ' lignes ignorées.';

            }


            alert(message);


          } catch (err) {

            console.error(err);

            setError(
              'Erreur lors de l’import : ' +
              (
                err.message ||
                'format du fichier incorrect.'
              )
            );

          } finally {

            setImporting(false);

          }

        };


      reader.onerror =
        () => {

          setError(
            'Impossible de lire le fichier.'
          );

          setImporting(false);

        };


      reader.readAsText(
        file
      );

    };


  /* =======================================================
     CHARGEMENT
     ======================================================= */

  if (loading) {

    return (

      <div className="flex items-center justify-center h-screen">

        <p>
          Chargement des horaires...
        </p>

      </div>

    );

  }


  /* =======================================================
     INTERFACE PRINCIPALE
     ======================================================= */

  return (

    <div className="min-h-screen bg-gray-50 p-6">


      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm">


        <div>

          <h1
            onDoubleClick={handleSecretClick}
            className="text-3xl font-bold text-gray-900 cursor-default select-none"
          >
            Horaires des Professeurs
          </h1>


          <p className="text-sm text-gray-500 mt-1">
            Application synchronisée
          </p>

        </div>


        {/* =================================================
            CONNEXION ADMINISTRATEUR
           ================================================= */}

        {showLogin && (

          <div className="mt-4 md:mt-0 p-4 border border-blue-200 bg-blue-50 rounded-lg w-full max-w-sm">

            <div className="flex justify-between items-center mb-3">

              <h3 className="text-sm font-semibold text-blue-900">
                🔐 Administration
              </h3>


              <button
                onClick={() =>
                  setShowLogin(false)
                }
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>

            </div>


            <form
              onSubmit={handleAdminLogin}
              className="space-y-3"
            >

              <input
                type="email"
                value={adminEmail}
                onChange={(e) =>
                  setAdminEmail(
                    e.target.value
                  )
                }
                placeholder="Adresse e-mail"
                autoComplete="username"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />


              <input
                type="password"
                value={adminPassword}
                onChange={(e) =>
                  setAdminPassword(
                    e.target.value
                  )
                }
                placeholder="Mot de passe"
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />


              {loginError && (

                <p className="text-red-600 text-xs">
                  {loginError}
                </p>

              )}


              <div className="flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowLogin(false)
                  }
                  className="px-3 py-2 text-sm text-gray-600"
                >
                  Annuler
                </button>


                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
                >
                  Se connecter
                </button>

              </div>

            </form>

          </div>

        )}


        {/* =================================================
            PANNEAU ADMINISTRATEUR
           ================================================= */}

        {showAdminPanel &&
          adminUser && (

            <div className="mt-4 md:mt-0 p-4 border border-green-200 bg-green-50 rounded-lg max-w-sm">

              <div className="flex justify-between items-center mb-2">

                <h3 className="text-sm font-semibold text-green-900">
                  🛠️ Import du fichier .txt
                </h3>


                <button
                  onClick={
                    handleAdminLogout
                  }
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  Déconnexion
                </button>

              </div>


              <p className="text-xs text-green-700 mb-3">
                Connecté : {adminUser.email}
              </p>


              <input
                type="file"
                accept=".txt"
                onChange={
                  handleFileUpload
                }
                disabled={importing}
                className="block w-full text-xs cursor-pointer"
              />


              <p className="text-xs text-gray-600 mt-1 truncate">
                Fichier : {fileName}
              </p>


              {importing && (

                <p className="text-xs text-blue-600 mt-2">
                  Import en cours...
                </p>

              )}

            </div>

          )}

      </header>


      {/* =====================================================
          ERREUR
         ===================================================== */}

      {error && (

        <div className="max-w-6xl mx-auto bg-red-100 text-red-700 px-4 py-3 rounded mb-4">

          {error}

        </div>

      )}


      {/* =====================================================
          CONTENU
         ===================================================== */}

      <main className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-6">


        {/* ONGlets */}

        <div className="flex border-b border-gray-200 mb-6">

          {[
            'professors',
            'classes',
            'rooms'
          ].map((tab) => (

            <button
              key={tab}
              onClick={() =>
                setActiveTab(tab)
              }
              className={
                'py-2 px-4 font-medium text-sm border-b-2 capitalize ' +
                (
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500'
                )
              }
            >

              {tab === 'professors'
                ? 'Professeurs'
                : tab === 'classes'
                ? 'Classes'
                : 'Locaux'}

            </button>

          ))}

        </div>


        {/* LISTE DES ENTITÉS */}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">

          {Object.keys(
            allSchedules[
              activeTab
            ] || {}
          )
            .sort()
            .map((entity) => (

              <button
                key={entity}
                onClick={() => {

                  setSelectedEntity(
                    entity
                  );

                  setIsModalOpen(
                    true
                  );

                }}
                className="p-3 text-center bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg font-medium text-gray-700 transition"
              >

                {entity}


                {activeTab ===
                  'professors' &&
                  professorHours[
                    entity
                  ] && (

                    <span className="block text-xs font-normal text-gray-400 mt-0.5">

                      {professorHours[
                        entity
                      ]}{' '}
                      h

                    </span>

                  )}

              </button>

            ))}

        </div>

      </main>


      {/* =====================================================
          FENÊTRE DE DÉTAIL
         ===================================================== */}

      {isModalOpen &&
        selectedEntity && (

          <ScheduleModal

            entityName={
              selectedEntity
            }

            scheduleType={
              activeTab
            }

            scheduleData={
              allSchedules[
                activeTab
              ]?.[
                selectedEntity
              ] || []
            }

            onClose={() => {

              setIsModalOpen(
                false
              );

              setSelectedEntity(
                null
              );

            }}

          />

        )}

    </div>

  );
}


export default App;

```jsx
/* global __initial_auth_token */

import React, { useEffect, useState } from 'react';

import {
  initializeApp
} from 'firebase/app';

import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';


// ============================================================
// CONFIGURATION
// ============================================================

const UNKNOWN_PROFESSOR = 'INCONNU';

const DAYS = ['1', '2', '3', '4', '5'];

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8'];

const DAY_NAMES = {
  '1': 'Lundi',
  '2': 'Mardi',
  '3': 'Mercredi',
  '4': 'Jeudi',
  '5': 'Vendredi'
};

const HOUR_NAMES = {
  '1': '8h20-9h10',
  '2': '9h10-10h00',
  '3': '10h20-11h10',
  '4': '11h10-12h00',
  '5': '13h10-14h00',
  '6': '14h00-14h50',
  '7': '15h05-15h55',
  '8': '15h55-16h45'
};


// ============================================================
// NETTOYAGE D'UNE VALEUR
// ============================================================

function cleanValue(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .trim()
    .replace(/^"|"$/g, '')
    .trim();
}


// ============================================================
// LECTURE CSV
//
// Exemple :
// 6003,"6B","SIC","MAT6","F12",1,7,,
//
// Résultat :
// 6003
// 6B
// SIC
// MAT6
// F12
// 1
// 7
// ''
// ''
// ============================================================

function parseCSVLine(line) {

  const result = [];

  let current = '';

  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {

    const character = line[i];

    if (character === '"') {

      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i += 1;

      } else {

        insideQuotes = !insideQuotes;

      }

    } else if (
      character === ',' &&
      !insideQuotes
    ) {

      result.push(current.trim());

      current = '';

    } else {

      current += character;

    }
  }

  result.push(current.trim());

  return result;
}


// ============================================================
// CONVERSION DES SETS
// ============================================================

function convertSetsToArrays(value) {

  if (Array.isArray(value)) {

    return value.map(
      convertSetsToArrays
    );

  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {

    const result = {};

    Object.keys(value).forEach(
      function(key) {

        if (value[key] instanceof Set) {

          result[key] =
            Array.from(value[key]);

        } else {

          result[key] =
            convertSetsToArrays(
              value[key]
            );

        }

      }
    );

    return result;
  }

  return value;
}


// ============================================================
// MODAL EMPLOI DU TEMPS
// ============================================================

function ScheduleModal(props) {

  const {
    entityName,
    scheduleType,
    scheduleData,
    onClose
  } = props;


  const grid = {};


  DAYS.forEach(
    function(day) {

      grid[day] = {};

      HOURS.forEach(
        function(hour) {

          grid[day][hour] = [];

        }
      );

    }
  );


  scheduleData.forEach(
    function(entry) {

      const day =
        String(entry.day || '');

      const hour =
        String(entry.hour || '');


      if (
        DAYS.includes(day) &&
        HOURS.includes(hour)
      ) {

        grid[day][hour].push(
          entry
        );

      }

    }
  );


  let title = '';


  if (scheduleType === 'professors') {

    title =
      'Emploi du temps de ' +
      entityName;

  } else if (
    scheduleType === 'classes'
  ) {

    title =
      'Emploi du temps de la classe ' +
      entityName;

  } else if (
    scheduleType === 'rooms'
  ) {

    title =
      'Emploi du temps du local ' +
      entityName;

  } else {

    title =
      'Détails pour ' +
      entityName;

  }


  return (

    <div
      className="
        fixed inset-0 z-50
        bg-black bg-opacity-50
        flex items-center justify-center
        p-4
      "
    >

      <div
        className="
          bg-white
          rounded-lg
          shadow-xl
          w-full
          max-w-6xl
          max-h-[90vh]
          p-6
          overflow-hidden
        "
      >

        <div
          className="
            flex
            justify-between
            items-center
            border-b
            pb-3
            mb-4
          "
        >

          <h2
            className="
              text-2xl
              font-bold
              text-gray-800
            "
          >
            {title}
          </h2>


          <button
            type="button"
            onClick={onClose}
            className="
              text-gray-500
              hover:text-gray-800
              text-3xl
              font-bold
            "
          >
            X
          </button>

        </div>


        {scheduleData.length === 0 ? (

          <p className="text-gray-600">
            Aucun emploi du temps trouvé.
          </p>

        ) : (

          <div
            className="
              overflow-auto
              max-h-[70vh]
            "
          >

            <table
              className="
                w-full
                border-collapse
                border
                border-gray-300
              "
            >

              <thead
                className="
                  bg-gray-100
                  sticky
                  top-0
                "
              >

                <tr>

                  <th
                    className="
                      border
                      border-gray-300
                      p-2
                      text-sm
                      w-28
                    "
                  >
                    Heure
                  </th>


                  {DAYS.map(
                    function(day) {

                      return (

                        <th
                          key={day}
                          className="
                            border
                            border-gray-300
                            p-2
                            text-sm
                          "
                        >
                          {DAY_NAMES[day]}
                        </th>

                      );

                    }
                  )}

                </tr>

              </thead>


              <tbody>

                {HOURS.map(
                  function(hour) {

                    return (

                      <tr
                        key={hour}
                      >

                        <td
                          className="
                            border
                            border-gray-300
                            p-2
                            text-sm
                            font-semibold
                            bg-gray-50
                            align-top
                          "
                        >
                          {HOUR_NAMES[hour]}
                        </td>


                        {DAYS.map(
                          function(day) {

                            const entries =
                              grid[day][hour];


                            return (

                              <td
                                key={
                                  day +
                                  '-' +
                                  hour
                                }
                                className="
                                  border
                                  border-gray-300
                                  p-2
                                  text-sm
                                  align-top
                                "
                              >

                                {entries.length === 0 ? (

                                  <span
                                    className="
                                      text-gray-300
                                    "
                                  >
                                    -
                                  </span>

                                ) : (

                                  <div
                                    className="
                                      space-y-2
                                    "
                                  >

                                    {entries.map(
                                      function(
                                        entry,
                                        index
                                      ) {

                                        return (

                                          <div
                                            key={
                                              day +
                                              '-' +
                                              hour +
                                              '-' +
                                              index
                                            }
                                            className="
                                              border-b
                                              border-gray-200
                                              pb-2
                                              last:border-b-0
                                            "
                                          >

                                            <div
                                              className={
                                                scheduleType ===
                                                'professors'
                                                  ? 'font-semibold text-blue-800'
                                                  : scheduleType ===
                                                    'classes'
                                                  ? 'font-semibold text-green-800'
                                                  : 'font-semibold text-purple-800'
                                              }
                                            >
                                              {
                                                entry.course ||
                                                'Cours inconnu'
                                              }
                                            </div>


                                            {scheduleType ===
                                              'professors' && (

                                              <>

                                                <div
                                                  className="
                                                    text-xs
                                                    text-gray-700
                                                  "
                                                >
                                                  Classe :{' '}
                                                  {
                                                    entry.class ||
                                                    '-'
                                                  }
                                                </div>

                                                <div
                                                  className="
                                                    text-xs
                                                    text-gray-700
                                                  "
                                                >
                                                  Local :{' '}
                                                  {
                                                    entry.room ||
                                                    '-'
                                                  }
                                                </div>

                                              </>

                                            )}


                                            {scheduleType ===
                                              'classes' && (

                                              <>

                                                <div
                                                  className="
                                                    text-xs
                                                    text-gray-700
                                                  "
                                                >
                                                  Prof :{' '}
                                                  {
                                                    entry.professorName ||
                                                    '-'
                                                  }
                                                </div>

                                                <div
                                                  className="
                                                    text-xs
                                                    text-gray-700
                                                  "
                                                >
                                                  Local :{' '}
                                                  {
                                                    entry.room ||
                                                    '-'
                                                  }
                                                </div>

                                              </>

                                            )}


                                            {scheduleType ===
                                              'rooms' && (

                                              <>

                                                <div
                                                  className="
                                                    text-xs
                                                    text-gray-700
                                                  "
                                                >
                                                  Prof :{' '}
                                                  {
                                                    entry.professorName ||
                                                    '-'
                                                  }
                                                </div>

                                                <div
                                                  className="
                                                    text-xs
                                                    text-gray-700
                                                  "
                                                >
                                                  Classe :{' '}
                                                  {
                                                    entry.class ||
                                                    '-'
                                                  }
                                                </div>

                                              </>

                                            )}

                                          </div>

                                        );

                                      }
                                    )}

                                  </div>

                                )}

                              </td>

                            );

                          }
                        )}

                      </tr>

                    );

                  }
                )}

              </tbody>

            </table>

          </div>

        )}


        <div
          className="
            flex
            justify-end
            mt-4
          "
        >

          <button
            type="button"
            onClick={onClose}
            className="
              bg-blue-600
              hover:bg-blue-700
              text-white
              font-bold
              py-2
              px-4
              rounded
            "
          >
            Fermer
          </button>

        </div>

      </div>

    </div>

  );
}


// ============================================================
// APPLICATION
// ============================================================

function App() {

  const [
    professorHours,
    setProfessorHours
  ] = useState({});


  const [
    allSchedules,
    setAllSchedules
  ] = useState({
    professors: {},
    classes: {},
    rooms: {}
  });


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    error,
    setError
  ] = useState(null);


  const [
    activeTab,
    setActiveTab
  ] = useState('professors');


  const [
    selectedEntity,
    setSelectedEntity
  ] = useState(null);


  const [
    isModalOpen,
    setIsModalOpen
  ] = useState(false);


  const [
    fileName,
    setFileName
  ] = useState(
    'Aucun fichier sélectionné'
  );


  const [
    db,
    setDb
  ] = useState(null);


  const [
    isAuthReady,
    setIsAuthReady
  ] = useState(false);


  const [
    showAdminPanel,
    setShowAdminPanel
  ] = useState(false);


  // ==========================================================
  // FIREBASE
  // ==========================================================

  useEffect(
    function() {

      try {

        const configText =
          process.env
            .REACT_APP_FIREBASE_CONFIG;


        if (!configText) {

          setError(
            'REACT_APP_FIREBASE_CONFIG est absente dans Netlify.'
          );

          setLoading(false);

          return;

        }


        const firebaseConfig =
          JSON.parse(
            configText
          );


        const app =
          initializeApp(
            firebaseConfig
          );


        const auth =
          getAuth(app);


        const firestore =
          getFirestore(app);


        setDb(
          firestore
        );


        const unsubscribe =
          onAuthStateChanged(
            auth,
            function() {

              setIsAuthReady(
                true
              );

            }
          );


        if (
          typeof __initial_auth_token !==
            'undefined' &&
          __initial_auth_token
        ) {

          signInWithCustomToken(
            auth,
            __initial_auth_token
          ).catch(
            function() {

              return signInAnonymously(
                auth
              );

            }
          );

        } else {

          signInAnonymously(
            auth
          );

        }


        return function() {

          unsubscribe();

        };

      } catch (err) {

        console.error(err);

        setError(
          'Erreur Firebase : ' +
          err.message
        );

        setLoading(false);

      }

    },
    []
  );


  // ==========================================================
  // FIRESTORE
  // ==========================================================

  useEffect(
    function() {

      if (
        !db ||
        !isAuthReady
      ) {

        return undefined;

      }


      const scheduleRef =
        doc(
          db,
          'app_data',
          'current_schedule'
        );


      const unsubscribe =
        onSnapshot(

          scheduleRef,

          function(snapshot) {

            if (
              snapshot.exists()
            ) {

              const data =
                snapshot.data();


              if (
                data.schedules
              ) {

                setAllSchedules(
                  data.schedules
                );

              }


              if (
                data.professorHours
              ) {

                setProfessorHours(
                  data.professorHours
                );

              }

            }


            setLoading(false);

          },

          function(err) {

            console.error(err);

            setError(
              'Impossible de charger les plannings : ' +
              err.message
            );

            setLoading(false);

          }

        );


      return function() {

        unsubscribe();

      };

    },
    [
      db,
      isAuthReady
    ]
  );


  // ==========================================================
  // IMPORT DU FICHIER
  // ==========================================================

  function handleFileUpload(event) {

    const file =
      event.target.files &&
      event.target.files[0];


    if (!file) {

      return;

    }


    if (!db) {

      setError(
        'La base de données n est pas disponible.'
      );

      return;

    }


    setFileName(
      file.name
    );


    const reader =
      new FileReader();


    reader.onload =
      async function(e) {

        try {

          setError(null);


          const text =
            String(
              e.target.result || ''
            );


          const schedules = {

            professors: {},

            classes: {},

            rooms: {}

          };


          const hours =
            {};


          let imported =
            0;


          let ignored =
            0;


          const lines =
            text.split(
              /\r?\n/
            );


          lines.forEach(
            function(line) {

              if (!line.trim()) {

                return;

              }


              const columns =
                parseCSVLine(
                  line
                );


              /*
               * GPU001.TXT
               *
               * 0 = numero
               * 1 = classe
               * 2 = professeur
               * 3 = cours
               * 4 = local
               * 5 = jour
               * 6 = heure
               *
               * Exemple :
               *
               * 6003,"6B","SIC","MAT6","F12",1,7,,
               */


              if (
                columns.length < 7
              ) {

                ignored += 1;

                return;

              }


              const className =
                cleanValue(
                  columns[1]
                ) ||
                'Classe inconnue';


              const professor =
                cleanValue(
                  columns[2]
                ) ||
                UNKNOWN_PROFESSOR;


              const course =
                cleanValue(
                  columns[3]
                ) ||
                'Cours inconnu';


              const room =
                cleanValue(
                  columns[4]
                ) ||
                'N/A';


              const day =
                cleanValue(
                  columns[5]
                );


              const hour =
                cleanValue(
                  columns[6]
                );


              if (
                !DAYS.includes(day) ||
                !HOURS.includes(hour)
              ) {

                ignored += 1;

                return;

              }


              const entry = {

                day: day,

                hour: hour,

                class: className,

                professorName: professor,

                course: course,

                room: room

              };


              // --------------------------------------------------
              // PROFESSEURS
              // --------------------------------------------------

              if (
                !schedules.professors[
                  professor
                ]
              ) {

                schedules.professors[
                  professor
                ] = [];

              }


              schedules.professors[
                professor
              ].push(
                entry
              );


              // --------------------------------------------------
              // CLASSES
              // --------------------------------------------------

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
              ].push(
                entry
              );


              // --------------------------------------------------
              // LOCAUX
              // --------------------------------------------------

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
              ].push(
                entry
              );


              // --------------------------------------------------
              // NOMBRE D HEURES
              // --------------------------------------------------

              if (
                hours[professor] ===
                undefined
              ) {

                hours[professor] = 0;

              }


              hours[professor] += 1;


              imported += 1;

            }
          );


          if (
            imported === 0
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
                hours,

              updatedAt:
                new Date()
                  .toISOString(),

              sourceFile:
                file.name,

              importedLines:
                imported,

              ignoredLines:
                ignored

            }

          );


          alert(
            'Fichier injecté avec succès !\n\n' +
            imported +
            ' ligne(s) importée(s).\n' +
            ignored +
            ' ligne(s) ignorée(s).'
          );


        } catch (err) {

          console.error(err);

          setError(
            'Erreur lors de l import : ' +
            err.message
          );

        }

      };


    reader.readAsText(
      file,
      'UTF-8'
    );

  }


  // ==========================================================
  // ADMIN
  // ==========================================================

  function handleSecretClick() {

    const password =
      window.prompt(
        'Entrez le mot de passe administrateur :'
      );


    if (
      password ===
      'MonMotDePasseSecret123'
    ) {

      setShowAdminPanel(
        true
      );

    } else if (
      password !== null
    ) {

      window.alert(
        'Mot de passe incorrect.'
      );

    }

  }


  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  if (loading) {

    return (

      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-gray-50
        "
      >

        <div
          className="
            bg-white
            p-8
            rounded-lg
            shadow
          "
        >

          <p
            className="
              text-gray-700
            "
          >
            Chargement des horaires...
          </p>

        </div>

      </div>

    );

  }


  // ==========================================================
  // INTERFACE
  // ==========================================================

  return (

    <div
      className="
        min-h-screen
        bg-gray-50
        p-6
      "
    >

      <header
        className="
          max-w-6xl
          mx-auto
          mb-8
          bg-white
          p-6
          rounded-lg
          shadow-sm
        "
      >

        <div
          className="
            flex
            flex-col
            md:flex-row
            justify-between
            items-center
          "
        >

          <div>

            <h1
              onDoubleClick={
                handleSecretClick
              }
              className="
                text-3xl
                font-bold
                text-gray-900
                select-none
              "
            >
              Horaires des Professeurs
            </h1>


            <p
              className="
                text-sm
                text-gray-500
                mt-1
              "
            >
              Application synchronisée
            </p>

          </div>


          {showAdminPanel && (

            <div
              className="
                mt-4
                md:mt-0
                p-4
                border
                border-blue-200
                bg-blue-50
                rounded-lg
                w-full
                md:w-auto
              "
            >

              <div
                className="
                  flex
                  justify-between
                  items-center
                  mb-2
                "
              >

                <h3
                  className="
                    text-sm
                    font-semibold
                    text-blue-900
                  "
                >
                  Import du fichier TXT
                </h3>


                <button
                  type="button"
                  onClick={
                    function() {
                      setShowAdminPanel(
                        false
                      );
                    }
                  }
                  className="
                    text-gray-500
                    hover:text-gray-800
                    text-xs
                  "
                >
                  Fermer
                </button>

              </div>


              <input
                type="file"
                accept=".txt"
                onChange={
                  handleFileUpload
                }
                className="
                  block
                  w-full
                  text-xs
                "
              />


              <p
                className="
                  text-xs
                  text-gray-600
                  mt-2
                "
              >
                Fichier : {fileName}
              </p>

            </div>

          )}

        </div>

      </header>


      {error && (

        <div
          className="
            max-w-6xl
            mx-auto
            mb-4
            bg-red-100
            border
            border-red-300
            text-red-700
            p-4
            rounded-lg
          "
        >

          <strong>
            Erreur :
          </strong>{' '}

          {error}

        </div>

      )}


      <main
        className="
          max-w-6xl
          mx-auto
          bg-white
          rounded-lg
          shadow-sm
          p-6
        "
      >

        {/* ====================================================
            ONGLETS
            ==================================================== */}

        <div
          className="
            flex
            border-b
            border-gray-200
            mb-6
          "
        >

          <button
            type="button"
            onClick={
              function() {
                setActiveTab(
                  'professors'
                );
              }
            }
            className={
              'py-2 px-4 font-medium text-sm border-b-2 ' +
              (
                activeTab ===
                'professors'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500'
              )
            }
          >
            Professeurs
          </button>


          <button
            type="button"
            onClick={
              function() {
                setActiveTab(
                  'classes'
                );
              }
            }
            className={
              'py-2 px-4 font-medium text-sm border-b-2 ' +
              (
                activeTab ===
                'classes'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500'
              )
            }
          >
            Classes
          </button>


          <button
            type="button"
            onClick={
              function() {
                setActiveTab(
                  'rooms'
                );
              }
            }
            className={
              'py-2 px-4 font-medium text-sm border-b-2 ' +
              (
                activeTab ===
                'rooms'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500'
              )
            }
          >
            Locaux
          </button>

        </div>


        {/* ====================================================
            LISTE
            ==================================================== */}

        <div
          className="
            grid
            grid-cols-2
            sm:grid-cols-3
            md:grid-cols-4
            lg:grid-cols-6
            gap-3
          "
        >

          {Object.keys(
            allSchedules[
              activeTab
            ] || {}
          )
            .sort(
              function(a, b) {

                return a.localeCompare(
                  b,
                  undefined,
                  {
                    numeric: true,
                    sensitivity: 'base'
                  }
                );

              }
            )
            .map(
              function(entity) {

                return (

                  <button
                    type="button"
                    key={entity}
                    onClick={
                      function() {

                        setSelectedEntity(
                          entity
                        );

                        setIsModalOpen(
                          true
                        );

                      }
                    }
                    className="
                      p-3
                      text-center
                      bg-gray-50
                      hover:bg-blue-50
                      border
                      border-gray-200
                      rounded-lg
                      font-medium
                      text-gray-700
                    "
                  >

                    {entity}


                    {activeTab ===
                      'professors' &&
                      professorHours[
                        entity
                      ] !== undefined && (

                        <span
                          className="
                            block
                            text-xs
                            font-normal
                            text-gray-400
                            mt-1
                          "
                        >
                          {
                            professorHours[
                              entity
                            ]
                          } h
                        </span>

                      )}

                  </button>

                );

              }
            )}

        </div>


        {Object.keys(
          allSchedules[
            activeTab
          ] || {}
        ).length === 0 && (

          <p
            className="
              text-gray-500
              text-center
              py-8
            "
          >
            Aucun horaire disponible.
          </p>

        )}

      </main>


      {/* ======================================================
          MODAL
          ====================================================== */}

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
              ] &&
              allSchedules[
                activeTab
              ][
                selectedEntity
              ]
                ? allSchedules[
                    activeTab
                  ][
                    selectedEntity
                  ]
                : []
            }

            onClose={
              function() {

                setIsModalOpen(
                  false
                );

                setSelectedEntity(
                  null
                );

              }
            }

          />

        )}

    </div>

  );
}


export default App;
```

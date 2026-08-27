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
              onClick={() => setActiveTab(tab)}
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

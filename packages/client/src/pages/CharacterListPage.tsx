import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCharacterStore } from "../store";

export function CharacterListPage() {
  const { list, listLoaded, loadList, create, remove } = useCharacterStore();
  const [name, setName] = useState("");
  const [useAp, setUseAp] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleCreate = async () => {
    const character = await create(name.trim() || "Namenloser Held", useAp);
    setName("");
    navigate(`/charakter/${character.id}`);
  };

  return (
    <div className="page">
      <h1>Charaktere</h1>

      <div className="create-row">
        <input
          placeholder="Name des neuen Helden"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
        />
        <label className="checkbox" title="Für Homebrew-Systeme mit eigener Werteverteilung">
          <input type="checkbox" checked={!useAp} onChange={(e) => setUseAp(!e.target.checked)} />
          Ohne AP (Homebrew)
        </label>
        <button className="primary" onClick={() => void handleCreate()}>
          Neuer Charakter
        </button>
      </div>

      {!listLoaded ? (
        <p className="muted">Lade …</p>
      ) : list.length === 0 ? (
        <p className="muted">Noch keine Charaktere. Leg den ersten an!</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Spezies</th>
              <th>Profession</th>
              <th>AP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <a
                    href={`/charakter/${c.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/charakter/${c.id}`);
                    }}
                  >
                    {c.name}
                  </a>
                </td>
                <td>{c.species?.name ?? "–"}</td>
                <td>{c.profession?.name ?? "–"}</td>
                <td>{c.useAp ? c.apTotal : "ohne AP"}</td>
                <td className="row-actions">
                  <button onClick={() => navigate(`/charakter/${c.id}`)}>Öffnen</button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (window.confirm(`"${c.name}" wirklich löschen?`)) void remove(c.id);
                    }}
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

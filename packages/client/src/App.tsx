import { NavLink, Route, Routes } from "react-router-dom";
import { CharacterEditorPage } from "./pages/CharacterEditorPage";
import { CharacterListPage } from "./pages/CharacterListPage";
import { DataBrowserPage } from "./pages/DataBrowserPage";

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">DSA Charakter-Editor</span>
        <nav>
          <NavLink to="/" end>
            Charaktere
          </NavLink>
          <NavLink to="/daten">Regeldaten</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<CharacterListPage />} />
          <Route path="/charakter/:id" element={<CharacterEditorPage />} />
          <Route path="/daten" element={<DataBrowserPage />} />
        </Routes>
      </main>
    </div>
  );
}

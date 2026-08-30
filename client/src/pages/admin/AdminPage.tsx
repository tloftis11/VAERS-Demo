import { useEffect, useState } from "react";
import {
  adminListVaccineOptions,
  adminCreateVaccineOption,
  adminUpdateVaccineOption,
  type AdminVaccineOption,
} from "../../api/client";

const TOKEN_KEY = "vaers_admin_token";

/**
 * Prototype-scoped admin portal: CRUD for the vaccine reference-data table
 * (see plan Phase 4). Deliberately narrow — this is not a CDC
 * reviewer/case-management system, just the one reference table whose
 * hardcoded predecessor (VACCINE_TYPES/VACCINE_TYPES_HCP) would otherwise
 * need a code deploy to update. Auth is a single shared token, explicitly
 * not production-grade (see requireAdminToken in server/src/routes/admin.ts).
 */
export function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? "");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    if (!token) return;
    adminListVaccineOptions(token)
      .then(() => setAuthed(true))
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken("");
      });
  }, [token]);

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    adminListVaccineOptions(tokenInput)
      .then(() => {
        sessionStorage.setItem(TOKEN_KEY, tokenInput);
        setToken(tokenInput);
        setAuthed(true);
      })
      .catch(() => setAuthError("Incorrect admin token."));
  }

  function handleSignOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setAuthed(false);
    setTokenInput("");
  }

  if (!authed) {
    return (
      <div className="page page--prose">
        <h1>Staff sign-in</h1>
        <p className="field__hint">
          Prototype-only shared token — for this demo, enter the word <strong>staff</strong>. A
          production deployment would use real federal identity (PIV/CAC or SSO) here instead.
        </p>
        <form onSubmit={handleSignIn}>
          <div className="field">
            <label className="field__label" htmlFor="admin-token">
              Staff token
            </label>
            <input
              id="admin-token"
              type="password"
              className="field__input"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              autoFocus
            />
          </div>
          {authError && <p className="field__error">{authError}</p>}
          <button type="submit" className="button button--primary">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return <VaccineOptionsAdmin token={token} onSignOut={handleSignOut} />;
}

function VaccineOptionsAdmin({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [options, setOptions] = useState<AdminVaccineOption[] | null>(null);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newAudience, setNewAudience] = useState<"public" | "hcp">("public");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reload() {
    adminListVaccineOptions(token).then(setOptions);
  }

  useEffect(reload, [token]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newValue.trim() || !newLabel.trim()) return;
    adminCreateVaccineOption(token, { value: newValue.trim(), label: newLabel.trim(), audience: newAudience })
      .then(() => {
        setNewValue("");
        setNewLabel("");
        reload();
      })
      .catch((err) => setError(err.message ?? "Failed to add vaccine option"));
  }

  function handleToggleActive(option: AdminVaccineOption) {
    adminUpdateVaccineOption(token, option.id, { active: !option.active }).then(reload);
  }

  function startEdit(option: AdminVaccineOption) {
    setEditingId(option.id);
    setEditingLabel(option.label);
  }

  function saveEdit(id: string) {
    if (!editingLabel.trim()) return;
    adminUpdateVaccineOption(token, id, { label: editingLabel.trim() }).then(() => {
      setEditingId(null);
      reload();
    });
  }

  if (!options) {
    return <div className="page">Loading…</div>;
  }

  return (
    <div className="page">
      <div className="admin-header">
        <h1>Vaccine reference data</h1>
        <button type="button" className="button button--text" onClick={onSignOut}>
          Sign out
        </button>
      </div>
      <p className="field__hint">
        Options marked inactive stop appearing in new reports but stay here — a past report may
        still reference one.
      </p>

      <form onSubmit={handleAdd} className="admin-add-form">
        <input
          className="field__input"
          placeholder="Value (e.g. covid19)"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <input
          className="field__input"
          placeholder="Label (e.g. COVID-19)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <select
          className="field__select"
          aria-label="Audience"
          value={newAudience}
          onChange={(e) => setNewAudience(e.target.value as "public" | "hcp")}
        >
          <option value="public">Public</option>
          <option value="hcp">Healthcare provider</option>
        </select>
        <button type="submit" className="button button--primary">
          Add
        </button>
      </form>
      {error && <p className="field__error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Value</th>
            <th>Label</th>
            <th>Audience</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {options.map((option) => (
            <tr key={option.id} className={option.active ? "" : "admin-table__row--inactive"}>
              <td>{option.value}</td>
              <td>
                {editingId === option.id ? (
                  <input
                    className="field__input"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    autoFocus
                  />
                ) : (
                  option.label
                )}
              </td>
              <td>{option.audience === "hcp" ? "HCP" : "Public"}</td>
              <td>{option.active ? "Active" : "Inactive"}</td>
              <td className="admin-table__actions">
                {editingId === option.id ? (
                  <>
                    <button type="button" className="button button--text" onClick={() => saveEdit(option.id)}>
                      Save
                    </button>
                    <button type="button" className="button button--text" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="button button--text" onClick={() => startEdit(option)}>
                      Edit
                    </button>
                    <button type="button" className="button button--text" onClick={() => handleToggleActive(option)}>
                      {option.active ? "Deactivate" : "Activate"}
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

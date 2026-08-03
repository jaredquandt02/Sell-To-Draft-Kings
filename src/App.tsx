import { useState } from "react";
import {
  createInitialState,
  runSimulation,
  type SimulatorState,
} from "./simulator";
import "./App.css";

export default function App() {
  const [state, setState] = useState<SimulatorState>(createInitialState);
  const [busy, setBusy] = useState(false);

  async function handleRun() {
    setBusy(true);
    setState((s) => ({ ...s, status: "running", result: null }));

    // Short delay so the UI shows "running" before results land.
    await new Promise((r) => setTimeout(r, 450));

    const result = runSimulation(state.players, state.entryFee);
    setState((s) => ({ ...s, status: "complete", result }));
    setBusy(false);
  }

  function handleReset() {
    setState(createInitialState());
  }

  return (
    <div className="shell">
      <header className="hero">
        <p className="brand">Gladiator</p>
        <h1>Sell to DraftKings</h1>
        <p className="lede">
          Local simulator scaffold — run a roster through variance and see a
          placeholder payout curve.
        </p>
        <div className="actions">
          <button type="button" className="primary" onClick={handleRun} disabled={busy}>
            {busy ? "Simulating…" : "Run simulation"}
          </button>
          <button type="button" className="ghost" onClick={handleReset} disabled={busy}>
            Reset
          </button>
        </div>
      </header>

      <section className="panel" aria-label="Roster">
        <div className="panel-head">
          <h2>Roster</h2>
          <label className="fee">
            Entry
            <input
              type="number"
              min={1}
              step={1}
              value={state.entryFee}
              disabled={busy}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  entryFee: Math.max(1, Number(e.target.value) || 1),
                }))
              }
            />
          </label>
        </div>
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Player</th>
              <th>Proj</th>
              <th>Salary</th>
              {state.result ? <th>Sim</th> : null}
            </tr>
          </thead>
          <tbody>
            {state.players.map((p) => {
              const sim = state.result?.players.find((r) => r.id === p.id);
              return (
                <tr key={p.id}>
                  <td>{p.position}</td>
                  <td>{p.name}</td>
                  <td>{p.projectedPoints.toFixed(1)}</td>
                  <td>${p.salary.toLocaleString()}</td>
                  {state.result ? (
                    <td className={sim && sim.simulatedPoints >= p.projectedPoints ? "up" : "down"}>
                      {sim?.simulatedPoints.toFixed(1) ?? "—"}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {state.result ? (
        <section className="result" aria-live="polite">
          <h2>Result</h2>
          <dl>
            <div>
              <dt>Total points</dt>
              <dd>{state.result.totalPoints.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Est. payout</dt>
              <dd>${state.result.payoutEstimate.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Seed</dt>
              <dd>{state.result.seed}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}

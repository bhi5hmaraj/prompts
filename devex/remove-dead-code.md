

---

## 1. Static pass: kill the obviously dead stuff

**[ ] Turn on compiler hygiene**

* In `tsconfig.json`:

  * `noUnusedLocals: true`
  * `noUnusedParameters: true`

**[ ] Turn on lint hygiene**

* Enable:

  * `@typescript-eslint/no-unused-vars`
  * any `import/no-unused-modules` / similar rule you use.

**[ ] Run an unused export scanner**

Pick one:

* `npx knip`
* or `npx ts-prune`
* or `npx unimported`

Then:

* **[ ] Delete / archive** files where *all* exports are unused.
* **[ ] Mark suspicious modules** (big things with 0 references) for review.

---

## 2. Frontend: what actually runs when you play the game?

**[ ] Use Chrome Coverage**

1. Open app in Chrome.
2. DevTools → `More tools` → `Coverage`.
3. Click record.
4. Click through the game like a real user (core flows).
5. Stop recording.

Then:

* **[ ] List FE files that are 0% or near-0% executed.**
* **[ ] Cross-check with static tools; move the obvious zombies to `legacy/` or delete.**

**Optional** (if you have tests):

* **[ ] Run Jest/Playwright/Cypress with coverage** and inspect `coverage/` for FE files that are never hit.

---

## 3. Backend: define and observe entrypoints

**[ ] Create `ENTRYPOINTS.md`**

List *all* server entrypoints:

* Colyseus:

  * `GameRoom.onJoin`
  * `GameRoom.onMessage("submit_action")`
  * `onMessage("advance_round")`
  * etc.
* Any HTTP API routes.
* Any cron jobs / queues / workers.

This is your “root set”.

**[ ] Add lightweight logging per entrypoint**

Inside each entrypoint, log once:

```ts
logger.info("entrypoint_called", {
  name: "roundAdvance",
  roomId,
  // maybe playerId/sessionId
});
```

Then:

* **[ ] Play the game / run flows, then grep logs**:

  * Which entrypoints never show up at all?
  * That’s a strong signal their downstream code is unused too.

**Optional**:

* **[ ] Run backend tests with coverage** (Jest with `--coverage`) and inspect which server files are never hit.

---

## 4. Cross-cut: make “public vs internal” crystal clear

**[ ] Decide what counts as “public entrypoints”**

* e.g. everything in:

  * `app/` or `pages/` (Next routes)
  * `server/routes/` (HTTP)
  * `rooms/` (Colyseus)
  * `jobs/` (workers)

**[ ] Treat everything else as internal**

* When in doubt:

  * If a file isn’t reachable from any entrypoint (by static tools *and* coverage), it’s probably safe to:

    * delete,
    * or move to `legacy/` and forget.

---

## 5. Ongoing guardrails so it doesn’t rot again

**[ ] Add a simple “dead code” CI step**

* Run `knip` / `ts-prune` / similar in CI.
* Fail or warn on new unused exports / files.

**[ ] Keep naming honest**

* Domain types: `GameState`, `GameSetup`.
* Transport/view: `GameStateMpSchema`, `GameSetupForm`, `GameSetupDb`.
* That makes it obvious *what’s allowed to die* (old view / transport) vs what is core.

**[ ] Periodically re-run coverage + static tools**
Whenever you do a big migration, rerun this checklist briefly.

---

 “minimum viable cleanup” path:

1. Turn on TS/ESLint unused checks.
2. Run `knip` (or similar) once and delete the obvious junk.
3. Use Chrome Coverage while you play the game and list untouched FE files.
4. Add logging to a few critical backend entrypoints and see what never fires.

That alone will massively shrink the “I have no idea what’s used” zone.

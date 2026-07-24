# House Template Library

Professional residential layouts as **editable vector geometry** (JSON → PlanDocument).

## Layout

```
templates/
  3-marla/
    traditional.json
    modern.json
    corner.json
  5-marla/
    ...
  7-marla/
  10-marla/
  20-marla/
```

## Add a template

1. Copy an existing JSON file in the matching plot folder.
2. Give it a unique `id` (e.g. `5-marla-my-layout`).
3. Edit rooms, partitions, doors, windows (normalized 0–1 footprint coords).
4. Run:

```bash
npm run templates:sync -w @boq/geometry
```

No application logic changes required. The gallery discovers templates from the generated catalog.

## Coordinates

- `x,y,w,h` and partition endpoints are **normalized** within the buildable footprint (plot minus setback).
- The builder maps them to metres and creates walls, rooms, doors, windows, stairs, columns.
- Output is a normal `PlanDocument` — fully editable in the planner, live-synced to BOQ.

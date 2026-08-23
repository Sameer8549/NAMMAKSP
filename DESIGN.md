# NAMMA KSP Design System

## Direction

**Integrated Command Ledger.** The interface is a modern operational descendant of a police control-room ledger: fixed command navigation, evidence-first bands, disciplined data tables, and analytical drawers. It rejects decorative SaaS card walls, excessive empty space, glass effects, and cinematic 3D.

## Palette

- Command navy `#0B1F3A`: navigation and decisive structural surfaces.
- Police blue `#1E5AA8`: active navigation, links, selected analysis.
- Intelligence teal `#087E78`: verified analytical state and normal operations.
- Karnataka saffron `#D47A12`: primary decisions and focused actions.
- Threat red `#B4232C`: critical warnings only.
- Evidence white `#FFFFFF`, canvas `#EEF2F6`, ink `#122033`, muted `#5D6B7C`.
- Dark theme uses deep neutral navy surfaces with pale blue-white text; semantic colors retain meaning.

## Typography

Use Inter and Noto Sans Kannada. Page titles are 24-30px, panel titles 14-17px, body 13-15px, metadata 11-12px. Letter spacing is zero. Numeric evidence uses tabular figures.

## Composition

- Header 58px, sidebar 232px, content width unconstrained but padded 24px.
- Page commands occupy a compact left-aligned command band.
- Repeated entities may be cards with radius 8px; page sections remain unframed bands.
- Tables, matrices, split panes, and drawers carry operational content.
- No cards nested inside cards and no decorative page-section shadows.

## Controls

Icon buttons for tools, segmented controls for filters, clear text buttons for commands, badges only for state, and drawers for evidence drilldown. Every interactive element has hover, focus, loading, disabled, empty, and error states.

## Motion

One restrained operational motion language: 120ms press, 180ms hover, 240ms drawer. Animate transform and opacity with exponential ease-out. Honor `prefers-reduced-motion`.

## Responsive

At tablet/mobile widths, navigation becomes a drawer, command actions wrap into a stable two-column bar, analytical grids become single-column, tables scroll horizontally, and no content creates viewport overflow.

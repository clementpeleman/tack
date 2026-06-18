// Public type surface for `@tack/widget` consumers (e.g. the browser
// extension). Decoupled from the internal source so importers don't inherit
// the widget's build-only imports (`?inline` CSS, workspace `.ts` paths).

export interface MountTackWidgetOptions {
  /** Public project key (`pk_…`). */
  projectKey: string
  /** Origin of the Tack host, e.g. `https://tack.example.com`. */
  apiHost: string
  /** Optional script element to read theme config (`data-theme`) from. */
  themeScript?: HTMLScriptElement | null
}

/**
 * Mount the Tack widget into the current document. Returns `false` (and does
 * nothing) when the viewport is too small, the project key is missing, or the
 * widget is already mounted.
 */
export function mountTackWidget(options: MountTackWidgetOptions): boolean

/** Remove a mounted widget, if present. */
export function unmountTackWidget(): void

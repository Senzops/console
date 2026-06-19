import * as React from "react"

/*
  Skeleton → content cross-fade
  -----------------------------
  When a page swaps its skeleton for the real content, the skeleton unmounts and
  the content mounts in the same commit. A plain swap "pops"; fading the content
  in from 0 briefly shows the empty background (reads as a flicker). The fix is a
  cross-fade: hold the OUTGOING skeleton one beat longer as an absolutely-
  positioned overlay that fades OUT over the content, which is already at full
  opacity underneath.

  Implementation: a skeleton component registers, via `useFadeOutOnUnmount`, a
  snapshot of what it looks like. When it unmounts (data arrived), the provider
  renders that snapshot as a fading overlay (.content-transition-out in
  globals.css) over the <main> content region, then drops it. The registration
  runs in a layout-effect cleanup, so React flushes the overlay synchronously
  before the browser paints — the overlay is present in the very frame the new
  content first appears (no blank frame, no pop).

  Safety: if no provider is mounted the hook is a no-op, and the fade-out call is
  guarded — this can never break a page's loading state, it only adds polish.
*/

type RevealApi = { fadeOut: (node: React.ReactNode) => void }

const RevealContext = React.createContext<RevealApi | null>(null)

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

/**
 * Registers a snapshot of the current (skeleton) subtree to be faded out when
 * this component unmounts. `render` is called at unmount time to produce the
 * overlay content, so it always reflects the latest props.
 */
export const useFadeOutOnUnmount = (render: () => React.ReactNode) => {
  const api = React.useContext(RevealContext)
  const renderRef = React.useRef(render)
  renderRef.current = render

  useIsoLayoutEffect(() => {
    return () => {
      try {
        api?.fadeOut(renderRef.current())
      } catch {
        /* never let a polish effect break a page */
      }
    }
    // Only re-arm if the provider identity changes.
  }, [api])
}

/** Duration must match the .content-transition-out animation in globals.css. */
const FADE_MS = 340

/**
 * Renders its children plus any in-flight fade-out overlays. Mount this inside a
 * `position: relative` container (the dashboard <main>) so overlays cover the
 * content region.
 */
export const RevealProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = React.useState<{ id: number; node: React.ReactNode }[]>([])
  const idRef = React.useRef(0)

  const api = React.useMemo<RevealApi>(
    () => ({
      fadeOut: (node) => {
        const id = ++idRef.current
        setItems((prev) => [...prev, { id, node }])
        window.setTimeout(
          () => setItems((prev) => prev.filter((i) => i.id !== id)),
          FADE_MS,
        )
      },
    }),
    [],
  )

  return (
    <RevealContext.Provider value={api}>
      {children}
      {items.map(({ id, node }) => (
        <div key={id} className="content-transition-out" aria-hidden="true">
          {node}
        </div>
      ))}
    </RevealContext.Provider>
  )
}

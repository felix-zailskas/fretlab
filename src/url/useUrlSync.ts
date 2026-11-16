import { useCallback, useEffect, useRef, useState } from "react";
import { parseUrl, type ParsedUrl } from "./parseUrl";
import { serializeUrl } from "./serializeUrl";
import type { ShareState } from "./shareState";
import { matchesTopic, type TopicPath } from "./topicPaths";

export type UrlSync = {
  // The topic page the visitor is on, while the state still matches it.
  topic: TopicPath | null;
  // True while the topic strip should show: on topic and not dismissed.
  topicActive: boolean;
  dismissTopic: () => void;
};

// After the first render, state drives the URL: every change rewrites it in
// place, a tab switch adds one history entry, and back/forward re-reads the
// URL into state through `apply`.
export function useUrlSync(
  state: ShareState,
  apply: (state: ShareState) => void,
  initialTopic: TopicPath | null,
): UrlSync {
  const [topic, setTopic] = useState(initialTopic);
  const [dismissed, setDismissed] = useState(false);

  // Leaving the topic is final for this visit: drop it during render so the
  // URL written below already falls back to "/?…".
  if (topic !== null && !matchesTopic(state, topic)) setTopic(null);
  const liveTopic = topic !== null && matchesTopic(state, topic) ? topic : null;

  const lastView = useRef(state.view);
  useEffect(() => {
    const url = serializeUrl(state, liveTopic);
    const current = window.location.pathname + window.location.search;
    if (url !== current) {
      // Browsers throttle history updates (Safari throws past ~100 per 30 s,
      // e.g. while the progression player changes chords). A skipped write
      // only leaves the address bar a step behind; the next change catches up.
      try {
        if (state.view !== lastView.current) window.history.pushState(null, "", url);
        else window.history.replaceState(null, "", url);
      } catch {
        // ignore
      }
    }
    lastView.current = state.view;
  }, [state, liveTopic]);

  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });
  useEffect(() => {
    function onPopState() {
      const parsed: ParsedUrl = parseUrl(new URL(window.location.href));
      lastView.current = parsed.state.view;
      setTopic(parsed.topic);
      applyRef.current(parsed.state);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const dismissTopic = useCallback(() => setDismissed(true), []);
  return {
    topic: liveTopic,
    topicActive: liveTopic !== null && !dismissed,
    dismissTopic,
  };
}

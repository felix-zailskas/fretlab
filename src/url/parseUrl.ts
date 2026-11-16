import { isPentatonicAvailable } from "../theory/pentatonic";
import { PARAMS } from "./params";
import { DEFAULT_SHARE_STATE, type ShareState } from "./shareState";
import { topicForPath, type TopicPath } from "./topicPaths";

export type ParsedUrl = { state: ShareState; topic: TopicPath | null };

// Builds the state a URL describes in three layers: defaults, then what a
// topic path pins, then query params. Params for pinned fields, unknown
// params and invalid values are ignored; parsing never throws.
export function parseUrl(url: URL): ParsedUrl {
  const topic = topicForPath(url.pathname);
  const state: ShareState = topic
    ? { ...DEFAULT_SHARE_STATE, key: topic.defaultKey, ...topic.fixes }
    : { ...DEFAULT_SHARE_STATE };
  const pinned = new Set(topic ? Object.keys(topic.fixes) : []);

  for (const param of PARAMS) {
    if (pinned.has(param.field)) continue;
    const raw = url.searchParams.get(param.name);
    if (raw === null) continue;
    const value = param.decode(raw);
    if (value !== undefined) (state as Record<string, unknown>)[param.field] = value;
  }

  // The app's own rule: pentatonic exists only in Ionian and Aeolian.
  if (!isPentatonicAvailable(state.mode)) state.scaleType = "full";
  return { state, topic };
}

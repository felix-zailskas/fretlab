import { PARAMS } from "./params";
import { DEFAULT_SHARE_STATE, type ShareState } from "./shareState";
import { matchesTopic, sameValue, type TopicPath } from "./topicPaths";

// Writes the URL for a state. While the state still matches the topic it
// was opened on, the topic's path is kept and only differences from that
// page's own defaults go in the query; otherwise it is "/" plus every field
// that differs from the app defaults. Fields equal to their default are
// omitted, so links stay short.
export function serializeUrl(state: ShareState, topic: TopicPath | null): string {
  const onTopic = topic !== null && matchesTopic(state, topic);
  const base: ShareState = onTopic
    ? { ...DEFAULT_SHARE_STATE, key: topic.defaultKey, ...topic.fixes }
    : DEFAULT_SHARE_STATE;

  const query = new URLSearchParams();
  for (const param of PARAMS) {
    if (sameValue(state[param.field], base[param.field])) continue;
    query.set(param.name, param.encode(state[param.field] as never));
  }
  // Commas stay readable: URLSearchParams would write them as %2C.
  const search = query.toString().replace(/%2C/g, ",");
  const path = onTopic ? topic.path : "/";
  return search === "" ? path : `${path}?${search}`;
}

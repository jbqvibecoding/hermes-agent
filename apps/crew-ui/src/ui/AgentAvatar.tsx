/**
 * Stands in for errand/src/ui/components/AgentAvatar.tsx, which generates a
 * `boring-avatars` beam from the agent's name.
 *
 * We do not generate one: hiring a teammate asks for an emoji, so there is
 * always a picture the operator chose. Pulling in an avatar library for a
 * fallback that never fires would be a dependency for a code path we do not
 * have. The hue is derived from the id so a teammate keeps the same tile
 * colour everywhere it appears.
 */

import type { Agent } from "../domain/types";

function hueOf(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) % 360;
  return hash;
}

export function AgentAvatar({ agent, size = 36 }: {
  agent: Pick<Agent, "id" | "name"> & { avatar?: string };
  size?: number;
}) {
  const hue = hueOf(agent.id || agent.name);
  return <span
    className="agent-avatar"
    role="img"
    aria-label={`${agent.name} avatar`}
    style={{
      width: size,
      height: size,
      fontSize: Math.round(size * 0.52),
      background: `hsl(${hue} 62% 46% / 0.16)`,
      color: `hsl(${hue} 62% 46%)`,
    }}
  >{agent.avatar || agent.name.trim().slice(0, 1).toUpperCase()}</span>;
}

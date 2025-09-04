export interface TagWithTeam {
  id?: string;
  name: string;
  teamName?: string | null;
  team_id?: string | null;
}

export function formatTagLabel(tag: TagWithTeam): string {
  const team = (tag.teamName ?? "").trim().toUpperCase();
  const safeName = tag.name.trim().toUpperCase();
  
  if (team.length > 0) {
    return `#${team} - ${safeName}`;
  }
  
  return `# - ${safeName}`;
}
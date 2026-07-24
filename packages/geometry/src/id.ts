let seq = 0;

export function gid(prefix = 'g'): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
}

export function resetGeometryIds(): void {
  seq = 0;
}

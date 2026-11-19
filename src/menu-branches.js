// Which branches sell each menu item. menu_items.branch_ids holds a JSON list of branch ids;
// an empty list means every branch, so new items and new branches need no extra setup.
import { db } from './db.js';
import { bad } from './validate.js';

export const activeBranchIds = () => db.prepare('SELECT id FROM branches WHERE available = 1 ORDER BY sort_order, id').all().map((b) => b.id);

// The branches an item is sold at, limited to branches that are still open. [] means every branch.
export function itemBranchIds(raw, branchIds = activeBranchIds()) {
  let ids;
  try { ids = JSON.parse(raw || '[]'); } catch { ids = []; }
  if (!Array.isArray(ids)) return [];
  const kept = [...new Set(ids.map(Number))].filter((id) => branchIds.includes(id));
  return kept.length === branchIds.length ? [] : kept;
}

// Reads the admin's "Available at" ticks ("1,2" or a list). Leaving the field out keeps the current value.
export function parseBranchIds(value, existingRaw = '[]') {
  if (value === undefined) return existingRaw || '[]';
  const known = db.prepare('SELECT id FROM branches').all().map((b) => b.id);
  const picked = [...new Set((Array.isArray(value) ? value : String(value).split(','))
    .map((v) => Number(String(v).trim()))
    .filter(Boolean))];
  if (picked.some((id) => !known.includes(id))) throw bad('That branch no longer exists. Please refresh the page.');
  if (!picked.length) throw bad('Tick at least one branch that sells this item.');
  const active = activeBranchIds();
  if (active.every((id) => picked.includes(id))) return '[]';
  return JSON.stringify(picked.sort((a, b) => a - b));
}

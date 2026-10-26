import { DatasetError, validateDataset, type ValidationResult } from './validate';

export async function loadDataset(
  url = `${import.meta.env.BASE_URL}data/data.json`,
): Promise<ValidationResult> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new DatasetError(`Could not fetch ${url}.`);
  }
  if (!res.ok) throw new DatasetError(`Could not load ${url} (HTTP ${res.status}).`);
  let raw: unknown;
  try {
    raw = await res.json();
  } catch (e) {
    throw new DatasetError(`data.json is not valid JSON: ${(e as Error).message}`);
  }
  return validateDataset(raw);
}

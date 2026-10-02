export interface SingleSearchValue {
  value: string | null;
  duplicated: boolean;
}

export const getSingleSearchValue = (params: URLSearchParams, key: string): SingleSearchValue => {
  const values = params.getAll(key);
  return {
    value: values[0] ?? null,
    duplicated: values.length > 1
  };
};

export const getUnknownSearchKeys = (params: URLSearchParams, allowedKeys: readonly string[]): string[] => {
  const allowed = new Set(allowedKeys);
  return [...new Set([...params.keys()].filter((key) => !allowed.has(key)))];
};

export const omitDefaultSearchValues = (
  params: URLSearchParams,
  defaults: Record<string, string>
): URLSearchParams | null => {
  const nextParams = new URLSearchParams(params);
  let changed = false;

  for (const [key, defaultValue] of Object.entries(defaults)) {
    const values = nextParams.getAll(key);
    if (values.length === 1 && values[0] === defaultValue) {
      nextParams.delete(key);
      changed = true;
    }
  }

  return changed ? nextParams : null;
};

export const setSearchValue = (
  params: URLSearchParams,
  key: string,
  value: string,
  defaultValue?: string
): URLSearchParams => {
  const nextParams = new URLSearchParams(params);
  nextParams.delete(key);
  if (value !== "" && value !== defaultValue) {
    nextParams.set(key, value);
  }
  return nextParams;
};
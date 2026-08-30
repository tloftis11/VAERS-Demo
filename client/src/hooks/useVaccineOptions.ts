import { useEffect, useState } from "react";
import { getVaccineOptions, type VaccineOption } from "../api/client";

/** Live vaccine dropdown options for the reporting flow — replaces the old
 * static VACCINE_TYPES/VACCINE_TYPES_HCP imports so a CDC staffer adding a
 * vaccine in /admin shows up here with no redeploy. */
export function useVaccineOptions(audience: "public" | "hcp") {
  const [options, setOptions] = useState<VaccineOption[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOptions(null);
    getVaccineOptions(audience)
      .then((result) => {
        if (!cancelled) setOptions(result);
      })
      .catch(() => {
        // A network/server failure shouldn't leave the caller stuck on
        // "loading" forever — resolve to empty so VaccineStep's static-list
        // fallback kicks in instead.
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  return options;
}

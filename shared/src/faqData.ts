/**
 * Static, keyword-matched FAQ dataset (design doc §4.5): "an embedded,
 * searchable FAQ — keyword/topic-matched to the user's current step, plus a
 * general FAQ popup reachable from anywhere." Deterministic by design, per
 * the doc's non-AI MVP decision (§6.8).
 */
import type { StepId } from "./branchingRules";

/** `en`/`es` rather than importing the client's `Language` type — shared/src
 * stays framework/UI-agnostic, so it declares its own minimal shape instead. */
export type FaqLanguage = "en" | "es";
interface Localized {
  en: string;
  es: string;
}

export interface FaqEntry {
  id: string;
  question: Localized;
  answer: Localized;
  keywords: string[];
  /** Steps where this entry should surface contextually; omit/empty for "general" entries shown everywhere in global search. */
  steps: StepId[];
}

/** A single entry with `question`/`answer` already resolved to one language —
 * what `searchFaq`/`faqForStep` return, and what the client actually renders. */
export interface ResolvedFaqEntry {
  id: string;
  question: string;
  answer: string;
}

function resolve(entry: FaqEntry, lang: FaqLanguage): ResolvedFaqEntry {
  return { id: entry.id, question: entry.question[lang], answer: entry.answer[lang] };
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "what-is-vaers",
    question: { en: "What is VAERS?", es: "¿Qué es VAERS?" },
    answer: {
      en: "VAERS (Vaccine Adverse Event Reporting System) is the national early-warning system used to monitor the safety of vaccines. Anyone — patients, parents, or healthcare providers — can submit a report.",
      es: "VAERS (Sistema de Reporte de Eventos Adversos de Vacunas) es el sistema nacional de alerta temprana usado para monitorear la seguridad de las vacunas. Cualquier persona — pacientes, padres o proveedores de atención médica — puede enviar un reporte.",
    },
    keywords: ["vaers", "what is", "purpose", "about"],
    steps: [],
  },
  {
    id: "who-should-report",
    question: { en: "Who should submit a report?", es: "¿Quién debería enviar un reporte?" },
    answer: {
      en: "Anyone who experiences or witnesses a possible adverse event after vaccination can report — patients, parents/guardians, caregivers, and healthcare providers.",
      es: "Cualquier persona que experimente o presencie un posible evento adverso después de la vacunación puede reportar — pacientes, padres/tutores, cuidadores y proveedores de atención médica.",
    },
    keywords: ["who", "should", "report", "eligible"],
    steps: ["submitter-type"],
  },
  {
    id: "adverse-event-vs-error",
    question: {
      en: "What's the difference between an adverse event and an administration error?",
      es: "¿Cuál es la diferencia entre un evento adverso y un error de administración?",
    },
    answer: {
      en: "An adverse event is an unexpected health problem after vaccination. An administration error means the vaccine itself was given incorrectly (wrong dose, wrong vaccine, wrong route) but the patient had no resulting health problem.",
      es: "Un evento adverso es un problema de salud inesperado después de la vacunación. Un error de administración significa que la vacuna en sí se administró incorrectamente (dosis incorrecta, vacuna incorrecta, vía incorrecta) pero el paciente no tuvo ningún problema de salud como resultado.",
    },
    keywords: ["adverse event", "error", "difference", "no ae"],
    steps: ["administration-error", "adverse-event-occurred"],
  },
  {
    id: "dont-know-lot-number",
    question: { en: "What if I don't know the lot number?", es: "¿Qué pasa si no sé el número de lote?" },
    answer: {
      en: "That's okay — public reporters can leave the lot number blank or mark it unknown. Check your vaccination card or ask your provider's office if you're able to.",
      es: "Está bien — los reporteros públicos pueden dejar el número de lote en blanco o marcarlo como desconocido. Revise su tarjeta de vacunación o pregunte en el consultorio de su proveedor si puede.",
    },
    keywords: ["lot number", "don't know", "unknown"],
    steps: ["vaccine"],
  },
  {
    id: "how-long-does-it-take",
    question: { en: "How long does a report take to complete?", es: "¿Cuánto tiempo toma completar un reporte?" },
    answer: {
      en: "Most reports take about 10 minutes. You can save your progress and come back later if you need to gather more information.",
      es: "La mayoría de los reportes toman unos 10 minutos. Puede guardar su progreso y volver más tarde si necesita reunir más información.",
    },
    keywords: ["how long", "time", "minutes"],
    steps: [],
  },
  {
    id: "save-and-resume",
    question: { en: "Can I save my progress and finish later?", es: "¿Puedo guardar mi progreso y terminar más tarde?" },
    answer: {
      en: "Yes. Your draft is saved automatically as you move between steps. Use the link provided to return to your draft.",
      es: "Sí. Su borrador se guarda automáticamente mientras se mueve entre los pasos. Use el enlace proporcionado para volver a su borrador.",
    },
    keywords: ["save", "resume", "later", "draft"],
    steps: ["review"],
  },
  {
    id: "upload-later",
    question: { en: "Can I add documents after I submit?", es: "¿Puedo agregar documentos después de enviar?" },
    answer: {
      en: "Yes. This form lets you attach documents now, but you can also use the existing follow-up information tool to add records after submission.",
      es: "Sí. Este formulario le permite adjuntar documentos ahora, pero también puede usar la herramienta de información de seguimiento existente para agregar registros después del envío.",
    },
    keywords: ["upload", "later", "after submit", "follow-up", "documents"],
    steps: ["documents"],
  },
  {
    id: "privacy",
    question: { en: "Is my information kept private?", es: "¿Mi información se mantiene privada?" },
    answer: {
      en: "Your information is protected and used only for vaccine-safety monitoring. Only the minimum information needed to evaluate the report is collected.",
      es: "Su información está protegida y se usa únicamente para el monitoreo de la seguridad de las vacunas. Solo se recopila la información mínima necesaria para evaluar el reporte.",
    },
    keywords: ["privacy", "private", "confidential", "phi", "pii"],
    steps: ["about-you", "patient"],
  },
  {
    id: "what-happens-after-submit",
    question: { en: "What happens after I submit?", es: "¿Qué sucede después de que envío?" },
    answer: {
      en: "Your report is reviewed as part of ongoing vaccine safety monitoring. You generally won't receive an individual response, but the data contributes to national safety surveillance.",
      es: "Su reporte se revisa como parte del monitoreo continuo de la seguridad de las vacunas. Generalmente no recibirá una respuesta individual, pero los datos contribuyen a la vigilancia nacional de seguridad.",
    },
    keywords: ["after", "submit", "next", "what happens"],
    steps: ["review"],
  },
  {
    id: "hcp-medical-record-number",
    question: { en: "Is the medical record number required?", es: "¿Se requiere el número de registro médico?" },
    answer: {
      en: "For healthcare-provider reports, yes — it helps link the report back to the source record if follow-up is needed.",
      es: "Para los reportes de proveedores de atención médica, sí — ayuda a vincular el reporte con el registro fuente si se necesita seguimiento.",
    },
    keywords: ["medical record number", "mrn", "required"],
    steps: ["patient"],
  },
];

export function searchFaq(query: string, step?: StepId, lang: FaqLanguage = "en"): ResolvedFaqEntry[] {
  const q = query.trim().toLowerCase();
  const pool = step
    ? FAQ_ENTRIES.filter((e) => e.steps.length === 0 || e.steps.includes(step))
    : FAQ_ENTRIES;

  if (!q) return pool.map((e) => resolve(e, lang));

  return pool
    .filter((entry) => {
      // Match against both languages' text regardless of the requested
      // display language, so search still finds the right entry even if the
      // reporter types a term in the other language mid-switch.
      const haystack = [entry.question.en, entry.answer.en, entry.question.es, entry.answer.es, ...entry.keywords]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).some((term) => term.length > 1 && haystack.includes(term));
    })
    .map((e) => resolve(e, lang));
}

export function faqForStep(step: StepId, lang: FaqLanguage = "en"): ResolvedFaqEntry[] {
  return FAQ_ENTRIES.filter((e) => e.steps.includes(step)).map((e) => resolve(e, lang));
}

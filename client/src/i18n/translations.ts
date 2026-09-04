export type Language = "en" | "es";

/**
 * Scoped translation set — matches the real VAERS eSubmitter system's own
 * per-step "en Español" pattern, but doesn't attempt every micro-copy string
 * across all ~8 wizard steps in one pass (that's hundreds of field labels,
 * hints, and option lists, many carrying medical/legal terminology that
 * deserves its own careful translation review rather than a first draft
 * done all at once). This covers the highest-visibility, highest-value
 * content: navigation, the landing page, the entry point before the wizard
 * begins, the two pieces of legal/certification text, and the confirmation
 * page — enough to prove the mechanism end-to-end. Extending it to the rest
 * of the wizard is exactly the same pattern: add more keys here.
 */
export const translations = {
  // Nav labels specifically stay short in both languages — even though
  // "FAQ" has a much fuller Spanish translation elsewhere (the FAQ page's
  // own heading), using it here made the Spanish nav row's total width
  // cross the wrap threshold at viewport widths where English didn't,
  // which changed the header's height when switching languages.
  "nav.faq": { en: "FAQ", es: "Preguntas" },
  "nav.about": { en: "About VAERS", es: "Acerca de VAERS" },
  "nav.accessibility": { en: "Accessibility", es: "Accesibilidad" },
  "nav.reportEvent": { en: "Report an Event", es: "Reportar un evento" },
  "nav.followUp": { en: "Provide Follow-up Info", es: "Información de seguimiento" },
  "nav.languageEnglish": { en: "English", es: "English" },
  "nav.languageSpanish": { en: "Español", es: "Español" },
  "nav.languageSelectLabel": { en: "Language", es: "Idioma" },

  "landing.heading": {
    en: "Report a possible vaccine adverse event or administration error",
    es: "Reporte un posible evento adverso o error de administración de una vacuna",
  },
  "landing.lead": {
    en: "VAERS (Vaccine Adverse Event Reporting System) is the national early-warning system for vaccine safety. Reporting takes about 10 minutes, and the form adapts to who you are and what happened so you're only asked what's relevant.",
    es: "VAERS (Sistema de Notificación de Eventos Adversos de Vacunas) es el sistema nacional de alerta temprana para la seguridad de las vacunas. Reportar toma aproximadamente 10 minutos, y el formulario se adapta a quién es usted y lo que sucedió para preguntarle solo lo relevante.",
  },
  "landing.reportEvent": { en: "Report an Event", es: "Reportar un evento" },
  "landing.learnMore": { en: "Learn More", es: "Más información" },
  "landing.followUp": { en: "Already reported? Provide follow-up info", es: "¿Ya reportó? Agregar información de seguimiento" },
  "landing.stat.time": { en: "~10 min", es: "~10 min" },
  "landing.stat.timeLabel": { en: "Typical time to complete", es: "Tiempo típico para completar" },
  "landing.stat.mobile": { en: "Mobile-friendly", es: "Compatible con móviles" },
  "landing.stat.mobileLabel": { en: "Works on any device", es: "Funciona en cualquier dispositivo" },
  "landing.stat.agencies": { en: "CDC & FDA", es: "CDC y FDA" },
  "landing.stat.agenciesLabel": { en: "Reviewed by both agencies", es: "Revisado por ambas agencias" },
  "landing.tile.faq.title": { en: "Frequently Asked Questions", es: "Preguntas frecuentes" },
  "landing.tile.faq.body": {
    en: "Answers to common questions about reporting, privacy, and what happens next.",
    es: "Respuestas a preguntas comunes sobre cómo reportar, privacidad, y qué sucede después.",
  },
  "landing.tile.about.title": { en: "About VAERS", es: "Acerca de VAERS" },
  "landing.tile.about.body": {
    en: "Background on the program, its purpose, and who should report.",
    es: "Información sobre el programa, su propósito, y quién debe reportar.",
  },
  "landing.tile.data.title": { en: "Look Up Data / Downloads", es: "Buscar datos / descargas" },
  "landing.tile.data.body": {
    en: "Opens the live VAERS data and download tools on vaers.hhs.gov in a new tab.",
    es: "Abre los datos y herramientas de descarga en vivo de VAERS en vaers.hhs.gov en una nueva pestaña.",
  },
  "landing.tile.followUp.title": { en: "Provide Follow-up Information", es: "Proporcionar información de seguimiento" },
  "landing.tile.followUp.body": {
    en: "Add documents or updates to a report you've already submitted, using your reference number.",
    es: "Agregue documentos o actualizaciones a un reporte que ya envió, usando su número de referencia.",
  },

  "beforeYouStart.heading": { en: "Before You Start", es: "Antes de comenzar" },
  "beforeYouStart.notice.title": { en: "How Your Report Is Used", es: "Cómo se usa su reporte" },
  "beforeYouStart.notice.body": {
    en: "Your report helps CDC and FDA monitor vaccine safety. Personal information is only used for follow-up if necessary and is protected.",
    es: "Su reporte ayuda al CDC y la FDA a monitorear la seguridad de las vacunas. La información personal solo se usa para seguimiento si es necesario y está protegida.",
  },
  "beforeYouStart.learnMore": { en: "Learn More ›", es: "Más información ›" },
  "beforeYouStart.infoNeeded": { en: "Information Needed", es: "Información necesaria" },
  "beforeYouStart.infoNeededLead": {
    en: "Having this information will help you complete your report faster.",
    es: "Tener esta información a la mano le ayudará a completar su reporte más rápido.",
  },
  "beforeYouStart.checklist.vaccine": { en: "Vaccine name", es: "Nombre de la vacuna" },
  "beforeYouStart.checklist.date": { en: "Date of vaccination", es: "Fecha de vacunación" },
  "beforeYouStart.checklist.symptoms": { en: "Symptoms experienced", es: "Síntomas experimentados" },
  "beforeYouStart.hint": {
    en: "These are helpful to have on hand — nothing here is required to start your report.",
    es: "Es útil tener esto a la mano — nada aquí es obligatorio para comenzar su reporte.",
  },
  "common.back": { en: "← Back", es: "← Atrás" },
  "common.continue": { en: "Continue", es: "Continuar" },

  // Appears in three places, deliberately with escalating detail: the
  // header banner is the shortest (every page, top of screen, first thing
  // anyone sees), the footer repeats it in fuller form (every page,
  // bottom), and the About page's own notice gives the fullest context
  // specifically where VAERS itself is being described in real terms —
  // see PrototypeBanner.tsx, PrototypeFooter.tsx, and About.tsx.
  "prototype.bannerNotice": {
    en: "⚠ Demonstration prototype — not the real CDC VAERS system. No data entered here is sent to CDC, VAERS, or any government agency.",
    es: "⚠ Prototipo de demostración — no es el sistema real de VAERS de los CDC. Ningún dato ingresado aquí se envía a los CDC, VAERS ni a ninguna agencia gubernamental.",
  },
  "prototype.footerNotice": {
    en: "This website is a prototype built for demonstration purposes only. It is not part of the real CDC VAERS system, and nothing entered here is transmitted to CDC, VAERS, or any other government or third-party system — no real adverse event report is filed.",
    es: "Este sitio web es un prototipo creado únicamente con fines de demostración. No forma parte del sistema real de VAERS de los CDC, y ningún dato ingresado aquí se transmite a los CDC, VAERS ni a ningún otro sistema gubernamental o de terceros — no se presenta ningún reporte real de eventos adversos.",
  },
  "prototype.aboutPageNotice": {
    en: "The information below describes the real, official VAERS program for context. This website itself is a demonstration prototype, not the real VAERS system — nothing you submit here reaches CDC, VAERS, or any government agency.",
    es: "La información a continuación describe el programa real y oficial de VAERS como contexto. Este sitio web en sí es un prototipo de demostración, no el sistema real de VAERS — nada de lo que envíe aquí llega a los CDC, VAERS ni a ninguna agencia gubernamental.",
  },

  "legal.falseReportWarning": {
    en: "Knowingly submitting false information is a federal crime under 18 U.S.C. § 1001.",
    es: "Enviar información falsa a sabiendas es un delito federal bajo el Código 18 de EE. UU., Sección 1001.",
  },
  "legal.certify": {
    en: "I certify that the information provided is accurate to the best of my knowledge.",
    es: "Certifico que la información proporcionada es precisa según mi mejor conocimiento.",
  },

  "confirmation.heading": { en: "Thank you for reporting", es: "Gracias por reportar" },
  "confirmation.lead1": {
    en: "Your report has been received and is now part of the national effort to keep vaccines safe. Reports like yours are what make this system work.",
    es: "Su reporte ha sido recibido y ahora es parte del esfuerzo nacional para mantener seguras las vacunas. Reportes como el suyo son lo que hace funcionar este sistema.",
  },
  "confirmation.lead2": {
    en: "You're done — there's nothing else you need to do unless we contact you for more information.",
    es: "Ha terminado — no necesita hacer nada más a menos que nos comuniquemos con usted para más información.",
  },
  "confirmation.referenceLabel": { en: "Your reference number", es: "Su número de referencia" },
  "confirmation.referenceHint": {
    en: "Write this down or take a screenshot — you'll need it if you want to add documents or updates to this report later.",
    es: "Anótelo o tome una captura de pantalla — lo necesitará si desea agregar documentos o actualizaciones a este reporte más tarde.",
  },
  "confirmation.printButton": { en: "Print or save a copy of this page", es: "Imprimir o guardar una copia de esta página" },
  "confirmation.duplicateTitle": {
    en: "This report may be similar to one already on file.",
    es: "Este reporte puede ser similar a uno que ya está en archivo.",
  },
  "confirmation.duplicateNoAction": { en: "That's okay — no action is needed on your part.", es: "Está bien — no necesita hacer nada." },
  "confirmation.duplicateDetail": {
    en: "We automatically compared the patient, vaccine, and description against existing reports; a CDC reviewer will take a closer look before anything is merged or discarded.",
    es: "Comparamos automáticamente al paciente, la vacuna, y la descripción con reportes existentes; un revisor del CDC lo examinará más de cerca antes de que se combine o descarte algo.",
  },
  "confirmation.nextHeading": { en: "What happens next", es: "Qué sucede después" },
  "confirmation.next1": {
    en: "CDC and FDA staff review your report as part of ongoing vaccine-safety monitoring.",
    es: "El personal del CDC y la FDA revisa su reporte como parte del monitoreo continuo de la seguridad de las vacunas.",
  },
  "confirmation.next2": {
    en: "They may follow up with the contact on this report if more information is needed — you generally won't receive an individual response otherwise.",
    es: "Pueden comunicarse con el contacto de este reporte si se necesita más información — generalmente no recibirá una respuesta individual de otra manera.",
  },
  "confirmation.next3.before": { en: "If a discharge summary or other document comes in later, you can", es: "Si un resumen de alta u otro documento llega después, puede" },
  "confirmation.next3.link": { en: "add it to this report", es: "agregarlo a este reporte" },
  "confirmation.next3.after": {
    en: "using your reference number above — no need to submit a new one.",
    es: "usando su número de referencia arriba — no necesita enviar uno nuevo.",
  },
  "confirmation.surveyTitle": { en: "How was your reporting experience?", es: "¿Cómo fue su experiencia al reportar?" },
  "confirmation.surveyPrompt": { en: "Rate your experience submitting this report", es: "Califique su experiencia al enviar este reporte" },
} satisfies Record<string, Record<Language, string>>;

export type TranslationKey = keyof typeof translations;

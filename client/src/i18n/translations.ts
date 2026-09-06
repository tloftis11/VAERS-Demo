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

  // The conversational-step engine's own chrome (shared by every wizard
  // step) — field labels/hints/options themselves are translated per step,
  // not here; this is only the surrounding "question 3 of 12"/Next/Back/
  // Skip/review-screen framing that's identical regardless of which step
  // is active.
  "convo.questionOf": { en: "Question {n} of {total}", es: "Pregunta {n} de {total}" },
  "convo.next": { en: "Next →", es: "Siguiente →" },
  "convo.skip": { en: "Skip →", es: "Omitir →" },
  "convo.notProvided": { en: "Not provided", es: "No proporcionado" },
  "convo.editAnswer": { en: "Edit answer: {label}", es: "Editar respuesta: {label}" },
  "convo.edit": { en: "Edit", es: "Editar" },
  "convo.reviewTitle": { en: "Review: {title}", es: "Revisar: {title}" },
  "convo.fixBeforeContinuing": {
    en: "Please fix the following before continuing:",
    es: "Corrija lo siguiente antes de continuar:",
  },
  "convo.saving": { en: "Saving…", es: "Guardando…" },

  // Step labels shown in the progress indicator, the "jump to a completed
  // step" dropdown, the "Editing X — you'll return to Y" banner, and the
  // review screen's blocking-issue list — keyed to match StepId values in
  // shared/src/branchingRules.ts exactly (kept English-only there, since
  // that file is shared with the server; translation only happens here,
  // client-side, at render time).
  "step.submitter-type": { en: "Who is reporting?", es: "¿Quién está reportando?" },
  "step.before-you-start": { en: "Before you start", es: "Antes de comenzar" },
  "step.administration-error": { en: "Administration error?", es: "¿Error de administración?" },
  "step.adverse-event-occurred": { en: "Adverse event?", es: "¿Evento adverso?" },
  "step.about-you": { en: "About you", es: "Sobre usted" },
  "step.patient": { en: "About the patient", es: "Sobre el paciente" },
  "step.vaccine": { en: "Vaccine information", es: "Información de la vacuna" },
  "step.adverse-event": { en: "What happened", es: "Qué sucedió" },
  "step.error-detail": { en: "Administration error details", es: "Detalles del error de administración" },
  "step.documents": { en: "Supporting documents", es: "Documentos de respaldo" },
  "step.review": { en: "Review & submit", es: "Revisar y enviar" },
  "step.editingBanner": {
    en: 'Editing "{current}" — you\'ll return to "{returnTo}" once you continue.',
    es: 'Editando "{current}" — volverá a "{returnTo}" una vez que continúe.',
  },
  "stepIndicator.ariaLabel": { en: "Report progress", es: "Progreso del reporte" },
  "stepIndicator.progressText": { en: "Step {n} of {total}: {label}", es: "Paso {n} de {total}: {label}" },
  "stepIndicator.jumpSrLabel": { en: "Jump to a completed step", es: "Ir a un paso completado" },
  "stepIndicator.jumpPlaceholder": { en: "Jump to a completed step…", es: "Ir a un paso completado…" },

  // Review & submit screen, and the section titles it shares with the
  // read-only FollowUp recap (both render the same ReportSummarySection
  // component with the same `title` strings).
  "review.heading": { en: "Review & submit", es: "Revisar y enviar" },
  "review.lead": {
    en: "Please review your report before submitting. You can go back to fix anything.",
    es: "Revise su reporte antes de enviarlo. Puede regresar para corregir cualquier cosa.",
  },
  "review.completeTheseSections": {
    en: "Please complete these sections before submitting:",
    es: "Complete estas secciones antes de enviar:",
  },
  "review.fixTheFollowing": {
    en: "Please fix the following before submitting:",
    es: "Corrija lo siguiente antes de enviar:",
  },
  "review.goFixThis": { en: "Go fix this", es: "Ir a corregir" },
  "review.submitError": {
    en: "Something went wrong submitting your report.",
    es: "Algo salió mal al enviar su reporte.",
  },
  "review.section.aboutYou": { en: "About you", es: "Sobre usted" },
  "review.section.aboutPatient": { en: "About the patient", es: "Sobre el paciente" },
  "review.section.vaccine": { en: "Vaccine information", es: "Información de la vacuna" },
  "review.section.whatHappened": { en: "What happened", es: "Qué sucedió" },
  "review.section.errorDetail": {
    en: "Administration error details",
    es: "Detalles del error de administración",
  },
  "review.section.documents": { en: "Supporting documents", es: "Documentos de respaldo" },
  "review.noDocuments": { en: "No documents attached.", es: "No se adjuntaron documentos." },
  "review.submitting": { en: "Submitting…", es: "Enviando…" },
  "review.submitReport": { en: "Submit report", es: "Enviar reporte" },

  // Provide Follow-up Information page
  "followUp.heading": { en: "Provide follow-up information", es: "Proporcionar información de seguimiento" },
  "followUp.lead": {
    en: "Already submitted a report and have new documents or details to add — like a discharge summary that arrived later, or an update on how the patient is doing? Look it up with the reference number from your confirmation page.",
    es: "¿Ya envió un reporte y tiene nuevos documentos o detalles que agregar — como un resumen de alta que llegó después, o una actualización sobre cómo está el paciente? Búsquelo con el número de referencia de su página de confirmación.",
  },
  "followUp.referenceNumber": { en: "Reference number", es: "Número de referencia" },
  "followUp.referenceHint": {
    en: "Shown on your confirmation page after you submitted the report.",
    es: "Se muestra en su página de confirmación después de enviar el reporte.",
  },
  "followUp.lookingUp": { en: "Looking up…", es: "Buscando…" },
  "followUp.findReport": { en: "Find my report", es: "Buscar mi reporte" },
  "followUp.notFound": {
    en: "We couldn't find a report with that reference number. Double-check it against your confirmation page and try again.",
    es: "No pudimos encontrar un reporte con ese número de referencia. Verifíquelo con su página de confirmación e intente de nuevo.",
  },
  "followUp.lookupError": {
    en: "Something went wrong looking up that report. Please try again in a moment.",
    es: "Algo salió mal al buscar ese reporte. Intente de nuevo en un momento.",
  },
  "followUp.draftNotAccessible": {
    en: "That report is still in progress and hasn't been submitted yet — it can only be continued from the device and browser it was started on.",
    es: "Ese reporte todavía está en progreso y no ha sido enviado — solo se puede continuar desde el dispositivo y navegador en el que se inició.",
  },
  "followUp.draftNotice": {
    en: "This report hasn't been submitted yet.",
    es: "Este reporte todavía no ha sido enviado.",
  },
  "followUp.continueCompleting": { en: "Continue completing it", es: "Continuar completándolo" },
  "followUp.draftNoticeAfter": {
    en: "— you can add documents on the final steps before you submit.",
    es: "— puede agregar documentos en los últimos pasos antes de enviar.",
  },
  "followUp.verifyItsYou": { en: "Verify it's you", es: "Verifique que es usted" },
  "followUp.verifyItsYouHint": {
    en: "This report has already been submitted, so before we show anything from it we need to confirm you're the person who filed it. Enter the email address you used when you submitted.",
    es: "Este reporte ya fue enviado, así que antes de mostrar cualquier información necesitamos confirmar que usted es quien lo presentó. Ingrese el correo electrónico que usó al enviarlo.",
  },
  "followUp.emailOfRecord": { en: "Email of record", es: "Correo electrónico registrado" },
  "followUp.emailMismatch": {
    en: "That email doesn't match our records for this report.",
    es: "Ese correo electrónico no coincide con nuestros registros para este reporte.",
  },
  "followUp.somethingWentWrong": { en: "Something went wrong. Please try again.", es: "Algo salió mal. Intente de nuevo." },
  "followUp.checking": { en: "Checking…", es: "Verificando…" },
  "followUp.sendCode": { en: "Send verification code", es: "Enviar código de verificación" },
  "followUp.enterCode": { en: "Enter your verification code", es: "Ingrese su código de verificación" },
  "followUp.prototypeNoteLabel": { en: "Prototype note:", es: "Nota del prototipo:" },
  "followUp.prototypeNoteBody": {
    en: "in production this code would be emailed to you. For this demo, here it is directly:",
    es: "en producción este código se le enviaría por correo electrónico. Para esta demostración, aquí está directamente:",
  },
  "followUp.sixDigitCode": { en: "6-digit code", es: "Código de 6 dígitos" },
  "followUp.codeIncorrect": {
    en: "That code is incorrect or has expired.",
    es: "Ese código es incorrecto o ha expirado.",
  },
  "followUp.verifying": { en: "Verifying…", es: "Verificando…" },
  "followUp.verify": { en: "Verify", es: "Verificar" },
  "followUp.referenceNumberLabel": { en: "Reference number", es: "Número de referencia" },
  "followUp.submitted": { en: "Submitted", es: "Enviado" },
  "followUp.whatYouSubmitted": { en: "What you submitted", es: "Lo que envió" },
  "followUp.additionalContext": { en: "Additional context", es: "Contexto adicional" },
  "followUp.documentsOnFile": { en: "Documents on file", es: "Documentos en archivo" },
  "followUp.addedAsFollowUp": { en: "— added as follow-up", es: "— agregado como seguimiento" },
  "followUp.noDocuments": {
    en: "No documents have been added to this report yet.",
    es: "Todavía no se han agregado documentos a este reporte.",
  },
  "followUp.addDocument": { en: "Add a document", es: "Agregar un documento" },
  "followUp.uploadingFiles": { en: "Uploading {n} file{plural}…", es: "Subiendo {n} archivo{plural}…" },
  "followUp.someFilesSkipped": {
    en: "Some files were skipped — only PDF, JPEG, PNG, or Word documents are accepted.",
    es: "Se omitieron algunos archivos — solo se aceptan documentos PDF, JPEG, PNG o Word.",
  },
  "followUp.uploadFailed": { en: "Upload failed", es: "Error al subir el archivo" },
  "followUp.followUpNotes": { en: "Follow-up notes", es: "Notas de seguimiento" },
  "followUp.addNote": { en: "Add a note", es: "Agregar una nota" },
  "followUp.addNoteButton": { en: "Add note", es: "Agregar nota" },
  "followUp.addNoteHint": {
    en: "For example, an update on recovery, or context for a document you just added.",
    es: "Por ejemplo, una actualización sobre la recuperación, o contexto para un documento que acaba de agregar.",
  },
  "followUp.adding": { en: "Adding…", es: "Agregando…" },

  // Administration Error Details step (HCP only)
  "errorDetail.type": { en: "Type of error", es: "Tipo de error" },
  "errorDetail.typeOther": { en: "Please describe the error type", es: "Describa el tipo de error" },
  "errorDetail.description": { en: "Describe the error", es: "Describa el error" },
  "errorDetail.discoveredDate": { en: "Date the error was discovered", es: "Fecha en que se descubrió el error" },
  "errorDetail.correctiveAction": {
    en: "Corrective action taken (optional)",
    es: "Acción correctiva tomada (opcional)",
  },
  "errorDetail.discoveredBeforeVaccination": {
    en: "The error-discovered date can't be before the vaccination date.",
    es: "La fecha en que se descubrió el error no puede ser anterior a la fecha de vacunación.",
  },

  // About the Patient step — most labels come in a self-report ("you/your")
  // and third-person ("the patient") pair, since the person answering and
  // the patient are the same only for a self-report (see PatientStep.tsx).
  "patient.firstName.self": { en: "Your first name", es: "Su nombre" },
  "patient.firstName.other": { en: "Patient's first name", es: "Nombre del paciente" },
  "patient.lastName.self": { en: "Your last name", es: "Su apellido" },
  "patient.lastName.other": { en: "Patient's last name", es: "Apellido del paciente" },
  "patient.dob": { en: "Date of birth", es: "Fecha de nacimiento" },
  "patient.dobHint.self": {
    en: "We use this to work out your age at vaccination automatically.",
    es: "Usamos esto para calcular su edad al momento de la vacunación automáticamente.",
  },
  "patient.dobHint.other": {
    en: "We use this to work out the patient's age at vaccination automatically.",
    es: "Usamos esto para calcular la edad del paciente al momento de la vacunación automáticamente.",
  },
  "patient.sex": { en: "Sex", es: "Sexo" },
  "patient.ageYears": {
    en: "How old was the patient when they got the vaccine? (years)",
    es: "¿Qué edad tenía el paciente cuando recibió la vacuna? (años)",
  },
  "patient.ageYearsHint": {
    en: "Whole years only. If the patient was younger than 1 year old, enter 0 — you'll be able to add months next.",
    es: "Solo años completos. Si el paciente tenía menos de 1 año, ingrese 0 — podrá agregar meses a continuación.",
  },
  "patient.ageMonths": {
    en: "If younger than 2 years old, how many additional months? (optional)",
    es: "Si tiene menos de 2 años, ¿cuántos meses adicionales? (opcional)",
  },
  "patient.ageMonthsHint": {
    en: "Only for infants and toddlers. For example, a patient who was 1 year and 6 months old: enter 1 above, and 6 here.",
    es: "Solo para bebés y niños pequeños. Por ejemplo, un paciente de 1 año y 6 meses: ingrese 1 arriba, y 6 aquí.",
  },
  "patient.address.self": { en: "Your address (optional)", es: "Su dirección (opcional)" },
  "patient.address.other": { en: "Patient's address (optional)", es: "Dirección del paciente (opcional)" },
  "patient.streetAddress.self": { en: "Your street address", es: "Su dirección" },
  "patient.streetAddress.other": { en: "Patient's street address", es: "Dirección del paciente" },
  "patient.cityError.self": { en: "Your city: {msg}", es: "Su ciudad: {msg}" },
  "patient.cityError.other": { en: "Patient's city: {msg}", es: "Ciudad del paciente: {msg}" },
  "patient.stateError.self": { en: "Your state: {msg}", es: "Su estado: {msg}" },
  "patient.stateError.other": { en: "Patient's state: {msg}", es: "Estado del paciente: {msg}" },
  "patient.zipError.self": { en: "Your ZIP: {msg}", es: "Su código postal: {msg}" },
  "patient.zipError.other": { en: "Patient's ZIP: {msg}", es: "Código postal del paciente: {msg}" },
  "patient.phone.self": { en: "Your phone (optional)", es: "Su teléfono (opcional)" },
  "patient.phone.other": { en: "Patient's phone (optional)", es: "Teléfono del paciente (opcional)" },
  "patient.email": { en: "Patient's email (optional)", es: "Correo electrónico del paciente (opcional)" },
  "patient.emailConfirm": { en: "Confirm patient's email", es: "Confirmar correo electrónico del paciente" },
  "patient.pregnant.self": {
    en: "Were you pregnant at the time of vaccination? (optional)",
    es: "¿Estaba embarazada al momento de la vacunación? (opcional)",
  },
  "patient.pregnant.other": {
    en: "Was the patient pregnant at the time of vaccination? (optional)",
    es: "¿Estaba embarazada la paciente al momento de la vacunación? (opcional)",
  },
  "patient.pregnantHint": {
    en: "If yes, you'll be able to describe the pregnancy and any complications next.",
    es: "Si es así, podrá describir el embarazo y cualquier complicación a continuación.",
  },
  "patient.pregnancyDetails": {
    en: "Describe the pregnancy and any complications (optional)",
    es: "Describa el embarazo y cualquier complicación (opcional)",
  },
  "patient.pregnancyDetailsHint": {
    en: "e.g. trimester at vaccination, and any pregnancy-related complications since.",
    es: "ej. trimestre al momento de la vacunación, y cualquier complicación relacionada con el embarazo desde entonces.",
  },
  "patient.medications": {
    en: "Prescriptions, OTC medications, or supplements at the time of vaccination (optional)",
    es: "Medicamentos recetados, de venta libre, o suplementos al momento de la vacunación (opcional)",
  },
  "patient.allergies": {
    en: "Allergies to medications, food, or other products (optional)",
    es: "Alergias a medicamentos, alimentos, u otros productos (opcional)",
  },
  "patient.recentIllnesses": {
    en: "Other illnesses at the time of vaccination or in the month before (optional)",
    es: "Otras enfermedades al momento de la vacunación o en el mes anterior (opcional)",
  },
  "patient.chronicConditions": {
    en: "Chronic or long-standing health conditions (optional)",
    es: "Condiciones de salud crónicas o de larga duración (opcional)",
  },
  "patient.chronicConditionsHint": { en: "e.g. asthma, diabetes, heart disease.", es: "ej. asma, diabetes, enfermedad cardíaca." },
  "patient.race.self": {
    en: "Your race (optional, select all that apply)",
    es: "Su raza (opcional, seleccione todas las que correspondan)",
  },
  "patient.race.other": {
    en: "Patient's race (optional, select all that apply)",
    es: "Raza del paciente (opcional, seleccione todas las que correspondan)",
  },
  "patient.raceHint": {
    en: 'Selecting "Other" adds a field to describe it, right here.',
    es: 'Seleccionar "Otra" agrega un campo para describirla, justo aquí.',
  },
  "patient.raceError": { en: "Race: {msg}", es: "Raza: {msg}" },
  "patient.raceOtherDescribe.self": { en: "Describe your race", es: "Describa su raza" },
  "patient.raceOtherDescribe.other": { en: "Describe the patient's race", es: "Describa la raza del paciente" },
  "patient.raceOtherPlaceholder": { en: "Please specify", es: "Por favor especifique" },
  "patient.ethnicity.self": { en: "Your ethnicity (optional)", es: "Su etnicidad (opcional)" },
  "patient.ethnicity.other": { en: "Patient's ethnicity (optional)", es: "Etnicidad del paciente (opcional)" },
  "patient.dobToggleHint": {
    en: "These two options are different: one still lets us estimate age automatically, the other asks for age directly instead.",
    es: "Estas dos opciones son diferentes: una todavía nos permite calcular la edad automáticamente, la otra pregunta la edad directamente.",
  },
  "patient.dobPartialToggle": {
    en: "I know the birth month and year, just not the exact day",
    es: "Sé el mes y año de nacimiento, pero no el día exacto",
  },
  "patient.dobPartialToggleHint": {
    en: "We'll still estimate age automatically from this.",
    es: "Aún así calcularemos la edad automáticamente a partir de esto.",
  },
  "patient.dobUnknownToggle": {
    en: "I don't know any part of the date of birth",
    es: "No sé ninguna parte de la fecha de nacimiento",
  },
  "patient.dobUnknownToggleHint": {
    en: "We'll ask for the patient's age directly instead — skip this if you were able to give a month and year above.",
    es: "En su lugar, le pediremos la edad del paciente directamente — omita esto si pudo indicar un mes y año arriba.",
  },
  "patient.selfReportAgeFlag": {
    en: "This date of birth suggests the patient is younger than {age}.",
    es: "Esta fecha de nacimiento sugiere que el paciente tiene menos de {age} años.",
  },
  "patient.selfReportPartialDobFlag": {
    en: "Not knowing your own exact date of birth is unusual for a self-report.",
    es: "No saber su propia fecha de nacimiento exacta es inusual para un autorreporte.",
  },
  "patient.changeWhoIsFilling": {
    en: "Change who's filling out this report",
    es: "Cambiar quién está completando este reporte",
  },
  "patient.skipPregnancy": {
    en: "We'll skip asking about pregnancy — {reason}.",
    es: "Omitiremos la pregunta sobre el embarazo — {reason}.",
  },
  "patient.skipReason.maleSelf": { en: "you're recorded as male", es: "está registrado como hombre" },
  "patient.skipReason.maleOther": { en: "the patient is recorded as male", es: "el paciente está registrado como hombre" },
  "patient.skipReason.ageSelf": { en: "your age makes this inapplicable", es: "su edad hace que esto no aplique" },
  "patient.skipReason.ageOther": {
    en: "the patient's age makes this inapplicable",
    es: "la edad del paciente hace que esto no aplique",
  },

  // Vaccine information step
  "vaccine.type": { en: "Vaccine", es: "Vacuna" },
  "vaccine.typeOther": { en: "Please specify the vaccine", es: "Especifique la vacuna" },
  "vaccine.manufacturer": { en: "Manufacturer (optional)", es: "Fabricante (opcional)" },
  "vaccine.manufacturerHint": {
    en: "We don't have a specific manufacturer list for this vaccine.",
    es: "No tenemos una lista específica de fabricantes para esta vacuna.",
  },
  "vaccine.administrationDate": { en: "Date administered", es: "Fecha de administración" },
  "vaccine.administrationTime": { en: "Time administered (optional)", es: "Hora de administración (opcional)" },
  "vaccine.doseNumber": { en: "Dose number (optional)", es: "Número de dosis (opcional)" },
  "vaccine.lotNumber": { en: "Lot number (optional)", es: "Número de lote (opcional)" },
  "vaccine.lotNumberHint": {
    en: "Check your vaccination card if you have it — otherwise leave blank.",
    es: "Revise su tarjeta de vacunación si la tiene — de lo contrario, déjelo en blanco.",
  },
  "vaccine.route": { en: "How was it given? (optional)", es: "¿Cómo se administró? (opcional)" },
  "vaccine.bodySite": { en: "Where was it given? (optional)", es: "¿Dónde se administró? (opcional)" },
  "vaccine.bodySiteHint": {
    en: 'Selecting "Other" adds a field to describe it, right here.',
    es: 'Seleccionar "Otro" agrega un campo para describirlo, justo aquí.',
  },
  "vaccine.bodySiteOtherDescribe": { en: "Describe where it was given", es: "Describa dónde se administró" },
  "vaccine.facilityName": { en: "Facility or clinic name (optional)", es: "Nombre de la instalación o clínica (opcional)" },
  "vaccine.facilityAddress": { en: "Facility address (optional)", es: "Dirección de la instalación (opcional)" },
  "vaccine.facilityStreetAddress": { en: "Facility street address", es: "Dirección de la instalación" },
  "vaccine.facilityCityError": { en: "Facility city: {msg}", es: "Ciudad de la instalación: {msg}" },
  "vaccine.facilityStateError": { en: "Facility state: {msg}", es: "Estado de la instalación: {msg}" },
  "vaccine.facilityZipError": { en: "Facility ZIP: {msg}", es: "Código postal de la instalación: {msg}" },
  "vaccine.facilityPhone": { en: "Facility phone (optional)", es: "Teléfono de la instalación (opcional)" },
  "vaccine.facilityFax": { en: "Facility fax (optional)", es: "Fax de la instalación (opcional)" },
  "vaccine.facilityType": { en: "Type of facility (optional)", es: "Tipo de instalación (opcional)" },
  "vaccine.facilityTypeOther": {
    en: "Please describe the type of facility",
    es: "Describa el tipo de instalación",
  },
  "vaccine.additionalVaccines": {
    en: "Additional vaccines given at this same visit (optional)",
    es: "Vacunas adicionales administradas en esta misma visita (opcional)",
  },
  "vaccine.additionalVaccinesCount": {
    en: "{n} additional vaccine{plural}",
    es: "{n} vacuna{plural} adicional{plural}",
  },
  "vaccine.priorVaccines": {
    en: "Other vaccines received in the month before the vaccination you're reporting (optional)",
    es: "Otras vacunas recibidas en el mes anterior a la vacunación que está reportando (opcional)",
  },
  "vaccine.priorVaccinesCount": { en: "{n} prior vaccine{plural}", es: "{n} vacuna{plural} anterior{plural}" },
  "vaccine.additionalRowPrefix": { en: "Additional vaccine {n}:", es: "Vacuna adicional {n}:" },
  "vaccine.priorRowPrefix": { en: "Prior vaccine {n}:", es: "Vacuna anterior {n}:" },
  "vaccine.rowSelectVaccine": { en: "select a vaccine.", es: "seleccione una vacuna." },
  "vaccine.rowEnterName": { en: "enter the vaccine name.", es: "ingrese el nombre de la vacuna." },
  "vaccine.rowDescribeSite": { en: "describe where it was given.", es: "describa dónde se administró." },
  "vaccine.dateBeforeBirth": {
    en: "Vaccination date can't be before the patient's date of birth.",
    es: "La fecha de vacunación no puede ser anterior a la fecha de nacimiento del paciente.",
  },
  "vaccine.loading": { en: "Loading…", es: "Cargando…" },

  // Repeatable vaccine-row editor (shared shape for "additional" and "prior" rows)
  "vaccineRow.header": { en: "Vaccine {n}", es: "Vacuna {n}" },
  "vaccineRow.priorHeader": { en: "Prior vaccine {n}", es: "Vacuna anterior {n}" },
  "vaccineRow.remove": { en: "Remove", es: "Eliminar" },
  "vaccineRow.vaccine": { en: "Vaccine", es: "Vacuna" },
  "vaccineRow.specifyVaccine": { en: "Please specify the vaccine", es: "Especifique la vacuna" },
  "vaccineRow.manufacturer": { en: "Manufacturer", es: "Fabricante" },
  "vaccineRow.lotNumber": { en: "Lot number", es: "Número de lote" },
  "vaccineRow.route": { en: "How was it given? (optional)", es: "¿Cómo se administró? (opcional)" },
  "vaccineRow.site": { en: "Where was it given? (optional)", es: "¿Dónde se administró? (opcional)" },
  "vaccineRow.dose": { en: "Dose number (optional)", es: "Número de dosis (opcional)" },
  "vaccineRow.date": { en: "Date administered (optional)", es: "Fecha de administración (opcional)" },
  "vaccineRow.addAnother": { en: "+ Add another vaccine", es: "+ Agregar otra vacuna" },

  // Adverse event ("What happened") step
  "adverseEvent.onsetDate": { en: "When did symptoms start?", es: "¿Cuándo comenzaron los síntomas?" },
  "adverseEvent.onsetTime": { en: "Time symptoms started (optional)", es: "Hora en que comenzaron los síntomas (opcional)" },
  "adverseEvent.description.hcp": { en: "Clinical description", es: "Descripción clínica" },
  "adverseEvent.description.public": { en: "What happened?", es: "¿Qué sucedió?" },
  "adverseEvent.descriptionHint": {
    en: 'Describe the symptoms and what happened in your own words — a short answer like "Sudden vomiting starting 2 hours after the shot" is enough.',
    es: 'Describa los síntomas y lo que sucedió con sus propias palabras — una respuesta breve como "Vómitos repentinos que comenzaron 2 horas después de la inyección" es suficiente.',
  },
  "adverseEvent.symptoms": {
    en: "Did any of these symptoms occur? (optional, select all that apply)",
    es: "¿Ocurrió alguno de estos síntomas? (opcional, seleccione todos los que apliquen)",
  },
  "adverseEvent.symptomsHint": {
    en: 'This is a quick-select shortcut — it doesn\'t replace the description above. Selecting "Other" adds a field to name it, right here.',
    es: 'Este es un atajo de selección rápida — no reemplaza la descripción anterior. Seleccionar "Otro" agrega un campo para nombrarlo, justo aquí.',
  },
  "adverseEvent.symptomsError": { en: "Symptoms: {msg}", es: "Síntomas: {msg}" },
  "adverseEvent.symptomsOtherDescribe": {
    en: 'Describe the "Other" symptom',
    es: 'Describa el síntoma "Otro"',
  },
  "adverseEvent.labResults": {
    en: "Medical tests or lab results related to this event (optional)",
    es: "Pruebas médicas o resultados de laboratorio relacionados con este evento (opcional)",
  },
  "adverseEvent.labResultsHint": {
    en: "Include dates if you can — both abnormal and normal/negative findings are useful.",
    es: "Incluya fechas si puede — tanto los hallazgos anormales como los normales/negativos son útiles.",
  },
  "adverseEvent.outcomes": {
    en: "Did any of these occur? (optional, select all that apply)",
    es: "¿Ocurrió alguno de estos? (opcional, seleccione todos los que apliquen)",
  },
  "adverseEvent.recoveryStatus.self": { en: "Have you recovered? (optional)", es: "¿Se ha recuperado? (opcional)" },
  "adverseEvent.recoveryStatus.other": {
    en: "Has the patient recovered? (optional)",
    es: "¿Se ha recuperado el paciente? (opcional)",
  },
  "adverseEvent.hospitalizationDays": { en: "Number of days hospitalized", es: "Número de días hospitalizado" },
  "adverseEvent.hospitalizationDaysHint.self": {
    en: "If you're still hospitalized, enter the number of days so far — you can update this later with a follow-up note.",
    es: "Si todavía está hospitalizado, ingrese el número de días hasta ahora — puede actualizar esto más tarde con una nota de seguimiento.",
  },
  "adverseEvent.hospitalizationDaysHint.other": {
    en: "If the patient is still hospitalized, enter the number of days so far — you can update this later with a follow-up note.",
    es: "Si el paciente todavía está hospitalizado, ingrese el número de días hasta ahora — puede actualizar esto más tarde con una nota de seguimiento.",
  },
  "adverseEvent.hospitalName": { en: "Hospital name (optional)", es: "Nombre del hospital (opcional)" },
  "adverseEvent.hospitalCity": { en: "Hospital city (optional)", es: "Ciudad del hospital (opcional)" },
  "adverseEvent.hospitalState": { en: "Hospital state (optional)", es: "Estado del hospital (opcional)" },
  "adverseEvent.dateOfDeath": { en: "Date of death", es: "Fecha de fallecimiento" },
  "adverseEvent.treatmentGiven": { en: "Treatment given (optional)", es: "Tratamiento administrado (opcional)" },
  "adverseEvent.clinicalCourseNotes": { en: "Clinical course notes (optional)", es: "Notas de evolución clínica (opcional)" },
  "adverseEvent.previousAdverseEvent.self": {
    en: "Have you ever had an adverse event after any previous vaccine? (optional)",
    es: "¿Alguna vez ha tenido un evento adverso después de alguna vacuna anterior? (opcional)",
  },
  "adverseEvent.previousAdverseEvent.other": {
    en: "Has the patient ever had an adverse event after any previous vaccine? (optional)",
    es: "¿El paciente alguna vez ha tenido un evento adverso después de alguna vacuna anterior? (opcional)",
  },
  "adverseEvent.previousAdverseEventDetails": {
    en: "Describe the previous event (age at the time, vaccination date, vaccine type/brand)",
    es: "Describa el evento anterior (edad en ese momento, fecha de vacunación, tipo/marca de vacuna)",
  },
  "adverseEvent.onsetBeforeVaccination": {
    en: "Symptom onset date can't be before the vaccination date.",
    es: "La fecha de inicio de los síntomas no puede ser anterior a la fecha de vacunación.",
  },
  "adverseEvent.deathBeforeVaccination": {
    en: "Date of death can't be before the vaccination date.",
    es: "La fecha de fallecimiento no puede ser anterior a la fecha de vacunación.",
  },
  "adverseEvent.deathBeforeOnset": {
    en: "Date of death can't be before the symptom onset date.",
    es: "La fecha de fallecimiento no puede ser anterior a la fecha de inicio de los síntomas.",
  },
  "adverseEvent.selfReportDeathNotice": {
    en: "A report submitted by the patient themselves can't also report that the patient died.",
    es: "Un reporte enviado por el propio paciente no puede también reportar que el paciente falleció.",
  },
  "adverseEvent.checkInconsistencies": { en: "Double-check for inconsistencies", es: "Verificar inconsistencias" },
  "adverseEvent.checking": { en: "Checking…", es: "Verificando…" },
  "adverseEvent.checkHint": {
    en: 'Optional — compares what you described in "What happened?" against the outcomes and recovery status you selected, in case anything doesn\'t quite line up.',
    es: 'Opcional — compara lo que describió en "¿Qué sucedió?" con los resultados y el estado de recuperación que seleccionó, en caso de que algo no coincida.',
  },
  "adverseEvent.checkErrorGeneric": {
    en: "Couldn't run the check right now — you can still continue.",
    es: "No se pudo ejecutar la verificación en este momento — aún puede continuar.",
  },
  "adverseEvent.noInconsistencies": { en: "No inconsistencies found.", es: "No se encontraron inconsistencias." },

  // Supporting documents step
  "documents.heading": { en: "Supporting documents", es: "Documentos de respaldo" },
  "documents.lead": {
    en: "Upload medical records or vaccine-administration documents (PDF, JPEG, PNG, or Word — 15 MB max each). You can also add these later using the existing follow-up information tool.",
    es: "Suba registros médicos o documentos de administración de vacunas (PDF, JPEG, PNG o Word — máximo 15 MB cada uno). También puede agregarlos más tarde usando la herramienta de información de seguimiento existente.",
  },
  "documents.suggestedForReport": { en: "Suggested documents for this report", es: "Documentos sugeridos para este reporte" },
  "documents.basedOnDescription": { en: "Based on your description", es: "Según su descripción" },
  "documents.checkingForCase": {
    en: "Checking for anything specific to this case…",
    es: "Buscando algo específico para este caso…",
  },
  "documents.aiSuggested": { en: "AI suggested", es: "Sugerido por IA" },
  "documents.aiDisclaimer": {
    en: "AI-generated from the description you entered — review before relying on it.",
    es: "Generado por IA a partir de la descripción que ingresó — revise antes de confiar en él.",
  },
  "documents.someFilesSkipped": {
    en: "Some files were skipped — only PDF, JPEG, PNG, or Word documents are accepted.",
    es: "Se omitieron algunos archivos — solo se aceptan documentos PDF, JPEG, PNG o Word.",
  },
  "documents.uploadFailed": { en: "Upload failed", es: "Error al subir el archivo" },
  "documents.removeFailed": {
    en: "Couldn't remove this file — please try again.",
    es: "No se pudo eliminar este archivo — inténtelo de nuevo.",
  },
  "documents.replaceFailed": { en: "Replace failed", es: "Error al reemplazar el archivo" },
  "documents.uploadingFiles": { en: "Uploading {n} file{plural}…", es: "Subiendo {n} archivo{plural}…" },
  "documents.uploadingAriaLabel": { en: "Uploading", es: "Subiendo" },
  "documents.download": { en: "Download", es: "Descargar" },
  "documents.replace": { en: "Replace", es: "Reemplazar" },
  "documents.removing": { en: "Removing…", es: "Eliminando…" },
  "documents.remove": { en: "Remove", es: "Eliminar" },
  "documents.additionalContext": { en: "Additional context (optional)", es: "Contexto adicional (opcional)" },
  "documents.continueToReview": { en: "Continue to review", es: "Continuar a la revisión" },

  // Feedback survey (CSAT)
  "survey.thankYou": { en: "Thank you for your feedback.", es: "Gracias por sus comentarios." },
  "survey.dismissAriaLabel": { en: "Dismiss survey", es: "Cerrar encuesta" },
  "survey.ratingAriaLabel": { en: "Rating, 1 to 5", es: "Calificación, 1 a 5" },
  "survey.notGreat": { en: "Not great", es: "No muy buena" },
  "survey.excellent": { en: "Excellent", es: "Excelente" },
  "survey.comments": { en: "Comments (optional)", es: "Comentarios (opcional)" },
  "survey.submitting": { en: "Submitting…", es: "Enviando…" },
  "survey.submitFeedback": { en: "Submit feedback", es: "Enviar comentarios" },

  // Embedded FAQ widget
  "faqWidget.closeHelp": { en: "Close help", es: "Cerrar ayuda" },
  "faqWidget.needHelp": { en: "Need help? Ask me!", es: "¿Necesita ayuda? ¡Pregúnteme!" },
  "faqWidget.panelAriaLabel": { en: "Frequently asked questions", es: "Preguntas frecuentes" },
  "faqWidget.searchLabel": { en: "Search the FAQ", es: "Buscar en las preguntas frecuentes" },
  "faqWidget.searchPlaceholder": {
    en: "e.g. lot number, privacy, how long",
    es: "p. ej. número de lote, privacidad, cuánto tiempo",
  },
  "faqWidget.suggestedQuestionsAriaLabel": { en: "Suggested questions", es: "Preguntas sugeridas" },
  "faqWidget.noMatches": { en: "No matching questions found.", es: "No se encontraron preguntas coincidentes." },
  "faqWidget.askLabel": { en: "Or ask in your own words", es: "O pregunte con sus propias palabras" },
  "faqWidget.askPlaceholder": {
    en: "e.g. do I have to know exactly when symptoms started?",
    es: "p. ej. ¿tengo que saber exactamente cuándo comenzaron los síntomas?",
  },
  "faqWidget.asking": { en: "Asking…", es: "Preguntando…" },
  "faqWidget.ask": { en: "Ask", es: "Preguntar" },
  "faqWidget.askErrorGeneric": {
    en: "Couldn't reach the assistant right now — try the FAQ list above instead.",
    es: "No se pudo comunicar con el asistente en este momento — intente con la lista de preguntas frecuentes de arriba.",
  },
  "faqWidget.aiAnswerDisclaimer": {
    en: "AI-generated answer — not a substitute for medical advice.",
    es: "Respuesta generada por IA — no sustituye el consejo médico.",
  },

  // FAQ page
  "faqPage.heading": { en: "Frequently Asked Questions", es: "Preguntas Frecuentes" },
  "faqPage.searchLabel": { en: "Search", es: "Buscar" },
  "faqPage.searchPlaceholder": {
    en: "e.g. privacy, lot number, how long",
    es: "p. ej. privacidad, número de lote, cuánto tiempo",
  },

  // Accessibility statement
  "accessibility.heading": { en: "Accessibility Statement", es: "Declaración de Accesibilidad" },
  "accessibility.para1": {
    en: "This prototype targets WCAG 2.0 Level A and AA success criteria (design doc §6.6): semantic form structure, labeled fields, visible focus states, keyboard-only operability, and error messages that are programmatically associated with their fields.",
    es: "Este prototipo apunta a los criterios de éxito de Nivel A y AA de WCAG 2.0 (documento de diseño §6.6): estructura semántica del formulario, campos etiquetados, estados de foco visibles, operabilidad solo con teclado, y mensajes de error que están asociados programáticamente con sus campos.",
  },
  "accessibility.para2": {
    en: "In a real deployment, this page would also include a contact path for reporting accessibility issues and a link to the current Accessibility Conformance Report (ACR/VPAT).",
    es: "En una implementación real, esta página también incluiría una vía de contacto para reportar problemas de accesibilidad y un enlace al Reporte de Conformidad de Accesibilidad (ACR/VPAT) actual.",
  },

  // About VAERS page
  "about.heading": { en: "About VAERS", es: "Acerca de VAERS" },
  "about.intro": {
    en: "The Vaccine Adverse Event Reporting System (VAERS) is the national early-warning system for vaccine safety in the United States. Established in 1990, it's co-managed by the Centers for Disease Control and Prevention (CDC) and the U.S. Food and Drug Administration (FDA). VAERS collects reports of adverse events — possible reactions or problems — that occur during or after administration of vaccines licensed in the U.S.",
    es: "El Sistema de Reporte de Eventos Adversos de Vacunas (VAERS) es el sistema nacional de alerta temprana para la seguridad de las vacunas en los Estados Unidos. Establecido en 1990, es administrado conjuntamente por los Centros para el Control y la Prevención de Enfermedades (CDC) y la Administración de Alimentos y Medicamentos de EE. UU. (FDA). VAERS recopila reportes de eventos adversos — posibles reacciones o problemas — que ocurren durante o después de la administración de vacunas autorizadas en EE. UU.",
  },
  "about.howItWorksHeading": { en: "How it works", es: "Cómo funciona" },
  "about.howItWorks.pre": { en: "VAERS is a ", es: "VAERS es un " },
  "about.howItWorks.strong": { en: "passive reporting system", es: "sistema de reporte pasivo" },
  "about.howItWorks.mid": {
    en: ": it relies on patients, caregivers, and healthcare providers to submit reports rather than actively searching for them. That makes it especially good at one specific job — spotting unusual or unexpected ",
    es: ": depende de que pacientes, cuidadores y proveedores de atención médica envíen reportes en lugar de buscarlos activamente. Eso lo hace especialmente bueno en una tarea específica — detectar ",
  },
  "about.howItWorks.em": { en: "patterns", es: "patrones" },
  "about.howItWorks.post": {
    en: " across many reports that might signal a safety issue worth a closer look, even though no single report on its own can establish that a vaccine caused an event. CDC and FDA scientists review incoming reports on an ongoing basis as part of the broader vaccine-safety surveillance system.",
    es: " inusuales o inesperados en muchos reportes que podrían señalar un problema de seguridad que merece una revisión más detallada, aunque ningún reporte individual por sí solo puede establecer que una vacuna causó un evento. Los científicos del CDC y la FDA revisan los reportes entrantes de manera continua como parte del sistema más amplio de vigilancia de la seguridad de las vacunas.",
  },
  "about.howItWorks.para2": {
    en: "Submitting a report is not the same as an admission that a vaccine or a healthcare provider caused or contributed to what happened — VAERS accepts every report it receives without prejudging the outcome.",
    es: "Enviar un reporte no es lo mismo que admitir que una vacuna o un proveedor de atención médica causó o contribuyó a lo que sucedió — VAERS acepta cada reporte que recibe sin prejuzgar el resultado.",
  },
  "about.whoShouldReportHeading": { en: "Who should report", es: "Quién debería reportar" },
  "about.whoShouldReport.pre": {
    en: "Anyone can submit a report — patients, parents or guardians, other caregivers, and healthcare providers — whether or not they're sure the vaccine was the cause. Reporting is voluntary for the public, but the law requires it in two cases: healthcare providers must report certain specified adverse events (see the VAERS Table of Reportable Events, per ",
    es: "Cualquier persona puede enviar un reporte — pacientes, padres o tutores, otros cuidadores y proveedores de atención médica — estén o no seguros de que la vacuna fue la causa. El reporte es voluntario para el público, pero la ley lo exige en dos casos: los proveedores de atención médica deben reportar ciertos eventos adversos específicos (vea la Tabla de Eventos Reportables de VAERS, según ",
  },
  "about.whoShouldReport.post": {
    en: "), and vaccine manufacturers must report all adverse events that come to their attention.",
    es: "), y los fabricantes de vacunas deben reportar todos los eventos adversos que lleguen a su conocimiento.",
  },
  "about.whatCountsHeading": { en: "What counts as a report", es: "Qué cuenta como un reporte" },
  "about.whatCounts.pre": { en: "Two kinds of reports are common: an ", es: "Dos tipos de reportes son comunes: un " },
  "about.whatCounts.strong1": { en: "adverse event", es: "evento adverso" },
  "about.whatCounts.mid": { en: " (an unexpected health problem after vaccination) and a vaccine ", es: " (un problema de salud inesperado después de la vacunación) y un " },
  "about.whatCounts.strong2": { en: "administration error", es: "error de administración" },
  "about.whatCounts.post": {
    en: " with no resulting health problem (wrong dose, wrong vaccine, wrong route, etc.). This form asks a couple of quick questions up front so it only shows the fields relevant to your situation.",
    es: " de vacuna sin ningún problema de salud resultante (dosis incorrecta, vacuna incorrecta, vía incorrecta, etc.). Este formulario hace un par de preguntas rápidas al principio para mostrar solo los campos relevantes a su situación.",
  },
  "about.privacyHeading": { en: "Your privacy", es: "Su privacidad" },
  "about.privacy.pre": {
    en: "VAERS protects patient identity and keeps identifying information confidential. The HIPAA Privacy Rule specifically permits reporting protected health information to public health authorities, including CDC and FDA, for exactly this purpose (",
    es: "VAERS protege la identidad del paciente y mantiene confidencial la información de identificación. La Regla de Privacidad de HIPAA permite específicamente reportar información de salud protegida a las autoridades de salud pública, incluyendo al CDC y la FDA, exactamente para este propósito (",
  },
  "about.privacy.post": { en: ").", es: ")." },
  "about.notCompensationHeading": {
    en: "VAERS is not a compensation program",
    es: "VAERS no es un programa de compensación",
  },
  "about.notCompensation.pre": { en: "Filing a VAERS report is separate from the ", es: "Presentar un reporte de VAERS es independiente del " },
  "about.notCompensation.strong": {
    en: "National Vaccine Injury Compensation Program (VICP)",
    es: "Programa Nacional de Compensación por Lesiones de Vacunas (VICP)",
  },
  "about.notCompensation.post": {
    en: ", which is administered by the Health Resources and Services Administration (HRSA). Submitting a report here does not file a compensation claim — if you're seeking compensation for a vaccine injury, that's a separate process through VICP.",
    es: ", que es administrado por la Administración de Recursos y Servicios de Salud (HRSA). Enviar un reporte aquí no presenta una reclamación de compensación — si busca compensación por una lesión relacionada con una vacuna, ese es un proceso separado a través del VICP.",
  },
  "about.afterSubmitHeading": { en: "What happens after you submit", es: "Qué sucede después de que envía" },
  "about.afterSubmit.para": {
    en: "Your report becomes part of ongoing vaccine-safety surveillance. You generally won't get an individual response, but reports like yours are what make the early-warning system work.",
    es: "Su reporte pasa a formar parte de la vigilancia continua de la seguridad de las vacunas. Generalmente no recibirá una respuesta individual, pero reportes como el suyo son los que hacen funcionar el sistema de alerta temprana.",
  },

  // Shared address block (AddressFieldGroup) — used for the reporter's
  // mailing address, the patient's address, and the facility address, so
  // fixing these labels once covers all three.
  "address.streetDefault": { en: "Street address", es: "Dirección" },
  "address.county": { en: "County", es: "Condado" },
  "address.city": { en: "City", es: "Ciudad" },
  "address.state": { en: "State", es: "Estado" },
  "address.selectPlaceholder": { en: "Select…", es: "Seleccionar…" },
  "address.zip": { en: "ZIP code", es: "Código postal" },
  "address.streetPlaceholderApt": { en: "e.g. 123 Main St, Apt 4B", es: "ej. Calle Principal 123, Apt 4B" },
  "address.streetPlaceholderSuite": { en: "e.g. 123 Main St, Suite 200", es: "ej. Calle Principal 123, Suite 200" },

  // About You step
  "aboutYou.contactName": { en: "Your name", es: "Su nombre" },
  "aboutYou.contactEmail": { en: "Your email", es: "Su correo electrónico" },
  "aboutYou.contactEmailHint": {
    en: "Used only if we need to follow up about this report.",
    es: "Se usa solo si necesitamos hacer seguimiento sobre este reporte.",
  },
  "aboutYou.contactEmailConfirm": { en: "Confirm your email", es: "Confirme su correo electrónico" },
  "aboutYou.contactPhone": { en: "Your phone (optional)", es: "Su teléfono (opcional)" },
  "aboutYou.phoneHint": {
    en: "e.g. (404) 555-1212 or +1 404 555 1212.",
    es: "ej. (404) 555-1212 o +1 404 555 1212.",
  },
  "aboutYou.relationship": { en: "Your relationship to the patient", es: "Su relación con el paciente" },
  "aboutYou.relationshipOther": {
    en: "Please describe your relationship to the patient",
    es: "Describa su relación con el paciente",
  },
  "aboutYou.bestContactName": {
    en: "Is there a doctor or nurse we could contact for more details? (optional)",
    es: "¿Hay un médico o enfermero que podamos contactar para más detalles? (opcional)",
  },
  "aboutYou.bestContactNameHint": {
    en: "Only if that's someone other than you.",
    es: "Solo si esa persona es alguien distinto de usted.",
  },
  "aboutYou.bestContactPhone": { en: "Their phone number (optional)", es: "Su número de teléfono (opcional)" },
  "aboutYou.mailingAddress": { en: "Mailing address", es: "Dirección postal" },
  "aboutYou.mailingCity": { en: "Mailing city", es: "Ciudad postal" },
  "aboutYou.mailingState": { en: "Mailing state", es: "Estado postal" },
  "aboutYou.mailingZip": { en: "Mailing ZIP", es: "Código postal" },
  "aboutYou.mailToggle": {
    en: "I'd like VAERS to also mail me a copy of this report, in addition to emailing it",
    es: "Me gustaría que VAERS también me envíe por correo postal una copia de este reporte, además de por correo electrónico",
  },

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

/** StepId (shared/src/branchingRules.ts) -> its translation key here —
 * centralizes the "step." prefix convention so callers never build the
 * key string by hand. */
export function stepLabelKey(step: string): TranslationKey {
  return `step.${step}` as TranslationKey;
}

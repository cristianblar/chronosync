export interface MEQOption {
  label: string;
  value: number;
}

export interface MEQQuestion {
  id: number;
  text: string;
  type: "time-range" | "likert" | "multiple-choice";
  options: MEQOption[];
}

export const MEQ_QUESTIONS: MEQQuestion[] = [
  {
    id: 1,
    text: "¿A qué hora te levantarías si fueras libre de planificar el día?",
    type: "time-range",
    options: [
      { label: "5:00 - 6:30", value: 5 },
      { label: "6:30 - 7:45", value: 4 },
      { label: "7:45 - 9:45", value: 3 },
      { label: "9:45 - 11:00", value: 2 },
      { label: "11:00 - 12:00", value: 1 },
    ],
  },
  {
    id: 2,
    text: "¿A qué hora te irías a dormir si fueras completamente libre?",
    type: "time-range",
    options: [
      { label: "20:00 - 21:00", value: 5 },
      { label: "21:00 - 22:15", value: 4 },
      { label: "22:15 - 00:30", value: 3 },
      { label: "00:30 - 01:45", value: 2 },
      { label: "01:45 - 03:00", value: 1 },
    ],
  },
  {
    id: 3,
    text: "Si tuvieras que levantarte a una hora fija, ¿cuánto dependerías de un despertador?",
    type: "multiple-choice",
    options: [
      { label: "No lo necesitaría", value: 4 },
      { label: "Lo pondría pero despertaría antes", value: 3 },
      { label: "Dependería bastante", value: 2 },
      { label: "Lo necesitaría totalmente", value: 1 },
    ],
  },
  {
    id: 4,
    text: "¿Qué tan cansado/a te sientes durante la primera media hora tras despertar?",
    type: "likert",
    options: [
      { label: "Nada cansado/a", value: 4 },
      { label: "Algo cansado/a", value: 3 },
      { label: "Bastante cansado/a", value: 2 },
      { label: "Muy cansado/a", value: 1 },
    ],
  },
  {
    id: 5,
    text: "¿Qué tan alerta te sientes durante la primera media hora tras despertar?",
    type: "likert",
    options: [
      { label: "Muy alerta", value: 4 },
      { label: "Algo alerta", value: 3 },
      { label: "Poco alerta", value: 2 },
      { label: "Nada alerta", value: 1 },
    ],
  },
  {
    id: 6,
    text: "¿Cómo es tu apetito durante la primera media hora tras despertar?",
    type: "likert",
    options: [
      { label: "Muy bueno", value: 4 },
      { label: "Aceptable", value: 3 },
      { label: "Bajo", value: 2 },
      { label: "Nulo", value: 1 },
    ],
  },
  {
    id: 7,
    text: "Si pudieras planificar tu trabajo, ¿en qué franja rendirías mejor?",
    type: "time-range",
    options: [
      { label: "08:00 - 10:00", value: 5 },
      { label: "10:00 - 13:00", value: 4 },
      { label: "13:00 - 17:00", value: 3 },
      { label: "17:00 - 21:00", value: 2 },
      { label: "21:00 - 00:00", value: 1 },
    ],
  },
  {
    id: 8,
    text: "¿A qué hora te sientes con mayor rendimiento físico?",
    type: "time-range",
    options: [
      { label: "06:00 - 09:00", value: 5 },
      { label: "09:00 - 12:00", value: 4 },
      { label: "12:00 - 17:00", value: 3 },
      { label: "17:00 - 21:00", value: 2 },
      { label: "21:00 - 23:00", value: 1 },
    ],
  },
  {
    id: 9,
    text: "A las 22:00, ¿qué nivel de cansancio sueles tener?",
    type: "likert",
    options: [
      { label: "Muy cansado/a", value: 5 },
      { label: "Algo cansado/a", value: 4 },
      { label: "Neutral", value: 3 },
      { label: "Poco cansado/a", value: 2 },
      { label: "Nada cansado/a", value: 1 },
    ],
  },
  {
    id: 10,
    text: "Si tuvieras una prueba importante a las 8:00, ¿cómo te sentirías?",
    type: "multiple-choice",
    options: [
      { label: "En excelente forma", value: 4 },
      { label: "Bien", value: 3 },
      { label: "Regular", value: 2 },
      { label: "Mal", value: 1 },
    ],
  },
  {
    id: 11,
    text: "Si te acuestas dos horas más tarde de lo normal, ¿qué pasa al día siguiente?",
    type: "multiple-choice",
    options: [
      { label: "Me levanto igual, sin problemas", value: 4 },
      { label: "Me levanto igual, algo cansado/a", value: 3 },
      { label: "Me levanto más tarde", value: 2 },
      { label: "Necesito dormir bastante más", value: 1 },
    ],
  },
  {
    id: 12,
    text: "Si duermes fuera de horario por trabajo/estudio, ¿qué turno prefieres?",
    type: "multiple-choice",
    options: [
      { label: "Mañana temprano", value: 5 },
      { label: "Mañana tardía", value: 4 },
      { label: "Tarde", value: 3 },
      { label: "Noche", value: 2 },
      { label: "Madrugada", value: 1 },
    ],
  },
  {
    id: 13,
    text: "Para ejercicio intenso durante 1 hora, ¿qué franja prefieres?",
    type: "time-range",
    options: [
      { label: "06:00 - 08:00", value: 5 },
      { label: "08:00 - 11:00", value: 4 },
      { label: "11:00 - 17:00", value: 3 },
      { label: "17:00 - 20:00", value: 2 },
      { label: "20:00 - 22:00", value: 1 },
    ],
  },
  {
    id: 14,
    text: "A las 23:00, ¿qué tan cansado/a estás normalmente?",
    type: "likert",
    options: [
      { label: "Muy cansado/a", value: 5 },
      { label: "Algo cansado/a", value: 4 },
      { label: "Neutral", value: 3 },
      { label: "Poco cansado/a", value: 2 },
      { label: "Nada cansado/a", value: 1 },
    ],
  },
  {
    id: 15,
    text: "Se considera a una persona matutina o vespertina, ¿cómo te describes?",
    type: "multiple-choice",
    options: [
      { label: "Definitivamente matutino/a", value: 6 },
      { label: "Moderadamente matutino/a", value: 4 },
      { label: "Intermedio/a", value: 3 },
      { label: "Moderadamente vespertino/a", value: 2 },
      { label: "Definitivamente vespertino/a", value: 1 },
    ],
  },
  {
    id: 16,
    text: "Si debieras estar en forma mental a las 23:00, ¿cómo rendirías?",
    type: "multiple-choice",
    options: [
      { label: "Muy bien", value: 1 },
      { label: "Bien", value: 2 },
      { label: "Regular", value: 3 },
      { label: "Mal", value: 4 },
    ],
  },
  {
    id: 17,
    text: "Si debieras estar en forma mental a las 7:00, ¿cómo rendirías?",
    type: "multiple-choice",
    options: [
      { label: "Muy bien", value: 4 },
      { label: "Bien", value: 3 },
      { label: "Regular", value: 2 },
      { label: "Mal", value: 1 },
    ],
  },
  {
    id: 18,
    text: "¿En qué momento del día te notas más activo/a socialmente?",
    type: "time-range",
    options: [
      { label: "Mañana", value: 5 },
      { label: "Mediodía", value: 4 },
      { label: "Tarde", value: 3 },
      { label: "Noche", value: 2 },
      { label: "Madrugada", value: 1 },
    ],
  },
  {
    id: 19,
    text: "Si mañana fuera libre, ¿a qué hora crees que te despertarías de forma natural?",
    type: "time-range",
    options: [
      { label: "Antes de 06:30", value: 5 },
      { label: "06:30 - 07:45", value: 4 },
      { label: "07:45 - 09:00", value: 3 },
      { label: "09:00 - 10:30", value: 2 },
      { label: "Después de 10:30", value: 1 },
    ],
  },
];

/** Compare calendar days in local timezone */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseTrainingDate(trainingDateStr: string): Date {
  return new Date(`${trainingDateStr}T12:00:00`);
}

export function isBeforeTrainingDay(trainingDateStr: string): boolean {
  const t = parseTrainingDate(trainingDateStr);
  const today = new Date();
  t.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return today < t;
}

export function isTrainingDayToday(trainingDateStr: string): boolean {
  const t = parseTrainingDate(trainingDateStr);
  const today = new Date();
  return isSameCalendarDay(today, t);
}

export function isAfterTrainingDay(trainingDateStr: string): boolean {
  const t = parseTrainingDate(trainingDateStr);
  const today = new Date();
  t.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return today > t;
}

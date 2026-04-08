export function formatSecondsPolish(count: number): string {
  if (count === 1) return '1 sekunda';
  if (count >= 2 && count <= 4) return `${count} sekundy`;
  return `${count} sekund`;
}

export function formatDurationPolish(seconds: number): string {
  if (seconds < 60) {
    return formatSecondsPolish(seconds);
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  let result = '';
  if (minutes === 1) {
    result = '1 minuta';
  } else if (minutes >= 2 && minutes <= 4) {
    result = `${minutes} minuty`;
  } else {
    result = `${minutes} minut`;
  }

  if (remainingSeconds > 0) {
    result += ` ${formatSecondsPolish(remainingSeconds)}`;
  }

  return result;
}

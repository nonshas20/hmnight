/**
 * Formats a date string or Date object to 12-hour time format
 * @param dateInput - Date string or Date object
 * @returns Formatted time string in 12-hour format (e.g., "2:30 PM")
 */
export function formatTime12Hour(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return 'Invalid time';
  }
  
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Formats a date string or Date object to 12-hour time format with seconds
 * @param dateInput - Date string or Date object
 * @returns Formatted time string in 12-hour format with seconds (e.g., "2:30:45 PM")
 */
export function formatTime12HourWithSeconds(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return 'Invalid time';
  }
  
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Formats a date string or Date object to full date and time in 12-hour format
 * @param dateInput - Date string or Date object
 * @returns Formatted date and time string (e.g., "12/25/2023 2:30 PM")
 */
export function formatDateTime12Hour(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const dateStr = date.toLocaleDateString();
  const timeStr = formatTime12Hour(date);
  
  return `${dateStr} ${timeStr}`;
}

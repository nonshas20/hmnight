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

/**
 * Formats a PostgreSQL interval string to human-readable format
 * @param intervalString - PostgreSQL interval string (e.g., "01:30:45")
 * @returns Formatted duration string (e.g., "1h 30m 45s")
 */
export function formatDuration(intervalString: string | null | undefined): string {
  if (!intervalString || intervalString === '0 seconds' || intervalString === '00:00:00') {
    return '0m';
  }

  // Handle PostgreSQL interval format like "01:30:45" or "1 day 02:30:45"
  const timeMatch = intervalString.match(/(\d+):(\d+):(\d+)/);
  const dayMatch = intervalString.match(/(\d+)\s+day/);

  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseInt(timeMatch[3], 10);
    const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0m';
  }

  // Handle simple seconds format
  const secondsMatch = intervalString.match(/(\d+)\s*seconds?/);
  if (secondsMatch) {
    const totalSeconds = parseInt(secondsMatch[1], 10);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0m';
  }

  return intervalString; // Return as-is if we can't parse it
}

/**
 * Calculates time spent between two dates
 * @param timeIn - Start time
 * @param timeOut - End time (optional, defaults to now)
 * @returns Formatted duration string
 */
export function calculateTimeSpent(timeIn: string | Date, timeOut?: string | Date): string {
  const startTime = typeof timeIn === 'string' ? new Date(timeIn) : timeIn;
  const endTime = timeOut ? (typeof timeOut === 'string' ? new Date(timeOut) : timeOut) : new Date();

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return '0m';
  }

  const diffMs = endTime.getTime() - startTime.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds <= 0) {
    return '0m';
  }

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);

  return parts.length > 0 ? parts.join(' ') : '0m';
}

/**
 * Gets status display text and color for current status
 * @param status - Current status
 * @returns Object with display text and color class
 */
export function getStatusDisplay(status: 'NEVER_ENTERED' | 'IN' | 'OUT') {
  switch (status) {
    case 'IN':
      return { text: 'Inside', color: 'text-green-600 bg-green-100' };
    case 'OUT':
      return { text: 'Completed', color: 'text-blue-600 bg-blue-100' };
    case 'NEVER_ENTERED':
    default:
      return { text: 'Not Entered', color: 'text-gray-600 bg-gray-100' };
  }
}

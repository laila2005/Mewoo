/**
 * PetPluse — "Add to calendar" links for appointments.
 *
 * Two links cover every device with no app install and no OAuth:
 *   - Google Calendar's template URL, which any browser can open.
 *   - An .ics file, which iOS Calendar, Android, Outlook and Apple Mail all
 *     open natively — that is the "phone calendar" case.
 *
 * Appointments are stored as timestamptz and displayed in Africa/Cairo. Both
 * formats below take UTC instants, so the calendar entry lands at the right
 * wall-clock time wherever the owner happens to be.
 */

import crypto from 'crypto';

const APP_URL = (process.env.FRONTEND_URL || process.env.APP_URL || 'https://petpluse-showcase.vercel.app').replace(/\/$/, '');

/**
 * Unguessable per-appointment token.
 *
 * A calendar link is clicked FROM AN EMAIL, in a browser that carries no
 * Authorization header — so the endpoint cannot simply require a session or the
 * button would 401 for everyone. This signs the appointment id with the server
 * secret instead: the link works without login, but cannot be guessed or
 * enumerated, and reveals nothing about other appointments.
 */
export function calendarToken(appointmentId) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'petpluse')
    .update(`calendar:${appointmentId}`)
    .digest('base64url')
    .slice(0, 24);
}

/** Constant-time comparison, so the token cannot be probed byte by byte. */
export function verifyCalendarToken(appointmentId, token) {
  const expected = calendarToken(appointmentId);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const DEFAULT_MINUTES = Number(process.env.APPOINTMENT_DURATION_MINUTES) || 30;

/** UTC basic format required by both Google and iCalendar: 20260815T120000Z */
function toStamp(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function windowFor(appointmentTime, minutes = DEFAULT_MINUTES) {
  const start = new Date(appointmentTime);
  const end = new Date(start.getTime() + minutes * 60000);
  return { start, end };
}

function details({ petName, vetName, clinicName, reason }) {
  const who = vetName || 'your veterinarian';
  const title = petName ? `${petName} — vet appointment` : 'Vet appointment';
  const descLines = [
    `Appointment with ${who}${clinicName ? ` at ${clinicName}` : ''}.`,
    reason ? `Reason: ${reason}` : null,
    '',
    `Manage this appointment: ${APP_URL}/profile?tab=appointments`,
  ].filter((l) => l !== null);
  return { title, description: descLines.join('\n'), location: clinicName || '' };
}

/** A Google Calendar "add event" URL. Works in any browser, signed in or not. */
export function googleCalendarUrl(appointment) {
  const { start, end } = windowFor(appointment.appointment_time, appointment.minutes);
  const { title, description, location } = details(appointment);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toStamp(start)}/${toStamp(end)}`,
    details: description,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * An RFC 5545 VEVENT.
 *
 * UID is derived from the appointment id, so re-sending the invite UPDATES the
 * existing entry instead of creating a duplicate — and SEQUENCE lets a later
 * send supersede an earlier one.
 */
export function buildIcs(appointment) {
  const { start, end } = windowFor(appointment.appointment_time, appointment.minutes);
  const { title, description, location } = details(appointment);
  // Long lines must be folded at 75 octets, and , ; \ and newlines escaped.
  const esc = (v) => String(v || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = (line) => line.match(/.{1,73}/g).join('\r\n ');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PetPluse//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appointment-${appointment.id}@petpluse`,
    `DTSTAMP:${toStamp(new Date())}`,
    `DTSTART:${toStamp(start)}`,
    `DTEND:${toStamp(end)}`,
    `SEQUENCE:${appointment.sequence || 0}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(description)}`,
    location ? `LOCATION:${esc(location)}` : null,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',           // a two-hour heads-up
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Site-relative path that serves the .ics for this appointment. */
export function icsPath(appointmentId) {
  return `/api/bookings/appointments/${appointmentId}/calendar.ics?t=${calendarToken(appointmentId)}`;
}

/** The two buttons, as email-safe HTML. */
export function calendarLinksHtml(appointment) {
  const google = googleCalendarUrl(appointment);
  const ics = `${APP_URL}${icsPath(appointment.id)}`;
  return (
    `<a href="${google}" style="color:#005DA7;font-weight:600;text-decoration:underline">Add to Google Calendar</a>` +
    `&nbsp;&nbsp;·&nbsp;&nbsp;` +
    `<a href="${ics}" style="color:#005DA7;font-weight:600;text-decoration:underline">Add to phone calendar (.ics)</a>`
  );
}

export default { googleCalendarUrl, buildIcs, icsPath, calendarLinksHtml };

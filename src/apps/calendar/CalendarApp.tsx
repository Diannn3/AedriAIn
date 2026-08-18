const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const offset = (copy.getDay() + 6) % 7; // Monday-first.
  copy.setDate(copy.getDate() - offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function CalendarApp() {
  const today = new Date();
  const start = startOfWeek(today);
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  return (
    <div className="calendar-mini">
      <div className="calendar-head"><b>{MONTHS[today.getMonth()]}</b><span>{today.getFullYear()}</span></div>
      <div className="calendar-grid">
        {days.map((date, index) => (
          <div key={date.toISOString()} className="calendar-day">
            <small>{WEEKDAYS[date.getDay()]}</small>
            <strong>{date.getDate()}</strong>
            {index === 1 && <span className="calendar-event">FOCUS</span>}
            {index === 3 && <span className="calendar-event calendar-event--alt">PROJECT</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

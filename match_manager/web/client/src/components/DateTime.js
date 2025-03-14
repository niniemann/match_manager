import { Box, Popover } from "@cloudscape-design/components";
import { Tooltip } from 'react-tooltip';

export function DateTimeDisplay({ timestamp }) {
  const dateTime = new Date(timestamp);

  const optionsLocal = {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "numeric",
    minute: "numeric",
  };
  const optionsUTC = { ...optionsLocal, timeZoneName: "short", timeZone: "UTC" };

  const as_local = dateTime.toLocaleString(undefined, optionsLocal);
  const as_utc = dateTime.toLocaleString(undefined, optionsUTC);

  return (
    <div>
        <span
            data-tooltip-id="datetime-tooltip"
            data-tooltip-content={as_utc}
        >
                {as_local}
        </span>
        <Tooltip id="datetime-tooltip" place="top" />
    </div>
  );
}

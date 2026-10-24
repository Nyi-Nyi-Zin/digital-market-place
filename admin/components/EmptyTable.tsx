"use client";

import { useI18n } from "./I18nProvider";

export function EmptyTableRow({
  columns,
  message,
}: {
  columns: number;
  message: string;
}) {
  const { t } = useI18n();
  return (
    <tr className="admin-empty-row">
      <td colSpan={columns}>
        <p role="status">{t(message)}</p>
      </td>
    </tr>
  );
}

export function EmptyTable({
  label,
  headers,
  message,
}: {
  label: string;
  headers: string[];
  message: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className="table-scroll admin-empty-table"
      tabIndex={0}
      role="region"
      aria-label={t(label)}
    >
      <table>
        <thead>
          <tr>
            {headers.map(header => (
              <th scope="col" key={header}>
                {t(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <EmptyTableRow columns={headers.length} message={message} />
        </tbody>
      </table>
    </div>
  );
}

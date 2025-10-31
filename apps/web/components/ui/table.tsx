import * as React from "react";
import clsx from "clsx";

export function Table({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={clsx("w-full caption-bottom text-sm", className)} {...props}>
      {children}
    </table>
  );
}

export function THead({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className="[&_tr]:border-b" {...props}>
      {children}
    </thead>
  );
}
export function TBody({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className="[&_tr:last-child]:border-0" {...props}>
      {children}
    </tbody>
  );
}
export function TR({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={clsx("border-b transition-colors hover:bg-muted/50", className)} {...props}>
      {children}
    </tr>
  );
}
export function TH({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={clsx("h-10 px-2 text-left align-middle font-medium text-muted-foreground", className)} {...props}>
      {children}
    </th>
  );
}
export function TD({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={clsx("p-2 align-middle", className)} {...props}>
      {children}
    </td>
  );
}
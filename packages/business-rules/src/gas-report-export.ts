export type ReportCell = string | number | null | undefined;
const xml = (v: ReportCell) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
export function gasReportRows(report: any): ReportCell[][] {
  return [
    [
      "Reference",
      "Status",
      "Payment status",
      "Delivery location",
      "Gas kg",
      "Gas revenue kobo",
      "Delivery kobo",
      "Order total kobo",
    ],
    ...report.orders.map((o: any) => [
      o.reference,
      o.status,
      o.payment_status,
      o.location_snapshot?.name ??
        o.location_id ??
        "Historical location unlinked",
      o.gas_lines.reduce((n: number, g: any) => n + Number(g.grams) / 1000, 0),
      o.gas_lines.reduce((n: number, g: any) => n + Number(g.subtotal_kobo), 0),
      Number(o.delivery_kobo),
      Number(o.total_kobo),
    ]),
  ];
}
export function gasReportCsv(rows: ReportCell[][]) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          const value =
            typeof v === "string" && /^[=+\-@\t\r]/.test(v)
              ? "'" + v
              : String(v ?? "");
          return '"' + value.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}
export function gasReportExcel(rows: ReportCell[][]) {
  return (
    '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Gas and delivery"><Table>' +
    rows
      .map(
        (row) =>
          "<Row>" +
          row
            .map(
              (v) =>
                '<Cell><Data ss:Type="' +
                (typeof v === "number" ? "Number" : "String") +
                '">' +
                xml(v) +
                "</Data></Cell>",
            )
            .join("") +
          "</Row>",
      )
      .join("") +
    "</Table></Worksheet></Workbook>"
  );
}
export function gasReportHtml(rows: ReportCell[][]) {
  return (
    "<!doctype html><html><head><title>EasyGas gas and delivery report</title><style>body{font:16px/1.6 Arial;color:#153528}table{border-collapse:collapse}td,th{border:1px solid #ccd8c8;padding:8px;text-align:left}@page{size:A4 landscape;margin:15mm}</style></head><body><h1>EasyGas gas and delivery report</h1><p>Order values are separate from verified payments and profit. Monetary columns are in kobo. Filters match the selected report.</p><table>" +
    rows
      .map(
        (row, i) =>
          "<tr>" +
          row
            .map(
              (v) => `<${i ? "td" : "th"}>` + xml(v) + `</${i ? "td" : "th"}>`,
            )
            .join("") +
          "</tr>",
      )
      .join("") +
    "</table></body></html>"
  );
}

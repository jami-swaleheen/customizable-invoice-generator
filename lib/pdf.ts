"use client";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

export async function invoiceElementToPdf(
  element: HTMLElement,
): Promise<jsPDF> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: "letter",
  });

  const pageWidth = 8.5;
  const pageHeight = 11;
  const margin = 0.5;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgAspect = canvas.width / canvas.height;
  let drawWidth = contentWidth;
  let drawHeight = drawWidth / imgAspect;

  if (drawHeight > contentHeight) {
    drawHeight = contentHeight;
    drawWidth = drawHeight * imgAspect;
  }

  const dx = margin + (contentWidth - drawWidth) / 2;
  const dy = margin;

  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", dx, dy, drawWidth, drawHeight);

  return pdf;
}

export async function downloadInvoicePdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const pdf = await invoiceElementToPdf(element);
  pdf.save(filename);
}

export async function invoicePdfToBase64(
  element: HTMLElement,
): Promise<string> {
  const pdf = await invoiceElementToPdf(element);
  const dataUri = pdf.output("datauristring");
  return dataUri.split(",")[1] ?? "";
}

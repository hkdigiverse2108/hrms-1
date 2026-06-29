import * as XLSX from "xlsx";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    toast.error("No data available to export.");
    return;
  }

  try {
    // Extract column keys
    const headers = Object.keys(data[0]);

    // Format headers for premium display
    const displayHeaders = headers.map(h => 
      h.replace(/([A-Z])/g, ' $1') // Insert space before capitals
       .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
       .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
       .trim()
    );

    // Generate title text
    const titleText = fileName
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Auto-detect optimal orientation based on column count
    const isLandscape = headers.length > 7;
    const orientation = isLandscape ? 'landscape' : 'portrait';

    const doc = new jsPDF({
      orientation: orientation,
    });

    const tableData = data.map(row => {
      return headers.map(h => {
        const val = row[h];
        if (val !== null && val !== undefined) {
          if (typeof val === 'object') {
            try { return JSON.stringify(val); } catch { return String(val); }
          }
          return String(val);
        }
        return '';
      });
    });

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(titleText, 14, 22);
    
    // Add meta info
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated on: ${timestamp}  •  Total Records: ${data.length}`, 14, 30);

    // Render table
    autoTable(doc, {
      head: [displayHeaders],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { 
        fillColor: [16, 185, 129], // Brand Teal (#10b981)
        textColor: [255, 255, 255], // White
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: headers.length > 10 ? 8 : (headers.length > 8 ? 9 : 10), 
        cellPadding: 3,
        textColor: [30, 41, 59] // slate-800
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      }
    });

    doc.save(`${fileName}.pdf`);
    toast.success("PDF report downloaded successfully.");
  } catch (error) {
    console.error("PDF generation failed:", error);
    toast.error("Failed to generate PDF. Please try again.");
  }
};

// Keep exportToCSV as an alias to exportToPDF for complete backward compatibility
export const exportToCSV = exportToPDF;

export const exportToExcel = (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    toast.error("No data available to export.");
    return;
  }

  try {
    // Extract column keys
    const headers = Object.keys(data[0]);

    // Format headers for premium display
    const displayHeaders = headers.map((h) =>
      h
        .replace(/([A-Z])/g, " $1") // Insert space before capitals
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .replace(/[-_]/g, " ") // Replace hyphens and underscores with spaces
        .trim()
    );

    // Create worksheet data
    const wsData = [displayHeaders];
    data.forEach((row) => {
      wsData.push(
        headers.map((h) => {
          const val = row[h];
          if (val !== null && val !== undefined) {
            if (typeof val === "object") {
              try {
                return JSON.stringify(val);
              } catch {
                return String(val);
              }
            }
            return val; // Allow native types for Excel
          }
          return "";
        })
      );
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-size columns based on content length
    const colWidths = displayHeaders.map((header, i) => {
      let maxLen = header.length;
      wsData.forEach((row) => {
        const cellValue = row[i] ? String(row[i]) : "";
        if (cellValue.length > maxLen) {
          maxLen = cellValue.length;
        }
      });
      return { wch: Math.min(maxLen + 2, 50) }; // cap at 50 chars
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // Write file and trigger download
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success("Excel report downloaded successfully.");
  } catch (error) {
    console.error("Excel generation failed:", error);
    toast.error("Failed to generate Excel. Please try again.");
  }
};

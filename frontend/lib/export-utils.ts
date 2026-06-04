import { toast } from "sonner";
export const exportToPDF = (data: any[], fileName: string) => {
  if (!data || data.length === 0) return;

  // Extract column keys
  const headers = Object.keys(data[0]);

  // Format headers for premium display
  const displayHeaders = headers.map(h => 
    h.replace(/([A-Z])/g, ' $1') // Insert space before capitals (camelCase)
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

  // Scale table font size based on column count to prevent overflow
  let fontSize = '12px';
  if (headers.length > 12) fontSize = '8px';
  else if (headers.length > 8) fontSize = '10px';

  // Build the premium HTML content
  const timestamp = new Date().toLocaleString();
  
  const tableRows = data.map((row, idx) => `
    <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-200 break-inside-avoid">
      ${headers.map(h => {
        const val = row[h];
        let displayVal = '';
        if (val !== null && val !== undefined) {
          if (typeof val === 'object') {
            try {
              displayVal = JSON.stringify(val);
            } catch {
              displayVal = String(val);
            }
          } else {
            displayVal = String(val);
          }
        }
        return `<td class="px-3 py-2 text-slate-700 break-words">${displayVal}</td>`;
      }).join('')}
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${titleText}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
        
        body {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          color: #1e293b;
          background-color: #ffffff;
        }

        .header {
          margin-bottom: 25px;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 15px;
        }

        .title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 5px 0;
        }

        .meta {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: ${fontSize};
          table-layout: auto;
        }

        th {
          background-color: #10b981; /* Brand Teal */
          color: #ffffff;
          font-weight: 600;
          padding: 10px 12px;
          text-transform: uppercase;
          font-size: calc(${fontSize} - 1px);
          letter-spacing: 0.05em;
        }

        td {
          padding: 8px 12px;
          border-bottom: 1px solid #e2e8f0;
          word-wrap: break-word;
          max-width: 250px;
        }

        .bg-white { background-color: #ffffff; }
        .bg-slate-50 { background-color: #f8fafc; }
        
        .break-inside-avoid {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        @media print {
          @page {
            size: ${orientation};
            margin: 1.5cm;
          }
          body {
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${titleText}</h1>
        <div class="meta">Generated on: ${timestamp} • Total Records: ${data.length}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            ${displayHeaders.map(dh => `<th>${dh}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <script>
        window.onload = function() {
          // Give rendering a split second
          setTimeout(function() {
            window.print();
            // Automatically close the print preview tab/window after printing
            window.onafterprint = function() {
              window.close();
            };
          }, 350);
        }
      </script>
    </body>
    </html>
  `;

  // Open clean new window synchronously (prevents popup blockers)
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    toast.error('Please enable popups for this website to export PDFs.');
  }
};

// Keep exportToCSV as an alias to exportToPDF for complete backward compatibility
export const exportToCSV = exportToPDF;

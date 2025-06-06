import { Student } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Prints the student list in a formatted table
 * @param students - Array of student objects to print
 */
export const printStudentList = (students: Student[]) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow pop-ups to print the student list');
    return;
  }
  
  // Get current date for the report header
  const currentDate = new Date().toLocaleDateString();
  
  // Format check-in status and date for display
  const formatStatus = (checked_in: boolean) => checked_in ? 'Checked In' : 'Not Checked In';
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Create HTML content for the print window
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student List - ${currentDate}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        h1 {
          text-align: center;
          color: #2a2a2a;
          margin-bottom: 10px;
        }
        .report-date {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .checked-in {
          color: #4CAF50;
          font-weight: bold;
        }
        .not-checked-in {
          color: #F44336;
        }
        .summary {
          margin-top: 30px;
          padding: 15px;
          background-color: #f8f8f8;
          border-radius: 5px;
        }
        .summary h2 {
          margin-top: 0;
          font-size: 18px;
        }
        .summary-item {
          margin: 10px 0;
        }
        @media print {
          .no-print {
            display: none;
          }
          body {
            margin: 0;
            padding: 15px;
          }
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <h1>HM Night Event - Student List</h1>
      <div class="report-date">Report generated on ${currentDate}</div>
      
      <button class="no-print" onclick="window.print();" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 20px;">
        Print Report
      </button>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Barcode</th>
            <th>Registration Date</th>
            <th>Status</th>
            <th>Check-in Time</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(student => `
            <tr>
              <td>${student.name}</td>
              <td>${student.email}</td>
              <td>${student.barcode}</td>
              <td>${formatDate(student.created_at)}</td>
              <td class="${student.checked_in ? 'checked-in' : 'not-checked-in'}">
                ${formatStatus(student.checked_in)}
              </td>
              <td>${formatDate(student.checked_in_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="summary">
        <h2>Summary</h2>
        <div class="summary-item">Total Students: <strong>${students.length}</strong></div>
        <div class="summary-item">Checked In: <strong>${students.filter(s => s.checked_in).length}</strong></div>
        <div class="summary-item">Not Checked In: <strong>${students.filter(s => !s.checked_in).length}</strong></div>
        <div class="summary-item">Check-in Rate: <strong>${Math.round((students.filter(s => s.checked_in).length / students.length) * 100) || 0}%</strong></div>
      </div>
    </body>
    </html>
  `;
  
  // Write the HTML content to the print window
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Focus the print window
  printWindow.focus();
};

/**
 * Exports student data to an Excel file
 * @param students - Array of student objects to export
 */
export const exportToExcel = async (students: Student[]) => {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HM Night Event';
  workbook.lastModifiedBy = 'HM Night Event System';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Add a worksheet
  const worksheet = workbook.addWorksheet('Students');
  
  // Add columns
  worksheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Barcode', key: 'barcode', width: 20 },
    { header: 'Registration Date', key: 'created_at', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Check-in Time', key: 'checked_in_at', width: 25 }
  ];
  
  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Add rows
  students.forEach(student => {
    worksheet.addRow({
      name: student.name,
      email: student.email,
      barcode: student.barcode,
      created_at: new Date(student.created_at).toLocaleString(),
      status: student.checked_in ? 'Checked In' : 'Not Checked In',
      checked_in_at: student.checked_in_at ? new Date(student.checked_in_at).toLocaleString() : '-'
    });
  });
  
  // Apply conditional formatting for the status column
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Skip header row
      const statusCell = row.getCell(5); // Status column
      if (statusCell.value === 'Checked In') {
        statusCell.font = { color: { argb: 'FF4CAF50' } };
      } else {
        statusCell.font = { color: { argb: 'FFF44336' } };
      }
    }
  });
  
  // Add a summary section
  const summaryRowIndex = students.length + 3;
  worksheet.addRow([]);
  worksheet.addRow(['Summary']);
  worksheet.getCell(`A${summaryRowIndex + 1}`).font = { bold: true, size: 14 };
  
  worksheet.addRow(['Total Students', students.length]);
  worksheet.addRow(['Checked In', students.filter(s => s.checked_in).length]);
  worksheet.addRow(['Not Checked In', students.filter(s => !s.checked_in).length]);
  worksheet.addRow(['Check-in Rate', `${Math.round((students.filter(s => s.checked_in).length / students.length) * 100) || 0}%`]);
  
  // Generate the Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Create a Blob from the buffer
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Save the file using FileSaver
  saveAs(blob, `HM_Night_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
};

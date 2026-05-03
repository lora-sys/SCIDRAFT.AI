import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType, VerticalAlign, WidthType } from "docx";
import { saveAs } from "file-saver";

/**
 * A sophisticated Markdown to Docx converter using 'docx' library.
 * Focuses on scientific precision: Table borders, standard fonts, and centered equations.
 */
export async function exportToWord(markdown: string) {
  const lines = markdown.split("\n");
  const children: any[] = [];
  
  let currentTable: string[][] = [];
  let inTable = false;

  const flushTable = () => {
    if (currentTable.length > 0) {
      const rows = currentTable.map((row, index) => 
        new TableRow({
          children: row.map(cell => 
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: cell.trim(), bold: index === 0, size: 21 })],
                alignment: AlignmentType.LEFT,
                spacing: { before: 80, after: 80 }
              })],
              borders: {
                top: { style: "single", size: 1, color: "000000" },
                bottom: { style: "single", size: 1, color: "000000" },
                left: { style: "single", size: 1, color: "000000" },
                right: { style: "single", size: 1, color: "000000" },
              },
              shading: { fill: index === 0 ? "F2F2F2" : "FFFFFF" },
              verticalAlign: VerticalAlign.CENTER,
            })
          ),
        })
      );
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows,
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
      }));
      currentTable = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Robust Table Detection: check for pipes and at least 2 cells
    const isTableLine = line.includes("|") && line.split("|").length > 2;
    
    if (isTableLine) {
      if (line.includes("---")) continue; 
      inTable = true;
      const cells = line.split("|")
        .map(c => c.trim())
        .filter((c, idx, arr) => {
           if (idx === 0 && c === "") return false;
           if (idx === arr.length - 1 && c === "") return false;
           return true;
        });
      if (cells.length > 0) {
        currentTable.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
      inTable = false;
    }

    if (!line) {
      children.push(new Paragraph(""));
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      children.push(new Paragraph({ text: line.replace("# ", ""), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith("## ")) {
      children.push(new Paragraph({ text: line.replace("## ", ""), heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith("### ")) {
      children.push(new Paragraph({ text: line.replace("### ", ""), heading: HeadingLevel.HEADING_3 }));
    } 
    // Bullets
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      children.push(new Paragraph({
        text: line.substring(2),
        bullet: { level: 0 },
        spacing: { after: 120 }
      }));
    }
    // Block Math
    else if (line.startsWith("$$")) {
      let math = line.replace(/\$\$/g, "");
      if (!math) { 
        i++;
        while(i < lines.length && !lines[i].includes("$$")) {
          math += lines[i] + " ";
          i++;
        }
      }
      children.push(new Paragraph({
        children: [new TextRun({ text: math, italics: true, font: "Cambria Math" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 }
      }));
    }
    // Normal Paragraph
    else {
      children.push(new Paragraph({
        children: [new TextRun({ text: line, size: 24 })],
        spacing: { after: 160 }
      }));
    }
  }
  
  if (inTable) flushTable();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", color: "1A1A1A" }
        }
      }
    },
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Scientific_Method_Export.docx");
}

/**
 * Adaptive LaTeX generator for scientific publications.
 */
export function generateFullLatex(markdown: string): string {
  const lines = markdown.split('\n');
  let body = "";
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const esc = (text: string) => text.replace(/([&%$#_{}])/g, '\\$1');

  const flushTableLatex = () => {
    if (tableHeaders.length > 0) {
      body += `\\begin{table}[htbp]\n\\centering\n`;
      body += `\\begin{tabular}{${'|' + 'l|'.repeat(tableHeaders.length)}}\n\\hline\n`;
      body += tableHeaders.map(h => `\\textbf{${esc(h)}}`).join(' & ') + ' \\\\ \\hline\n';
      tableRows.forEach(row => {
        body += row.map(c => esc(c)).join(' & ') + ' \\\\ \\hline\n';
      });
      body += `\\end{tabular}\n\\caption{Experimental Observations and Parameters}\n\\end{table}\n\n`;
    }
    tableHeaders = [];
    tableRows = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Robust Table Detection
    const isTableLine = trimmed.includes("|") && trimmed.split("|").length > 2;

    if (isTableLine) {
      if (trimmed.includes("---")) return;
      inTable = true;
      const cells = trimmed.split("|")
        .map(c => c.trim())
        .filter((c, idx, arr) => {
          if (idx === 0 && c === "") return false;
          if (idx === arr.length - 1 && c === "") return false;
          return true;
        });
      if (tableHeaders.length === 0) tableHeaders = cells;
      else tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTableLatex();
      inTable = false;
    }

    if (trimmed.startsWith("# ")) body += `\\section{${esc(trimmed.slice(2))}}\n`;
    else if (trimmed.startsWith("## ")) body += `\\subsection{${esc(trimmed.slice(3))}}\n`;
    else if (trimmed.startsWith("### ")) body += `\\subsubsection{${esc(trimmed.slice(4))}}\n`;
    else if (trimmed.startsWith("- ")) body += `\\begin{itemize}\\item ${esc(trimmed.slice(2))}\\end{itemize}\n`;
    else if (trimmed.startsWith("$$")) {
      body += `\\begin{equation}\n${trimmed.replace(/\$\$/g, '')}\n\\end{equation}\n`;
    }
    else if (trimmed) body += esc(trimmed) + "\n\n";
  });

  if (inTable) flushTableLatex();

  return `\\documentclass[12pt, a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath, amsfonts, amssymb}
\\usepackage{booktabs, caption, array, multirow}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage{setspace}
\\onehalfspacing

\\title{\\textbf{Research Protocol: Scientific Methodology Analysis}}
\\author{SciDraft IA Laboratory Emulator}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
This methodology report provides optimized experimental procedures and mathematical analysis generated via neural synthesis.
\\end{abstract}

${body}

\\end{document}`;
}

export async function copyToWordClipboard(htmlContent: string) {
  try {
    // For Word compatibility, text/html blobs are best.
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const data = [new ClipboardItem({ 'text/html': blob })];
    await navigator.clipboard.write(data);
    console.log('Successfully copied HTML to clipboard');
    return true;
  } catch (err) {
    console.warn('ClipboardItem HTML failed, trying text/plain fallback:', err);
    try {
        // Ultimate fallback: copy as plain text
        const textToCopy = htmlContent.replace(/<[^>]*>/g, '\n').trim(); // very crude strip tags
        await navigator.clipboard.writeText(textToCopy);
        return true;
    } catch (e) {
        console.error('All clipboard attempts failed:', e);
        return false;
    }
  }
}

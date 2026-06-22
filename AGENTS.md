# Repository UNSRI PDF Splitter

## Project Overview

Repository UNSRI PDF Splitter is a privacy-first client-side web application designed to help Universitas Sriwijaya students prepare PDF files required for Repository UNSRI submission.

Students are required to upload multiple files to the repository, including a full thesis PDF and separated PDF files for each chapter (BAB). Manually splitting the document, determining page ranges, and renaming every file is time-consuming and error-prone.

This application automates the splitting, merging, and file naming process based on Repository UNSRI standards.

---

# Core Principles

## Privacy First

All document processing MUST happen entirely inside the user's browser.

The application MUST NOT:

- Upload PDF files to any server.
- Store PDF files in a database.
- Send user documents to any external API.

The application SHOULD clearly communicate to users that their files never leave their device.

---

# Tech Stack

The application is a fully client-side web application.

## Core

- React Router v7 (Framework Mode)
- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui

## Libraries

### PDF Processing

- pdf-lib  
  Used for:
  - Splitting PDF documents.
  - Merging PDF documents.
  - Generating output PDF files.

- PDF.js  
  Used for:
  - Reading PDF text content.
  - Rendering PDF previews.
  - Future automatic chapter detection.

### File Management

- JSZip  
  Used to package all generated files into a single ZIP archive.

- FileSaver.js  
  Used to trigger client-side downloads.

### Form and Validation

- React Hook Form
- Zod

### State Management

Avoid global state unless necessary.

Prefer:

- React state
- React Context for shared UI state

Only introduce Zustand if application complexity significantly increases.

---

# Application Features

## 1. Repository PDF Splitter

The main feature of the application.

### Input

User uploads a complete thesis PDF.

User provides metadata:

- Program Study Code (KODE)
- Student ID Number (NIM)
- Supervisor 1 NIDN
- Supervisor 2 NIDN (optional)

### Program Study Code

The application MUST provide a searchable dropdown containing all Universitas Sriwijaya study programs.

Data source MUST be a local static JSON file.

The user SHOULD NOT manually enter the KODE to avoid mistakes.

---

## PDF Sections

The application supports splitting the thesis into:

### 01_front_ref

Contains:

- Cover
- Approval pages
- Abstract
- Table of contents
- All pages before BAB I

Output filename:

```
KODE_NIM_NIDN1_NIDN2_01_front_ref.pdf
```

---

### BAB 2

Output:

```
KODE_NIM_NIDN1_NIDN2_02.pdf
```

---

### BAB 3

Output:

```
KODE_NIM_NIDN1_NIDN2_03.pdf
```

---

### BAB 4

Output:

```
KODE_NIM_NIDN1_NIDN2_04.pdf
```

---

### BAB 5

Output:

```
KODE_NIM_NIDN1_NIDN2_05.pdf
```

---

### Daftar Pustaka

Detected using the title:

- DAFTAR PUSTAKA

Output:

```
KODE_NIM_NIDN1_NIDN2_06_ref.pdf
```

---

### Lampiran

Output:

```
KODE_NIM_NIDN1_NIDN2_07_lamp.pdf
```

---

## Chapter Detection Strategy

The first version MUST support manual page range selection.

The system MAY assist the user by detecting:

- BAB I
- BAB II
- BAB III
- BAB IV
- BAB V
- DAFTAR PUSTAKA
- LAMPIRAN

using PDF text extraction.

Automatic detection is considered a helper feature.

Users MUST always be able to edit the detected page ranges manually.

---

## PDF Preview

The application MUST provide PDF page preview during range selection.

The preview helps users verify the selected pages before generating output files.

---

## Generated Output

The application MUST generate a ZIP file containing:

- Full thesis PDF
- Split chapter PDFs

Example:

```
55201_090312823xxxx.pdf

55201_090312823xxxx_0012345678_0098765432_01_front_ref.pdf

55201_090312823xxxx_0012345678_0098765432_02.pdf

55201_090312823xxxx_0012345678_0098765432_03.pdf

55201_090312823xxxx_0012345678_0098765432_04.pdf

55201_090312823xxxx_0012345678_0098765432_05.pdf

55201_090312823xxxx_0012345678_0098765432_06_ref.pdf

55201_090312823xxxx_0012345678_0098765432_07_lamp.pdf
```

---

## NIDN Formatting Rules

NIDN2 is optional.

When NIDN2 does not exist, the filename MUST NOT contain an empty placeholder.

Correct:

```
55201_090312823xxxx_0012345678_02.pdf
```

Incorrect:

```
55201_090312823xxxx_0012345678__02.pdf
```

---

# 2. Turnitin PDF Merger

A separate feature from the splitter.

Users upload:

1. Turnitin PDF
2. Similarity approval letter

The application merges them into one PDF.

Output format:

```
KODE_NIM_TURNITIN.pdf
```

---

# Cover Image

Repository UNSRI requires a separate cover image.

The application DOES NOT generate this file.

The UI MUST clearly inform users that they still need to manually capture the hardcover thesis cover and upload:

```
KODE_NIM_cover.jpg
```

---

# User Flow

## Splitter

1. Upload complete thesis PDF.
2. Fill repository metadata.
3. Select or confirm PDF ranges.
4. Review generated filenames.
5. Generate ZIP.
6. Download ZIP.

---

## Turnitin Merger

1. Upload Turnitin PDF.
2. Upload similarity letter PDF.
3. Fill KODE and NIM.
4. Generate merged PDF.
5. Download final PDF.

---

# User Experience Guidelines

The UI should prioritize simplicity because most users are final-year students who only use the application once.

Avoid exposing technical PDF terminology.

Prefer:

"Select the beginning of BAB II"

instead of:

"Select page range offset"

---

Provide clear information:

"All processing is done locally in your browser. Your files are never uploaded."

---

# Error Handling

The application MUST handle:

- Invalid PDF files.
- Corrupted PDF documents.
- Missing required metadata.
- Invalid page ranges.
- Empty generated sections.

Provide human-friendly error messages.

---

# Performance Requirements

The application should support large thesis documents.

Target:

- PDF size up to 100 MB.
- More than 300 pages.

Avoid unnecessary PDF rendering.

Use lazy loading and virtualization when possible.

---

# Accessibility

The application should support:

- Keyboard navigation.
- Proper labels.
- Screen reader friendly forms.
- Responsive layout for mobile devices.

---

# Future Roadmap

Possible future improvements:

- Automatic chapter detection with higher accuracy.
- Progressive Web App (PWA) support.
- Repository upload guide integration.
- Existing file renaming tool.
- Multi-language support (Indonesian and English).

---

# Development Philosophy

Keep the application simple.

Do not introduce backend infrastructure.

Do not introduce authentication.

Do not introduce a database.

The application exists to solve one problem efficiently:

"Convert a student's thesis PDF into Repository UNSRI ready files."

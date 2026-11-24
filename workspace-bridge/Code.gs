/**
 * Boongood AI Company - Layer 1 Workspace Bridge (Google Apps Script)
 *
 * Bridges Layer 2 (Backend Orchestrator) with Layer 1 (Google Drive & Google Sheets).
 * - setupWorkspace(): Run once to provision folders, Master Ledger sheet, and ScriptProperties.
 * - doPost(e): Authenticated JSON endpoint supporting:
 *     1. create_doc   - Create formatted Google Doc in 00_Inbox_Drafts & log to Tasks_Log
 *     2. append_sheet - Append 1+ rows to Market_Data or Finance_Models
 *     3. save_file    - Save text/HTML/Markdown prototype into 00_Inbox_Drafts & log to Tasks_Log
 *     4. approve_file - Move file from 00_Inbox_Drafts to target folder & mark APPROVED in Tasks_Log
 */

const CONFIG = {
  ROOT_FOLDER_NAME: 'Boongood_AI_Company',
  MASTER_SHEET_NAME: 'Boongood_Master_Ledger',
  SUBFOLDERS: {
    FOLDER_INBOX_ID: '00_Inbox_Drafts',
    FOLDER_MARKET_RESEARCH_ID: '01_Market_Research',
    FOLDER_PROTOTYPES_ID: '02_Prototypes_Drafts',
    FOLDER_DATA_CALC_ID: '03_Data_Calculations',
  },
  APPROVE_TARGETS: {
    '01_Market_Research': 'FOLDER_MARKET_RESEARCH_ID',
    '02_Prototypes_Drafts': 'FOLDER_PROTOTYPES_ID',
    '03_Data_Calculations': 'FOLDER_DATA_CALC_ID',
  },
  SHEET_SCHEMAS: {
    Tasks_Log: [
      'Task_ID',
      'Created_At',
      'Agent_Name',
      'Goal',
      'Status',
      'File_URL',
      'Summary',
      'CEO_Feedback',
    ],
    Market_Data: [
      'Date',
      'Competitor_Name',
      'Product',
      'Price',
      'USP',
      'Source_URL',
      'Notes',
    ],
    Finance_Models: [
      'Date',
      'Item_Name',
      'Cost_COGS',
      'Selling_Price',
      'Margin_Percent',
      'Notes',
    ],
  },
  APPENDABLE_SHEETS: ['Market_Data', 'Finance_Models'],
};

/**
 * Run ONCE from the Apps Script editor to initialize Google Drive folders,
 * Boongood_Master_Ledger spreadsheet, and store all IDs in ScriptProperties.
 * Safe to re-run (reuses existing non-trashed folders/sheets instead of duplicating).
 */
function setupWorkspace() {
  const props = PropertiesService.getScriptProperties();

  // 1. Create or reuse root folder: Boongood_AI_Company
  const rootFolder = getOrCreateRootFolder_(props, CONFIG.ROOT_FOLDER_NAME);
  props.setProperty('ROOT_FOLDER_ID', rootFolder.getId());

  // 2. Create or reuse 4 subfolders inside Boongood_AI_Company
  const folderSummary = {};
  Object.keys(CONFIG.SUBFOLDERS).forEach(function (propKey) {
    const folderName = CONFIG.SUBFOLDERS[propKey];
    const subFolder = getOrCreateSubFolder_(props, propKey, rootFolder, folderName);
    props.setProperty(propKey, subFolder.getId());
    folderSummary[folderName] = {
      property: propKey,
      id: subFolder.getId(),
      url: subFolder.getUrl(),
    };
  });

  // 3. Create or reuse Boongood_Master_Ledger Google Sheet inside root folder
  const spreadsheet = getOrCreateMasterSpreadsheet_(props, rootFolder, CONFIG.MASTER_SHEET_NAME);
  props.setProperty('MASTER_SHEET_ID', spreadsheet.getId());

  // 4. Initialize the 3 required tabs with header rows
  initializeSheets_(spreadsheet);

  // 5. Ensure API_SECRET exists in ScriptProperties (never hardcoded in source)
  let apiSecretCreated = false;
  if (!props.getProperty('API_SECRET')) {
    const generatedSecret = 'bg_' + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('API_SECRET', generatedSecret);
    apiSecretCreated = true;
  }

  const result = {
    status: 'WORKSPACE_READY',
    root_folder: {
      name: rootFolder.getName(),
      id: rootFolder.getId(),
      url: rootFolder.getUrl(),
    },
    subfolders: folderSummary,
    master_ledger: {
      name: spreadsheet.getName(),
      id: spreadsheet.getId(),
      url: spreadsheet.getUrl(),
      tabs: Object.keys(CONFIG.SHEET_SCHEMAS),
    },
    api_secret_note: apiSecretCreated
      ? 'Da tu dong tao API_SECRET trong Project Settings -> Script Properties.'
      : 'Giu nguyen API_SECRET da co trong Script Properties.',
  };

  Logger.log('=== BOONGOOD WORKSPACE SETUP COMPLETE ===');
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Lightweight GET endpoint for health check after Web App deployment.
 */
function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'Boongood Workspace Bridge',
    status: 'running',
    supported_actions: ['create_doc', 'append_sheet', 'save_file', 'approve_file'],
  });
}

/**
 * Main POST JSON endpoint secured by API_SECRET stored in ScriptProperties.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: 'Missing JSON request body.' });
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse_({ ok: false, error: 'Invalid JSON payload: ' + parseErr.message });
    }

    const props = PropertiesService.getScriptProperties();

    // Authenticate request using API_SECRET from ScriptProperties
    const expectedSecret = props.getProperty('API_SECRET');
    if (!expectedSecret) {
      return jsonResponse_({
        ok: false,
        error: 'API_SECRET is not configured in ScriptProperties. Run setupWorkspace() or set API_SECRET.',
      });
    }

    const providedSecret =
      (payload && (payload.api_secret || payload.secret)) ||
      (e.parameter && e.parameter.api_secret) ||
      '';

    if (!constantTimeEquals_(String(providedSecret), String(expectedSecret))) {
      return jsonResponse_({ ok: false, error: 'Unauthorized: invalid API_SECRET.' });
    }

    const action = payload.action;
    if (!action) {
      return jsonResponse_({ ok: false, error: 'Missing required field: action.' });
    }

    switch (action) {
      case 'create_doc':
        return jsonResponse_(handleCreateDoc_(payload, props));
      case 'append_sheet':
        return jsonResponse_(handleAppendSheet_(payload, props));
      case 'save_file':
        return jsonResponse_(handleSaveFile_(payload, props));
      case 'approve_file':
        return jsonResponse_(handleApproveFile_(payload, props));
      default:
        return jsonResponse_({
          ok: false,
          error: 'Unsupported action "' + action + '". Allowed: create_doc, append_sheet, save_file, approve_file.',
        });
    }
  } catch (err) {
    Logger.log('doPost error: ' + err.stack);
    return jsonResponse_({
      ok: false,
      error: err.message || String(err),
    });
  }
}

/* ============================================================================
 * ACTION HANDLERS
 * ========================================================================== */

/**
 * Action: create_doc
 * Creates a cleanly formatted Google Doc (title, metadata, section outline, body)
 * inside 00_Inbox_Drafts, logs to Tasks_Log, and returns file_id + file_url.
 */
function handleCreateDoc_(payload, props) {
  const title = requireString_(payload.title, 'title');
  const inboxFolder = getRequiredFolder_(props, 'FOLDER_INBOX_ID', '00_Inbox_Drafts');

  const taskId = payload.task_id ? String(payload.task_id).trim() : generateTaskId_();
  const agentName = payload.agent_name ? String(payload.agent_name).trim() : 'AI_Agent';
  const goal = payload.goal ? String(payload.goal).trim() : title;
  const status = payload.status ? String(payload.status).trim() : 'WAITING_APPROVAL';
  const summary = payload.summary ? String(payload.summary).trim() : '';
  const createdAt = new Date().toISOString();

  // Create Google Doc and format structure
  const doc = DocumentApp.create(title);
  const body = doc.getBody();
  body.setMarginTop(54);
  body.setMarginBottom(54);
  body.setMarginLeft(64);
  body.setMarginRight(64);

  // Document Title
  const titlePara = body.appendParagraph(title);
  titlePara.setHeading(DocumentApp.ParagraphHeading.TITLE);
  titlePara.setSpacingAfter(6);

  // Metadata line
  const metaPara = body.appendParagraph(
    'Task ID: ' + taskId + '  |  Agent: ' + agentName + '  |  Created: ' + createdAt
  );
  metaPara.setFontSize(9);
  metaPara.setForegroundColor('#5F6368');
  metaPara.setItalic(true);
  metaPara.setSpacingAfter(8);

  if (goal && goal !== title) {
    const goalPara = body.appendParagraph('Mục tiêu: ' + goal);
    goalPara.setFontSize(10);
    goalPara.setForegroundColor('#374151');
    goalPara.setSpacingAfter(10);
  }

  body.appendHorizontalRule();

  const sections = normalizeDocSections_(payload.sections, payload.content);

  // Table of Contents / Mục lục đoạn when there are named sections
  const outlineHeadings = sections
    .map(function (sec) {
      return sec.heading;
    })
    .filter(function (h) {
      return Boolean(h);
    });

  if (outlineHeadings.length > 0) {
    const tocTitle = body.appendParagraph('Mục lục');
    tocTitle.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    tocTitle.setSpacingBefore(10);
    tocTitle.setSpacingAfter(4);

    outlineHeadings.forEach(function (headingText, idx) {
      const tocItem = body.appendParagraph((idx + 1) + '. ' + headingText);
      tocItem.setFontSize(10);
      tocItem.setForegroundColor('#374151');
      tocItem.setIndentStart(14);
      tocItem.setSpacingAfter(2);
    });

    body.appendHorizontalRule();
  }

  // Render sections
  let headingIndex = 0;
  sections.forEach(function (sec) {
    if (sec.heading) {
      headingIndex += 1;
      const headingPara = body.appendParagraph(headingIndex + '. ' + sec.heading);
      headingPara.setHeading(
        sec.level === 3
          ? DocumentApp.ParagraphHeading.HEADING3
          : DocumentApp.ParagraphHeading.HEADING2
      );
      headingPara.setSpacingBefore(12);
      headingPara.setSpacingAfter(4);
    }

    if (sec.paragraphs && sec.paragraphs.length > 0) {
      sec.paragraphs.forEach(function (text) {
        const p = body.appendParagraph(text);
        p.setLineSpacing(1.25);
        p.setSpacingAfter(6);
      });
    }

    if (sec.bullets && sec.bullets.length > 0) {
      sec.bullets.forEach(function (bulletText) {
        const li = body.appendListItem(bulletText);
        li.setGlyphType(DocumentApp.GlyphType.BULLET);
        li.setLineSpacing(1.2);
        li.setSpacingAfter(3);
      });
    }
  });

  doc.saveAndClose();

  // Move created Doc into 00_Inbox_Drafts
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(inboxFolder);

  const fileId = file.getId();
  const fileUrl = doc.getUrl();

  // Log entry in Tasks_Log
  appendTasksLog_(props, {
    Task_ID: taskId,
    Created_At: createdAt,
    Agent_Name: agentName,
    Goal: goal,
    Status: status,
    File_URL: fileUrl,
    Summary: summary,
    CEO_Feedback: '',
  });

  return {
    ok: true,
    action: 'create_doc',
    task_id: taskId,
    file_id: fileId,
    file_url: fileUrl,
    title: title,
    folder: CONFIG.SUBFOLDERS.FOLDER_INBOX_ID,
  };
}

/**
 * Action: append_sheet
 * Appends one or multiple rows to Market_Data or Finance_Models and returns sheet_url.
 */
function handleAppendSheet_(payload, props) {
  const sheetName = requireString_(payload.sheet_name, 'sheet_name');
  if (CONFIG.APPENDABLE_SHEETS.indexOf(sheetName) === -1) {
    throw new Error(
      'Invalid sheet_name "' + sheetName + '". Allowed: ' + CONFIG.APPENDABLE_SHEETS.join(', ')
    );
  }

  let rawRows = [];
  if (Array.isArray(payload.rows)) {
    rawRows = payload.rows;
  } else if (payload.row !== undefined && payload.row !== null) {
    rawRows = [payload.row];
  } else {
    throw new Error('Missing required field: rows (array) or row (object/array).');
  }

  if (rawRows.length === 0) {
    throw new Error('rows array must contain at least 1 row.');
  }

  const headers = CONFIG.SHEET_SCHEMAS[sheetName];
  const formattedRows = rawRows.map(function (rowItem) {
    return normalizeSheetRow_(sheetName, headers, rowItem);
  });

  const spreadsheet = getMasterSpreadsheet_(props);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Tab "' + sheetName + '" not found in Boongood_Master_Ledger. Run setupWorkspace().');
  }

  withScriptLock_(function () {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, formattedRows.length, headers.length).setValues(formattedRows);
  });

  return {
    ok: true,
    action: 'append_sheet',
    sheet_name: sheetName,
    rows_added: formattedRows.length,
    sheet_url: spreadsheet.getUrl() + '#gid=' + sheet.getSheetId(),
  };
}

/**
 * Action: save_file
 * Saves a text/HTML/Markdown prototype file into 00_Inbox_Drafts, logs to Tasks_Log
 * (unless log_task === false), and returns file_id + file_url.
 */
function handleSaveFile_(payload, props) {
  const fileName = requireString_(payload.file_name, 'file_name');
  if (typeof payload.content !== 'string') {
    throw new Error('Missing or invalid required field: content (must be string).');
  }

  const inboxFolder = getRequiredFolder_(props, 'FOLDER_INBOX_ID', '00_Inbox_Drafts');
  const mimeType = payload.mime_type
    ? String(payload.mime_type).trim()
    : inferMimeType_(fileName);

  const blob = Utilities.newBlob(payload.content, mimeType, fileName);
  const file = inboxFolder.createFile(blob);

  const fileId = file.getId();
  const fileUrl = file.getUrl();
  const taskId = payload.task_id ? String(payload.task_id).trim() : generateTaskId_();

  if (payload.log_task !== false) {
    appendTasksLog_(props, {
      Task_ID: taskId,
      Created_At: new Date().toISOString(),
      Agent_Name: payload.agent_name ? String(payload.agent_name).trim() : 'AI_Agent',
      Goal: payload.goal ? String(payload.goal).trim() : 'Save prototype: ' + fileName,
      Status: payload.status ? String(payload.status).trim() : 'WAITING_APPROVAL',
      File_URL: fileUrl,
      Summary: payload.summary ? String(payload.summary).trim() : 'Prototype file (' + mimeType + ')',
      CEO_Feedback: '',
    });
  }

  return {
    ok: true,
    action: 'save_file',
    task_id: taskId,
    file_id: fileId,
    file_url: fileUrl,
    file_name: fileName,
    mime_type: mimeType,
    folder: CONFIG.SUBFOLDERS.FOLDER_INBOX_ID,
  };
}

/**
 * Action: approve_file
 * Moves a file from 00_Inbox_Drafts to 01_Market_Research, 02_Prototypes_Drafts,
 * or 03_Data_Calculations, and updates Status in Tasks_Log to APPROVED.
 */
function handleApproveFile_(payload, props) {
  const fileId = requireString_(payload.file_id, 'file_id');
  const targetFolderName = requireString_(payload.target_folder, 'target_folder');

  const targetPropKey = CONFIG.APPROVE_TARGETS[targetFolderName];
  if (!targetPropKey) {
    throw new Error(
      'Invalid target_folder "' +
        targetFolderName +
        '". Allowed: ' +
        Object.keys(CONFIG.APPROVE_TARGETS).join(', ')
    );
  }

  const inboxFolderId = props.getProperty('FOLDER_INBOX_ID');
  if (!inboxFolderId) {
    throw new Error('FOLDER_INBOX_ID is missing in ScriptProperties. Run setupWorkspace() first.');
  }

  const destFolder = getRequiredFolder_(props, targetPropKey, targetFolderName);
  const file = DriveApp.getFileById(fileId);

  // Verify the file is currently located in 00_Inbox_Drafts to prevent accidental moves
  if (payload.require_in_inbox !== false && !isFileInFolder_(file, inboxFolderId)) {
    throw new Error(
      'File "' +
        file.getName() +
        '" (id: ' +
        fileId +
        ') is not inside 00_Inbox_Drafts. It may have already been moved.'
    );
  }

  file.moveTo(destFolder);

  const taskId = payload.task_id ? String(payload.task_id).trim() : '';
  const ceoFeedback =
    payload.ceo_feedback !== undefined && payload.ceo_feedback !== null
      ? String(payload.ceo_feedback).trim()
      : null;

  const updatedRows = updateTaskStatusApproved_(props, fileId, taskId, ceoFeedback);

  return {
    ok: true,
    action: 'approve_file',
    file_id: fileId,
    file_name: file.getName(),
    file_url: file.getUrl(),
    target_folder: targetFolderName,
    status: 'APPROVED',
    tasks_log_updated: updatedRows > 0,
    updated_rows: updatedRows,
  };
}

/* ============================================================================
 * WORKSPACE PROVISIONING HELPERS
 * ========================================================================== */

function getOrCreateRootFolder_(props, folderName) {
  const savedId = props.getProperty('ROOT_FOLDER_ID');
  if (savedId) {
    try {
      const existing = DriveApp.getFolderById(savedId);
      if (!existing.isTrashed()) {
        return existing;
      }
    } catch (e) {
      // Saved folder was deleted or inaccessible; fall through to lookup/create
    }
  }

  const iterator = DriveApp.getRootFolder().getFoldersByName(folderName);
  while (iterator.hasNext()) {
    const candidate = iterator.next();
    if (!candidate.isTrashed()) {
      return candidate;
    }
  }

  return DriveApp.createFolder(folderName);
}

function getOrCreateSubFolder_(props, propKey, parentFolder, folderName) {
  const savedId = props.getProperty(propKey);
  if (savedId) {
    try {
      const existing = DriveApp.getFolderById(savedId);
      if (!existing.isTrashed()) {
        return existing;
      }
    } catch (e) {
      // Fall through to lookup/create
    }
  }

  const iterator = parentFolder.getFoldersByName(folderName);
  while (iterator.hasNext()) {
    const candidate = iterator.next();
    if (!candidate.isTrashed()) {
      return candidate;
    }
  }

  return parentFolder.createFolder(folderName);
}

function getOrCreateMasterSpreadsheet_(props, rootFolder, sheetName) {
  const savedId = props.getProperty('MASTER_SHEET_ID');
  if (savedId) {
    try {
      const existingFile = DriveApp.getFileById(savedId);
      if (!existingFile.isTrashed()) {
        return SpreadsheetApp.openById(savedId);
      }
    } catch (e) {
      // Fall through to lookup/create
    }
  }

  const files = rootFolder.getFilesByName(sheetName);
  while (files.hasNext()) {
    const candidate = files.next();
    if (!candidate.isTrashed() && candidate.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return SpreadsheetApp.openById(candidate.getId());
    }
  }

  const ss = SpreadsheetApp.create(sheetName);
  DriveApp.getFileById(ss.getId()).moveTo(rootFolder);
  return ss;
}

function initializeSheets_(spreadsheet) {
  const tabNames = Object.keys(CONFIG.SHEET_SCHEMAS);

  tabNames.forEach(function (tabName) {
    const headers = CONFIG.SHEET_SCHEMAS[tabName];
    let sheet = spreadsheet.getSheetByName(tabName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(tabName);
    }

    const firstRowValues =
      sheet.getLastRow() >= 1
        ? sheet.getRange(1, 1, 1, headers.length).getValues()[0]
        : [];
    const hasHeader = firstRowValues.some(function (cell) {
      return String(cell).trim() !== '';
    });

    if (!hasHeader) {
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1F2937');
      headerRange.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
    }
  });

  // Remove default empty "Sheet1" if our 3 tabs are present
  const defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && spreadsheet.getSheets().length > tabNames.length) {
    if (defaultSheet.getLastRow() === 0 && defaultSheet.getLastColumn() === 0) {
      spreadsheet.deleteSheet(defaultSheet);
    }
  }
}

/* ============================================================================
 * DATA & FORMATTING HELPERS
 * ========================================================================== */

function normalizeDocSections_(rawSections, rawContent) {
  const sections = [];

  if (Array.isArray(rawSections) && rawSections.length > 0) {
    rawSections.forEach(function (sec) {
      if (!sec || typeof sec !== 'object') {
        return;
      }
      const paragraphs = [];
      if (typeof sec.body === 'string' && sec.body.trim()) {
        sec.body
          .split(/\n{2,}/)
          .map(function (p) {
            return p.trim();
          })
          .filter(Boolean)
          .forEach(function (p) {
            paragraphs.push(p);
          });
      } else if (Array.isArray(sec.paragraphs)) {
        sec.paragraphs.forEach(function (p) {
          if (String(p).trim()) {
            paragraphs.push(String(p).trim());
          }
        });
      }

      const bullets = Array.isArray(sec.bullets)
        ? sec.bullets
            .map(function (b) {
              return String(b).trim();
            })
            .filter(Boolean)
        : [];

      sections.push({
        heading: sec.heading ? String(sec.heading).trim() : '',
        level: sec.level === 3 ? 3 : 2,
        paragraphs: paragraphs,
        bullets: bullets,
      });
    });
  }

  if (typeof rawContent === 'string' && rawContent.trim()) {
    const parsed = parseMarkdownContent_(rawContent);
    parsed.forEach(function (sec) {
      sections.push(sec);
    });
  }

  if (sections.length === 0) {
    sections.push({
      heading: 'Nội dung',
      level: 2,
      paragraphs: ['(Chưa có nội dung chi tiết)'],
      bullets: [],
    });
  }

  return sections;
}

function parseMarkdownContent_(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let current = { heading: '', level: 2, paragraphs: [], bullets: [] };

  lines.forEach(function (rawLine) {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      if (current.heading || current.paragraphs.length > 0 || current.bullets.length > 0) {
        sections.push(current);
      }
      current = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length >= 3 ? 3 : 2,
        paragraphs: [],
        bullets: [],
      };
      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      current.bullets.push(bulletMatch[1].trim());
      return;
    }

    current.paragraphs.push(line);
  });

  if (current.heading || current.paragraphs.length > 0 || current.bullets.length > 0) {
    sections.push(current);
  }

  return sections;
}

function normalizeSheetRow_(sheetName, headers, rowItem) {
  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  if (Array.isArray(rowItem)) {
    const arr = headers.map(function (_, idx) {
      return rowItem[idx] !== undefined && rowItem[idx] !== null ? rowItem[idx] : '';
    });
    if (headers[0] === 'Date' && !String(arr[0]).trim()) {
      arr[0] = todayStr;
    }
    return arr;
  }

  if (rowItem && typeof rowItem === 'object') {
    const lowerMap = {};
    Object.keys(rowItem).forEach(function (key) {
      lowerMap[key.toLowerCase()] = rowItem[key];
    });

    const row = headers.map(function (colName) {
      if (rowItem[colName] !== undefined && rowItem[colName] !== null) {
        return rowItem[colName];
      }
      const lowerVal = lowerMap[colName.toLowerCase()];
      return lowerVal !== undefined && lowerVal !== null ? lowerVal : '';
    });

    // Auto-fill Date if omitted
    if (headers[0] === 'Date' && !String(row[0]).trim()) {
      row[0] = todayStr;
    }

    // Auto-calculate Margin_Percent for Finance_Models if omitted
    if (sheetName === 'Finance_Models') {
      const cogs = Number(row[2]);
      const sellingPrice = Number(row[3]);
      if (String(row[4]).trim() === '' && !isNaN(cogs) && !isNaN(sellingPrice) && sellingPrice > 0) {
        row[4] = Number((((sellingPrice - cogs) / sellingPrice) * 100).toFixed(2));
      }
    }

    return row;
  }

  throw new Error('Each row must be an object or an array.');
}

function appendTasksLog_(props, entry) {
  const spreadsheet = getMasterSpreadsheet_(props);
  const sheet = spreadsheet.getSheetByName('Tasks_Log');
  if (!sheet) {
    throw new Error('Tab "Tasks_Log" not found in Boongood_Master_Ledger. Run setupWorkspace().');
  }

  const headers = CONFIG.SHEET_SCHEMAS.Tasks_Log;
  const row = headers.map(function (col) {
    return entry[col] !== undefined && entry[col] !== null ? entry[col] : '';
  });

  withScriptLock_(function () {
    sheet.appendRow(row);
  });
}

function updateTaskStatusApproved_(props, fileId, taskId, ceoFeedback) {
  const spreadsheet = getMasterSpreadsheet_(props);
  const sheet = spreadsheet.getSheetByName('Tasks_Log');
  if (!sheet) {
    throw new Error('Tab "Tasks_Log" not found in Boongood_Master_Ledger.');
  }

  let updatedCount = 0;

  withScriptLock_(function () {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return;
    }

    const headers = CONFIG.SHEET_SCHEMAS.Tasks_Log;
    const taskIdCol = headers.indexOf('Task_ID');
    const statusCol = headers.indexOf('Status');
    const fileUrlCol = headers.indexOf('File_URL');
    const feedbackCol = headers.indexOf('CEO_Feedback');

    const dataRange = sheet.getRange(2, 1, lastRow - 1, headers.length);
    const rows = dataRange.getValues();

    for (let i = 0; i < rows.length; i++) {
      const rowTaskId = String(rows[i][taskIdCol] || '').trim();
      const rowFileUrl = String(rows[i][fileUrlCol] || '');

      const matchesTask = taskId && rowTaskId === taskId;
      const matchesFile = rowFileUrl.indexOf(fileId) !== -1;

      if (matchesTask || matchesFile) {
        sheet.getRange(i + 2, statusCol + 1).setValue('APPROVED');
        if (ceoFeedback !== null) {
          sheet.getRange(i + 2, feedbackCol + 1).setValue(ceoFeedback);
        }
        updatedCount++;
      }
    }
  });

  return updatedCount;
}

/* ============================================================================
 * UTILITY & SECURITY HELPERS
 * ========================================================================== */

function getRequiredFolder_(props, propKey, folderLabel) {
  const folderId = props.getProperty(propKey);
  if (!folderId) {
    throw new Error(
      'Missing ScriptProperty "' + propKey + '" (' + folderLabel + '). Run setupWorkspace() first.'
    );
  }
  return DriveApp.getFolderById(folderId);
}

function getMasterSpreadsheet_(props) {
  const sheetId = props.getProperty('MASTER_SHEET_ID');
  if (!sheetId) {
    throw new Error('Missing ScriptProperty "MASTER_SHEET_ID". Run setupWorkspace() first.');
  }
  return SpreadsheetApp.openById(sheetId);
}

function isFileInFolder_(file, folderId) {
  const parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === folderId) {
      return true;
    }
  }
  return false;
}

function inferMimeType_(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.css')) return 'text/css';
  if (lower.endsWith('.js')) return 'application/javascript';
  return 'text/plain';
}

function generateTaskId_() {
  const stamp = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd-HHmmss');
  const suffix = Utilities.getUuid().slice(0, 6).toUpperCase();
  return 'TASK-' + stamp + '-' + suffix;
}

function requireString_(val, fieldName) {
  if (typeof val !== 'string' || !val.trim()) {
    throw new Error('Missing or empty required string field: ' + fieldName);
  }
  return val.trim();
}

function constantTimeEquals_(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function withScriptLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

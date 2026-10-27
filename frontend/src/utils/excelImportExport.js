import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Generates and downloads an Excel file (.xlsx) template
 * with native Excel dropdown validation.
 * Pre-fills rows based on the society's total unit count (up to max units),
 * with srno, unit no, and home type pre-filled.
 * If home type is flat, shows Tower and Floor columns; otherwise omits Tower and Floor columns.
 */
export const exportResidentsExcelTemplate = async (societyOrObj = 'society', targetUnitsCount = null) => {
  const isObj = typeof societyOrObj === 'object' && societyOrObj !== null;
  const societyName = isObj ? (societyOrObj.name || 'society') : String(societyOrObj);
  const rawType = isObj ? String(societyOrObj.society_type || 'FLAT').toUpperCase() : 'FLAT';
  const isFlat = rawType === 'FLAT';
  const maxUnitsAllowed = isObj ? parseInt(societyOrObj.max_units || societyOrObj.total_homes || 10, 10) : 10;
  
  // Total units to generate in Excel sheet (prefilled rows)
  const defaultUnits = isObj ? parseInt(societyOrObj.total_homes || societyOrObj.max_units || 1, 10) : 1;
  const unitsCount = Math.max(1, Math.min(parseInt(targetUnitsCount, 10) || defaultUnits, maxUnitsAllowed));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'MyVMS';
  wb.lastModifiedBy = 'MyVMS';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Residents_Template', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Conditionally build columns: Flat includes Tower & Floor; Bungalow omits them
  let headers = [];
  let columns = [];

  if (isFlat) {
    headers = [
      'Sr No.',
      'Unit',
      'Home No',
      'Home Type',
      'Tower',
      'Floor',
      'Property Configuration',
      'User Name',
      'Resident Type',
      'Phone Number',
      'Email ID',
      'Move In Date (YYYY-MM-DD)',
      'Password',
      'Max Family Members (Create Account No)',
    ];

    columns = [
      { header: headers[0], key: 'srno', width: 10 },
      { header: headers[1], key: 'unit', width: 12 },
      { header: headers[2], key: 'home_no', width: 14 },
      { header: headers[3], key: 'home_type', width: 18 },
      { header: headers[4], key: 'tower', width: 16 },
      { header: headers[5], key: 'floor', width: 10 },
      { header: headers[6], key: 'property_configuration', width: 28 },
      { header: headers[7], key: 'user_name', width: 22 },
      { header: headers[8], key: 'resident_type', width: 18 },
      { header: headers[9], key: 'phone_number', width: 18 },
      { header: headers[10], key: 'email_id', width: 26 },
      { header: headers[11], key: 'move_in_date', width: 24 },
      { header: headers[12], key: 'password', width: 18 },
      { header: headers[13], key: 'max_family_members', width: 36 },
    ];
  } else {
    // Non-Flat (Bungalow): Do NOT show Tower and Floor
    headers = [
      'Sr No.',
      'Unit',
      'Home No',
      'Home Type',
      'Property Configuration',
      'User Name',
      'Resident Type',
      'Phone Number',
      'Email ID',
      'Move In Date (YYYY-MM-DD)',
      'Password',
      'Max Family Members (Create Account No)',
    ];

    columns = [
      { header: headers[0], key: 'srno', width: 10 },
      { header: headers[1], key: 'unit', width: 12 },
      { header: headers[2], key: 'home_no', width: 14 },
      { header: headers[3], key: 'home_type', width: 18 },
      { header: headers[4], key: 'property_configuration', width: 28 },
      { header: headers[5], key: 'user_name', width: 22 },
      { header: headers[6], key: 'resident_type', width: 18 },
      { header: headers[7], key: 'phone_number', width: 18 },
      { header: headers[8], key: 'email_id', width: 26 },
      { header: headers[9], key: 'move_in_date', width: 24 },
      { header: headers[10], key: 'password', width: 18 },
      { header: headers[11], key: 'max_family_members', width: 36 },
    ];
  }

  ws.columns = columns;

  // Style Header Row
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D3748' }, // sleek dark slate
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  const todayStr = new Date().toISOString().split('T')[0];
  const homeTypeVal = isFlat ? 'flat' : 'bunglow';

  // Smart family accounts quota distribution within society max_users
  const maxUsersAllowed = isObj && (societyOrObj.max_users || societyOrObj.plan_max_users)
    ? parseInt(societyOrObj.max_users || societyOrObj.plan_max_users, 10)
    : null;
  const remainingUserQuota = maxUsersAllowed ? Math.max(0, maxUsersAllowed - unitsCount) : unitsCount * 2;
  const baseFamilyPerUnit = Math.floor(remainingUserQuota / unitsCount);
  let familyRemainder = remainingUserQuota % unitsCount;

  // Pre-fill rows based on total units selected
  for (let i = 1; i <= unitsCount; i++) {
    const unitNo = isFlat ? String(100 + i) : String(i);
    const samplePhone = `98765432${String(10 + i).slice(-2)}`;
    const sampleEmail = `resident${unitNo}@example.com`;
    const sampleName = i === 1 ? 'Ramesh Patel' : `Resident ${unitNo}`;
    const assignedFamily = Math.min(2, baseFamilyPerUnit + (familyRemainder > 0 ? 1 : 0));
    if (familyRemainder > 0) familyRemainder--;

    if (isFlat) {
      ws.addRow([
        i,                      // Sr No.
        unitNo,                 // Unit
        unitNo,                 // Home No
        homeTypeVal,            // Home Type
        'Tower A',              // Tower
        1,                      // Floor
        '2bhk',                 // Property Configuration
        sampleName,             // User Name
        'Owner',                // Resident Type
        samplePhone,            // Phone Number
        sampleEmail,            // Email ID
        todayStr,               // Move In Date
        'Password@123',         // Password
        assignedFamily,         // Max Family Members
      ]);
    } else {
      // Bungalow: Tower & Floor omitted
      ws.addRow([
        i,                      // Sr No.
        unitNo,                 // Unit
        unitNo,                 // Home No
        homeTypeVal,            // Home Type
        '2bhk',                 // Property Configuration
        sampleName,             // User Name
        'Owner',                // Resident Type
        samplePhone,            // Phone Number
        sampleEmail,            // Email ID
        todayStr,               // Move In Date
        'Password@123',         // Password
        assignedFamily,         // Max Family Members
      ]);
    }
  }

  // Apply dropdown data validation to rows 2 through 300
  const maxRowsToValidate = Math.max(unitsCount + 20, 100);
  const dateColIdx = isFlat ? 12 : 10;
  ws.getColumn(dateColIdx).numFmt = '@';

  for (let r = 2; r <= maxRowsToValidate; r++) {
    const row = ws.getRow(r);
    row.alignment = { vertical: 'middle' };
    row.getCell(dateColIdx).numFmt = '@';

    if (isFlat) {
      // Column 4: Home Type
      row.getCell(4).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"bunglow,flat"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Home Type',
        error: 'Please choose either bunglow or flat from the dropdown list.',
      };

      // Column 7: Property Configuration
      row.getCell(7).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"1bhk,2bhk,3bhk,4bhk,Panthouse"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Configuration',
        error: 'Please choose 1bhk, 2bhk, 3bhk, 4bhk, or Panthouse from the dropdown list.',
      };

      // Column 9: Resident Type
      row.getCell(9).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Owner,Tenant"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Resident Type',
        error: 'Please choose either Owner or Tenant from the dropdown list.',
      };
    } else {
      // Non-Flat (Bungalow):
      // Column 4: Home Type
      row.getCell(4).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"bunglow,flat"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Home Type',
        error: 'Please choose either bunglow or flat from the dropdown list.',
      };

      // Column 5: Property Configuration
      row.getCell(5).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"1bhk,2bhk,3bhk,4bhk,Panthouse"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Configuration',
        error: 'Please choose 1bhk, 2bhk, 3bhk, 4bhk, or Panthouse from the dropdown list.',
      };

      // Column 7: Resident Type
      row.getCell(7).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Owner,Tenant"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Resident Type',
        error: 'Please choose either Owner or Tenant from the dropdown list.',
      };
    }
  }

  // Generate buffer and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const cleanName = String(societyName).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  anchor.download = `${cleanName}_residents_import_sheet.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

/**
 * Normalizes any date format (e.g. '10/27/26', '10/27/2026', '27/10/2026', '2026-10-27', Excel serial number)
 * into a valid 'YYYY-MM-DD' string for MySQL DATE columns.
 */
export const normalizeToDateString = (val) => {
  if (!val) return new Date().toISOString().split('T')[0];

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Handle Excel serial date numbers (e.g. 46322)
  if (typeof val === 'number' || (!isNaN(val) && String(val).trim().length === 5 && !String(val).includes('-') && !String(val).includes('/'))) {
    const num = Number(val);
    if (!isNaN(num) && num > 10000 && num < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const targetDate = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(targetDate.getTime())) {
        return targetDate.toISOString().split('T')[0];
      }
    }
  }

  const str = String(val).trim();
  if (!str) return new Date().toISOString().split('T')[0];

  // Already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Handle slash, dot, or dash separated dates: M/D/YY, MM/DD/YY, DD/MM/YYYY, etc.
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    let [p1, p2, p3] = parts.map((p) => p.trim());

    // 2-digit year at end (e.g. '26' -> '2026')
    if (p3.length === 2) {
      const yr = parseInt(p3, 10);
      p3 = yr < 50 ? `20${p3.padStart(2, '0')}` : `19${p3.padStart(2, '0')}`;
    }

    // YYYY/MM/DD or YYYY-MM-DD
    if (p1.length === 4) {
      const y = p1;
      const m = p2.padStart(2, '0');
      const d = p3.padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // MM/DD/YYYY or DD/MM/YYYY
    if (p3.length === 4) {
      const num1 = parseInt(p1, 10);
      const num2 = parseInt(p2, 10);
      const year = p3;

      let month, day;
      if (num1 > 12) {
        day = String(num1).padStart(2, '0');
        month = String(num2).padStart(2, '0');
      } else if (num2 > 12) {
        month = String(num1).padStart(2, '0');
        day = String(num2).padStart(2, '0');
      } else {
        month = String(num1).padStart(2, '0');
        day = String(num2).padStart(2, '0');
      }
      return `${year}-${month}-${day}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().split('T')[0];
};

/**
 * Parses uploaded Excel (.xlsx, .xls) or CSV file into normalized resident items
 */
export const parseResidentsExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        const normalized = rawRows.map((row, index) => {
          // Flexible key lookup
          const getVal = (patterns) => {
            const foundKey = Object.keys(row).find((k) => {
              const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              return patterns.some((p) => lower.includes(p));
            });
            return foundKey ? String(row[foundKey]).trim() : '';
          };

          const srno = getVal(['srno', 'sr', 'serial']) || (index + 1);
          const unit = getVal(['unit', 'unitno']);
          const home_no = getVal(['homeno', 'home', 'flatno', 'flat']) || unit;
          const rawHomeType = getVal(['hometype']) || 'flat';
          const isBung = rawHomeType.toLowerCase().includes('bung');
          const home_type = isBung ? 'bunglow' : 'flat';
          const tower = getVal(['tower', 'block', 'wing']) || (isBung ? '' : 'Tower A');
          const floor = getVal(['floor', 'flor']) || (isBung ? '' : '1');
          const property_configuration = getVal(['propertyconfiguration', 'configuration', 'config']) || '2bhk';
          const user_name = getVal(['username', 'residentname', 'name', 'user']) || `Resident ${index + 1}`;
          const resident_type = getVal(['residenttype', 'resident_type', 'resident', 'occupancy']) || 'Owner';
          const phone_number = getVal(['phonenumber', 'phone', 'mobile', 'contact']) || '';
          const email_id = getVal(['emailid', 'email', 'mail']) || '';
          const rawMoveInDate = getVal(['moveindate', 'movein', 'date']);
          const move_in_date = normalizeToDateString(rawMoveInDate);
          const password = getVal(['password', 'pass']) || 'Password@123';
          const rawFamily = getVal(['maxfamilymembers', 'familymembers', 'maxfamily', 'familyaccount', 'family']);
          const max_family_members = rawFamily !== '' && !isNaN(parseInt(rawFamily, 10)) ? Math.max(0, parseInt(rawFamily, 10)) : 2;

          return {
            srno,
            unit: unit || home_no,
            home_no,
            home_type,
            tower: isBung ? null : (tower || 'Tower A'),
            floor: isBung ? null : (parseInt(floor, 10) || 1),
            property_configuration,
            user_name,
            resident_type: resident_type.toLowerCase() === 'tenant' ? 'Tenant' : 'Owner',
            phone_number,
            email_id,
            move_in_date,
            password,
            max_family_members,
          };
        }).filter((r) => r.home_no || r.user_name || r.phone_number);

        resolve(normalized);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

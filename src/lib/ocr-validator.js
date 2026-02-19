// OCR Validation Engine
// Simulates document type detection using pattern matching
// In production, this would connect to Tartan's in-house OCR service

const DOCUMENT_PATTERNS = {
    pan_card: {
        label: 'PAN Card',
        patterns: [
            /[A-Z]{5}[0-9]{4}[A-Z]/,           // PAN format: ABCDE1234F
            /permanent\s*account\s*number/i,
            /income\s*tax\s*department/i,
            /GOVT\.?\s*OF\s*INDIA/i,
        ],
        keywords: ['permanent account number', 'income tax', 'pan', 'govt of india'],
    },
    aadhaar_card: {
        label: 'Aadhaar Card',
        patterns: [
            /\d{4}\s?\d{4}\s?\d{4}/,            // Aadhaar format: 1234 5678 9012
            /unique\s*identification/i,
            /aadhaar/i,
            /UIDAI/i,
        ],
        keywords: ['aadhaar', 'unique identification', 'uidai', 'enrolment'],
    },
    passport: {
        label: 'Passport',
        patterns: [
            /[A-Z]\d{7}/,                        // Passport format: A1234567
            /REPUBLIC\s*OF\s*INDIA/i,
            /passport/i,
            /nationality/i,
        ],
        keywords: ['passport', 'republic of india', 'nationality', 'emigration'],
    },
    bank_statement: {
        label: 'Bank Statement',
        patterns: [
            /account\s*(number|no|#)/i,
            /balance/i,
            /transaction/i,
            /statement\s*of\s*account/i,
            /IFSC/i,
        ],
        keywords: ['account', 'balance', 'transaction', 'statement', 'bank', 'ifsc'],
    },
    salary_slip: {
        label: 'Salary Slip',
        patterns: [
            /salary\s*slip/i,
            /pay\s*slip/i,
            /gross\s*salary/i,
            /net\s*pay/i,
            /basic\s*pay/i,
            /deductions/i,
        ],
        keywords: ['salary', 'pay slip', 'gross', 'net pay', 'deductions', 'employee'],
    },
    itr: {
        label: 'ITR',
        patterns: [
            /income\s*tax\s*return/i,
            /ITR[-\s]?\d/i,
            /assessment\s*year/i,
            /form\s*16/i,
        ],
        keywords: ['income tax return', 'itr', 'assessment year', 'form 16', 'taxable income'],
    },
    address_proof: {
        label: 'Address Proof',
        patterns: [
            /utility\s*bill/i,
            /electricity\s*bill/i,
            /water\s*bill/i,
            /rent\s*agreement/i,
            /gas\s*bill/i,
        ],
        keywords: ['utility', 'electricity', 'water', 'rent agreement', 'gas bill', 'address'],
    },
    photograph: {
        label: 'Photograph',
        patterns: [],
        keywords: [],
    },
    signature: {
        label: 'Signature',
        patterns: [],
        keywords: [],
    },
};

// Simulate OCR text extraction from file
// In production: send file to Tartan OCR service
function simulateOCRExtraction(fileName, fileContent) {
    // Simulate text based on filename patterns
    const name = fileName.toLowerCase();

    if (name.includes('pan') || name.includes('pancard')) {
        return 'GOVT OF INDIA INCOME TAX DEPARTMENT Permanent Account Number ABCDE1234F Name: John Doe Date of Birth: 01/01/1990';
    }
    if (name.includes('aadhaar') || name.includes('aadhar') || name.includes('uid')) {
        return 'UNIQUE IDENTIFICATION AUTHORITY OF INDIA Aadhaar 1234 5678 9012 Name: John Doe DOB: 01/01/1990 UIDAI Government of India';
    }
    if (name.includes('passport')) {
        return 'REPUBLIC OF INDIA PASSPORT P A1234567 Nationality: INDIAN Surname: DOE Given Names: JOHN Date of Birth: 01 JAN 1990';
    }
    if (name.includes('bank') || name.includes('statement')) {
        return 'STATEMENT OF ACCOUNT Account Number: 1234567890 IFSC: ABCD0001234 Opening Balance: 50000 Transaction Date: 01/01/2026 Credit: 25000 Debit: 10000 Closing Balance: 65000';
    }
    if (name.includes('salary') || name.includes('payslip') || name.includes('pay_slip')) {
        return 'SALARY SLIP Month: January 2026 Employee Name: John Doe Basic Pay: 50000 HRA: 20000 Deductions: 5000 Gross Salary: 70000 Net Pay: 65000';
    }
    if (name.includes('itr') || name.includes('tax_return') || name.includes('form16')) {
        return 'INCOME TAX RETURN ITR-1 Assessment Year: 2025-26 Name: John Doe PAN: ABCDE1234F Taxable Income: 800000 Tax Payable: 40000';
    }
    if (name.includes('address') || name.includes('utility') || name.includes('bill')) {
        return 'ELECTRICITY BILL Utility Bill Consumer No: 123456 Name: John Doe Address: 123 Main Street, City, State 400001 Amount Due: Rs. 2500';
    }

    // For files without recognizable names, return generic text
    // This simulates OCR being unable to clearly identify the document
    return 'Document uploaded. Unable to extract clear text for validation. Manual review recommended.';
}

export function validateDocument(expectedDocType, fileName, fileContent) {
    const extractedText = simulateOCRExtraction(fileName, fileContent);

    // Try to detect what type of document was actually uploaded
    let detectedType = null;
    let maxScore = 0;

    for (const [docType, config] of Object.entries(DOCUMENT_PATTERNS)) {
        let score = 0;

        // Check regex patterns
        for (const pattern of config.patterns) {
            if (pattern.test(extractedText)) {
                score += 3;
            }
        }

        // Check keywords
        for (const keyword of config.keywords) {
            if (extractedText.toLowerCase().includes(keyword.toLowerCase())) {
                score += 2;
            }
        }

        if (score > maxScore) {
            maxScore = score;
            detectedType = docType;
        }
    }

    // If we couldn't detect anything meaningful
    if (!detectedType || maxScore < 3) {
        // For photograph and signature, accept any image
        if (expectedDocType === 'photograph' || expectedDocType === 'signature') {
            return {
                valid: true,
                detectedType: expectedDocType,
                expectedType: expectedDocType,
                confidence: 0.8,
                message: `${DOCUMENT_PATTERNS[expectedDocType]?.label || expectedDocType} accepted.`,
                extractedText: '(Image document — visual content)',
            };
        }

        return {
            valid: false,
            detectedType: 'unknown',
            expectedType: expectedDocType,
            confidence: 0.2,
            message: `Could not verify this as a valid ${DOCUMENT_PATTERNS[expectedDocType]?.label || expectedDocType}. The document may be unclear or of an unexpected format. Please re-upload a clear copy.`,
            extractedText,
        };
    }

    // Check if detected type matches expected type
    const isMatch = detectedType === expectedDocType;
    const expectedLabel = DOCUMENT_PATTERNS[expectedDocType]?.label || expectedDocType;
    const detectedLabel = DOCUMENT_PATTERNS[detectedType]?.label || detectedType;

    if (isMatch) {
        return {
            valid: true,
            detectedType,
            expectedType: expectedDocType,
            confidence: Math.min(maxScore / 10, 1),
            message: `✓ ${expectedLabel} verified successfully. Document matches the required type.`,
            extractedText,
        };
    } else {
        return {
            valid: false,
            detectedType,
            expectedType: expectedDocType,
            confidence: Math.min(maxScore / 10, 1),
            message: `✗ Expected ${expectedLabel} but detected ${detectedLabel}. Please upload the correct ${expectedLabel} document.`,
            extractedText,
        };
    }
}

export function getDocumentLabel(docType) {
    return DOCUMENT_PATTERNS[docType]?.label || docType;
}

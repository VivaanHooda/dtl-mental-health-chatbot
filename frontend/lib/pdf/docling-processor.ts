/**
 * Enhanced PDF Processor using Docling
 * Option C: Smart multi-content pipeline
 * 
 * Handles:
 * - Tables: Extracted and stored with structure preserved
 * - Images: Extracted with descriptions (TODO: vision API integration)
 * - Text: Smart chunking with context preservation
 */

import { DocumentChunk } from './processor';

// --- TYPES ---

export interface DoclingTable {
  data: string[][];      // 2D array of table cells
  numRows: number;
  numCols: number;
  caption?: string;
  pageNumber: number;
}

export interface DoclingImage {
  format: string;        // png, jpg, etc.
  base64Data: string;    // For future vision processing
  caption?: string;
  pageNumber: number;
}

export interface DoclingTextBlock {
  text: string;
  type: 'paragraph' | 'heading' | 'list' | 'code';
  level?: number;        // For headings (h1, h2, etc.)
  pageNumber: number;
}

export interface DoclingProcessedDoc {
  tables: DoclingTable[];
  images: DoclingImage[];
  textBlocks: DoclingTextBlock[];
  metadata: {
    totalPages: number;
    hasScannedContent: boolean;
  };
}

export interface EnhancedDocumentChunk extends DocumentChunk {
  contentType: 'text' | 'table' | 'image';
  structuredData?: any;  // For tables or image metadata
}

// --- CONFIGURATION ---

const CHUNK_CONFIG = {
  // Text chunking
  maxChunkSize: 1000,
  chunkOverlap: 200,
  
  // Table handling
  maxTableCellsPerChunk: 100,  // Split large tables
  includeTableContext: true,    // Add surrounding text to table chunks
  
  // Image handling  
  includeImageDescriptions: true,
  maxImagesPerDocument: 20,     // Prevent overwhelming storage
};

// --- MAIN PROCESSOR ---

/**
 * Process a PDF using Docling and return multi-content chunks
 * @param buffer - PDF file buffer
 * @returns Enhanced chunks with content type metadata
 */
export async function processWithDocling(
  buffer: Buffer
): Promise<EnhancedDocumentChunk[]> {
  
  console.log('🔵 DOCLING: Starting enhanced PDF processing...');
  
  // Step 1: Extract structured content from PDF
  const doclingOutput = await extractStructuredContent(buffer);
  
  console.log(`📊 DOCLING: Found ${doclingOutput.tables.length} tables`);
  console.log(`🖼️  DOCLING: Found ${doclingOutput.images.length} images`);
  console.log(`📝 DOCLING: Found ${doclingOutput.textBlocks.length} text blocks`);
  
  // Step 2: Convert to chunks with appropriate strategies
  const chunks: EnhancedDocumentChunk[] = [];
  
  // Process tables
  const tableChunks = processTableContent(doclingOutput.tables);
  chunks.push(...tableChunks);
  
  // Process images (with placeholder descriptions for now)
  const imageChunks = processImageContent(doclingOutput.images);
  chunks.push(...imageChunks);
  
  // Process text blocks
  const textChunks = processTextContent(doclingOutput.textBlocks);
  chunks.push(...textChunks);
  
  console.log(`✅ DOCLING: Created ${chunks.length} total chunks`);
  console.log(`   - Tables: ${tableChunks.length}`);
  console.log(`   - Images: ${imageChunks.length}`);
  console.log(`   - Text: ${textChunks.length}`);
  
  return chunks;
}

// --- CONTENT EXTRACTION ---

/**
 * Extract structured content using Docling
 * This is where we call the actual Docling library
 */
async function extractStructuredContent(
  buffer: Buffer
): Promise<DoclingProcessedDoc> {
  
  // TODO: Import and configure Docling
  // import { DocumentConverter, PdfFormatOption } from 'docling';
  
  // For now, return a structured format that Docling will populate
  // This is a placeholder - you'll replace with actual Docling calls
  
  const docling = await callDocling(buffer);
  
  return {
    tables: docling.tables || [],
    images: docling.images || [],
    textBlocks: docling.textBlocks || [],
    metadata: {
      totalPages: docling.totalPages || 1,
      hasScannedContent: docling.hasScannedContent || false,
    }
  };
}

/**
 * Call Docling API to process PDF
 */
async function callDocling(buffer: Buffer): Promise<any> {
  const { Docling } = await import('docling-sdk');
  
  const baseUrl = process.env.DOCLING_URL || 'http://localhost:5001';
  
  const client = new Docling({
    api: {
      baseUrl,
      timeout: 120000, // 2 minutes for large PDFs
    },
  });

  try {
    console.log('📡 Calling Docling API (async with JSON result)...');
    
    // Submit async conversion task with JSON result
    const task = await client.convertSourceAsync({
      sources: [{
        kind: 'file' as any,
        base64_string: buffer.toString('base64'),
        filename: 'document.pdf',
      }],
      options: {
        to_formats: ['json'],
        // Enable advanced features
        do_table_structure: true,
        do_ocr: true, // Re-enabled - install EasyOCR first: pip install easyocr
        do_picture_classification: true,
        generate_picture_images: true,
      },
      // Get JSON response instead of ZIP
      target: { kind: 'inbody' },
    });

    console.log(`⏳ Task submitted (ID: ${task.taskId}), waiting for completion...`);

    // Wait for task to complete
    try {
      await task.waitForCompletion();
    } catch (taskError: any) {
      // Task failed during processing
      console.error('❌ Task failed during processing:', taskError.message);
      throw taskError;
    }
    
    console.log('✅ Task completed, fetching result...');

    // Get the JSON result
    const result = await client.getTaskResult(task.taskId);

    console.log('✅ Docling processing complete');
    console.log('🔍 DEBUG: Result structure:', JSON.stringify(result, null, 2).slice(0, 500));

    // Parse the Docling JSON response
    return parseDoclingResponse(result);
    
  } catch (error: any) {
    console.error('❌ Docling API error:', error);
    throw new Error(`Docling processing failed: ${error.message}`);
  }
}

/**
 * Parse Docling's JSON response into our format
 */
function parseDoclingResponse(doclingResult: any): {
  tables: DoclingTable[];
  images: DoclingImage[];
  textBlocks: DoclingTextBlock[];
  totalPages: number;
  hasScannedContent: boolean;
} {
  // Extract the actual document from the response
  const doc = doclingResult.document?.json_content || doclingResult.document || doclingResult;
  
  console.log('🔍 Parsing document with keys:', Object.keys(doc).join(', '));
  
  // Extract tables
  const tables: DoclingTable[] = [];
  if (doc.tables && Array.isArray(doc.tables)) {
    console.log(`📊 Processing ${doc.tables.length} tables...`);
    for (let i = 0; i < doc.tables.length; i++) {
      const table = doc.tables[i];
      const extractedData = extractTableDataFromCells(table);
      
      console.log(`Table ${i + 1}: ${extractedData.length} rows x ${extractedData[0]?.length || 0} cols`);
      
      tables.push({
        data: extractedData,
        numRows: extractedData.length,
        numCols: extractedData[0]?.length || 0,
        caption: table.text || table.caption,
        pageNumber: getPageNumber(table.prov),
      });
    }
  }

  // Extract images/figures
  const images: DoclingImage[] = [];
  if (doc.pictures && Array.isArray(doc.pictures)) {
    console.log(`🖼️  Processing ${doc.pictures.length} pictures...`);
    for (const picture of doc.pictures) {
      images.push({
        format: picture.image?.format || 'png',
        base64Data: picture.image?.data || '',
        caption: picture.text || picture.caption || picture.description,
        pageNumber: getPageNumber(picture.prov),
      });
    }
  }

  // Extract text blocks from body
  const textBlocks: DoclingTextBlock[] = [];
  if (doc.body) {
    console.log('📝 Processing document body...');
    textBlocks.push(...extractTextFromBody(doc.body, doc));
  }

  // Also try to get texts directly
  if (doc.texts && Array.isArray(doc.texts)) {
    console.log(`📝 Processing ${doc.texts.length} text items...`);
    for (const text of doc.texts) {
      textBlocks.push({
        text: text.text || '',
        type: mapDoclingType(text.type || text.label),
        level: text.level,
        pageNumber: getPageNumber(text.prov),
      });
    }
  }

  const totalPages = doc.page_count || doc.num_pages || doc.pages?.length || 1;
  const hasScannedContent = doc.ocr_stats?.chars_from_ocr > 0 || false;

  console.log(`✅ Extracted: ${tables.length} tables, ${images.length} images, ${textBlocks.length} text blocks`);

  return {
    tables,
    images,
    textBlocks,
    totalPages,
    hasScannedContent,
  };
}

/**
 * Helper: Get page number from provenance
 */
function getPageNumber(prov: any): number {
  if (!prov) return 1;
  if (Array.isArray(prov) && prov.length > 0) {
    return prov[0].page_no || prov[0].page || 1;
  }
  return prov.page_no || prov.page || 1;
}

/**
 * Helper: Extract text blocks from document body
 */
function extractTextFromBody(body: any, doc: any): DoclingTextBlock[] {
  const blocks: DoclingTextBlock[] = [];
  
  // Body has a children array with references
  if (body.children && Array.isArray(body.children)) {
    for (const child of body.children) {
      // Resolve the reference
      const ref = child.$ref || child.self_ref;
      if (ref) {
        const item = resolveReference(ref, doc);
        if (item && item.text) {
          blocks.push({
            text: item.text,
            type: mapDoclingType(item.type || item.label),
            level: item.level,
            pageNumber: getPageNumber(item.prov),
          });
        }
      }
    }
  }
  
  return blocks;
}

/**
 * Helper: Resolve JSON reference like "#/texts/0"
 */
function resolveReference(ref: string, doc: any): any {
  if (!ref || !ref.startsWith('#/')) return null;
  
  const parts = ref.slice(2).split('/');
  let current = doc;
  
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = current[part];
    } else {
      return null;
    }
  }
  
  return current;
}

/**
 * Helper: Extract table data from Docling table structure with cells
 */
function extractTableDataFromCells(table: any): string[][] {
  console.log('🔍 Table has keys:', Object.keys(table).join(', '));
  console.log('🔍 Table.data type:', typeof table.data);
  console.log('🔍 Has table_cells?', table.data?.table_cells ? 'YES' : 'NO');
  
  // Check if we have the new table_cells format
  if (table.data?.table_cells && Array.isArray(table.data.table_cells)) {
    console.log('🔍 Using table_cells format with', table.data.table_cells.length, 'cells');
    return convertTableCellsToGrid(table.data);
  }
  
  // Fallback: check if data is already a 2D array
  if (Array.isArray(table.data)) {
    console.log('🔍 Data is already array');
    return table.data;
  }
  
  // Legacy format with cells property
  if (table.cells) {
    console.log('🔍 Using legacy cells format');
    const rows = table.num_rows || 0;
    const cols = table.num_cols || 0;
    const data: string[][] = Array(rows).fill(null).map(() => Array(cols).fill(''));
    
    for (const cell of table.cells) {
      const row = cell.row || 0;
      const col = cell.col || 0;
      data[row][col] = cell.text || '';
    }
    
    return data;
  }
  
  console.log('❌ No valid table data format found');
  return [];
}

/**
 * Convert Docling's table_cells format to 2D array
 */
function convertTableCellsToGrid(data: any): string[][] {
  const cells = data.table_cells;
  if (!cells || cells.length === 0) return [];
  
  // Find grid dimensions
  let maxRow = 0;
  let maxCol = 0;
  
  for (const cell of cells) {
    const endRow = (cell.start_row_offset_idx || 0) + (cell.row_span || 1);
    const endCol = (cell.start_col_offset_idx || 0) + (cell.col_span || 1);
    maxRow = Math.max(maxRow, endRow);
    maxCol = Math.max(maxCol, endCol);
  }
  
  // Initialize grid
  const grid: string[][] = Array(maxRow).fill(null).map(() => Array(maxCol).fill(''));
  
  // Fill grid with cell text
  for (const cell of cells) {
    const rowStart = cell.start_row_offset_idx || 0;
    const colStart = cell.start_col_offset_idx || 0;
    const text = cell.text || '';
    
    // For cells that span multiple rows/cols, put text in first cell
    if (grid[rowStart] && grid[rowStart][colStart] !== undefined) {
      grid[rowStart][colStart] = text;
    }
  }
  
  return grid;
}

/**
 * Helper: Map Docling type to our type system
 */
function mapDoclingType(doclingType: string): 'paragraph' | 'heading' | 'list' | 'code' {
  const type = doclingType?.toLowerCase() || '';
  
  if (type.includes('heading') || type.includes('title')) return 'heading';
  if (type.includes('list') || type.includes('item')) return 'list';
  if (type.includes('code')) return 'code';
  
  return 'paragraph';
}

// --- TABLE PROCESSING ---

/**
 * Convert tables to searchable chunks
 * Strategy: Preserve structure while making content searchable
 */
function processTableContent(tables: DoclingTable[]): EnhancedDocumentChunk[] {
  const chunks: EnhancedDocumentChunk[] = [];
  
  for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
    const table = tables[tableIdx];
    
    // Convert table to markdown for better readability
    const markdownTable = tableToMarkdown(table);
    
    // Also create a linearized version for search
    const searchableText = tableToSearchableText(table);
    
    // Combine both representations
    const chunkText = [
      table.caption ? `Table: ${table.caption}` : `Table ${tableIdx + 1}`,
      '',
      markdownTable,
      '',
      '--- Searchable Content ---',
      searchableText
    ].join('\n');
    
    chunks.push({
      text: chunkText,
      metadata: {
        pageNumber: table.pageNumber,
        paragraphIndex: tableIdx,
        totalParagraphs: tables.length,
      },
      contentType: 'table',
      structuredData: {
        rows: table.numRows,
        cols: table.numCols,
        data: table.data,
      }
    });
  }
  
  return chunks;
}

/**
 * Convert table to markdown format
 */
function tableToMarkdown(table: DoclingTable): string {
  // Ensure data is an array
  if (!table.data || !Array.isArray(table.data) || table.data.length === 0) {
    return 'Empty table';
  }
  
  const rows = table.data.map(row => {
    // Ensure row is an array
    if (!Array.isArray(row)) {
      return '| (invalid row) |';
    }
    return '| ' + row.join(' | ') + ' |';
  });
  
  // Add header separator
  if (rows.length > 0) {
    const separator = '| ' + Array(table.numCols).fill('---').join(' | ') + ' |';
    rows.splice(1, 0, separator);
  }
  
  return rows.join('\n');
}

/**
 * Convert table to searchable text
 * Makes it easy to find table content via semantic search
 */
function tableToSearchableText(table: DoclingTable): string {
  // Ensure data is an array
  if (!table.data || !Array.isArray(table.data) || table.data.length === 0) {
    return '';
  }
  
  return table.data
    .map(row => {
      // Ensure row is an array
      if (!Array.isArray(row)) return '';
      return row.filter(cell => cell && cell.trim()).join(', ');
    })
    .filter(row => row.length > 0)
    .join('. ');
}

// --- IMAGE PROCESSING ---

/**
 * Convert images to searchable chunks
 * Strategy: Store metadata + descriptions for future vision API integration
 */
function processImageContent(images: DoclingImage[]): EnhancedDocumentChunk[] {
  const chunks: EnhancedDocumentChunk[] = [];
  
  // Limit images to prevent storage bloat
  const imagesToProcess = images.slice(0, CHUNK_CONFIG.maxImagesPerDocument);
  
  for (let imgIdx = 0; imgIdx < imagesToProcess.length; imgIdx++) {
    const image = imagesToProcess[imgIdx];
    
    // For now, create a placeholder chunk
    // TODO: Integrate vision API (Gemini Vision, GPT-4V, etc.) to generate descriptions
    const description = image.caption || `Image ${imgIdx + 1} (${image.format})`;
    
    const chunkText = [
      `[IMAGE: ${description}]`,
      image.caption ? `Caption: ${image.caption}` : '',
      `Format: ${image.format}`,
      `Page: ${image.pageNumber}`,
      '',
      '// TODO: Vision API integration for detailed description',
    ].filter(line => line).join('\n');
    
    chunks.push({
      text: chunkText,
      metadata: {
        pageNumber: image.pageNumber,
        paragraphIndex: imgIdx,
        totalParagraphs: imagesToProcess.length,
      },
      contentType: 'image',
      structuredData: {
        format: image.format,
        base64Preview: image.base64Data.substring(0, 100), // Store small preview
        hasFullImage: true,
      }
    });
  }
  
  return chunks;
}

// --- TEXT PROCESSING ---

/**
 * Convert text blocks to chunks with smart splitting
 * Strategy: Preserve context while respecting chunk size limits
 */
function processTextContent(textBlocks: DoclingTextBlock[]): EnhancedDocumentChunk[] {
  const chunks: EnhancedDocumentChunk[] = [];
  
  // Group consecutive blocks into logical sections
  const sections = groupTextBlocks(textBlocks);
  
  for (const section of sections) {
    const sectionText = section.blocks.map(b => b.text).join('\n\n');
    
    // Split large sections into chunks
    const sectionChunks = splitTextIntoChunks(
      sectionText,
      section.startPage,
      section.context
    );
    
    chunks.push(...sectionChunks);
  }
  
  return chunks;
}

/**
 * Group text blocks into logical sections
 */
interface TextSection {
  blocks: DoclingTextBlock[];
  startPage: number;
  context: string;  // e.g., "Under heading: Cognitive Behavioral Therapy"
}

function groupTextBlocks(blocks: DoclingTextBlock[]): TextSection[] {
  const sections: TextSection[] = [];
  let currentSection: TextSection | null = null;
  let currentHeading = '';
  
  for (const block of blocks) {
    // Start new section on headings
    if (block.type === 'heading') {
      if (currentSection && currentSection.blocks.length > 0) {
        sections.push(currentSection);
      }
      currentHeading = block.text;
      currentSection = {
        blocks: [block],
        startPage: block.pageNumber,
        context: `Section: ${currentHeading}`,
      };
    } else {
      // Add to current section
      if (!currentSection) {
        currentSection = {
          blocks: [],
          startPage: block.pageNumber,
          context: '',
        };
      }
      currentSection.blocks.push(block);
    }
  }
  
  // Add final section
  if (currentSection && currentSection.blocks.length > 0) {
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Split text into appropriately-sized chunks with overlap
 */
function splitTextIntoChunks(
  text: string,
  pageNumber: number,
  context: string
): EnhancedDocumentChunk[] {
  const chunks: EnhancedDocumentChunk[] = [];
  const { maxChunkSize, chunkOverlap } = CHUNK_CONFIG;
  
  // Simple sentence-aware splitting
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = context ? `${context}\n\n` : '';
  let currentChunkSentences: string[] = [];
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          pageNumber,
          paragraphIndex: chunks.length,
          totalParagraphs: -1, // Will be updated later
        },
        contentType: 'text',
      });
      
      // Start new chunk with overlap
      const overlapSentences = currentChunkSentences.slice(-2); // Keep last 2 sentences
      currentChunk = overlapSentences.join(' ') + ' ';
      currentChunkSentences = overlapSentences;
    }
    
    currentChunk += trimmedSentence + ' ';
    currentChunkSentences.push(trimmedSentence);
  }
  
  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: {
        pageNumber,
        paragraphIndex: chunks.length,
        totalParagraphs: chunks.length + 1,
      },
      contentType: 'text',
    });
  }
  
  // Update totalParagraphs
  chunks.forEach(chunk => {
    chunk.metadata.totalParagraphs = chunks.length;
  });
  
  return chunks;
}

// --- EXPORTS ---

export {
  processWithDocling as processPDF,
  CHUNK_CONFIG,
};
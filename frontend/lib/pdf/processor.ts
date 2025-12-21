import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import fs from "fs/promises";
import os from "os";
import path from "path";

// Keep your interface to maintain compatibility with your app
export interface DocumentChunk {
  text: string;
  metadata: {
    pageNumber?: number;
    paragraphIndex: number; // We will map chunk index to this
    totalParagraphs: number; // We will map total chunks to this
  };
}

export async function processPDF(buffer: Buffer): Promise<DocumentChunk[]> {
  // 1. Create a temporary file path
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `upload-${Date.now()}.pdf`);

  try {
    // 2. Write the buffer to the temp file so PDFLoader can read it
    await fs.writeFile(tempFilePath, buffer);

    // 3. Initialize the loader (as per your docs)
    const loader = new PDFLoader(tempFilePath, {
      splitPages: false, // Load entire doc first to split it smartly later
    });

    const docs = await loader.load();

    // 4. Use LangChain's splitter instead of manual paragraph splitting
    // This is better for RAG as it handles overlap and context boundaries
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments(docs);

    // 5. Map LangChain documents back to your DocumentChunk interface
    return splitDocs.map((doc, index) => ({
      text: doc.pageContent,
      metadata: {
        // PDFLoader automatically extracts page number into loc.pageNumber
        pageNumber: doc.metadata.loc?.pageNumber || 1,
        paragraphIndex: index,
        totalParagraphs: splitDocs.length,
      },
    }));

  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  } finally {
    // 6. Clean up: Delete the temp file
    try {
      await fs.unlink(tempFilePath);
    } catch (unlinkError) {
      console.warn("Failed to delete temp file:", unlinkError);
    }
  }
}
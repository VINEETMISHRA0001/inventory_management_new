'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  X,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  FileDown,
  Trash2,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';

interface CSVRow {
  [key: string]: string;
}

interface EditableRow {
  [key: string]: string | boolean | undefined;
  _id: string;
  _isNew?: boolean;
}

interface CSVUploadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (
    data: Array<Record<string, string | number | boolean>>
  ) => Promise<void>;
  storageKey: string;
  title?: string;
  description?: string;
}

const STORAGE_PREFIX = 'csv_upload_';

/**
 * CSVUploadDrawer component provides a full-page drawer with drag and drop CSV upload,
 * editable table preview, and localStorage persistence. Only publishes to DB on Publish click.
 */
export function CSVUploadDrawer({
  open,
  onOpenChange,
  onPublish,
  storageKey,
  title = 'Upload CSV',
  description = 'Drag and drop your CSV file or click to browse',
}: CSVUploadDrawerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [csvData, setCsvData] = useState<EditableRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.data && parsed.data.length > 0) {
            setCsvData(parsed.data);
            setHeaders(parsed.headers || []);
            setFileName(parsed.fileName || '');
          }
        } catch (error) {
          console.error('Failed to load from localStorage:', error);
        }
      }
    }
  }, [open, storageKey]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (csvData.length > 0) {
      localStorage.setItem(
        `${STORAGE_PREFIX}${storageKey}`,
        JSON.stringify({
          data: csvData,
          headers,
          fileName,
        })
      );
    }
  }, [csvData, headers, fileName, storageKey]);

  const parseCSV = useCallback((file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<CSVRow>) => {
        if (results.errors.length > 0) {
          toast.error('CSV parsing errors occurred');
          console.error('CSV errors:', results.errors);
        }

        if (results.data && results.data.length > 0) {
          const data = results.data as CSVRow[];
          const editableData: EditableRow[] = data.map((row, index) => ({
            ...row,
            _id: `row_${index}`,
            _isNew: true,
          }));

          const csvHeaders = Object.keys(data[0] || {});
          setHeaders(csvHeaders);
          setCsvData(editableData);
          toast.success(`Loaded ${editableData.length} rows from CSV`);
        } else {
          toast.error('No data found in CSV file');
        }
      },
      error: (error: Error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type === 'text/csv') {
        parseCSV(file);
      } else {
        toast.error('Please upload a valid CSV file');
      }
    },
    [parseCSV]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        parseCSV(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [parseCSV]
  );

  const handleCellEdit = useCallback(
    (rowId: string, column: string, value: string) => {
      setCsvData((prev) =>
        prev.map((row) =>
          row._id === rowId ? { ...row, [column]: value } : row
        )
      );
    },
    []
  );

  const handleDeleteRow = useCallback((rowId: string) => {
    setCsvData((prev) => prev.filter((row) => row._id !== rowId));
    toast.success('Row deleted');
  }, []);

  const handlePublish = useCallback(async () => {
    if (csvData.length === 0) {
      toast.error('No data to publish');
      return;
    }

    setIsPublishing(true);
    try {
      // Filter out internal properties and undefined values before publishing
      const dataToPublish = csvData.map((row) => {
        const { _id, _isNew, ...rest } = row;
        const cleaned: Record<string, string | number | boolean> = {};
        Object.entries(rest).forEach(([key, value]) => {
          if (value !== undefined) {
            cleaned[key] = typeof value === 'string' ? value : String(value);
          }
        });
        return cleaned;
      });
      await onPublish(dataToPublish);
      // Clear localStorage after successful publish
      localStorage.removeItem(`${STORAGE_PREFIX}${storageKey}`);
      setCsvData([]);
      setHeaders([]);
      setFileName('');
      toast.success('Data published successfully!');
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to publish data';
      toast.error(errorMessage);
    } finally {
      setIsPublishing(false);
    }
  }, [csvData, onPublish, storageKey, onOpenChange]);

  const handleClear = useCallback(() => {
    setCsvData([]);
    setHeaders([]);
    setFileName('');
    localStorage.removeItem(`${STORAGE_PREFIX}${storageKey}`);
    toast.success('Data cleared');
  }, [storageKey]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="bottom"
      dismissible={true}
      shouldScaleBackground={false}
    >
      <DrawerContent className="h-screen max-h-screen rounded-none border-0 mt-0 w-full inset-0 flex flex-col">
        {/* Top Drag Handle */}
        <div className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none">
          <div className="flex flex-col items-center gap-1.5">
            <div className="bg-muted h-1.5 w-16 rounded-full" />
            <ChevronUp className="size-5 text-muted-foreground" />
          </div>
        </div>

        <DrawerHeader className="border-b px-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-2xl">{title}</DrawerTitle>
              <DrawerDescription className="mt-2">
                {description}
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {csvData.length === 0 ? (
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg ring-2 ring-primary/20'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className={cn(
                    'rounded-full p-4 transition-all duration-300',
                    isDragging && 'scale-110 rotate-6'
                  )}
                >
                  {isDragging ? (
                    <FileDown
                      className={cn(
                        'size-12 transition-colors duration-300',
                        'text-primary animate-bounce'
                      )}
                    />
                  ) : (
                    <FileSpreadsheet
                      className={cn(
                        'size-12 transition-colors duration-300',
                        'text-muted-foreground group-hover:text-primary'
                      )}
                    />
                  )}
                </div>
                <div>
                  <p
                    className={cn(
                      'text-lg font-medium transition-colors duration-300',
                      isDragging && 'text-primary'
                    )}
                  >
                    {isDragging
                      ? 'Drop your CSV file here'
                      : 'Drag and drop your CSV file'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    or click to browse
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-2 cursor-pointer"
                >
                  <FileSpreadsheet className="size-4 mr-2" />
                  Select CSV File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-500" />
                  <span className="font-medium">
                    {csvData.length} rows loaded
                    {fileName && (
                      <span className="text-muted-foreground ml-2">
                        from {fileName}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClear}>
                    Clear
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="min-w-[120px]"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4 mr-2" />
                        Publish
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[60vh]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        {headers.map((header) => (
                          <TableHead key={header} className="min-w-[150px]">
                            {header}
                          </TableHead>
                        ))}
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.map((row) => (
                        <TableRow key={row._id}>
                          {headers.map((header) => (
                            <TableCell key={header}>
                              <Input
                                value={String(row[header] || '')}
                                onChange={(e) =>
                                  handleCellEdit(
                                    row._id!,
                                    header,
                                    e.target.value
                                  )
                                }
                                className="h-8 min-w-[120px]"
                              />
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRow(row._id!)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete row"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Drag Handle */}
        <div className="flex items-center justify-center pt-2 pb-3 cursor-grab active:cursor-grabbing touch-none border-t mt-auto">
          <div className="flex flex-col items-center gap-1.5">
            <ChevronUp className="size-5 text-muted-foreground rotate-180" />
            <p className="text-xs text-muted-foreground">Drag down to close</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

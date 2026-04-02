import { useRef, useState } from "react"
import { IconDownload, IconLoader2, IconUpload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const SAMPLE_ROW = { name: "Joseph Black", email: "joseph.black@melpapp.com", phone: "61234567890" }

function downloadCsv(withSample: boolean) {
  const header = "FULL NAME,EMAIL,PHONE"
  const rows = withSample
    ? [header, `${SAMPLE_ROW.name},${SAMPLE_ROW.email},${SAMPLE_ROW.phone}`]
    : [header]
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = withSample ? "bulk-invite-sample.csv" : "bulk-invite-template.csv"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function BulkUploadInline({
  onFileSelected,
  onCancel,
  uploading,
}: {
  onFileSelected: (file: File) => void
  onCancel: () => void
  uploading: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState("")

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.toLowerCase()
    const allowedExt = ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls")
    if (!allowedExt) {
      setFileError("Please upload a CSV or Excel file only (.csv, .xlsx, .xls)")
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("Maximum upload file size is 5 MB")
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setFileError("")
    setSelectedFile(file)
  }

  function handleUpload() {
    if (selectedFile) onFileSelected(selectedFile)
  }

  function handleCancel() {
    setSelectedFile(null)
    setFileError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    onCancel()
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-base font-semibold mb-1">Bulk Upload Users</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Follow the steps below to import multiple users at once.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left — Steps */}
        <div className="lg:basis-1/2 min-w-0">
          <ol className="flex flex-col gap-6">
            {/* Step 1 — Download template */}
            <li className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                1
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Download the template file</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadCsv(true)}>
                    <IconDownload className="size-4 mr-1.5" />
                    With Sample Data
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadCsv(false)}>
                    <IconDownload className="size-4 mr-1.5" />
                    Blank Template
                  </Button>
                </div>
              </div>
            </li>

            {/* Step 2 — Preview format */}
            <li className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                2
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-2">Fill in the file using this format</p>
                <div className="rounded border overflow-x-auto w-full max-w-lg min-w-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs uppercase tracking-wider">Full Name</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider">Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm">{SAMPLE_ROW.name}</TableCell>
                        <TableCell className="text-sm">{SAMPLE_ROW.email}</TableCell>
                        <TableCell className="text-sm">{SAMPLE_ROW.phone}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </li>

            {/* Step 3 — Upload */}
            <li className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                3
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Upload your completed file</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    Choose File
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedFile ? selectedFile.name : "No file chosen"}
                  </span>
                </div>
                {fileError && <p className="text-xs text-destructive mt-1">{fileError}</p>}
                <p className="text-xs text-muted-foreground mt-1">Max file size: <span className="font-medium">5 MB</span></p>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={uploading}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="melp-radius"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? (
                      <>
                        <IconLoader2 className="size-4 mr-1.5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <IconUpload className="size-4 mr-1.5" />
                        Upload File
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </li>
          </ol>
        </div>

        {/* Right — Notes */}
        <div className="lg:basis-1/2 shrink-0">
          <div className="rounded-md border border-border bg-muted/40 p-4 h-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Avoid common errors</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-muted-foreground">
              <li>You can add up to 1500 users per CSV file.</li>
              <li>Each user must have a unique username email address.</li>
              <li>Email addresses can&apos;t use accent marks, like à or ñ.</li>
              <li>Email addresses can&apos;t begin with a period (.).</li>
              <li>The part of the email address before the @ symbol can have 64 characters or less.</li>
              <li>Username email addresses may only use letters, numbers, and the following special characters &apos;.-_!#^~.</li>
              <li>Alternate email addresses may only use letters, numbers, and the following special characters: !#$%&amp;*+-/=?^_|~.</li>
              <li>Save as a CSV (comma delimited) file with 16 columns.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
